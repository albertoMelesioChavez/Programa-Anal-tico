import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/planeaciones.json';

export async function GET() {
    try {
        // Asegurar que todas las tablas necesarias existen y están pobladas
        const { ensureTablesExist } = await import('@/lib/db-init');
        await ensureTablesExist();

        // Si la conexión a Turso es exitosa pero la tabla está vacía, 
        // el resultado será una lista vacía [], lo cual es correcto para una DB nueva.

        const result = await db.execute(`
            SELECT 
                p.*, 
                f.nombre as fase_nombre, 
                g.nombre as grado_nombre, 
                l.nombre as lenguaje_nombre,
                cn.descripcion as contenido_nacional_desc,
                pda.descripcion as pda_desc
            FROM planeaciones p
            LEFT JOIN fases f ON p.fase_id = f.id
            LEFT JOIN grados g ON p.grado_id = g.id
            LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
            LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
            LEFT JOIN pdas pda ON p.pda_id = pda.id
            ORDER BY p.fecha_creacion DESC
        `);
        return NextResponse.json(result.rows);
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
            contenido_nacional_id, contenido_estatal_id, pda_id,
            ejes_articuladores,
            metodologia, actividades, recursos, evidencias, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            console.warn('POST Planeacion: Faltan campos requeridos', { titulo, fase_id, grado_id, lenguaje_id });
            return NextResponse.json({ error: 'Faltan campos requeridos (Título, Fase, Grado, Lenguaje)' }, { status: 400 });
        }

        if (!process.env.TURSO_DATABASE_URL) {
            console.error('CRÍTICO: TURSO_DATABASE_URL no configurada en el servidor.');
            return NextResponse.json({ error: 'Base de datos no configurada en Vercel' }, { status: 503 });
        }

        const sql = `INSERT INTO planeaciones (
                    titulo, fase_id, grado_id, lenguaje_id, 
                    contenido_nacional_id, contenido_estatal_id, pda_id,
                    ejes_articuladores,
                    metodologia, actividades, recursos, evidencias, evaluacion,
                    secuencia_inicio, secuencia_desarrollo, secuencia_cierre
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const args = [
            titulo, fase_id?.toString(), grado_id?.toString(), lenguaje_id?.toString(),
            contenido_nacional_id?.toString() || null, 
            contenido_estatal_id?.toString() || null, 
            pda_id?.toString() || null,
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
