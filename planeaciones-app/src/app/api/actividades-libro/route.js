import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const grado_id = searchParams.get('grado_id');
    const lenguaje_id = searchParams.get('lenguaje_id');

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM actividades_libro WHERE grado_id = ? AND lenguaje_id = ?',
            args: [grado_id, lenguaje_id]
        });
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Turso Actividades Error:", error);
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/data/actividades_libro.json'), 'utf8'));
            return NextResponse.json(data.filter(a => a.grado_id == grado_id && a.lenguaje_id == lenguaje_id));
        } catch (e) {
            return NextResponse.json([]);
        }
    }
}
