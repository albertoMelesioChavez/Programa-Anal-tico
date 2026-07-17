import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ensureProyectoArteTable, ensureProyectoEscolarTable } from '@/lib/context-schema';
import { extractTextFromDocument, titleFromFilename } from '@/lib/document-text';

export const runtime = 'nodejs';

// Inicializar tabla si no existe (seguridad extra)
const initDB = async () => {
    await ensureProyectoEscolarTable();
    await ensureProyectoArteTable();
};

export async function GET(request) {
    try {
        await initDB();
        const projectSchoolId = new URL(request.url).searchParams.get('proyecto_escolar_id');
        const result = await client.execute({
            sql: `SELECT p.*, pe.titulo as proyecto_escolar_titulo
                  FROM proyectos p
                  LEFT JOIN proyectos_escolares pe ON p.proyecto_escolar_id = pe.id
                  ${projectSchoolId ? 'WHERE p.proyecto_escolar_id = ?' : ''}
                  ORDER BY p.created_at DESC`,
            args: projectSchoolId ? [projectSchoolId] : []
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
            const proyectoEscolarId = String(formData.get('proyecto_escolar_id') || '').trim();

            if (!proyectoEscolarId) {
                return NextResponse.json({ error: 'Selecciona el proyecto escolar que contendrá este proyecto de arte.' }, { status: 400 });
            }
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
                sql: `INSERT INTO proyectos (titulo, tematica, introduccion, productos, vinculacion, configuracion, proyecto_escolar_id, nombre_archivo, tipo_archivo, archivo_url)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    titulo,
                    'Proyecto de arte importado desde archivo',
                    contenido,
                    JSON.stringify([]),
                    JSON.stringify([]),
                    JSON.stringify({ origen: 'archivo' }),
                    proyectoEscolarId,
                    file.name,
                    file.type || null,
                    archivoUrl
                ]
            });
            const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
            return NextResponse.json({ id, extracted: true });
        }

        const data = await request.json();
        const { titulo, tematica, introduccion, productos, vinculacion, configuracion, proyecto_escolar_id } = data;

        if (!titulo || !proyecto_escolar_id) {
            return NextResponse.json({ error: 'Selecciona un proyecto escolar antes de crear el proyecto de arte.' }, { status: 400 });
        }

        const result = await client.execute({
            sql: `INSERT INTO proyectos (titulo, tematica, introduccion, productos, vinculacion, configuracion, proyecto_escolar_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                titulo, 
                tematica, 
                introduccion, 
                JSON.stringify(productos || []), 
                JSON.stringify(vinculacion || []), 
                JSON.stringify(configuracion || {}),
                String(proyecto_escolar_id)
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
