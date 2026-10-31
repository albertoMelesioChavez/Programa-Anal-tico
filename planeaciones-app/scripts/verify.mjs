import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, rm, readdir, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
const children = new Set();
let directory;
let log;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function launch(command, args, env, stdio = 'inherit') {
    const child = spawn(command, args, { cwd: root, env, stdio });
    children.add(child);
    child.once('exit', () => children.delete(child));
    return child;
}

async function run(command, args, env) {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const child = launch(command, args, env);
    const [code, signal] = await once(child, 'exit');
    if (code !== 0) throw new Error(`${command} terminó con ${code ?? signal}.`);
}

async function stopChildren() {
    await Promise.all([...children].map(async child => {
        const stopped = once(child, 'exit');
        child.kill('SIGTERM');
        const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
        await stopped;
        clearTimeout(timeout);
    }));
}

// Evita aprobar por accidente una suite incompleta, también fuera de CI.
async function assertNoDisabledTests(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
        const file = join(folder, item.name);
        if (item.isDirectory()) await assertNoDisabledTests(file);
        else if (/\.[cm]?[jt]sx?$/.test(item.name)) {
            const source = await readFile(file, 'utf8');
            if (/\b(?:test|it|describe)\.(?:skip|only|fixme)\s*\(|\b(?:skip|todo)\s*:/.test(source)) {
                throw new Error(`Hay una prueba omitida o exclusiva en ${file}.`);
            }
        }
    }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void stopChildren().finally(() => process.exit(130)); });
}

try {
    await assertNoDisabledTests(join(root, 'tests'));
    if (!process.argv.includes('--system')) {
        await run(npm, ['run', 'lint'], process.env);
        await run(npm, ['run', 'test:unit'], process.env);
    }
    directory = await mkdtemp(join(tmpdir(), 'planeaciones-verify-'));
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    const origin = `http://localhost:${port}`;
    const env = {
        ...process.env,
        NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_BUILD_DIR: '.next-verify',
        TURSO_DATABASE_URL: pathToFileURL(join(directory, 'test.db')).href,
        TURSO_AUTH_TOKEN: '', GOOGLE_AI_STUDIO_API_KEY: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
        DEMO_USER_ENABLED: 'true', DEMO_USER_EMAIL: 'demo@verification.invalid',
        NEXT_PUBLIC_APP_URL: origin, PROJECT_TEST_ORIGIN: origin, VERIFY_ISOLATED: '1',
    };
    await run(npm, ['run', 'build'], env);
    await mkdir('test-results', { recursive: true });
    log = createWriteStream('test-results/server.log');
    const server = launch(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], env, ['ignore', 'pipe', 'pipe']);
    server.stdout.pipe(log, { end: false });
    server.stderr.pipe(log, { end: false });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
        if (server.exitCode !== null) throw new Error('El servidor de prueba no arrancó. Consulta test-results/server.log.');
        try { ready = (await fetch(origin + '/acceso', { signal: AbortSignal.timeout(1000) })).ok; } catch {}
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error('Tiempo agotado al arrancar el servidor aislado.');
    // Secuencial: cada prueba controla sus datos y el navegador no compite con la API.
    const integrationFiles = (await readdir('tests/integration')).filter(name => name.endsWith('.test.mjs')).sort().map(name => 'tests/integration/' + name);
    if (!integrationFiles.length) throw new Error('Faltan las pruebas de integración.');
    await run(process.execPath, ['--test', '--test-concurrency=1', ...integrationFiles], env);
    await run(npx, ['playwright', 'test'], env);
    console.log('\nVERIFICACIÓN APROBADA: compilación, API y navegador con base temporal.');
} catch (error) {
    console.error('\nVERIFICACIÓN FALLIDA:', error.message);
    process.exitCode = 1;
} finally {
    await stopChildren();
    if (log) await new Promise(resolve => log.end(resolve));
    if (directory) await rm(directory, { recursive: true, force: true });
}
