import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Inicializar tabla si no existe (seguridad extra)
const initDB = async () => {
    await client.execute(`
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
};

export async function GET() {
    try {
        await initDB();
        const result = await client.execute("SELECT * FROM proyectos ORDER BY created_at DESC");
        const proyectos = result.rows.map(row => ({
            ...row,
            productos: row.productos ? JSON.parse(row.productos) : [],
            vinculacion: row.vinculacion ? JSON.parse(row.vinculacion) : [],
            configuracion: row.configuracion ? JSON.parse(row.configuracion) : {}
        }));
        return NextResponse.json(proyectos);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await initDB();
        const data = await request.json();
        const { titulo, tematica, introduccion, productos, vinculacion, configuracion } = data;

        const result = await client.execute({
            sql: `INSERT INTO proyectos (titulo, tematica, introduccion, productos, vinculacion, configuracion) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
                titulo, 
                tematica, 
                introduccion, 
                JSON.stringify(productos || []), 
                JSON.stringify(vinculacion || []), 
                JSON.stringify(configuracion || {})
            ]
        });

        return NextResponse.json({ id: result.lastInsertRowid });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
