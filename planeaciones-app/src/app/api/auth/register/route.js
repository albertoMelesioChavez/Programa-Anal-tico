import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, createSession, ensureAuthTables, hashPassword, normalizeEmail, requireSameOrigin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    try {
        const { nombre, email, password } = await request.json();
        const name = String(nombre || '').trim();
        const normalized = normalizeEmail(email);
        if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254 || typeof password !== 'string' || password.length < 12 || password.length > 128) {
            return NextResponse.json({ error: 'Escribe tu nombre, un correo válido y una contraseña de 12 a 128 caracteres.' }, { status: 400 });
        }
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        if (!await checkRateLimit(`register:${ip}`, 5)) return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos.' }, { status: 429 });
        await ensureAuthTables();
        const id = randomUUID();
        await db.execute({ sql: 'INSERT INTO docentes (id, nombre, email, password_hash) VALUES (?, ?, ?, ?)', args: [id, name, normalized, await hashPassword(password)] });
        return createSession(NextResponse.json({ user: { id, nombre: name, email: normalized } }, { status: 201 }), id);
    } catch (error) {
        if (/UNIQUE|unique/i.test(error.message)) return NextResponse.json({ error: 'Este correo ya tiene una cuenta.' }, { status: 409 });
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'No se pudo crear la cuenta.' }, { status: 500 });
    }
}
