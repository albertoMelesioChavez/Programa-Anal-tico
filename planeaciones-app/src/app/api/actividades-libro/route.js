import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const grado = searchParams.get('grado');
        const lenguaje = searchParams.get('lenguaje');

        if (!grado) {
            return NextResponse.json({ error: 'grado is required' }, { status: 400 });
        }

        const db = getDb();

        let query = 'SELECT * FROM actividades_libro WHERE grado = ?';
        const params = [grado];

        if (lenguaje) {
            query += ' AND lenguaje_artistico LIKE ?';
            params.push(`%${lenguaje}%`);
        }

        query += ' ORDER BY libro, pagina ASC';

        const actividades = db.prepare(query).all(...params);

        return NextResponse.json({ actividades });

    } catch (error) {
        console.error('Database error fetching actividades:', error);
        return NextResponse.json({ error: 'Failed to fetch actividades' }, { status: 500 });
    }
}
