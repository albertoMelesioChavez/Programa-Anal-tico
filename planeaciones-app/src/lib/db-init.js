import { db } from './db';
import fases from '@/lib/data/catalogs.json';
import contenidosNac from '@/lib/data/contenidos_nacionales.json';
import contenidosEst from '@/lib/data/contenidos_estatales.json';
import pdas from '@/lib/data/pdas.json';
import orientaciones from '@/lib/data/orientaciones_didacticas.json';
import actividades from '@/lib/data/actividades_libro.json';
import materiales from '@/lib/data/material_consulta.json';

export async function ensureTablesExist() {
    console.log("Iniciando verificación de integridad de base de datos...");
    
    try {
        // 1. Fases
        await db.execute("CREATE TABLE IF NOT EXISTS fases (id INTEGER PRIMARY KEY, nombre TEXT)");
        const faseCheck = await db.execute("SELECT count(*) as count FROM fases");
        if (faseCheck.rows[0].count === 0) {
            console.log("Inyectando fases...");
            for (const f of fases.fases) {
                await db.execute({ sql: "INSERT INTO fases (id, nombre) VALUES (?, ?)", args: [f.id, f.nombre] });
            }
        }

        // 2. Grados
        await db.execute("CREATE TABLE IF NOT EXISTS grados (id INTEGER PRIMARY KEY, nombre TEXT, fase_id INTEGER)");
        const gradoCheck = await db.execute("SELECT count(*) as count FROM grados");
        if (gradoCheck.rows[0].count === 0) {
            console.log("Inyectando grados...");
            for (const g of fases.grados) {
                await db.execute({ sql: "INSERT INTO grados (id, nombre, fase_id) VALUES (?, ?, ?)", args: [g.id, g.nombre, g.fase_id] });
            }
        }

        // 3. Lenguajes
        await db.execute("CREATE TABLE IF NOT EXISTS lenguajes_artisticos (id INTEGER PRIMARY KEY, nombre TEXT)");
        const lenCheck = await db.execute("SELECT count(*) as count FROM lenguajes_artisticos");
        if (lenCheck.rows[0].count === 0) {
            console.log("Inyectando lenguajes...");
            for (const l of fases.lenguajes) {
                await db.execute({ sql: "INSERT INTO lenguajes_artisticos (id, nombre) VALUES (?, ?)", args: [l.id, l.nombre] });
            }
        }

        // Esta tabla se consulta al abrir el formulario y debe existir en Turso.
        await db.execute("CREATE TABLE IF NOT EXISTS ejes_articuladores (id INTEGER PRIMARY KEY, nombre TEXT, descripcion TEXT)");
        const ejeCheck = await db.execute("SELECT count(*) as count FROM ejes_articuladores");
        if (ejeCheck.rows[0].count === 0) {
            for (const eje of fases.ejes_articuladores) {
                await db.execute({
                    sql: "INSERT INTO ejes_articuladores (id, nombre, descripcion) VALUES (?, ?, ?)",
                    args: [eje.id, eje.nombre, eje.descripcion || '']
                });
            }
        }

        // 4. Contenidos Nacionales
        await db.execute("CREATE TABLE IF NOT EXISTS contenidos_nacionales (id INTEGER PRIMARY KEY, descripcion TEXT, fase_id INTEGER)");
        const cnCheck = await db.execute("SELECT count(*) as count FROM contenidos_nacionales");
        if (cnCheck.rows[0].count === 0) {
            console.log("Inyectando contenidos nacionales...");
            for (const c of contenidosNac) {
                await db.execute({ sql: "INSERT INTO contenidos_nacionales (id, descripcion, fase_id) VALUES (?, ?, ?)", args: [c.id, c.descripcion, c.fase_id] });
            }
        }

        // Las planeaciones hacen JOIN sobre esta tabla en producción.
        await db.execute("CREATE TABLE IF NOT EXISTS contenidos_estatales (id INTEGER PRIMARY KEY, contenido_nacional_id INTEGER, fase_id INTEGER, lenguaje_id INTEGER, descripcion TEXT)");
        const ceCheck = await db.execute("SELECT count(*) as count FROM contenidos_estatales");
        if (ceCheck.rows[0].count === 0) {
            for (const c of contenidosEst) {
                await db.execute({
                    sql: "INSERT INTO contenidos_estatales (id, contenido_nacional_id, fase_id, lenguaje_id, descripcion) VALUES (?, ?, ?, ?, ?)",
                    args: [c.id, c.contenido_nacional_id, c.fase_id, c.lenguaje_id, c.descripcion]
                });
            }
        }

        // 5. PDAs
        await db.execute("CREATE TABLE IF NOT EXISTS pdas (id INTEGER PRIMARY KEY, descripcion TEXT, contenido_estatal_id INTEGER, grado_id INTEGER, lenguaje_id INTEGER, grado_numero INTEGER)");
        const pdaColumns = new Set((await db.execute("PRAGMA table_info('pdas')")).rows.map((row) => String(row.name)));
        for (const [column, type] of [['contenido_estatal_id', 'INTEGER'], ['lenguaje_id', 'INTEGER'], ['grado_numero', 'INTEGER']]) {
            if (!pdaColumns.has(column)) await db.execute(`ALTER TABLE pdas ADD COLUMN ${column} ${type}`);
        }
        const pdaCheck = await db.execute("SELECT count(*) as count FROM pdas");
        if (pdaCheck.rows[0].count === 0) {
            console.log("Inyectando PDAs...");
            for (const p of pdas) {
                await db.execute({
                    sql: "INSERT INTO pdas (id, descripcion, contenido_estatal_id, grado_id, lenguaje_id, grado_numero) VALUES (?, ?, ?, ?, ?, ?)",
                    args: [p.id, p.descripcion, p.contenido_estatal_id, p.grado_id, p.lenguaje_id, p.grado_numero]
                });
            }
        }

        // 6. Planeaciones (Estructura base)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS planeaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT,
                fase_id TEXT,
                grado_id TEXT,
                lenguaje_id TEXT,
                contenido_nacional_id TEXT,
                contenido_estatal_id TEXT,
                pda_id TEXT,
                pda_por_grado TEXT,
                evaluacion_por_grado TEXT,
                recursos_por_grado TEXT,
                evidencias_por_grado TEXT,
                proyecto_escolar_id TEXT,
                proyecto_arte_id TEXT,
                valor_mensual TEXT,
                ejes_articuladores TEXT,
                metodologia TEXT,
                actividades TEXT,
                recursos TEXT,
                evidencias TEXT,
                evaluacion TEXT,
                secuencia_inicio TEXT,
                secuencia_desarrollo TEXT,
                secuencia_cierre TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 8. Inyectar Planeaciones Iniciales si la tabla está vacía
        const planCheck = await db.execute("SELECT count(*) as count FROM planeaciones");
        if (planCheck.rows[0].count === 0) {
            console.log("Migrando planeaciones iniciales desde JSON...");
            const initialPlans = [
                {
                    titulo: "Exploración de Colores y Texturas",
                    fase_id: "3",
                    grado_id: "1",
                    lenguaje_id: "1",
                    contenido_nacional_id: "1",
                    pda_id: "1",
                    metodologia: "Aprendizaje basado en proyectos",
                    actividades: "1. Observar colores en el entorno.\n2. Crear un mural colectivo.",
                    secuencia_inicio: "Presentación del tema con un video.",
                    secuencia_desarrollo: "Pintura con dedos usando colores primarios.",
                    secuencia_cierre: "Exposición de trabajos."
                },
                {
                    titulo: "Ritmos y Sonidos de mi Comunidad",
                    fase_id: "3",
                    grado_id: "2",
                    lenguaje_id: "1",
                    contenido_nacional_id: "2",
                    pda_id: "3",
                    metodologia: "Secuencia didáctica",
                    actividades: "1. Identificar sonidos cotidianos.\n2. Construir instrumentos con material reciclado.",
                    secuencia_inicio: "Juego de adivinar sonidos.",
                    secuencia_desarrollo: "Construcción de maracas.",
                    secuencia_cierre: "Concierto grupal."
                }
            ];

            for (const p of initialPlans) {
                await db.execute({
                    sql: `INSERT INTO planeaciones (
                        titulo, fase_id, grado_id, lenguaje_id, 
                        contenido_nacional_id, pda_id, metodologia, 
                        actividades, secuencia_inicio, secuencia_desarrollo, secuencia_cierre
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [
                        p.titulo, p.fase_id, p.grado_id, p.lenguaje_id, 
                        p.contenido_nacional_id, p.pda_id, p.metodologia, 
                        p.actividades, p.secuencia_inicio, p.secuencia_desarrollo, p.secuencia_cierre
                    ]
                });
            }
        }

        console.log("DB sincronizada correctamente.");
    } catch (error) {
        console.error("Error durante la sincronización de DB:", error.message);
    }
}
