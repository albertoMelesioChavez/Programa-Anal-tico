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
        const planeaciones = db.prepare('SELECT * FROM planeaciones ORDER BY fecha_creacion DESC').all();
        return NextResponse.json(planeaciones);
    } catch (error) {
        console.error('Planeaciones fallback:', error);
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database/planeaciones.json'), 'utf8'));
            return NextResponse.json(data);
        } catch (e) {
            return NextResponse.json([]);
        }
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
