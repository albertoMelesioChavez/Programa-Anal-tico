import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const db = getDb();

        const fases = db.prepare('SELECT * FROM fases ORDER BY id ASC').all();
        const grados = db.prepare('SELECT * FROM grados ORDER BY id ASC').all();
        const lenguajes = db.prepare('SELECT * FROM lenguajes_artisticos ORDER BY id ASC').all();
        const campos_formativos = db.prepare('SELECT * FROM campos_formativos ORDER BY id ASC').all();
        const ejes_articuladores = db.prepare('SELECT * FROM ejes_articuladores ORDER BY id ASC').all();

        return NextResponse.json({
            fases,
            grados,
            lenguajes,
            campos_formativos,
            ejes_articuladores
        });
    } catch (error) {
        console.error('Database error in catalogos, attempting JSON fallback:', error);
        
        try {
            const jsonPath = path.join(process.cwd(), 'database', 'catalogs.json');
            if (fs.existsSync(jsonPath)) {
                const rawData = fs.readFileSync(jsonPath, 'utf8');
                return NextResponse.json(JSON.parse(rawData));
            }
        } catch (jsonError) {
            console.error('JSON Fallback also failed:', jsonError);
        }

        return NextResponse.json({ error: 'Failed to fetch catalogs' }, { status: 500 });
    }
}
