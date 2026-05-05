import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lenguaje_id = searchParams.get('lenguaje_id');

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM material_consulta WHERE lenguaje_id = ?',
            args: [lenguaje_id]
        });
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Turso Material Consulta Error:", error);
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/data/material_consulta.json'), 'utf8'));
            return NextResponse.json(data.filter(m => m.lenguaje_id == lenguaje_id));
        } catch (e) {
            return NextResponse.json([]);
        }
    }
}
