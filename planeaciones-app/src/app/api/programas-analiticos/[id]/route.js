import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProgramasAnaliticosTable } from '@/lib/context-schema';
import { requireSameOrigin, requireUser } from '@/lib/auth';

export async function GET(request, { params }) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    const { id } = await params;
    await ensureProgramasAnaliticosTable();
    const result = await db.execute({ sql: 'SELECT * FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), auth.user.id] });
    if (!result.rows[0]) return NextResponse.json({ error: 'Programa no encontrado.' }, { status: 404 });
    return NextResponse.json({ ...result.rows[0], id: String(result.rows[0].id) });
}

export async function PATCH(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        const { titulo, contenido } = await request.json();
        await ensureProgramasAnaliticosTable();
        const current = await db.execute({ sql: 'SELECT * FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), auth.user.id] });
        if (!current.rows[0]) throw new Error('Programa no encontrado.');
        const title = titulo === undefined ? current.rows[0].titulo : String(titulo).trim();
        const content = contenido === undefined ? current.rows[0].contenido : String(contenido);
        if (!title || !content) throw new Error('El programa necesita un nombre y contenido.');
        await db.execute({ sql: 'UPDATE programas_analiticos SET titulo = ?, contenido = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ? AND docente_id = ?', args: [title, content, String(id), auth.user.id] });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        await ensureProgramasAnaliticosTable();
        const current = await db.execute({ sql: 'SELECT id FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), auth.user.id] });
        if (!current.rows[0]) return NextResponse.json({ error: 'Programa no encontrado.' }, { status: 404 });
        const count = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM programas_analiticos WHERE docente_id = ?', args: [auth.user.id] });
        if (Number(count.rows[0]?.count || 0) <= 1) throw new Error('Conserva al menos un programa analítico.');
        await db.execute({ sql: 'UPDATE proyectos SET programa_analitico_id = NULL WHERE programa_analitico_id = ? AND docente_id = ?', args: [String(id), auth.user.id] }).catch(() => {});
        await db.execute({ sql: 'UPDATE planeaciones SET programa_analitico_id = NULL WHERE programa_analitico_id = ? AND docente_id = ?', args: [String(id), auth.user.id] }).catch(() => {});
        await db.execute({ sql: 'DELETE FROM programas_analiticos WHERE id = ? AND docente_id = ?', args: [String(id), auth.user.id] });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
