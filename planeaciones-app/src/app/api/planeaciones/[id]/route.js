import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const result = await db.execute({
            sql: 'DELETE FROM planeaciones WHERE id = ?',
            args: [id]
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'Planeacion no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar planeación en Turso:', error);
        return NextResponse.json({ error: 'Error al eliminar la planeación' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id, contenido_estatal_id, pda_id,
            ejes_articuladores,
            metodologia, actividades, recursos, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre
        } = body;

        if (!titulo) {
            return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
        }

        if (!process.env.TURSO_DATABASE_URL) {
            return NextResponse.json({ error: 'Base de datos no configurada en Vercel' }, { status: 503 });
        }

        await db.execute({
            sql: `UPDATE planeaciones SET 
                    titulo = ?, fase_id = ?, grado_id = ?, lenguaje_id = ?, 
                    contenido_nacional_id = ?, contenido_estatal_id = ?, pda_id = ?,
                    ejes_articuladores = ?,
                    metodologia = ?, actividades = ?, recursos = ?, evaluacion = ?,
                    secuencia_inicio = ?, secuencia_desarrollo = ?, secuencia_cierre = ?
                  WHERE id = ?`,
            args: [
                titulo, 
                fase_id?.toString(), 
                grado_id?.toString(), 
                lenguaje_id?.toString(),
                contenido_nacional_id?.toString() || null, 
                contenido_estatal_id?.toString() || null, 
                pda_id?.toString() || null,
                ejes_articuladores || '',
                metodologia || '', actividades || '', recursos || '', evaluacion || '',
                secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || '',
                id
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Turso PUT Error:', error);
        return NextResponse.json({ error: 'Error al actualizar: ' + error.message }, { status: 500 });
    }
}
