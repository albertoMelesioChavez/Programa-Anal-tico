import { NextResponse } from 'next/server';
import data from '../../../../database/pdas.json';

const isProd = process.env.NODE_ENV === 'production';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    if (!isProd) {
        try {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            if (db) {
                const pdas = db.prepare('SELECT * FROM pdas WHERE contenido_id = ?').all(contenido_id);
                return NextResponse.json(pdas);
            }
        } catch (e) {
            console.error("DB Error in PDAs");
        }
    }

    return NextResponse.json(data.filter(p => String(p.contenido_id) === String(contenido_id)));
}
