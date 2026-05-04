import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDb();

        const fases = db.prepare('SELECT * FROM fases ORDER BY id ASC').all();
        const grados = db.prepare('SELECT * FROM grados ORDER BY id ASC').all();
        const lenguajes = db.prepare('SELECT * FROM lenguajes_artisticos ORDER BY id ASC').all();

        return NextResponse.json({
            fases,
            grados,
            lenguajes
        });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalogs' }, { status: 500 });
    }
}
