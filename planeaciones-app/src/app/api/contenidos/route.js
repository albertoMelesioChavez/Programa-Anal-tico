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
        
        return NextResponse.json({ 
            nacionales: nacionales.rows, 
            estatales: estatales.rows,
            pdas: pdas.rows
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
