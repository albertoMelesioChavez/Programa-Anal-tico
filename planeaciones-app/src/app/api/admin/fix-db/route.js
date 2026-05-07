import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await client.execute(`ALTER TABLE planeaciones ADD COLUMN evidencias TEXT`);
    } catch (e) {}

    try {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT
            )
        `);
        return NextResponse.json({ message: "Tablas y columnas actualizadas con éxito." });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
