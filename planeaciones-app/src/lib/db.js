import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db = null;

export function getDb() {
    if (!db) {
        // En Vercel, la ruta puede variar. Intentamos resolverla desde la raíz del proyecto.
        const dbPath = path.join(process.cwd(), 'database', 'app.db');
        
        if (!fs.existsSync(dbPath)) {
            console.error(`Database not found at: ${dbPath}`);
            // Intentar una ruta alternativa común en Vercel
            const altPath = path.join(process.cwd(), '..', 'database', 'app.db');
            if (fs.existsSync(altPath)) {
                db = new Database(altPath, { readonly: true });
            } else {
                throw new Error(`Database file not found at ${dbPath} or ${altPath}`);
            }
        } else {
            // Usamos readonly: true para evitar problemas de permisos en Vercel
            db = new Database(dbPath, { readonly: true });
        }
        
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');
    }
    return db;
}
