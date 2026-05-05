import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/pdas.json';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    try {
        const pdas = await db.execute({
            sql: 'SELECT * FROM pdas WHERE contenido_estatal_id = ? OR contenido_id = ?',
            args: [contenido_id, contenido_id]
        });
        return NextResponse.json(pdas.rows);
    } catch (e) {
        console.error("Turso PDAs Error:", e);
        // Fallback
        return NextResponse.json(dataFallback.filter(p => 
            String(p.contenido_estatal_id) === String(contenido_id) || 
            String(p.contenido_id) === String(contenido_id)
        ));
    }
}
