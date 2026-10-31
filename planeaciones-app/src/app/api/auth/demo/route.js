import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, ensureAuthTables, hashPassword, requireSameOrigin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_USER_ENABLED !== 'true') {
        return NextResponse.json({ error: 'El usuario de prueba no está habilitado.' }, { status: 404 });
    }
    try {
        await ensureAuthTables();
        const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase() || 'demo@gestion-aula.local';
        let user = (await db.execute({ sql: 'SELECT id, nombre, email FROM docentes WHERE email = ?', args: [email] })).rows[0];
        if (!user) {
            user = { id: randomUUID(), nombre: 'Docente de prueba', email };
            const unusablePassword = await hashPassword(randomUUID() + randomUUID());
            await db.execute({ sql: 'INSERT INTO docentes (id, nombre, email, password_hash) VALUES (?, ?, ?, ?)', args: [user.id, user.nombre, user.email, unusablePassword] });
        }
        return createSession(NextResponse.json({ user }), user.id);
    } catch (error) {
        console.error('Demo login error:', error);
        return NextResponse.json({ error: 'No se pudo abrir el usuario de prueba.' }, { status: 500 });
    }
}
