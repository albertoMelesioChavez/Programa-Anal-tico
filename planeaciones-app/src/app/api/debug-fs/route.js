import fs from 'fs';
import path from 'path';

export async function GET() {
    const rootDir = process.cwd();
    const dbPath = path.join(rootDir, 'database', 'app.db');
    
    let files = [];
    try { files = fs.readdirSync(rootDir); } catch (e) { files = [e.message]; }

    let dbExists = fs.existsSync(dbPath);
    let databaseFolder = [];
    try { databaseFolder = fs.readdirSync(path.join(rootDir, 'database')); } catch (e) { databaseFolder = [e.message]; }

    const report = `
        ROOT: ${rootDir}
        DB PATH: ${dbPath}
        DB EXISTS: ${dbExists}
        ROOT FILES: ${files.join(', ')}
        DB FOLDER: ${databaseFolder.join(', ')}
    `;

    return new Response(report, { headers: { 'Content-Type': 'text/plain' } });
}
