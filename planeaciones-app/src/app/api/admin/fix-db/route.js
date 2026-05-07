import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function GET() {
    try {
        await client.execute(`ALTER TABLE planeaciones ADD COLUMN evidencias TEXT`);
        return NextResponse.json({ message: "Columna 'evidencias' añadida con éxito." });
    } catch (error) {
        if (error.message.includes("duplicate column name")) {
            return NextResponse.json({ message: "La columna 'evidencias' ya existía." });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
