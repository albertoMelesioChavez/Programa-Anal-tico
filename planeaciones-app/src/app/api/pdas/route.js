import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/pdas.json';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    try {
        const tableInfo = await db.execute("PRAGMA table_info('pdas')");
        const columns = new Set(tableInfo.rows.map((row) => String(row.name)));
        const contentColumns = ['contenido_estatal_id', 'contenido_id'].filter((column) => columns.has(column));

        if (contentColumns.length === 0) {
            return NextResponse.json(dataFallback.filter(p =>
                String(p.contenido_estatal_id) === String(contenido_id) ||
                String(p.contenido_id) === String(contenido_id)
            ));
        }

        const pdas = await db.execute({
            sql: `SELECT * FROM pdas WHERE ${contentColumns.map((column) => `${column} = ?`).join(' OR ')}`,
            args: contentColumns.map(() => contenido_id)
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
