import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import data from '../../../../database/pdas.json';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    try {
        const db = getDb();
        const pdas = db.prepare('SELECT * FROM pdas WHERE contenido_id = ?').all(contenido_id);
        return NextResponse.json(pdas);
    } catch (error) {
        return NextResponse.json(data.filter(p => String(p.contenido_id) === String(contenido_id)));
    }
}
