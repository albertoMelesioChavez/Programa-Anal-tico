import { db } from '@/lib/db';

export async function ensurePlaneacionContextColumns() {
    const tableInfo = await db.execute("PRAGMA table_info('planeaciones')");
    const columns = new Set(tableInfo.rows.map((row) => String(row.name)));

    const additions = [
        ['evidencias', 'TEXT'],
        ['proyecto_arte_id', 'TEXT'],
        ['programa_analitico_id', 'TEXT'],
        ['valor_mensual', 'TEXT'],
        ['pda_por_grado', 'TEXT'],
        ['evaluacion_por_grado', 'TEXT'],
        ['recursos_por_grado', 'TEXT'],
        ['evidencias_por_grado', 'TEXT'],
        ['grupo', 'TEXT'],
        ['fecha_clase', 'TEXT'],
        ['numero_sesion', 'INTEGER'],
        ['duracion_minutos', 'INTEGER'],
        ['proposito', 'TEXT'],
        ['criterios', 'TEXT'],
        ['ajustes', 'TEXT'],
        ['observaciones', 'TEXT'],
        ['estado', "TEXT DEFAULT 'borrador'"],
        ['origen_borrador', 'TEXT'],
        ['orden', 'INTEGER DEFAULT 0'],
        ['docente_id', 'TEXT']
    ];

    for (const [name, definition] of additions) {
        if (!columns.has(name)) {
            await db.execute(`ALTER TABLE planeaciones ADD COLUMN ${name} ${definition}`);
        }
    }
    await db.execute('CREATE INDEX IF NOT EXISTS planeaciones_docente_idx ON planeaciones(docente_id)');
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
    await ensureColumn('proyectos', 'programa_analitico_id', 'TEXT');
    await ensureColumn('proyectos', 'docente_id', 'TEXT');
    await db.execute('CREATE INDEX IF NOT EXISTS proyectos_docente_idx ON proyectos(docente_id)');
}

export async function ensureProgramasAnaliticosTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS programas_analiticos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL,
            orden INTEGER DEFAULT 0,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await ensureColumn('programas_analiticos', 'docente_id', 'TEXT');
    await db.execute('CREATE INDEX IF NOT EXISTS programas_docente_idx ON programas_analiticos(docente_id)');
}
