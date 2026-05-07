import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';

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
        const proyectos = result.rows.map(row => {
            const newRow = {};
            for (const key in row) {
                newRow[key] = typeof row[key] === 'bigint' ? Number(row[key]) : row[key];
            }
            return {
                ...newRow,
                productos: newRow.productos ? JSON.parse(newRow.productos) : [],
                vinculacion: newRow.vinculacion ? JSON.parse(newRow.vinculacion) : [],
                configuracion: newRow.configuracion ? JSON.parse(newRow.configuracion) : {}
            };
        });
        return NextResponse.json(proyectos);
    } catch (error) {
        console.error("Projects Fetch Error:", error);
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

        // Convertir BigInt a Number para evitar error de serialización
        const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
        return NextResponse.json({ id });
    } catch (error) {
        console.error("Project Save Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
