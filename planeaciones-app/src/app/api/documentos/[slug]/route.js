import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireSameOrigin, requireUser } from '@/lib/auth';

export async function GET(request, { params }) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
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
        await db.execute(`
            CREATE TABLE IF NOT EXISTS documentos_docente (
                docente_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                contenido TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (docente_id, nombre)
            )
        `);

        const result = await db.execute({
            sql: 'SELECT contenido FROM documentos_docente WHERE nombre = ? AND docente_id = ?',
            args: [slug, auth.user.id]
        });

        if (result.rows.length > 0 && result.rows[0].contenido) {
            // Las plantillas son valores iniciales; nunca sustituyen una edición guardada.
            return new Response(result.rows[0].contenido, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        if (backupContent) {
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
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { slug } = await params;
    if (slug !== 'artes' && slug !== 'tablas') return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
    try {
        const { content } = await request.json();
        if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

        await db.execute(`
            CREATE TABLE IF NOT EXISTS documentos_docente (
                docente_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                contenido TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (docente_id, nombre)
            )
        `);

        await db.execute({
            sql: 'INSERT INTO documentos_docente (docente_id, nombre, contenido, fecha_actualizacion) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(docente_id, nombre) DO UPDATE SET contenido = excluded.contenido, fecha_actualizacion = CURRENT_TIMESTAMP',
            args: [auth.user.id, slug, content]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al guardar', details: error.message }, { status: 500 });
    }
}
