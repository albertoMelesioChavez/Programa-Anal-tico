import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    try {
        const db = getDb();
        const pdas = db.prepare('SELECT * FROM pdas WHERE contenido_id = ?').all(contenido_id);
        return NextResponse.json(pdas);
    } catch (error) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database/pdas.json'), 'utf8'));
            return NextResponse.json(data.filter(p => p.contenido_id == contenido_id));
        } catch (e) {
            return NextResponse.json([]);
        }
    }
}
