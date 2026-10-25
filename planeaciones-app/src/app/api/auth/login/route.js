import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, createSession, ensureAuthTables, normalizeEmail, requireSameOrigin, verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    try {
        const { email, password } = await request.json();
        const normalized = normalizeEmail(email);
        if (!normalized || typeof password !== 'string' || password.length > 128) return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });
        if (!await checkRateLimit(`login:${normalized}`, 8)) return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos.' }, { status: 429 });
        await ensureAuthTables();
        const user = (await db.execute({ sql: 'SELECT id, nombre, email, password_hash FROM docentes WHERE email = ?', args: [normalized] })).rows[0];
        if (!user || !await verifyPassword(password, user.password_hash)) return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });
        return createSession(NextResponse.json({ user: { id: user.id, nombre: user.nombre, email: user.email } }), user.id);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 });
    }
}
