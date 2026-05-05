import { NextResponse } from 'next/server';
import data from '@/lib/data/planeaciones.json';

const isProd = process.env.NODE_ENV === 'production';

export async function GET() {
    if (!isProd) {
        try {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            if (db) {
                const planeaciones = db.prepare('SELECT * FROM planeaciones ORDER BY fecha_creacion DESC').all();
                return NextResponse.json(planeaciones);
            }
        } catch (error) {
            console.error('DB Error in planeaciones GET');
        }
    }
    return NextResponse.json(data);
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
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isProd) {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            if (db) {
                const insert = db.prepare(`
                  INSERT INTO planeaciones (
                    titulo, fase_id, grado_id, lenguaje_id, 
                    contenido_nacional_id, contenido_estatal_id, pda_id,
                    ejes_articuladores,
                    metodologia, actividades, recursos, evaluacion,
                    secuencia_inicio, secuencia_desarrollo, secuencia_cierre
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const result = insert.run(
                    titulo, fase_id, grado_id, lenguaje_id,
                    contenido_nacional_id || null, contenido_estatal_id || null, pda_id || null,
                    ejes_articuladores || '',
                    metodologia || '', actividades || '', recursos || '', evaluacion || '',
                    secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || ''
                );
                return NextResponse.json({ id: result.lastInsertRowid, success: true }, { status: 201 });
            }
        }

        // In production, we simulate success for the UI, but tell the user it's local-only for now
        return NextResponse.json({ 
            success: true, 
            message: 'Planeación creada localmente en el navegador (Vercel es solo lectura)',
            id: Date.now() 
        }, { status: 201 });

    } catch (error) {
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
