import { writeTransaction } from './transactions.mjs';

const tableFor = { art: 'proyectos', planning: 'planeaciones' };
export function domainError(message, status = 400) { return Object.assign(new Error(message), { status }); }
async function owned(tx, table, id, user) {
    const row = (await tx.execute({ sql: `SELECT * FROM ${table} WHERE id = ? AND docente_id = ?`, args: [String(id), user] })).rows[0];
    if (!row) throw domainError('No se encontró el elemento en tu cuenta.', 404);
    return row;
}
async function duplicate(tx, table, id, user, overrides = {}, appendCopy = true) {
    const row = await owned(tx, table, id, user);
    const columns = (await tx.execute(`PRAGMA table_info('${table}')`)).rows.map(item => item.name).filter(name => !['id', 'created_at', 'fecha_creacion', 'fecha_actualizacion'].includes(name));
    const values = columns.map(name => Object.hasOwn(overrides, name) ? overrides[name] : name === 'titulo' && appendCopy ? `${row[name]} (copia)` : row[name] ?? null);
    const result = await tx.execute({ sql: `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, args: values });
    return String(result.lastInsertRowid);
}

export function organizeWorkspace(client, user, { action, type, id, title, parentId, ids }) {
    const table = tableFor[type];
    if (!table) throw domainError('Tipo de elemento no reconocido.');
    return writeTransaction(client, async tx => {
        if (action === 'duplicate') {
            const newId = await duplicate(tx, table, id, user);
            if (type === 'art') {
                const children = (await tx.execute({ sql: 'SELECT id FROM planeaciones WHERE proyecto_arte_id = ? AND docente_id = ? ORDER BY orden, id', args: [String(id), user] })).rows;
                for (const child of children) await duplicate(tx, 'planeaciones', child.id, user, { proyecto_arte_id: newId }, false);
            }
            return { success: true, id: newId };
        }
        if (action === 'rename') {
            const name = String(title || '').trim();
            if (!name || name.length > 160) throw domainError('Escribe un nombre de 1 a 160 caracteres.');
            await owned(tx, table, id, user);
            await tx.execute({ sql: `UPDATE ${table} SET titulo = ? WHERE id = ? AND docente_id = ?`, args: [name, String(id), user] });
        } else if (action === 'move' && type === 'planning') {
            await owned(tx, table, id, user);
            const parent = parentId ? await owned(tx, 'proyectos', parentId, user) : null;
            await tx.execute({ sql: 'UPDATE planeaciones SET proyecto_arte_id = ?, programa_analitico_id = ? WHERE id = ? AND docente_id = ?', args: [parent ? String(parent.id) : null, parent?.programa_analitico_id ?? null, String(id), user] });
        } else if (action === 'reorder' && Array.isArray(ids)) {
            for (const item of ids) await owned(tx, table, item, user);
            for (let index = 0; index < ids.length; index++) await tx.execute({ sql: `UPDATE ${table} SET orden = ? WHERE id = ? AND docente_id = ?`, args: [index, String(ids[index]), user] });
        } else throw domainError('Acción no reconocida.');
        return { success: true };
    });
}

export function deleteProject(client, user, id) {
    return writeTransaction(client, async tx => {
        await owned(tx, 'proyectos', id, user);
        const detached = await tx.execute({ sql: 'UPDATE planeaciones SET proyecto_arte_id = NULL WHERE proyecto_arte_id = ? AND docente_id = ?', args: [String(id), user] });
        await tx.execute({ sql: 'DELETE FROM proyectos WHERE id = ? AND docente_id = ?', args: [String(id), user] });
        return { success: true, preserved: detached.rowsAffected };
    });
}

export function updateProject(client, user, id, data) {
    return writeTransaction(client, async tx => {
        const previous = await owned(tx, 'proyectos', id, user);
        const program = Object.hasOwn(data, 'programa_analitico_id') ? data.programa_analitico_id || null : previous.programa_analitico_id;
        if (program) await owned(tx, 'programas_analiticos', program, user);
        const title = String(data.titulo ?? previous.titulo).trim();
        if (!title || title.length > 200) throw domainError('Escribe un título de 1 a 200 caracteres.');
        const fields = ['tematica', 'introduccion', 'productos', 'vinculacion', 'configuracion'];
        const values = fields.map(field => Object.hasOwn(data, field)
            ? ['productos', 'vinculacion', 'configuracion'].includes(field) ? JSON.stringify(data[field]) : data[field]
            : previous[field] ?? null);
        await tx.execute({ sql: `UPDATE proyectos SET titulo=?, ${fields.map(field => field + '=?').join(',')}, programa_analitico_id=? WHERE id=? AND docente_id=?`, args: [title, ...values, program ? String(program) : null, String(id), user] });
        await tx.execute({ sql: 'UPDATE planeaciones SET programa_analitico_id=? WHERE proyecto_arte_id=? AND docente_id=?', args: [program ? String(program) : null, String(id), user] });
        return { success: true };
    });
}

export function deleteProgram(client, user, id) {
    return writeTransaction(client, async tx => {
        await owned(tx, 'programas_analiticos', id, user);
        const count = (await tx.execute({ sql: 'SELECT count(*) AS total FROM programas_analiticos WHERE docente_id = ?', args: [user] })).rows[0].total;
        if (Number(count) <= 1) throw domainError('Conserva al menos un programa analítico.');
        await tx.batch(['proyectos', 'planeaciones'].map(table => ({ sql: `UPDATE ${table} SET programa_analitico_id = NULL WHERE programa_analitico_id = ? AND docente_id = ?`, args: [String(id), user] })));
        await tx.execute({ sql: 'DELETE FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), user] });
        return { success: true };
    });
}
