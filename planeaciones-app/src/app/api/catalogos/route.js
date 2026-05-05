import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import data from '../../../../database/catalogs.json';

export async function GET() {
    try {
        const db = getDb();
        const fases = db.prepare('SELECT * FROM fases ORDER BY id ASC').all();
        const grados = db.prepare('SELECT * FROM grados ORDER BY id ASC').all();
        const lenguajes = db.prepare('SELECT * FROM lenguajes_artisticos ORDER BY id ASC').all();
        const campos_formativos = db.prepare('SELECT * FROM campos_formativos ORDER BY id ASC').all();
        const ejes_articuladores = db.prepare('SELECT * FROM ejes_articuladores ORDER BY id ASC').all();

        return NextResponse.json({ fases, grados, lenguajes, campos_formativos, ejes_articuladores });
    } catch (error) {
        return NextResponse.json(data);
    }
}
