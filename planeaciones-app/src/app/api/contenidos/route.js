import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import nacData from '@/lib/data/contenidos_nacionales.json';
import estData from '@/lib/data/contenidos_estatales.json';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fase_id = searchParams.get('fase_id');
    const lenguaje_id = searchParams.get('lenguaje_id');

    try {
        const nacionales = await db.execute({
            sql: 'SELECT * FROM contenidos_nacionales WHERE fase_id = ?',
            args: [fase_id]
        });
        const estatales = await db.execute({
            sql: 'SELECT * FROM contenidos_estatales WHERE fase_id = ? AND lenguaje_id = ?',
            args: [fase_id, lenguaje_id]
        });
        return NextResponse.json({ 
            nacionales: nacionales.rows, 
            estatales: estatales.rows 
        });
    } catch (e) {
        console.error("Turso Contenidos Error:", e);
        // Fallback
        return NextResponse.json({
            nacionales: nacData.filter(c => String(c.fase_id) === String(fase_id)),
            estatales: estData.filter(c => String(c.fase_id) === String(fase_id) && String(c.lenguaje_id) === String(lenguaje_id))
        });
    }
}
