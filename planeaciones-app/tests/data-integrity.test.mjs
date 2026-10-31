import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { mkdtemp, rm, readFile, stat, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { scryptSync } from 'node:crypto';
import { tmpdir } from 'node:os';
import { migrate } from '../src/lib/migrations.mjs';
import { organizeWorkspace, deleteProject, deleteProgram, updateProject } from '../src/lib/workspace-operations.mjs';
import { legacyInventory, assignLegacy } from '../src/lib/legacy-data.mjs';

async function database(t) {
    const dir = await mkdtemp(tmpdir() + '/integrity-');
    const client = createClient({ url: 'file:' + dir + '/db.sqlite' });
    t.after(async () => { client.close(); await rm(dir, { recursive: true, force: true }); });
    return client;
}

test('dos conexiones independientes pueden migrar la misma base sin perder datos', async t => {
    const dir = await mkdtemp(tmpdir() + '/parallel-migration-');
    const clients = [createClient({ url: 'file:' + dir + '/db.sqlite' }), createClient({ url: 'file:' + dir + '/db.sqlite' })];
    t.after(async () => { clients.forEach(client => client.close()); await rm(dir, { recursive: true, force: true }); });
    await Promise.all(clients.map(client => migrate(client)));
    assert.equal((await clients[0].execute('SELECT count(*) AS n FROM schema_migrations')).rows[0].n, 2);
});

test('cambiar el programa actualiza las sesiones de forma atómica sin perder sus decisiones', async t => {
    const db = await database(t); await fixture(db);
    await assert.rejects(updateProject(db, 'b', 1, { programa_analitico_id: 2 }), error => error.status === 404);
    await db.execute("CREATE TRIGGER fail_update BEFORE UPDATE ON planeaciones BEGIN SELECT RAISE(ABORT,'fallo simulado'); END");
    await assert.rejects(updateProject(db, 'a', 1, { programa_analitico_id: 2 }), /fallo simulado/);
    assert.equal((await db.execute('SELECT programa_analitico_id FROM proyectos')).rows[0].programa_analitico_id, '1');
    await db.execute('DROP TRIGGER fail_update');
    await updateProject(db, 'a', 1, { programa_analitico_id: 2 });
    const plan = (await db.execute('SELECT * FROM planeaciones')).rows[0];
    assert.equal(plan.programa_analitico_id, '2');
    assert.equal(plan.evaluacion_por_grado, '[{"texto":"Observa"}]');
    assert.equal((await db.execute('SELECT configuracion FROM proyectos')).rows[0].configuracion, '{"escuela":"Mi escuela"}');
});
async function fixture(db) {
    await migrate(db);
    await db.batch([
        "INSERT INTO docentes (id,nombre,email,password_hash) VALUES ('a','Ana','ana@test.invalid','unused'),('b','Bea','bea@test.invalid','unused')",
        "INSERT INTO programas_analiticos (id,titulo,contenido,docente_id) VALUES (1,'Programa','Texto propio','a'),(2,'Otro','Segundo','a')",
        "INSERT INTO proyectos (id,titulo,configuracion,docente_id,programa_analitico_id) VALUES (1,'Agua','{\"escuela\":\"Mi escuela\"}','a',1)",
        "INSERT INTO planeaciones (id,titulo,docente_id,proyecto_arte_id,programa_analitico_id,evaluacion_por_grado) VALUES (1,'Mi clase','a',1,1,'[{\"texto\":\"Observa\"}]')",
    ]);
}

test('migrar una base antigua preserva contenido, admite arranques simultáneos y no crea planeaciones ficticias', async t => {
    const db = await database(t);
    await db.batch([
        'CREATE TABLE proyectos (id INTEGER PRIMARY KEY, titulo TEXT, configuracion TEXT)',
        `INSERT INTO proyectos VALUES (8,'Mi proyecto','{"recursos":"Propios"}')`,
    ]);
    await Promise.all([migrate(db), migrate(db), migrate(db)]);
    assert.equal((await db.execute('SELECT configuracion FROM proyectos WHERE id=8')).rows[0].configuracion, '{"recursos":"Propios"}');
    assert.equal((await db.execute('SELECT docente_id FROM proyectos WHERE id=8')).rows[0].docente_id, null);
    assert.equal((await db.execute('SELECT count(*) AS n FROM schema_migrations')).rows[0].n, 2);
    assert.equal((await db.execute('SELECT count(*) AS n FROM planeaciones')).rows[0].n, 0);
});

test('si falla una migración se revierte y puede reintentarse sin marcarla aplicada', async t => {
    const db = await database(t);
    await assert.rejects(migrate(db, { catalogs: { fases: [{ id: 1, nombre: { invalid: true } }] } }));
    assert.equal((await db.execute("SELECT count(*) AS n FROM sqlite_master WHERE name='schema_migrations'")).rows[0].n, 0);
    await migrate(db, { catalogs: { fases: [{ id: 1, nombre: 'Fase 3' }] } });
    await migrate(db, { catalogs: { fases: [{ id: 1, nombre: 'No reemplazar' }] } });
    assert.equal((await db.execute('SELECT nombre FROM fases')).rows[0].nombre, 'Fase 3');
});

test('duplicar un proyecto revierte también la copia padre si falla un hijo', async t => {
    const db = await database(t); await fixture(db);
    await db.execute("CREATE TRIGGER fail_copy BEFORE INSERT ON planeaciones BEGIN SELECT RAISE(ABORT,'fallo simulado'); END");
    await assert.rejects(organizeWorkspace(db, 'a', { action: 'duplicate', type: 'art', id: 1 }), /fallo simulado/);
    assert.equal((await db.execute('SELECT count(*) AS n FROM proyectos')).rows[0].n, 1);
    await db.execute('DROP TRIGGER fail_copy');
    const copy = await organizeWorkspace(db, 'a', { action: 'duplicate', type: 'art', id: 1 });
    assert.equal((await db.execute({ sql: 'SELECT count(*) AS n FROM planeaciones WHERE proyecto_arte_id=?', args: [copy.id] })).rows[0].n, 1);
});

test('eliminar conserva las planeaciones y revierte la desvinculación si falla el borrado', async t => {
    const db = await database(t); await fixture(db);
    await db.execute("CREATE TRIGGER fail_delete BEFORE DELETE ON proyectos BEGIN SELECT RAISE(ABORT,'fallo simulado'); END");
    await assert.rejects(deleteProject(db, 'a', 1), /fallo simulado/);
    assert.equal((await db.execute('SELECT proyecto_arte_id FROM planeaciones')).rows[0].proyecto_arte_id, '1');
    await db.execute('DROP TRIGGER fail_delete');
    await assert.rejects(deleteProject(db, 'b', 1), error => error.status === 404);
    assert.equal((await deleteProject(db, 'a', 1)).preserved, 1);
    const plan = (await db.execute('SELECT * FROM planeaciones')).rows[0];
    assert.equal(plan.proyecto_arte_id, null);
    assert.equal(plan.programa_analitico_id, '1');
    assert.equal(plan.evaluacion_por_grado, '[{"texto":"Observa"}]');
});

test('borrar simultáneamente dos programas conserva al menos uno', async t => {
    const db = await database(t); await fixture(db);
    const results = await Promise.allSettled([deleteProgram(db, 'a', 1), deleteProgram(db, 'a', 2)]);
    assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal((await db.execute("SELECT count(*) AS n FROM programas_analiticos WHERE docente_id='a'")).rows[0].n, 1);
});

test('recuperación exige dueño existente, mantiene vínculos y rechaza datos de otras cuentas', async t => {
    const db = await database(t); await fixture(db);
    await db.batch(["UPDATE proyectos SET docente_id=NULL", "UPDATE planeaciones SET docente_id=NULL", "UPDATE programas_analiticos SET docente_id=NULL WHERE id=1", 'CREATE TABLE documentos_base (nombre TEXT PRIMARY KEY, contenido TEXT)', "INSERT INTO documentos_base VALUES ('artes','Texto antiguo sin marcador')"]);
    const manifest = await legacyInventory(db);
    assert.deepEqual(manifest.proyectos, ['1']);
    await assert.rejects(assignLegacy(db, 'no-existe@test.invalid', manifest), /Primero crea/);
    await assignLegacy(db, 'ana@test.invalid', manifest);
    assert.equal((await db.execute('SELECT docente_id FROM proyectos')).rows[0].docente_id, 'a');
    assert.equal((await db.execute('SELECT contenido FROM documentos_base')).rows[0].contenido, 'Texto antiguo sin marcador');
    assert.equal((await db.execute('SELECT contenido FROM documentos_docente')).rows[0].contenido, 'Texto antiguo sin marcador');
    await assert.rejects(assignLegacy(db, 'bea@test.invalid', manifest), /pertenece a otra cuenta/);
});

test('las herramientas locales crean una cuenta privada y respaldan antes de recuperar', async t => {
    const dir = await mkdtemp(tmpdir() + '/recovery-cli-');
    const file = dir + '/db.sqlite';
    const db = createClient({ url: 'file:' + file });
    t.after(async () => { db.close(); await rm(dir, { recursive: true, force: true }); });
    await migrate(db);
    await db.execute("INSERT INTO proyectos (titulo) VALUES ('Texto que conservar')");
    const run = async (script, args) => promisify(execFile)(process.execPath, [fileURLToPath(new URL('../scripts/' + script, import.meta.url)), ...args], { cwd: dir });
    await run('local-account.mjs', [file, 'propietario@test.invalid', 'Docente']);
    const credentialFile = dir + '/.private/cuenta-local.txt';
    const credentials = await readFile(credentialFile, 'utf8');
    const password = credentials.match(/Contraseña: (.+)/)[1];
    const account = (await db.execute('SELECT * FROM docentes')).rows[0];
    const [, salt, hash] = account.password_hash.split(':');
    assert.equal(scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex'), hash);
    assert.equal((await stat(credentialFile)).mode & 0o777, 0o600);
    await assert.rejects(run('local-account.mjs', [file, account.email, 'Otro nombre']), /ya existe/);
    assert.equal(await readFile(credentialFile, 'utf8'), credentials);
    const plan = dir + '/manifest.json';
    await run('legacy-data.mjs', ['inspect', '--database', file, '--plan', plan]);
    await run('legacy-data.mjs', ['assign', '--database', file, '--plan', plan, '--email', account.email]);
    assert.equal((await db.execute('SELECT docente_id FROM proyectos')).rows[0].docente_id, account.id);
    const backups = await readdir(dir + '/backups');
    assert.equal(backups.length, 1);
    const backup = createClient({ url: 'file:' + dir + '/backups/' + backups[0] });
    try {
        const original = (await backup.execute('SELECT * FROM proyectos')).rows[0];
        assert.equal(original.docente_id, null);
        assert.equal(original.titulo, 'Texto que conservar');
    } finally { backup.close(); }
});
