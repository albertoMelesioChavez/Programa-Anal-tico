import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const lenguaje = searchParams.get('lenguaje');

        const db = getDb();

        let query = 'SELECT * FROM material_consulta';
        const params = [];

        if (lenguaje) {
            query += ' WHERE lenguaje = ?';
            params.push(lenguaje);
        }

        query += ' ORDER BY id ASC';

        const materiales = db.prepare(query).all(...params);

        return NextResponse.json({ materiales });

    } catch (error) {
        console.error('Database error fetching material:', error);
        return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 });
    }
}
