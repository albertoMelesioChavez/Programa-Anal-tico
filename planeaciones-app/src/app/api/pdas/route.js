import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const grado_id = searchParams.get('grado_id');
        const lenguaje_id = searchParams.get('lenguaje_id');

        if (!grado_id || !lenguaje_id) {
            return NextResponse.json({ error: 'grado_id and lenguaje_id are required' }, { status: 400 });
        }

        const db = getDb();

        // Fetch PDAs for this Grado and Lenguaje
        const pdas = db.prepare(
            'SELECT * FROM pdas WHERE grado_id = ? AND lenguaje_id = ? ORDER BY id ASC'
        ).all(grado_id, lenguaje_id);

        return NextResponse.json({
            pdas
        });

    } catch (error) {
        console.error('Database error fetching PDAs:', error);
        return NextResponse.json({ error: 'Failed to fetch PDAs' }, { status: 500 });
    }
}
