import { createClient } from '@libsql/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [database, email, name] = process.argv.slice(2);
if (!database || !email || !name) throw new Error('Uso: node scripts/local-account.mjs database/app.db correo nombre');
await access(resolve(database));
const db = createClient({ url: pathToFileURL(resolve(database)).href });
try {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Correo inválido.');
    const existing = (await db.execute({ sql: 'SELECT id FROM docentes WHERE email=?', args: [normalized] })).rows[0];
    if (existing) throw new Error('La cuenta ya existe; no se modificó su contraseña.');
    const password = randomBytes(24).toString('base64url');
    const salt = randomBytes(16);
    const hash = `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
    await mkdir('.private', { recursive: true, mode: 0o700 });
    const credentials = resolve('.private/cuenta-local.txt');
    await writeFile(credentials, `Acceso local: http://localhost:3000/acceso\nCorreo: ${normalized}\nContraseña: ${password}\n\nEsta cuenta pertenece únicamente a la base local indicada. No se publica en GitHub.\n`, { flag: 'wx', mode: 0o600 });
    await db.execute({ sql: 'INSERT INTO docentes (id,nombre,email,password_hash) VALUES (?,?,?,?)', args: [randomUUID(), name, normalized, hash] });
    console.log('Cuenta creada. Datos de acceso guardados en', credentials);
} finally { db.close(); }
