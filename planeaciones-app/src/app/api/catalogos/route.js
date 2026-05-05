import { NextResponse } from 'next/server';
import data from '../../../../database/catalogs.json';

const isProd = process.env.NODE_ENV === 'production';

export async function GET() {
    if (!isProd) {
        try {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            if (db) {
                const fases = db.prepare('SELECT * FROM fases ORDER BY id ASC').all();
                const grados = db.prepare('SELECT * FROM grados ORDER BY id ASC').all();
                const lenguajes = db.prepare('SELECT * FROM lenguajes_artisticos ORDER BY id ASC').all();
                const campos_formativos = db.prepare('SELECT * FROM campos_formativos ORDER BY id ASC').all();
                const ejes_articuladores = db.prepare('SELECT * FROM ejes_articuladores ORDER BY id ASC').all();

                return NextResponse.json({ fases, grados, lenguajes, campos_formativos, ejes_articuladores });
            }
        } catch (e) {
            console.error("DB Error in catalogs");
        }
    }

    return NextResponse.json(data);
}
