import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensurePlaneacionContextColumns, ensureProyectoArteTable } from '@/lib/context-schema';
import { owns, requireSameOrigin, requireUser } from '@/lib/auth';

export async function GET(request) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        // Asegurar que todas las tablas necesarias existen y están pobladas
        const { ensureTablesExist } = await import('@/lib/db-init');
        await ensureTablesExist();
        await ensurePlaneacionContextColumns();
        await ensureProyectoArteTable();

        // Si la conexión a Turso es exitosa pero la tabla está vacía, 
        // el resultado será una lista vacía [], lo cual es correcto para una DB nueva.

        const result = await db.execute({ sql: `
            SELECT 
                p.*, 
                f.nombre as fase_nombre, 
                g.nombre as grado_nombre, 
                l.nombre as lenguaje_nombre,
                cn.descripcion as contenido_nacional_desc,
                ce.descripcion as contenido_estatal_desc,
                pda.descripcion as pda_desc,
                pr.titulo as proyecto_arte_titulo
            FROM planeaciones p
            LEFT JOIN fases f ON p.fase_id = f.id
            LEFT JOIN grados g ON p.grado_id = g.id
            LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
            LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
            LEFT JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
            LEFT JOIN pdas pda ON p.pda_id = pda.id
            LEFT JOIN proyectos pr ON p.proyecto_arte_id = pr.id AND pr.docente_id = p.docente_id
            WHERE p.docente_id = ?
            ORDER BY p.orden ASC, p.fecha_creacion DESC
        `, args: [auth.user.id] });
        return NextResponse.json(result.rows.map((row) => ({
            ...row,
            ...Object.fromEntries(['pda_por_grado', 'evaluacion_por_grado', 'recursos_por_grado', 'evidencias_por_grado'].map((field) => [field, (() => {
                if (!row[field]) return [];
                try { return JSON.parse(row[field]); } catch { return []; }
            })()]))
        })));
    } catch (error) {
        console.error('Turso GET Error:', error);
        return NextResponse.json({ error: 'No se pudieron cargar tus planeaciones.' }, { status: 500 });
    }
}

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const body = await request.json();
        const {
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado,
            proyecto_arte_id, programa_analitico_id, valor_mensual,
            ejes_articuladores,
            metodologia, actividades, recursos, evidencias, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre,
            grupo, fecha_clase, numero_sesion, duracion_minutos, proposito, criterios, ajustes, observaciones, estado, origen_borrador
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            console.warn('POST Planeacion: Faltan campos requeridos', { titulo, fase_id, grado_id, lenguaje_id });
            return NextResponse.json({ error: 'Faltan campos requeridos (Título, Fase, Grado, Lenguaje)' }, { status: 400 });
        }

        const { ensureTablesExist } = await import('@/lib/db-init');
        await ensureTablesExist();
        await ensurePlaneacionContextColumns();
        await ensureProyectoArteTable();
        const { ensureProgramasAnaliticosTable } = await import('@/lib/context-schema');
        await ensureProgramasAnaliticosTable();
        if (proyecto_arte_id && !await owns('proyectos', proyecto_arte_id, auth.user.id)) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        if (programa_analitico_id && !await owns('programas_analiticos', programa_analitico_id, auth.user.id)) return NextResponse.json({ error: 'Programa no encontrado.' }, { status: 404 });

        const sql = `INSERT INTO planeaciones (
                    titulo, fase_id, grado_id, lenguaje_id, 
                    contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado,
                    proyecto_arte_id, programa_analitico_id, valor_mensual,
                    ejes_articuladores,
                    metodologia, actividades, recursos, evidencias, evaluacion,
                    secuencia_inicio, secuencia_desarrollo, secuencia_cierre,
                    grupo, fecha_clase, numero_sesion, duracion_minutos, proposito, criterios, ajustes, observaciones, estado, origen_borrador, docente_id
                  ) VALUES (${Array(34).fill('?').join(', ')})`;
        
        const args = [
            titulo, fase_id?.toString(), grado_id?.toString(), lenguaje_id?.toString(),
            contenido_nacional_id?.toString() || null, 
            contenido_estatal_id?.toString() || null, 
            pda_id?.toString() || null,
            JSON.stringify(pda_por_grado || []),
            JSON.stringify(evaluacion_por_grado || []),
            JSON.stringify(recursos_por_grado || []),
            JSON.stringify(evidencias_por_grado || []),
            proyecto_arte_id?.toString() || null,
            programa_analitico_id?.toString() || null,
            valor_mensual?.trim() || '',
            ejes_articuladores || '',
            metodologia || '', actividades || '', recursos || '', evidencias || '', evaluacion || '',
            secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || '',
            grupo || null, fecha_clase || null, numero_sesion || null, duracion_minutos || null,
            proposito || '', criterios || '', ajustes || '', observaciones || '', estado || 'borrador', origen_borrador || null, auth.user.id
        ];

        const result = await db.execute({ sql, args });

        return NextResponse.json({ 
            id: result.lastInsertRowid?.toString(), 
            success: true 
        }, { status: 201 });

    } catch (error) {
        console.error('Turso POST Error Detallado:', error);
        return NextResponse.json({ 
            error: 'Error al guardar en la nube: ' + error.message,
            details: error.toString()
        }, { status: 500 });
    }
}
