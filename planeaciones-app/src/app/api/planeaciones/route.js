import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/planeaciones.json';
import { ensurePlaneacionContextColumns, ensureProyectoArteTable, ensureProyectoEscolarTable } from '@/lib/context-schema';

export async function GET() {
    try {
        // Asegurar que todas las tablas necesarias existen y están pobladas
        const { ensureTablesExist } = await import('@/lib/db-init');
        await ensureTablesExist();
        await ensurePlaneacionContextColumns();
        await ensureProyectoArteTable();
        await ensureProyectoEscolarTable();

        // Si la conexión a Turso es exitosa pero la tabla está vacía, 
        // el resultado será una lista vacía [], lo cual es correcto para una DB nueva.

        const result = await db.execute(`
            SELECT 
                p.*, 
                f.nombre as fase_nombre, 
                g.nombre as grado_nombre, 
                l.nombre as lenguaje_nombre,
                cn.descripcion as contenido_nacional_desc,
                ce.descripcion as contenido_estatal_desc,
                pda.descripcion as pda_desc,
                pr.titulo as proyecto_arte_titulo,
                pe.titulo as proyecto_escolar_titulo
            FROM planeaciones p
            LEFT JOIN fases f ON p.fase_id = f.id
            LEFT JOIN grados g ON p.grado_id = g.id
            LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
            LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
            LEFT JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
            LEFT JOIN pdas pda ON p.pda_id = pda.id
            LEFT JOIN proyectos pr ON p.proyecto_arte_id = pr.id
            LEFT JOIN proyectos_escolares pe ON p.proyecto_escolar_id = pe.id
            ORDER BY p.fecha_creacion DESC
        `);
        return NextResponse.json(result.rows.map((row) => ({
            ...row,
            ...Object.fromEntries(['pda_por_grado', 'evaluacion_por_grado', 'recursos_por_grado', 'evidencias_por_grado'].map((field) => [field, (() => {
                if (!row[field]) return [];
                try { return JSON.parse(row[field]); } catch { return []; }
            })()]))
        })));
    } catch (error) {
        console.error('Turso GET Error:', error);
        // Si falla la conexión a la nube, devolvemos el fallback estático
        return NextResponse.json(dataFallback);
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado,
            proyecto_escolar_id, proyecto_arte_id, valor_mensual,
            ejes_articuladores,
            metodologia, actividades, recursos, evidencias, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            console.warn('POST Planeacion: Faltan campos requeridos', { titulo, fase_id, grado_id, lenguaje_id });
            return NextResponse.json({ error: 'Faltan campos requeridos (Título, Fase, Grado, Lenguaje)' }, { status: 400 });
        }

        const { ensureTablesExist } = await import('@/lib/db-init');
        await ensureTablesExist();
        await ensurePlaneacionContextColumns();
        await ensureProyectoEscolarTable();

        const sql = `INSERT INTO planeaciones (
                    titulo, fase_id, grado_id, lenguaje_id, 
                    contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado,
                    proyecto_escolar_id, proyecto_arte_id, valor_mensual,
                    ejes_articuladores,
                    metodologia, actividades, recursos, evidencias, evaluacion,
                    secuencia_inicio, secuencia_desarrollo, secuencia_cierre
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const args = [
            titulo, fase_id?.toString(), grado_id?.toString(), lenguaje_id?.toString(),
            contenido_nacional_id?.toString() || null, 
            contenido_estatal_id?.toString() || null, 
            pda_id?.toString() || null,
            JSON.stringify(pda_por_grado || []),
            JSON.stringify(evaluacion_por_grado || []),
            JSON.stringify(recursos_por_grado || []),
            JSON.stringify(evidencias_por_grado || []),
            proyecto_escolar_id?.toString() || null,
            proyecto_arte_id?.toString() || null,
            valor_mensual?.trim() || '',
            ejes_articuladores || '',
            metodologia || '', actividades || '', recursos || '', evidencias || '', evaluacion || '',
            secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || ''
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
