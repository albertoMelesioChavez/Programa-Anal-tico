import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { ensureProyectoEscolarTable } from '@/lib/context-schema';
import { extractTextFromDocument, titleFromFilename } from '@/lib/document-text';

export const runtime = 'nodejs';

function serializeRow(row) {
    if (!row) return null;
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value])
    );
}

async function saveProyecto({ id, titulo, contenido, nombreArchivo = null, tipoArchivo = null, archivoUrl = null }) {
    let projectId = id ? String(id) : null;

    if (projectId) {
        await db.execute({
            sql: `UPDATE proyectos_escolares SET
                    titulo = ?, contenido = ?,
                    nombre_archivo = COALESCE(?, nombre_archivo),
                    tipo_archivo = COALESCE(?, tipo_archivo),
                    archivo_url = COALESCE(?, archivo_url),
                    fecha_actualizacion = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [titulo, contenido, nombreArchivo, tipoArchivo, archivoUrl, projectId]
        });
    } else {
        const result = await db.execute({
            sql: `INSERT INTO proyectos_escolares (titulo, nombre_archivo, tipo_archivo, archivo_url, contenido)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [titulo, nombreArchivo, tipoArchivo, archivoUrl, contenido]
        });
        projectId = String(result.lastInsertRowid);
    }

    const result = await db.execute({ sql: 'SELECT * FROM proyectos_escolares WHERE id = ?', args: [projectId] });
    return serializeRow(result.rows[0]);
}

export async function GET(request) {
    try {
        await ensureProyectoEscolarTable();
        const id = new URL(request.url).searchParams.get('id');
        if (id) {
            const result = await db.execute({ sql: 'SELECT * FROM proyectos_escolares WHERE id = ?', args: [id] });
            return NextResponse.json({ proyecto: serializeRow(result.rows[0]) });
        }
        const result = await db.execute('SELECT * FROM proyectos_escolares ORDER BY fecha_actualizacion DESC');
        return NextResponse.json({ proyectos: result.rows.map(serializeRow) });
    } catch (error) {
        console.error('Proyecto escolar GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await ensureProyectoEscolarTable();
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('archivo');
            const id = formData.get('id');
            const titulo = String(formData.get('titulo') || titleFromFilename(file?.name, 'Proyecto escolar')).trim();

            if (!(file instanceof File) || file.size === 0) {
                return NextResponse.json({ error: 'Selecciona un archivo válido.' }, { status: 400 });
            }

            const contenido = await extractTextFromDocument(file);
            if (!contenido) {
                return NextResponse.json({ error: 'No se pudo extraer texto del documento.' }, { status: 400 });
            }

            let archivoUrl = null;
            if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blob = await put(`proyecto-escolar/${Date.now()}-${file.name}`, file, { access: 'public' });
                archivoUrl = blob.url;
            }

            const proyecto = await saveProyecto({
                id,
                titulo,
                contenido,
                nombreArchivo: file.name,
                tipoArchivo: file.type || null,
                archivoUrl
            });
            return NextResponse.json({ proyecto, extracted: true });
        }

        const body = await request.json();
        const id = body.id;
        const titulo = String(body.titulo || 'Proyecto escolar').trim();
        const contenido = String(body.contenido || '').trim();
        if (!contenido) {
            return NextResponse.json({ error: 'El contexto del proyecto escolar no puede quedar vacío.' }, { status: 400 });
        }

        const proyecto = await saveProyecto({ id, titulo, contenido });
        return NextResponse.json({ proyecto });
    } catch (error) {
        console.error('Proyecto escolar POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
