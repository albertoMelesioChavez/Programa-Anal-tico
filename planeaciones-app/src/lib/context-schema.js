import { db } from '@/lib/db';

export async function ensurePlaneacionContextColumns() {
    const tableInfo = await db.execute("PRAGMA table_info('planeaciones')");
    const columns = new Set(tableInfo.rows.map((row) => String(row.name)));

    const additions = [
        ['evidencias', 'TEXT'],
        ['proyecto_escolar_id', 'TEXT'],
        ['proyecto_arte_id', 'TEXT'],
        ['valor_mensual', 'TEXT'],
        ['pda_por_grado', 'TEXT'],
        ['evaluacion_por_grado', 'TEXT'],
        ['recursos_por_grado', 'TEXT'],
        ['evidencias_por_grado', 'TEXT']
    ];

    for (const [name, definition] of additions) {
        if (!columns.has(name)) {
            await db.execute(`ALTER TABLE planeaciones ADD COLUMN ${name} ${definition}`);
        }
    }
}

async function ensureColumn(tableName, columnName, definition) {
    const tableInfo = await db.execute(`PRAGMA table_info('${tableName}')`);
    const columns = new Set(tableInfo.rows.map((row) => String(row.name)));
    if (!columns.has(columnName)) {
        await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
}

export async function ensureProyectoEscolarTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS proyectos_escolares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            nombre_archivo TEXT,
            tipo_archivo TEXT,
            archivo_url TEXT,
            contenido TEXT NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Conserva el único proyecto escolar que podía existir antes de esta migración.
    const legacy = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'proyecto_escolar'");
    if (legacy.rows.length > 0) {
        const current = await db.execute('SELECT count(*) as count FROM proyectos_escolares');
        if (Number(current.rows[0]?.count || 0) === 0) {
            await db.execute(`
                INSERT INTO proyectos_escolares (titulo, nombre_archivo, tipo_archivo, archivo_url, contenido, fecha_actualizacion)
                SELECT titulo, nombre_archivo, tipo_archivo, archivo_url, contenido, fecha_actualizacion
                FROM proyecto_escolar
                WHERE contenido IS NOT NULL
            `);
        }
    }
}

export async function ensureLegacyProyectoEscolarTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS proyecto_escolar (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            titulo TEXT NOT NULL,
            nombre_archivo TEXT,
            tipo_archivo TEXT,
            archivo_url TEXT,
            contenido TEXT NOT NULL,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export async function ensureProyectoArteTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS proyectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            tematica TEXT,
            introduccion TEXT,
            productos TEXT,
            vinculacion TEXT,
            configuracion TEXT,
            proyecto_escolar_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await ensureColumn('proyectos', 'proyecto_escolar_id', 'TEXT');
    await ensureColumn('proyectos', 'nombre_archivo', 'TEXT');
    await ensureColumn('proyectos', 'tipo_archivo', 'TEXT');
    await ensureColumn('proyectos', 'archivo_url', 'TEXT');
}
