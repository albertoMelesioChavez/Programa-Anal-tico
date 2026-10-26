import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureTablesExist } from '@/lib/db-init';
import fs from 'fs/promises';
import path from 'path';
import { requireSameOrigin, requireUser } from '@/lib/auth';
import { writeTransaction } from '@/lib/transactions.mjs';

async function seed(user) {
    await ensureTablesExist();
    const initial = JSON.parse(await fs.readFile(path.join(process.cwd(), 'src/lib/data/initialDocs.json'), 'utf8'));
    await writeTransaction(db, async tx => {
        const count = (await tx.execute({ sql: 'SELECT count(*) AS total FROM programas_analiticos WHERE docente_id=?', args: [user] })).rows[0].total;
        if (!Number(count)) await tx.execute({ sql: 'INSERT INTO programas_analiticos (titulo,contenido,docente_id) VALUES (?,?,?)', args: ['Programa Analítico de Artes', initial.artes || '# Programa analítico', user] });
    });
}
export async function GET(request) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        await seed(auth.user.id);
        const result = await db.execute({ sql: `SELECT p.id,p.titulo,p.orden,p.fecha_creacion,p.fecha_actualizacion,
            (SELECT count(*) FROM proyectos pr WHERE pr.programa_analitico_id=p.id AND pr.docente_id=p.docente_id) AS proyectos_count
            FROM programas_analiticos p WHERE p.docente_id=? ORDER BY p.orden,p.fecha_creacion`, args: [auth.user.id] });
        return NextResponse.json(result.rows.map(row => ({ ...row, id: String(row.id) })));
    } catch (error) { return NextResponse.json({ error: 'No se pudieron cargar los programas.', details: error.message }, { status: 500 }); }
}
export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        await seed(auth.user.id);
        const { action, titulo, contenido, id, ids } = await request.json();
        const result = await writeTransaction(db, async tx => {
            if (action === 'reorder' && Array.isArray(ids)) {
                for (const item of ids) {
                    const own = await tx.execute({ sql: 'SELECT id FROM programas_analiticos WHERE id=? AND docente_id=?', args: [String(item), auth.user.id] });
                    if (!own.rows.length) throw new Error('Programa no encontrado.');
                }
                for (let index=0; index<ids.length; index++) await tx.execute({ sql: 'UPDATE programas_analiticos SET orden=? WHERE id=? AND docente_id=?', args: [index,String(ids[index]),auth.user.id] });
                return { success: true };
            }
            let name, text;
            if (action === 'create') {
                name = String(titulo ?? 'Nuevo programa analítico').trim();
                text = contenido === undefined ? '<!-- PAGE_START 1 -->\n# Nueva sección\n\nEscribe el contenido aquí.\n<!-- PAGE_END -->' : String(contenido);
            } else if (action === 'duplicate') {
                const row = (await tx.execute({ sql: 'SELECT titulo,contenido FROM programas_analiticos WHERE id=? AND docente_id=?', args: [String(id),auth.user.id] })).rows[0];
                if (!row) throw new Error('Programa no encontrado.');
                name = row.titulo + ' (copia)'; text = row.contenido;
            } else throw new Error('Acción no reconocida.');
            if (!name || name.length>200 || !text.trim() || text.length>500000) throw new Error('Escribe un título de hasta 200 caracteres y un documento no vacío de hasta 500 000 caracteres.');
            const order = (await tx.execute({ sql: 'SELECT COALESCE(MAX(orden),-1)+1 AS next FROM programas_analiticos WHERE docente_id=?', args: [auth.user.id] })).rows[0].next;
            const created = await tx.execute({ sql: 'INSERT INTO programas_analiticos (titulo,contenido,orden,docente_id) VALUES (?,?,?,?)', args: [name,text,order,auth.user.id] });
            return { id: String(created.lastInsertRowid) };
        });
        return NextResponse.json(result, { status: result.id ? 201 : 200 });
    } catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
}
