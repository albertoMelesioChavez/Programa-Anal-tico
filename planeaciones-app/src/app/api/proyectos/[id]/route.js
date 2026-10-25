import { db as client } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ensureProyectoArteTable } from '@/lib/context-schema';
import { owns, requireSameOrigin, requireUser } from '@/lib/auth';

async function initDB() {
    await ensureProyectoArteTable();
}

export async function GET(request, { params }) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    try {
        await initDB();
        const result = await client.execute({
            sql: "SELECT * FROM proyectos WHERE id = ? AND docente_id = ?",
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
        if (!await owns('proyectos', id, auth.user.id)) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        const data = await request.json();
        const { titulo, tematica, introduccion, productos, vinculacion, configuracion, programa_analitico_id } = data;
        const { ensureProgramasAnaliticosTable } = await import('@/lib/context-schema');
        await ensureProgramasAnaliticosTable();
        if (programa_analitico_id && !await owns('programas_analiticos', programa_analitico_id, auth.user.id)) return NextResponse.json({ error: 'Programa no encontrado.' }, { status: 404 });

        await client.execute({
            sql: `UPDATE proyectos 
                  SET titulo = ?, tematica = ?, introduccion = ?, productos = ?, vinculacion = ?, configuracion = ?, programa_analitico_id = ?
                  WHERE id = ? AND docente_id = ?`,
            args: [
                titulo, 
                tematica, 
                introduccion, 
                JSON.stringify(productos || []), 
                JSON.stringify(vinculacion || []),
                JSON.stringify(configuracion || {}),
                programa_analitico_id?.toString() || null,
                id, auth.user.id
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    try {
        await initDB();
        const result = await client.execute({
            sql: "DELETE FROM proyectos WHERE id = ? AND docente_id = ?",
            args: [id, auth.user.id]
        });
        if (result.rowsAffected === 0) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
