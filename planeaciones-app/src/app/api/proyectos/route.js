import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ensureProyectoArteTable } from '@/lib/context-schema';
import { extractTextFromDocument, titleFromFilename } from '@/lib/document-text';

export const runtime = 'nodejs';

// Inicializar tabla si no existe (seguridad extra)
const initDB = async () => {
    await ensureProyectoArteTable();
};

export async function GET() {
    try {
        await initDB();
        const result = await client.execute({
            sql: `SELECT p.*, COUNT(pl.id) as planeaciones_count
                  FROM proyectos p
                  LEFT JOIN planeaciones pl ON CAST(pl.proyecto_arte_id AS TEXT) = CAST(p.id AS TEXT)
                  GROUP BY p.id
                  ORDER BY p.orden ASC, p.created_at DESC`,
            args: []
        });
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
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('archivo');
            if (!(file instanceof File) || file.size === 0) {
                return NextResponse.json({ error: 'Selecciona un archivo válido.' }, { status: 400 });
            }

            const contenido = await extractTextFromDocument(file);
            if (!contenido) {
                return NextResponse.json({ error: 'No se pudo extraer texto del documento.' }, { status: 400 });
            }

            let archivoUrl = null;
            if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blob = await put(`proyecto-arte/${Date.now()}-${file.name}`, file, { access: 'public' });
                archivoUrl = blob.url;
            }

            const titulo = String(formData.get('titulo') || titleFromFilename(file.name, 'Proyecto de arte')).trim();
            const result = await client.execute({
            sql: `INSERT INTO proyectos (titulo, tematica, introduccion, productos, vinculacion, configuracion, nombre_archivo, tipo_archivo, archivo_url)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    titulo,
                    'Proyecto de arte importado desde archivo',
                    contenido,
                    JSON.stringify([]),
                    JSON.stringify([]),
                    JSON.stringify({ origen: 'archivo' }),
                    file.name,
                    file.type || null,
                    archivoUrl
                ]
            });
            const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
            return NextResponse.json({ id, extracted: true });
        }

        const data = await request.json();
        const { titulo, tematica, introduccion, productos, vinculacion, configuracion } = data;

        if (!titulo) {
            return NextResponse.json({ error: 'Escribe un título para el proyecto de arte.' }, { status: 400 });
        }

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
