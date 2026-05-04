import Database from 'better-sqlite3';
import path from 'path';

let db = null;

export function getDb() {
    if (!db) {
        const dbPath = path.resolve(process.cwd(), 'database/app.db');
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
    }
    return db;
}
