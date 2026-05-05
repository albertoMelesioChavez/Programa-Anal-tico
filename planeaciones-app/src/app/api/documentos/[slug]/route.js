import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import initialDocs from '@/lib/data/initialDocs.json';

export async function GET(request, { params }) {
    const { slug } = params; 
    
    // Solo permitimos 'artes' y 'tablas'
    if (slug !== 'artes' && slug !== 'tablas') {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    try {
        // 1. Asegurar tabla (Indispensable para Turso Cloud nuevo)
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

        // 3. Si hay contenido en la DB, lo devolvemos
        if (result.rows.length > 0 && result.rows[0].contenido) {
            return new Response(result.rows[0].contenido, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        // 4. MIGRACIÓN FORZADA: Si no está en la DB, inyectamos el contenido desde initialDocs.json
        // Este JSON es parte del código fuente, siempre está disponible en Vercel.
        const content = initialDocs[slug];
        
        if (content) {
            console.log(`Migrando documento ${slug} a la base de datos...`);
            await db.execute({
                sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido) VALUES (?, ?)',
                args: [slug, content]
            });

            return new Response(content, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

        return NextResponse.json({ error: 'Contenido base no encontrado en el sistema' }, { status: 404 });

    } catch (error) {
        console.error('Error crítico en API Documentos:', error);
        return NextResponse.json({ 
            error: 'Fallo total en la carga de documentos',
            details: error.message 
        }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { slug } = params;
    try {
        const { content } = await request.json();
        if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

        await db.execute({
            sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido, fecha_actualizacion) VALUES (?, ?, CURRENT_TIMESTAMP)',
            args: [slug, content]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error al guardar documento:', error);
        return NextResponse.json({ error: 'Error al guardar en la base de datos' }, { status: 500 });
    }
}
