import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProgramasAnaliticosTable } from '@/lib/context-schema';
import fs from 'fs/promises';
import path from 'path';
import { requireSameOrigin, requireUser } from '@/lib/auth';

async function defaultContent() {
    const jsonPath = path.join(process.cwd(), 'src/lib/data/initialDocs.json');
    const initialDocs = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    return initialDocs.artes || '<!-- PAGE_START 1 -->\n# Programa Analítico de Artes\n<!-- PAGE_END -->';
}

async function ensureSeeded(docenteId) {
    await ensureProgramasAnaliticosTable();
    const current = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM programas_analiticos WHERE docente_id = ?', args: [docenteId] });
    if (Number(current.rows[0]?.count || 0) > 0) return;
    const content = await defaultContent();
    await db.execute({
        sql: 'INSERT INTO programas_analiticos (titulo, contenido, orden, docente_id) VALUES (?, ?, 0, ?)',
        args: ['Programa Analítico de Artes', content, docenteId]
    });
}

export async function GET(request) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        await ensureSeeded(auth.user.id);
        const result = await db.execute({ sql: 'SELECT id, titulo, orden, fecha_creacion, fecha_actualizacion FROM programas_analiticos WHERE docente_id = ? ORDER BY orden ASC, fecha_creacion ASC', args: [auth.user.id] });
        return NextResponse.json(result.rows.map((row) => ({ ...row, id: String(row.id) })));
    } catch (error) {
        return NextResponse.json({ error: 'No se pudieron cargar los programas.', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        await ensureSeeded(auth.user.id);
        const { action, titulo, id, ids } = await request.json();
        if (action === 'create') {
            const name = String(titulo || 'Nuevo programa analítico').trim();
            if (!name) throw new Error('Escribe un nombre para el programa.');
            const order = await db.execute({ sql: 'SELECT COALESCE(MAX(orden), -1) + 1 AS next_order FROM programas_analiticos WHERE docente_id = ?', args: [auth.user.id] });
            const result = await db.execute({ sql: 'INSERT INTO programas_analiticos (titulo, contenido, orden, docente_id) VALUES (?, ?, ?, ?)', args: [name, '<!-- PAGE_START 1 -->\n# Nueva sección\n\nEscribe el contenido aquí.\n<!-- PAGE_END -->', Number(order.rows[0]?.next_order || 0), auth.user.id] });
            return NextResponse.json({ id: String(result.lastInsertRowid) }, { status: 201 });
        }
        if (action === 'duplicate') {
            const source = await db.execute({ sql: 'SELECT titulo, contenido FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), auth.user.id] });
            if (!source.rows[0]) throw new Error('El programa que deseas duplicar ya no existe.');
            const order = await db.execute({ sql: 'SELECT COALESCE(MAX(orden), -1) + 1 AS next_order FROM programas_analiticos WHERE docente_id = ?', args: [auth.user.id] });
            const result = await db.execute({ sql: 'INSERT INTO programas_analiticos (titulo, contenido, orden, docente_id) VALUES (?, ?, ?, ?)', args: [`${source.rows[0].titulo} (copia)`, source.rows[0].contenido, Number(order.rows[0]?.next_order || 0), auth.user.id] });
            return NextResponse.json({ id: String(result.lastInsertRowid) }, { status: 201 });
        }
        if (action === 'reorder' && Array.isArray(ids)) {
            for (let index = 0; index < ids.length; index += 1) await db.execute({ sql: 'UPDATE programas_analiticos SET orden = ? WHERE id = ? AND docente_id = ?', args: [index, String(ids[index]), auth.user.id] });
            return NextResponse.json({ success: true });
        }
        throw new Error('Acción no reconocida.');
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
