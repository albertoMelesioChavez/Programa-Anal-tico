import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import nacData from '../../../../../../database/contenidos_nacionales.json';
import estData from '../../../../../../database/contenidos_estatales.json';

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
        return NextResponse.json({
            nacionales: nacData.filter(c => String(c.fase_id) === String(fase_id)),
            estatales: estData.filter(c => String(c.fase_id) === String(fase_id) && String(c.lenguaje_id) === String(lenguaje_id))
        });
    }
}
