import { createClient } from '@libsql/client';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { legacyInventory, assignLegacy } from '../src/lib/legacy-data.mjs';
import { migrate } from '../src/lib/migrations.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--database') || !['inspect', 'assign'].includes(args[0])) throw new Error('Uso: node scripts/legacy-data.mjs inspect|assign --database database/app.db --plan /ruta/plan.json [--email correo]');
const path = resolve(option('--database'));
await access(path);
const client = createClient({ url: pathToFileURL(path).href });
try {
    if (args[0] === 'inspect') {
        const manifest = await legacyInventory(client);
        console.log(Object.fromEntries(Object.entries(manifest).map(([key, ids]) => [key, ids.length])));
        if (args.includes('--plan')) await writeFile(resolve(option('--plan')), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    } else {
        if (!args.includes('--plan') || !args.includes('--email')) throw new Error('La asignación requiere un plan revisado y el correo confirmado del propietario.');
        const manifest = JSON.parse(await readFile(resolve(option('--plan')), 'utf8'));
        const backup = resolve(dirname(path), 'backups', `antes-recuperacion-${Date.now()}.db`);
        await mkdir(dirname(backup), { recursive: true });
        await client.execute({ sql: 'VACUUM INTO ?', args: [backup] });
        const names = { catalogs: 'catalogs', nacionales: 'contenidos_nacionales', estatales: 'contenidos_estatales', pdas: 'pdas', orientaciones: 'orientaciones_didacticas', actividades: 'actividades_libro', materiales: 'material_consulta' };
        const data = {};
        for (const [key, file] of Object.entries(names)) data[key] = JSON.parse(await readFile(new URL(`../src/lib/data/${file}.json`, import.meta.url), 'utf8'));
        await migrate(client, data);
        console.log(await assignLegacy(client, option('--email'), manifest));
        console.log('Respaldo:', backup);
    }
} finally { client.close(); }
