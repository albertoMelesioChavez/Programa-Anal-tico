import { NextResponse } from 'next/server';
import data from '@/lib/data/pdas.json';

const isProd = process.env.NODE_ENV === 'production';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    if (!isProd) {
        try {
            const { getDb } = require('@/lib/db');
            const db = getDb();
            if (db) {
                // En la DB real, el campo puede ser contenido_id o contenido_estatal_id
                // Intentamos primero con contenido_estatal_id que es lo que vi en el JSON
                const pdas = db.prepare('SELECT * FROM pdas WHERE contenido_estatal_id = ?').all(contenido_id);
                return NextResponse.json(pdas);
            }
        } catch (e) {
            console.error("DB Error in PDAs");
        }
    }

    // En el JSON de respaldo, la clave es contenido_estatal_id
    return NextResponse.json(data.filter(p => 
        String(p.contenido_estatal_id) === String(contenido_id) || 
        String(p.contenido_id) === String(contenido_id)
    ));
}
