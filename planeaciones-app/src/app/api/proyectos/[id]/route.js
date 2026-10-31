import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ensureProyectoArteTable } from '@/lib/context-schema';
import { requireSameOrigin, requireUser } from '@/lib/auth';
import { deleteProject, updateProject } from '@/lib/workspace-operations.mjs';

async function initDB() {
    await ensureProyectoArteTable();
}

export async function GET(request, { params }) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    try {
        await initDB();
        const result = await client.execute({
            sql: "SELECT p.*, pa.titulo AS programa_titulo FROM proyectos p LEFT JOIN programas_analiticos pa ON pa.id=p.programa_analitico_id AND pa.docente_id=p.docente_id WHERE p.id = ? AND p.docente_id = ?",
            args: [id, auth.user.id]
        });
        
        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        const row = result.rows[0];
        const proyecto = {};
        for (const key in row) {
            proyecto[key] = typeof row[key] === 'bigint' ? Number(row[key]) : row[key];
        }

        return NextResponse.json({
            ...proyecto,
            productos: proyecto.productos ? JSON.parse(proyecto.productos) : { fase3: [], fase4: [], fase5: [] },
            vinculacion: proyecto.vinculacion ? JSON.parse(proyecto.vinculacion) : [],
            configuracion: proyecto.configuracion ? JSON.parse(proyecto.configuracion) : {}
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    try {
        await initDB();
        const data = await request.json();
        return NextResponse.json(await updateProject(client, auth.user.id, id, data));
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
}

export async function DELETE(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    try {
        await initDB();
        return NextResponse.json(await deleteProject(client, auth.user.id, id));
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
}
