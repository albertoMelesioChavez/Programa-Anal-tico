import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import nacData from '@/lib/data/contenidos_nacionales.json';
import estData from '@/lib/data/contenidos_estatales.json';
import pdasData from '@/lib/data/pdas.json';

export async function GET(request) {
    try {
        const nacionales = await db.execute('SELECT * FROM contenidos_nacionales');
        const estatales = await db.execute('SELECT * FROM contenidos_estatales');
        const pdas = await db.execute('SELECT * FROM pdas');
        
        const serializeRows = (rows) => rows.map(row => {
            const newRow = {};
            for (const key in row) {
                newRow[key] = typeof row[key] === 'bigint' ? Number(row[key]) : row[key];
            }
            return newRow;
        });

        return NextResponse.json({ 
            nacionales: serializeRows(nacionales.rows), 
            estatales: serializeRows(estatales.rows),
            pdas: serializeRows(pdas.rows)
        });
    } catch (e) {
        console.error("Turso Contenidos Error:", e);
        // Fallback
        return NextResponse.json({
            nacionales: nacData,
            estatales: estData,
            pdas: pdasData
        });
    }
}
