import { writeTransaction } from './transactions.mjs';

const schema = {
    docentes: "id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    sesiones_docente: 'token_hash TEXT PRIMARY KEY, docente_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    auth_attempts: 'key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL',
    fases: 'id INTEGER PRIMARY KEY, nombre TEXT',
    grados: 'id INTEGER PRIMARY KEY, nombre TEXT, fase_id INTEGER',
    lenguajes_artisticos: 'id INTEGER PRIMARY KEY, nombre TEXT',
    ejes_articuladores: 'id INTEGER PRIMARY KEY, nombre TEXT, descripcion TEXT',
    contenidos_nacionales: 'id INTEGER PRIMARY KEY, descripcion TEXT, fase_id INTEGER',
    contenidos_estatales: 'id INTEGER PRIMARY KEY, contenido_nacional_id INTEGER, fase_id INTEGER, lenguaje_id INTEGER, descripcion TEXT',
    pdas: 'id INTEGER PRIMARY KEY, descripcion TEXT, grado_id INTEGER',
    proyectos: 'id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, tematica TEXT, introduccion TEXT, productos TEXT, vinculacion TEXT, configuracion TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    programas_analiticos: 'id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, contenido TEXT NOT NULL, orden INTEGER DEFAULT 0, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP',
    planeaciones: `id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, fase_id TEXT, grado_id TEXT, lenguaje_id TEXT,
        contenido_nacional_id TEXT, contenido_estatal_id TEXT, pda_id TEXT, ejes_articuladores TEXT, metodologia TEXT,
        actividades TEXT, recursos TEXT, evaluacion TEXT, secuencia_inicio TEXT, secuencia_desarrollo TEXT, secuencia_cierre TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP`,
    documentos_docente: 'docente_id TEXT NOT NULL, nombre TEXT NOT NULL, contenido TEXT, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (docente_id, nombre)',
    orientaciones_didacticas: 'id INTEGER PRIMARY KEY, fase_id INTEGER, lenguaje_id INTEGER, descripcion TEXT',
    actividades_libro: 'id INTEGER PRIMARY KEY, grado_id INTEGER, lenguaje_id INTEGER, libro TEXT, grado INTEGER, pagina INTEGER, titulo_proyecto TEXT, lenguaje_artistico TEXT, campo_formativo TEXT, ejes_articuladores TEXT, producto TEXT, fase_id INTEGER',
    material_consulta: 'id INTEGER PRIMARY KEY, lenguaje_id INTEGER, lenguaje TEXT, recurso TEXT, url TEXT',
    legacy_assignments: 'id INTEGER PRIMARY KEY AUTOINCREMENT, docente_id TEXT NOT NULL, manifest TEXT NOT NULL, assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP',
};
const additions = {
    docentes: { google_sub: 'TEXT' },
    pdas: { contenido_estatal_id: 'INTEGER', lenguaje_id: 'INTEGER', grado_numero: 'INTEGER' },
    proyectos: { nombre_archivo: 'TEXT', tipo_archivo: 'TEXT', archivo_url: 'TEXT', orden: 'INTEGER DEFAULT 0', programa_analitico_id: 'TEXT', docente_id: 'TEXT' },
    programas_analiticos: { docente_id: 'TEXT' },
    planeaciones: {
        evidencias: 'TEXT', proyecto_arte_id: 'TEXT', programa_analitico_id: 'TEXT', valor_mensual: 'TEXT',
        pda_por_grado: 'TEXT', evaluacion_por_grado: 'TEXT', recursos_por_grado: 'TEXT', evidencias_por_grado: 'TEXT',
        grupo: 'TEXT', fecha_clase: 'TEXT', numero_sesion: 'INTEGER', duracion_minutos: 'INTEGER', proposito: 'TEXT', criterios: 'TEXT',
        ajustes: 'TEXT', observaciones: 'TEXT', estado: "TEXT DEFAULT 'borrador'", origen_borrador: 'TEXT', orden: 'INTEGER DEFAULT 0', docente_id: 'TEXT',
    },
};

async function baseline(tx) {
    await tx.batch(Object.entries(schema).map(([table, columns]) => `CREATE TABLE IF NOT EXISTS ${table} (${columns})`));
    for (const [table, fields] of Object.entries(additions)) {
        const existing = new Set((await tx.execute(`PRAGMA table_info('${table}')`)).rows.map(row => row.name));
        const updates = Object.entries(fields).filter(([name]) => !existing.has(name)).map(([name, type]) => `ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
        if (updates.length) await tx.batch(updates);
    }
    await tx.batch([
        'CREATE UNIQUE INDEX IF NOT EXISTS docentes_google_sub_idx ON docentes(google_sub)',
        'CREATE INDEX IF NOT EXISTS sesiones_docente_docente_idx ON sesiones_docente(docente_id)',
        'CREATE INDEX IF NOT EXISTS proyectos_docente_idx ON proyectos(docente_id)',
        'CREATE INDEX IF NOT EXISTS programas_docente_idx ON programas_analiticos(docente_id)',
        'CREATE INDEX IF NOT EXISTS planeaciones_docente_idx ON planeaciones(docente_id)',
        'CREATE INDEX IF NOT EXISTS planeaciones_proyecto_grupo_idx ON planeaciones(docente_id, proyecto_arte_id, grupo)',
        'CREATE INDEX IF NOT EXISTS proyectos_programa_idx ON proyectos(docente_id, programa_analitico_id)',
    ]);
}
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
async function seed(tx, data) {
    const catalogs = data.catalogs || {};
    const languageId = name => catalogs.lenguajes?.find(item => fold(item.nombre) === fold(name))?.id || null;
    const entries = {
        fases: catalogs.fases || [], grados: catalogs.grados || [], lenguajes_artisticos: catalogs.lenguajes || [],
        ejes_articuladores: catalogs.ejes_articuladores || [], contenidos_nacionales: data.nacionales || [], contenidos_estatales: data.estatales || [], pdas: data.pdas || [],
        orientaciones_didacticas: data.orientaciones || [],
        actividades_libro: (data.actividades || []).map(item => ({ ...item, grado_id: item.grado, lenguaje_id: languageId(item.lenguaje_artistico) })),
        material_consulta: (data.materiales || []).map(item => ({ ...item, lenguaje_id: languageId(item.lenguaje) })),
    };
    for (const [table, rows] of Object.entries(entries)) {
        const columns = new Set((await tx.execute(`PRAGMA table_info('${table}')`)).rows.map(row => row.name));
        const queries = rows.map(row => {
            const keys = Object.keys(row).filter(key => columns.has(key));
            return { sql: `INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, args: keys.map(key => row[key] ?? null) };
        });
        for (let start = 0; start < queries.length; start += 100) await tx.batch(queries.slice(start, start + 100));
    }
}

export async function migrate(client, data = {}) {
    return writeTransaction(client, async tx => {
        await tx.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
        const applied = new Set((await tx.execute('SELECT version FROM schema_migrations')).rows.map(row => Number(row.version)));
        for (const [version, operation] of [[1, baseline], [2, tx => seed(tx, data)]]) {
            if (applied.has(version)) continue;
            await operation(tx);
            await tx.execute({ sql: 'INSERT INTO schema_migrations (version) VALUES (?)', args: [version] });
        }
    });
}
