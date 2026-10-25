import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'docente_session';
export const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
export const OAUTH_COOKIE_OPTIONS = { ...COOKIE_OPTIONS, maxAge: 60 * 10 };

export async function ensureAuthTables() {
    await db.execute('CREATE TABLE IF NOT EXISTS docentes (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    const columns = new Set((await db.execute("PRAGMA table_info('docentes')")).rows.map(row => String(row.name)));
    if (!columns.has('google_sub')) {
        try { await db.execute('ALTER TABLE docentes ADD COLUMN google_sub TEXT'); }
        catch (error) { if (!/duplicate column/i.test(error.message)) throw error; }
    }
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS docentes_google_sub_idx ON docentes(google_sub)');
    await db.execute('CREATE TABLE IF NOT EXISTS sesiones_docente (token_hash TEXT PRIMARY KEY, docente_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await db.execute('CREATE INDEX IF NOT EXISTS sesiones_docente_docente_idx ON sesiones_docente(docente_id)');
    await db.execute('CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL)');
}

export function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

export function appOrigin(request) {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    const protocol = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    return `${protocol}://${host}`;
}

export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(password, Buffer.from(salt, 'hex'), 64);
    return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
    const [algorithm, salt, hash] = String(stored || '').split(':');
    if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
    const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64);
    return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }

export async function createSession(response, docenteId) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    await db.execute({ sql: 'INSERT INTO sesiones_docente (token_hash, docente_id, expires_at) VALUES (?, ?, ?)', args: [tokenHash(token), docenteId, expiresAt] });
    response.cookies.set(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_SECONDS });
    return response;
}

export async function deleteSession(request, response) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) await db.execute({ sql: 'DELETE FROM sesiones_docente WHERE token_hash = ?', args: [tokenHash(token)] });
    response.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
    return response;
}

export async function currentUser(request) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    await ensureAuthTables();
    const result = await db.execute({
        sql: 'SELECT d.id, d.nombre, d.email FROM sesiones_docente s JOIN docentes d ON d.id = s.docente_id WHERE s.token_hash = ? AND s.expires_at > ?',
        args: [tokenHash(token), Math.floor(Date.now() / 1000)]
    });
    return result.rows[0] || null;
}

export async function requireUser(request) {
    const user = await currentUser(request);
    return user ? { user } : { error: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }) };
}

export function sameOrigin(request) {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    try { return new URL(origin).host === request.headers.get('host'); } catch { return false; }
}

export function requireSameOrigin(request) {
    return sameOrigin(request) ? null : NextResponse.json({ error: 'Origen de solicitud no permitido.' }, { status: 403 });
}

export async function checkRateLimit(key, maxAttempts = 8) {
    await ensureAuthTables();
    const now = Math.floor(Date.now() / 1000);
    const row = (await db.execute({ sql: 'SELECT attempts, window_start FROM auth_attempts WHERE key = ?', args: [key] })).rows[0];
    if (row && now - Number(row.window_start) < 900 && Number(row.attempts) >= maxAttempts) return false;
    if (!row || now - Number(row.window_start) >= 900) {
        await db.execute({ sql: 'INSERT INTO auth_attempts (key, attempts, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = 1, window_start = excluded.window_start', args: [key, now] });
    } else {
        await db.execute({ sql: 'UPDATE auth_attempts SET attempts = attempts + 1 WHERE key = ?', args: [key] });
    }
    return true;
}

export async function owns(table, id, docenteId) {
    if (!id) return true;
    if (!['proyectos', 'planeaciones', 'programas_analiticos'].includes(table)) return false;
    const result = await db.execute({ sql: `SELECT 1 FROM ${table} WHERE id = ? AND docente_id = ?`, args: [String(id), docenteId] });
    return !!result.rows[0];
}
