import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function POST(request) {
    try {
        const { key, value } = await request.json();
        
        // Asegurar que la tabla existe
        await client.execute(`
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT
            )
        `);

        await client.execute({
            sql: "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)",
            args: [key, value]
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const res = await client.execute("SELECT * FROM configuracion");
        return NextResponse.json(res.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
