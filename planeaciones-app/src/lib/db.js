import path from 'path';
import fs from 'fs';

let db = null;

export function getDb() {
    if (!db) {
        try {
            const Database = require('better-sqlite3');
            const dbPath = path.join(process.cwd(), 'database', 'app.db');
            
            if (fs.existsSync(dbPath)) {
                db = new Database(dbPath, { readonly: true });
            } else {
                console.warn("DB file not found, using null db");
                return null;
            }
        } catch (e) {
            console.warn("better-sqlite3 could not be loaded, using fallback");
            return null;
        }
    }
    return db;
}
