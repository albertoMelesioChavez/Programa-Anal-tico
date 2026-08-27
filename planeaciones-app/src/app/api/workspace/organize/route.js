import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensurePlaneacionContextColumns, ensureProyectoArteTable } from '@/lib/context-schema';

const tableForType = {
    art: 'proyectos',
    planning: 'planeaciones'
};

async function ensureWorkspace() {
    const { ensureTablesExist } = await import('@/lib/db-init');
    await ensureTablesExist();
    await ensureProyectoArteTable();
    await ensurePlaneacionContextColumns();
}

async function getRow(table, id) {
    const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [String(id)] });
    return result.rows[0] || null;
}

async function duplicateRow(table, id, overrides = {}, appendCopy = true) {
    const row = await getRow(table, id);
    if (!row) throw new Error('No se encontró el elemento que deseas duplicar.');
    const info = await db.execute(`PRAGMA table_info('${table}')`);
    const columns = info.rows.map((column) => String(column.name)).filter((name) => name !== 'id');
    const values = columns.map((column) => {
        if (Object.prototype.hasOwnProperty.call(overrides, column)) return overrides[column];
        if (column === 'titulo' && appendCopy) return `${row[column]} (copia)`;
        if (column === 'orden') return Number(row[column] || 0) + 1;
        return row[column] ?? null;
    });
    const placeholders = columns.map(() => '?').join(', ');
    const result = await db.execute({
        sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        args: values
    });
    return String(result.lastInsertRowid);
}

async function duplicatePlanning(id, overrides = {}, appendCopy = true) {
    return duplicateRow('planeaciones', id, overrides, appendCopy);
}

async function duplicateArtProject(id, appendCopy = true) {
    const newArtId = await duplicateRow('proyectos', id, {}, appendCopy);
    const children = await db.execute({ sql: 'SELECT id FROM planeaciones WHERE proyecto_arte_id = ? ORDER BY orden ASC, fecha_creacion ASC', args: [String(id)] });
    for (const child of children.rows) {
        await duplicatePlanning(child.id, { proyecto_arte_id: newArtId }, false);
    }
    return newArtId;
}

async function moveItem(type, id, parentId) {
    if (type === 'planning') {
        const project = await getRow('proyectos', parentId);
        if (!project) throw new Error('El proyecto de arte de destino ya no existe.');
        const order = await db.execute({ sql: 'SELECT COALESCE(MAX(orden), -1) + 1 AS next_order FROM planeaciones WHERE proyecto_arte_id = ?', args: [String(parentId)] });
        await db.execute({
            sql: 'UPDATE planeaciones SET proyecto_arte_id = ?, orden = ? WHERE id = ?',
            args: [String(parentId), Number(order.rows[0]?.next_order || 0), String(id)]
        });
        return;
    }
    throw new Error('Solo las planeaciones se pueden mover entre proyectos.');
}

async function reorder(type, ids) {
    const table = tableForType[type];
    if (!table) throw new Error('Tipo de elemento no reconocido.');
    for (let index = 0; index < ids.length; index += 1) {
        await db.execute({ sql: `UPDATE ${table} SET orden = ? WHERE id = ?`, args: [index, String(ids[index])] });
    }
}

async function renameItem(type, id, title) {
    const table = tableForType[type];
    if (!table) throw new Error('Tipo de elemento no reconocido.');
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) throw new Error('El nombre no puede quedar vacío.');
    if (normalizedTitle.length > 160) throw new Error('El nombre no puede superar 160 caracteres.');
    const row = await getRow(table, id);
    if (!row) throw new Error('El elemento que deseas renombrar ya no existe.');
    await db.execute({ sql: `UPDATE ${table} SET titulo = ? WHERE id = ?`, args: [normalizedTitle, String(id)] });
}

export async function POST(request) {
    try {
        await ensureWorkspace();
        const body = await request.json();
        const { action, type, id, parentId, ids, title } = body;

        if (action === 'move') await moveItem(type, id, parentId);
        else if (action === 'reorder') await reorder(type, Array.isArray(ids) ? ids : []);
        else if (action === 'rename') await renameItem(type, id, title);
        else if (action === 'duplicate') {
            let newId;
            if (type === 'art') newId = await duplicateArtProject(id);
            else if (type === 'planning') newId = await duplicatePlanning(id);
            else throw new Error('Tipo de elemento no reconocido.');
            return NextResponse.json({ success: true, id: newId });
        } else throw new Error('Acción no reconocida.');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Workspace organize error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
