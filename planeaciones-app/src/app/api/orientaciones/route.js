import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fase_id = searchParams.get('fase_id');
    const lenguaje_id = searchParams.get('lenguaje_id');

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM orientaciones_didacticas WHERE fase_id = ? AND lenguaje_id = ?',
            args: [fase_id, lenguaje_id]
        });
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Turso Orientaciones Error:", error);
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/data/orientaciones_didacticas.json'), 'utf8'));
            return NextResponse.json(data.filter(o => o.fase_id == fase_id && o.lenguaje_id == lenguaje_id));
        } catch (e) {
            return NextResponse.json([]);
        }
    }
}
