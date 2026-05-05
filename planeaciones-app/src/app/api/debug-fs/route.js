import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const rootDir = process.cwd();
    const dbPath = path.join(rootDir, 'database', 'app.db');
    
    let files = [];
    try {
        files = fs.readdirSync(rootDir);
    } catch (e) {
        files = ['Error reading root: ' + e.message];
    }

    let dbExists = fs.existsSync(dbPath);
    let databaseFolder = [];
    try {
        databaseFolder = fs.readdirSync(path.join(rootDir, 'database'));
    } catch (e) {
        databaseFolder = ['Error reading database folder: ' + e.message];
    }

    return NextResponse.json({
        rootDir,
        dbPath,
        dbExists,
        files,
        databaseFolder,
        env: process.env.NODE_ENV,
        arch: process.arch,
        platform: process.platform
    });
}
