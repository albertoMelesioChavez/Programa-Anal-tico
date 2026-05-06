import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/planeaciones.json';

export async function GET() {
    try {
        // Asegurar que la tabla existe (especialmente para Turso Cloud nuevo)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS planeaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT,
                fase_id TEXT,
                grado_id TEXT,
                lenguaje_id TEXT,
                contenido_nacional_id TEXT,
                contenido_estatal_id TEXT,
                pda_id TEXT,
                ejes_articuladores TEXT,
                metodologia TEXT,
                actividades TEXT,
                recursos TEXT,
                evaluacion TEXT,
                secuencia_inicio TEXT,
                secuencia_desarrollo TEXT,
                secuencia_cierre TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
            metodologia, actividades, recursos, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const result = await db.execute({
            sql: `INSERT INTO planeaciones (
                    titulo, fase_id, grado_id, lenguaje_id, 
                    contenido_nacional_id, contenido_estatal_id, pda_id,
                    ejes_articuladores,
                    metodologia, actividades, recursos, evaluacion,
                    secuencia_inicio, secuencia_desarrollo, secuencia_cierre,
                    fecha_creacion
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [
                titulo, fase_id, grado_id, lenguaje_id,
                contenido_nacional_id || null, contenido_estatal_id || null, pda_id || null,
                ejes_articuladores || '',
                metodologia || '', actividades || '', recursos || '', evaluacion || '',
                secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || ''
            ]
        });

        return NextResponse.json({ 
            id: result.lastInsertRowid?.toString(), 
            success: true 
        }, { status: 201 });

    } catch (error) {
        console.error('Turso POST Error:', error);
        return NextResponse.json({ error: 'Error al guardar en la base de datos' }, { status: 500 });
    }
}
