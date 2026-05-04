import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDb();

        // Fetch all planeaciones with their related names instead of just IDs
        const planeaciones = db.prepare(`
      SELECT 
        p.id, p.fecha_creacion, p.titulo, 
        f.nombre as fase, g.nombre as grado, l.nombre as lenguaje,
        p.metodologia, p.actividades, p.recursos, p.evaluacion
      FROM planeaciones p
      LEFT JOIN fases f ON p.fase_id = f.id
      LEFT JOIN grados g ON p.grado_id = g.id
      LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
      ORDER BY p.fecha_creacion DESC
    `).all();

        return NextResponse.json({ planeaciones });
    } catch (error) {
        console.error('Database error fetching planeaciones:', error);
        return NextResponse.json({ error: 'Failed to fetch planeaciones' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id, contenido_estatal_id, pda_id,
            metodologia, actividades, recursos, evaluacion
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDb();

        const insert = db.prepare(`
      INSERT INTO planeaciones (
        titulo, fase_id, grado_id, lenguaje_id, 
        contenido_nacional_id, contenido_estatal_id, pda_id, 
        metodologia, actividades, recursos, evaluacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = insert.run(
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id || null, contenido_estatal_id || null, pda_id || null,
            metodologia || '', actividades || '', recursos || '', evaluacion || ''
        );

        return NextResponse.json({ id: result.lastInsertRowid, success: true }, { status: 201 });
    } catch (error) {
        console.error('Database error creating planeacion:', error);
        return NextResponse.json({ error: 'Failed to create planeacion' }, { status: 500 });
    }
}
