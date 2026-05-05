import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fase_id = searchParams.get('fase_id');
    const lenguaje_id = searchParams.get('lenguaje_id');

    try {
        const db = getDb();
        const nacionales = db.prepare('SELECT * FROM contenidos_nacionales WHERE fase_id = ?').all(fase_id);
        const estatales = db.prepare('SELECT * FROM contenidos_estatales WHERE fase_id = ? AND lenguaje_id = ?').all(fase_id, lenguaje_id);

        return NextResponse.json({ nacionales, estatales });
    } catch (error) {
        console.error('Database error in contenidos, using JSON fallback:', error);
        try {
            const nacData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database/contenidos_nacionales.json'), 'utf8'));
            const estData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database/contenidos_estatales.json'), 'utf8'));
            
            return NextResponse.json({
                nacionales: nacData.filter(c => String(c.fase_id) === String(fase_id)),
                estatales: estData.filter(c => String(c.fase_id) === String(fase_id) && String(c.lenguaje_id) === String(lenguaje_id))
            });
        } catch (e) {
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }
    }
}
