import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
    try {
        const id = params.id;
        const db = getDb();

        const del = db.prepare('DELETE FROM planeaciones WHERE id = ?');
        const result = del.run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Planeacion not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database error deleting planeacion:', error);
        return NextResponse.json({ error: 'Failed to delete planeacion' }, { status: 500 });
    }
}
