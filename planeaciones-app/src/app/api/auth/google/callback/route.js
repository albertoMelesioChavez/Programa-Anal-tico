import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appOrigin, createSession, ensureAuthTables, GOOGLE_STATE_COOKIE, hashPassword, normalizeEmail } from '@/lib/auth';

export const runtime = 'nodejs';
const accessError = (request, code) => NextResponse.redirect(`${appOrigin(request)}/acceso?error=${code}`);

export async function GET(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState) return accessError(request, 'google_estado_invalido');
    try {
        const callback = `${appOrigin(request)}/api/auth/google/callback`;
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: callback, grant_type: 'authorization_code' }) });
        if (!tokenResponse.ok) throw new Error(`Google token response: ${tokenResponse.status}`);
        const tokens = await tokenResponse.json();
        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        if (!profileResponse.ok) throw new Error(`Google profile response: ${profileResponse.status}`);
        const profile = await profileResponse.json();
        const email = normalizeEmail(profile.email);
        if (!profile.email_verified || !email || !profile.sub) return accessError(request, 'google_correo_no_verificado');
        await ensureAuthTables();
        let user = (await db.execute({ sql: 'SELECT id, nombre, email, google_sub FROM docentes WHERE google_sub = ?', args: [String(profile.sub)] })).rows[0];
        if (!user) {
            // Una cuenta creada solo con contraseña no demuestra propiedad del correo.
            const emailOwner = (await db.execute({ sql: 'SELECT id FROM docentes WHERE email = ?', args: [email] })).rows[0];
            if (emailOwner) return accessError(request, 'google_conflicto');
        }
        if (!user) {
            user = { id: randomUUID(), nombre: String(profile.name || email.split('@')[0]).slice(0, 100), email };
            const unusablePassword = await hashPassword(randomUUID() + randomUUID());
            await db.execute({ sql: 'INSERT INTO docentes (id, nombre, email, password_hash, google_sub) VALUES (?, ?, ?, ?, ?)', args: [user.id, user.nombre, user.email, unusablePassword, String(profile.sub)] });
        }
        const response = await createSession(NextResponse.redirect(`${appOrigin(request)}/`), user.id);
        response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/', maxAge: 0 });
        return response;
    } catch (error) {
        console.error('Google login error:', error);
        return accessError(request, 'google_fallo');
    }
}
