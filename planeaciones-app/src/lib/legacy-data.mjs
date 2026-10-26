import { writeTransaction } from './transactions.mjs';

const tables = ['programas_analiticos', 'proyectos', 'planeaciones'];
export async function legacyInventory(client) {
    const existing = new Set((await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(row => row.name));
    const inventory = {};
    for (const table of tables) {
        if (!existing.has(table)) { inventory[table] = []; continue; }
        const columns = new Set((await client.execute(`PRAGMA table_info('${table}')`)).rows.map(row => row.name));
        const condition = columns.has('docente_id') ? " WHERE docente_id IS NULL OR docente_id = ''" : '';
        inventory[table] = (await client.execute(`SELECT id FROM ${table}${condition} ORDER BY id`)).rows.map(row => String(row.id));
    }
    inventory.documentos_base = existing.has('documentos_base') ? (await client.execute('SELECT nombre FROM documentos_base ORDER BY nombre')).rows.map(row => row.nombre) : [];
    return inventory;
}

// Solo se invoca desde una herramienta de administración local; no existe una ruta pública para reclamar datos.
export function assignLegacy(client, email, manifest) {
    return writeTransaction(client, async tx => {
        const user = (await tx.execute({ sql: 'SELECT id FROM docentes WHERE email = ?', args: [String(email).trim().toLowerCase()] })).rows[0];
        if (!user) throw new Error('Primero crea o inicia sesión en la cuenta destinataria.');
        for (const table of tables) {
            if (!Array.isArray(manifest[table])) throw new Error('El plan de recuperación está incompleto.');
            for (const id of manifest[table]) {
                const row = (await tx.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [String(id)] })).rows[0];
                if (!row || (row.docente_id && row.docente_id !== user.id)) throw new Error('Un registro ya no está disponible o pertenece a otra cuenta.');
                for (const [key, parentTable] of [['programa_analitico_id', 'programas_analiticos'], ['proyecto_arte_id', 'proyectos']]) {
                    if (!row[key]) continue;
                    const parent = (await tx.execute({ sql: `SELECT docente_id FROM ${parentTable} WHERE id = ?`, args: [String(row[key])] })).rows[0];
                    if (!parent || (parent.docente_id !== user.id && !manifest[parentTable]?.includes(String(row[key])))) throw new Error('Incluye el documento relacionado en el plan o revisa su propietario.');
                    if (parent.docente_id && parent.docente_id !== user.id) throw new Error('Una relación pertenece a otra cuenta.');
                }
                await tx.execute({ sql: `UPDATE ${table} SET docente_id = ? WHERE id = ?`, args: [user.id, String(id)] });
            }
        }
        for (const name of manifest.documentos_base || []) {
            if (!['artes', 'tablas'].includes(name)) throw new Error('Documento antiguo no reconocido.');
            const source = (await tx.execute({ sql: 'SELECT contenido FROM documentos_base WHERE nombre = ?', args: [name] })).rows[0];
            if (!source?.contenido) throw new Error('No se encontró el contenido antiguo.');
            const current = (await tx.execute({ sql: 'SELECT contenido FROM documentos_docente WHERE docente_id = ? AND nombre = ?', args: [user.id, name] })).rows[0];
            if (current && current.contenido !== source.contenido) throw new Error('La cuenta ya tiene otra edición de ese documento. Consérvala y revisa la recuperación por separado.');
            await tx.execute({ sql: 'INSERT OR IGNORE INTO documentos_docente (docente_id, nombre, contenido) VALUES (?, ?, ?)', args: [user.id, name, source.contenido] });
            if (name === 'artes' && !current) await tx.execute({ sql: 'INSERT INTO programas_analiticos (titulo, contenido, docente_id) VALUES (?, ?, ?)', args: ['Documento de artes recuperado', source.contenido, user.id] });
        }
        await tx.execute({ sql: 'INSERT INTO legacy_assignments (docente_id, manifest) VALUES (?, ?)', args: [user.id, JSON.stringify(manifest)] });
        return { assignedTo: email, counts: Object.fromEntries(Object.entries(manifest).map(([key, ids]) => [key, ids.length])) };
    });
}
