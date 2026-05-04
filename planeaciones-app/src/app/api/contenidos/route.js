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

        // Fetch Nacionales for this Fase
        const nacionales = db.prepare(
            'SELECT * FROM contenidos_nacionales WHERE fase_id = ? ORDER BY id ASC'
        ).all(fase_id);

        // Fetch Estatales for this Fase and Lenguaje
        const estatales = db.prepare(
            'SELECT * FROM contenidos_estatales WHERE fase_id = ? AND lenguaje_id = ? ORDER BY id ASC'
        ).all(fase_id, lenguaje_id);

        return NextResponse.json({
            nacionales,
            estatales
        });

    } catch (error) {
        console.error('Database error fetching contenidos:', error);
        return NextResponse.json({ error: 'Failed to fetch contenidos' }, { status: 500 });
    }
}
