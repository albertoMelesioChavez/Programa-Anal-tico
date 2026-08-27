import { db } from '@/lib/db';

export async function ensurePlaneacionContextColumns() {
    const tableInfo = await db.execute("PRAGMA table_info('planeaciones')");
    const columns = new Set(tableInfo.rows.map((row) => String(row.name)));

    const additions = [
        ['evidencias', 'TEXT'],
        ['proyecto_arte_id', 'TEXT'],
        ['valor_mensual', 'TEXT'],
        ['pda_por_grado', 'TEXT'],
        ['evaluacion_por_grado', 'TEXT'],
        ['recursos_por_grado', 'TEXT'],
        ['evidencias_por_grado', 'TEXT'],
        ['orden', 'INTEGER DEFAULT 0']
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await ensureColumn('proyectos', 'nombre_archivo', 'TEXT');
    await ensureColumn('proyectos', 'tipo_archivo', 'TEXT');
    await ensureColumn('proyectos', 'archivo_url', 'TEXT');
    await ensureColumn('proyectos', 'orden', 'INTEGER DEFAULT 0');
}
