import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const { slug } = params; // slug será 'artes' o 'tablas'
    const fileNameMap = {
        'artes': 'contenidos_programa_analitico.md',
        'tablas': 'tablasdecontenidos_programa_analitico.md'
    };
    
    const fileName = fileNameMap[slug];
    if (!fileName) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    try {
        // Intentar leer de Turso
        const result = await db.execute({
            sql: 'SELECT contenido FROM documentos_base WHERE nombre = ?',
            args: [slug]
        });

        if (result.rows.length > 0) {
            return new Response(result.rows[0].contenido, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        // Si no está en la DB (primera vez), leer el archivo físico y guardarlo en Turso
        const filePath = path.join(process.cwd(), 'public', fileName);
        const content = await fs.readFile(filePath, 'utf8');
        
        try {
            // Intentamos crear la tabla por si no existe
            await db.execute(`
                CREATE TABLE IF NOT EXISTS documentos_base (
                    nombre TEXT PRIMARY KEY,
                    contenido TEXT,
                    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await db.execute({
                sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido) VALUES (?, ?)',
                args: [slug, content]
            });
        } catch (dbErr) {
            console.warn("No se pudo persistir el documento inicial en Turso:", dbErr);
        }

        return new Response(content, {
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
        });

    } catch (error) {
        console.error('Error en API Documentos:', error);
        return NextResponse.json({ error: 'Error al cargar el documento' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { slug } = params;
    const { content } = await request.json();

    if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

    try {
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
