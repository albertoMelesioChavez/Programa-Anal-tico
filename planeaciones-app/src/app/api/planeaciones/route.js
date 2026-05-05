import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/planeaciones.json';

export async function GET() {
    try {
        const result = await db.execute('SELECT * FROM planeaciones ORDER BY fecha_creacion DESC');
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
