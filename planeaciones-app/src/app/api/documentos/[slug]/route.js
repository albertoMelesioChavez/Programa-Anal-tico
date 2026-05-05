import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import initialDocs from '@/lib/data/initialDocs.json';

export async function GET(request, { params }) {
    const { slug } = params; 
    
    if (slug !== 'artes' && slug !== 'tablas') {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // El contenido que tenemos en el código fuente (siempre disponible)
    const backupContent = initialDocs[slug];

    try {
        // 1. Intentar asegurar tabla en la DB
        // Nota: Esto puede fallar en Vercel si no hay Turso configurado, 
        // pero lo atrapamos en el catch.
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

        // 3. Si no está en la DB, inyectar desde el backup
        if (backupContent) {
            try {
                await db.execute({
                    sql: 'INSERT OR REPLACE INTO documentos_base (nombre, contenido) VALUES (?, ?)',
                    args: [slug, backupContent]
                });
            } catch (e) {
                console.warn("No se pudo persistir en DB, pero devolvemos backup:", e.message);
            }
            
            return new Response(backupContent, {
                headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
            });
        }

    } catch (error) {
        console.error('Error en DB Turso:', error.message);
        
        // 4. FALLBACK SUPREMO: Si Turso falla (ej. no hay variables de entorno o error de red),
        // devolvemos el contenido estático que está en el bundle.
        if (backupContent) {
            console.log("Sirviendo contenido desde backup local debido a fallo en DB.");
            return new Response(backupContent, {
                headers: { 
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'X-Data-Source': 'Static-Backup'
                }
            });
        }
    }

    return NextResponse.json({ error: 'No hay datos disponibles' }, { status: 404 });
}

export async function POST(request, { params }) {
    const { slug } = params;
    try {
        const { content } = await request.json();
        if (!content) return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 });

        // Intentar guardar en DB
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
        console.error('Error al guardar:', error.message);
        return NextResponse.json({ 
            error: 'No se pudo guardar. Verifica la conexión a Turso.',
            details: error.message 
        }, { status: 500 });
    }
}
