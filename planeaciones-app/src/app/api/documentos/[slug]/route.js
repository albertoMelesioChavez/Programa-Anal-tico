import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const { slug } = params; 
    const fileNameMap = {
        'artes': 'contenidos_programa_analitico.md',
        'tablas': 'tablasdecontenidos_programa_analitico.md'
    };
    
    const fileName = fileNameMap[slug];
    if (!fileName) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    try {
        // 1. Asegurar que la tabla existe primero
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

        // 3. Si no está en la DB, leer del archivo físico (fallback de migración)
        // Intentamos en src/lib/data primero, luego en public
        let content = '';
        try {
            const filePath = path.join(process.cwd(), 'src', 'lib', 'data', fileName);
            content = await fs.readFile(filePath, 'utf8');
        } catch (e) {
            const fallbackPath = path.join(process.cwd(), 'public', fileName);
            content = await fs.readFile(fallbackPath, 'utf8');
        }
        
        if (content) {
            // Guardar en la DB para futuras peticiones
            await db.execute({
                sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido) VALUES (?, ?)',
                args: [slug, content]
            });

            return new Response(content, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        return NextResponse.json({ error: 'Contenido no disponible' }, { status: 404 });

    } catch (error) {
        console.error('Error crítico en API Documentos:', error);
        return NextResponse.json({ 
            error: 'Error al cargar el documento',
            details: error.message 
        }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { slug } = params;
    try {
        const { content } = await request.json();

        if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

        // Asegurar tabla
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
        console.error('Error al guardar documento en Turso:', error);
        return NextResponse.json({ error: 'Error al guardar en la base de datos' }, { status: 500 });
    }
}
