import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

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
