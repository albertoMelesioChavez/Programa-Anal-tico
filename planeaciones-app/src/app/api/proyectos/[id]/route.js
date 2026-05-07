import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const result = await client.execute({
            sql: "SELECT * FROM proyectos WHERE id = ?",
            args: [id]
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
    const { id } = await params;
    try {
        const data = await request.json();
        const { titulo, tematica, introduccion, productos, vinculacion } = data;

        await client.execute({
            sql: `UPDATE proyectos 
                  SET titulo = ?, tematica = ?, introduccion = ?, productos = ?, vinculacion = ?
                  WHERE id = ?`,
            args: [
                titulo, 
                tematica, 
                introduccion, 
                JSON.stringify(productos || []), 
                JSON.stringify(vinculacion || []), 
                id
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    try {
        await client.execute({
            sql: "DELETE FROM proyectos WHERE id = ?",
            args: [id]
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
