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

        // 4. Contenidos Nacionales
        await db.execute("CREATE TABLE IF NOT EXISTS contenidos_nacionales (id INTEGER PRIMARY KEY, descripcion TEXT, fase_id INTEGER)");
        const cnCheck = await db.execute("SELECT count(*) as count FROM contenidos_nacionales");
        if (cnCheck.rows[0].count === 0) {
            console.log("Inyectando contenidos nacionales...");
            for (const c of contenidosNac) {
                await db.execute({ sql: "INSERT INTO contenidos_nacionales (id, descripcion, fase_id) VALUES (?, ?, ?)", args: [c.id, c.descripcion, c.fase_id] });
            }
        }

        // 5. PDAs
        await db.execute("CREATE TABLE IF NOT EXISTS pdas (id INTEGER PRIMARY KEY, descripcion TEXT, contenido_id INTEGER, grado_id INTEGER)");
        const pdaCheck = await db.execute("SELECT count(*) as count FROM pdas");
        if (pdaCheck.rows[0].count === 0) {
            console.log("Inyectando PDAs...");
            for (const p of pdas) {
                await db.execute({ sql: "INSERT INTO pdas (id, descripcion, contenido_id, grado_id) VALUES (?, ?, ?, ?)", args: [p.id, p.descripcion, p.contenido_id, p.grado_id] });
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
                ejes_articuladores TEXT,
                metodologia TEXT,
                actividades TEXT,
                recursos TEXT,
                evaluacion TEXT,
                secuencia_inicio TEXT,
                secuencia_desarrollo TEXT,
                secuencia_cierre TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 7. Documentos Base
        await db.execute(`
            CREATE TABLE IF NOT EXISTS documentos_base (
                nombre TEXT PRIMARY KEY,
                contenido TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("DB sincronizada correctamente.");
    } catch (error) {
        console.error("Error durante la sincronización de DB:", error.message);
    }
}
