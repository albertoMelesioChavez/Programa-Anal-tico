import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDb();

        const planeaciones = db.prepare(`
      SELECT 
        p.id, p.fecha_creacion, p.titulo, 
        f.nombre as fase, g.nombre as grado, l.nombre as lenguaje,
        cn.descripcion as contenido_nacional_desc,
        ce.descripcion as contenido_estatal_desc,
        pda.descripcion as pda_desc,
        p.metodologia, p.actividades, p.recursos, p.evaluacion,
        p.ejes_articuladores, p.secuencia_inicio, p.secuencia_desarrollo, p.secuencia_cierre
      FROM planeaciones p
      LEFT JOIN fases f ON p.fase_id = f.id
      LEFT JOIN grados g ON p.grado_id = g.id
      LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
      LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
      LEFT JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
      LEFT JOIN pdas pda ON p.pda_id = pda.id
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
            ejes_articuladores,
            metodologia, actividades, recursos, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre
        } = body;

        if (!titulo || !fase_id || !grado_id || !lenguaje_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDb();

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
    } catch (error) {
        console.error('DETAILED DATABASE ERROR:', error);
        return NextResponse.json({ 
            error: 'Failed to create planeacion', 
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
