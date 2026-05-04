import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const fase_id = searchParams.get('fase_id');
        const lenguaje_id = searchParams.get('lenguaje_id');

        if (!fase_id || !lenguaje_id) {
            return NextResponse.json({ error: 'fase_id and lenguaje_id are required' }, { status: 400 });
        }

        const db = getDb();

        const orientaciones = db.prepare(
            'SELECT * FROM orientaciones_didacticas WHERE fase_id = ? AND lenguaje_id = ? ORDER BY id ASC'
        ).all(fase_id, lenguaje_id);

        return NextResponse.json({ orientaciones });

    } catch (error) {
        console.error('Database error fetching orientaciones:', error);
        return NextResponse.json({ error: 'Failed to fetch orientaciones' }, { status: 500 });
    }
}
