import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const { slug } = await params; 
    
    if (slug !== 'artes' && slug !== 'tablas') {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    let backupContent = null;
    try {
        // Leemos el JSON bajo demanda para no saturar el arranque de la función
        const jsonPath = path.join(process.cwd(), 'src/lib/data/initialDocs.json');
        const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
        backupContent = jsonData[slug];
    } catch (e) {
        console.warn("No se pudo leer initialDocs.json:", e.message);
    }

    try {
        // 1. Intentar asegurar tabla
        await db.execute(`
            CREATE TABLE IF NOT EXISTS documentos_base (
                nombre TEXT PRIMARY KEY,
                contenido TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Intentar leer de la DB
        const result = await db.execute({
            sql: 'SELECT contenido FROM documentos_base WHERE nombre = ?',
            args: [slug]
        });

        if (result.rows.length > 0 && result.rows[0].contenido) {
            return new Response(result.rows[0].contenido, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        // 3. Fallback a inyección
        if (backupContent) {
            try {
                await db.execute({
                    sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido) VALUES (?, ?)',
                    args: [slug, backupContent]
                });
            } catch (dbErr) {
                console.error("Fallo al inyectar backup en Turso:", dbErr.message);
            }
            
            return new Response(backupContent, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

    } catch (error) {
        console.error('Fallo en flujo principal de Documentos:', error.message);
        
        // Fallback final
        if (backupContent) {
            return new Response(backupContent, {
                headers: { 
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'X-Data-Source': 'Emergency-Backup'
                }
            });
        }
    }

    return NextResponse.json({ error: 'Fallo total de carga de datos', details: 'No se pudo conectar a DB ni leer backup.' }, { status: 500 });
}

export async function POST(request, { params }) {
    const { slug } = await params;
    try {
        const { content } = await request.json();
        if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

        await db.execute(`
            CREATE TABLE IF NOT EXISTS documentos_base (
                nombre TEXT PRIMARY KEY,
                contenido TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute({
            sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido, fecha_actualizacion) VALUES (?, ?, CURRENT_TIMESTAMP)',
            args: [slug, content]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al guardar', details: error.message }, { status: 500 });
    }
}
