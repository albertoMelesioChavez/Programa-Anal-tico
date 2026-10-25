import test from 'node:test';
import assert from 'node:assert/strict';

const origin = process.env.PROJECT_TEST_ORIGIN;
assert.equal(process.env.VERIFY_ISOLATED, '1', 'Usa npm run verify: se necesita una base temporal.');
assert.match(origin, /^http:\/\/localhost:\d+$/);
const client = (cookie = '') => async (path, method = 'GET', data) => fetch(origin + path, {
    method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
});
const publicRequest = client();
async function json(response, status = 200) {
    assert.equal(response.status, status, await response.clone().text());
    return response.json();
}

test('contrato de aplicación: autenticación, documentos, programas, proyectos y planeaciones', async t => {
    let a, b, cookieA, programId, projectId, planId;
    const password = 'Prueba aislada 2026!';
    await t.test('protege datos privados y rechaza mutaciones de otro origen', async () => {
        for (const path of ['/api/proyectos', '/api/planeaciones', '/api/programas-analiticos', '/api/documentos/artes']) {
            assert.equal((await publicRequest(path)).status, 401, path);
        }
        assert.equal((await fetch(origin + '/api/auth/demo', { method: 'POST', headers: { Origin: 'https://otro.invalid' } })).status, 403);
        assert.equal((await publicRequest('/api/auth/register', 'POST', { nombre: 'A', email: 'incorrecto', password: '123' })).status, 400);
        for (const name of ['ana', 'bea']) {
            const response = await publicRequest('/api/auth/register', 'POST', { nombre: `Docente ${name}`, email: `${name}@verification.invalid`, password });
            await json(response, 201);
            const cookie = response.headers.get('set-cookie').split(';')[0];
            assert.match(cookie, /^docente_session=/);
            if (name === 'ana') { a = client(cookie); cookieA = cookie; } else b = client(cookie);
        }
        const me = await json(await a('/api/auth/me'));
        assert.equal(me.user.email, 'ana@verification.invalid');
        assert.equal((await publicRequest('/api/auth/login', 'POST', { email: 'ana@verification.invalid', password: 'incorrecta' })).status, 401);
        await json(await publicRequest('/api/auth/login', 'POST', { email: 'ana@verification.invalid', password }));
    });

    await t.test('un documento personalizado sobrevive a reabrirlo y no aparece a otro docente', async () => {
        for (const slug of ['artes', 'tablas']) {
            const content = `# Documento propio de Ana\n\n${slug}: contenido que no contiene marcadores de plantilla.`;
            await json(await a('/api/documentos/' + slug, 'POST', { content }));
            for (let read = 0; read < 2; read++) assert.equal(await (await a('/api/documentos/' + slug)).text(), content);
            assert.notEqual(await (await b('/api/documentos/' + slug)).text(), content);
        }
        assert.equal((await a('/api/documentos/desconocido')).status, 404);
        assert.equal((await a('/api/documentos/artes', 'POST', { content: '' })).status, 400);
    });

    await t.test('programas: crear, editar, duplicar, ordenar y conservar el último', async () => {
        const initial = await json(await a('/api/programas-analiticos'));
        assert.equal(initial.length, 1);
        assert.equal((await a(`/api/programas-analiticos/${initial[0].id}`, 'DELETE')).status, 400);
        programId = (await json(await a('/api/programas-analiticos', 'POST', { action: 'create', titulo: 'Programa de prueba' }), 201)).id;
        const path = '/api/programas-analiticos/' + programId;
        await json(await a(path, 'PATCH', { contenido: '# Acuerdos del colectivo', titulo: 'Programa revisado' }));
        const saved = await json(await a(path));
        assert.equal(saved.contenido, '# Acuerdos del colectivo');
        assert.equal(saved.titulo, 'Programa revisado');
        assert.equal((await b(path)).status, 404);
        assert.equal((await b(path, 'DELETE')).status, 404);
        assert.equal((await b(path, 'PATCH', { titulo: 'Intrusión' })).status, 400);
        assert.equal((await json(await a(path))).titulo, 'Programa revisado');
        const copy = await json(await a('/api/programas-analiticos', 'POST', { action: 'duplicate', id: programId }), 201);
        assert.equal((await json(await a('/api/programas-analiticos/' + copy.id))).contenido, saved.contenido);
        await json(await a('/api/programas-analiticos', 'POST', { action: 'reorder', ids: [copy.id, programId, initial[0].id] }));
        assert.equal((await json(await a('/api/programas-analiticos')))[0].id, copy.id);
        await json(await a('/api/programas-analiticos/' + copy.id, 'DELETE'));
    });

    await t.test('catálogos reales, proyecto privado y relación con su programa', async () => {
        const catalog = await json(await a('/api/catalogos'));
        assert.ok(catalog.grados.length >= 6);
        const contents = await json(await a('/api/contenidos'));
        assert.ok(contents.pdas.length > 0);
        const pda = contents.pdas.find(item => Number(item.grado_id) === 4);
        const pdas = await json(await a('/api/pdas?contenido_id=' + pda.contenido_estatal_id));
        assert.ok(pdas.length > 0);
        assert.ok(pdas.every(item => Number(item.contenido_estatal_id) === Number(pda.contenido_estatal_id)));
        projectId = (await json(await a('/api/proyectos', 'POST', { titulo: 'Proyecto privado', tematica: 'Agua', introduccion: 'Contexto propio', configuracion: { escuela: 'Escuela de prueba' }, programa_analitico_id: programId }))).id;
        const path = '/api/proyectos/' + projectId;
        assert.equal((await b(path)).status, 404);
        assert.equal((await b(path, 'PATCH', { titulo: 'Intrusión' })).status, 404);
        assert.equal((await b(path, 'DELETE')).status, 404);
        assert.ok(!(await json(await b('/api/proyectos'))).some(item => String(item.id) === String(projectId)));
        assert.equal((await b('/api/proyectos', 'POST', { titulo: 'Vínculo ajeno', programa_analitico_id: programId })).status, 404);
        assert.equal((await json(await a(path))).titulo, 'Proyecto privado');
    });

    await t.test('planeaciones: guardar, editar, exportar y aislar datos por grado y docente', async () => {
        const body = {
            titulo: 'Clase del agua', fase_id: 4, grado_id: 4, lenguaje_id: 1,
            proyecto_arte_id: projectId, programa_analitico_id: programId,
            grupo: '4A', fecha_clase: '2026-11-02', numero_sesion: 1, duracion_minutos: 50,
            secuencia_inicio: 'Observar', secuencia_desarrollo: 'Crear', secuencia_cierre: 'Compartir',
            evaluacion_por_grado: [{ grado_id: '4', grado_nombre: 'Cuarto', texto: 'Explica sus decisiones' }],
            recursos_por_grado: [{ grado_id: '4', grado_nombre: 'Cuarto', texto: 'Cartón recuperado' }],
            evidencias_por_grado: [{ grado_id: '4', grado_nombre: 'Cuarto', texto: 'Boceto propio' }],
        };
        assert.equal((await a('/api/planeaciones', 'POST', {})).status, 400);
        assert.equal((await b('/api/planeaciones', 'POST', body)).status, 404);
        planId = (await json(await a('/api/planeaciones', 'POST', body), 201)).id;
        const path = '/api/planeaciones/' + planId;
        const edited = { ...body, titulo: 'Clase revisada', observaciones: 'Revisar con el grupo' };
        await json(await a(path, 'PUT', edited));
        const saved = (await json(await a('/api/planeaciones'))).find(item => String(item.id) === String(planId));
        assert.equal(saved.titulo, edited.titulo);
        assert.deepEqual(saved.evaluacion_por_grado, body.evaluacion_por_grado);
        assert.deepEqual(saved.recursos_por_grado, body.recursos_por_grado);
        assert.deepEqual(saved.evidencias_por_grado, body.evidencias_por_grado);
        const exported = await a(path + '/export');
        assert.equal(exported.status, 200);
        assert.match(exported.headers.get('content-disposition'), /attachment/);
        const markdown = await exported.text();
        for (const expected of ['Clase revisada', 'Escuela de prueba', 'Explica sus decisiones', 'Cartón recuperado', 'Boceto propio']) assert.ok(markdown.includes(expected), expected);
        assert.equal((await b(path + '/export')).status, 404);
        assert.equal((await b(path, 'PUT', edited)).status, 404);
        assert.equal((await b(path, 'DELETE')).status, 404);
    });

    await t.test('organizador: duplicar incluye las planeaciones y mover respeta propiedad', async () => {
        const copy = await json(await a('/api/workspace/organize', 'POST', { action: 'duplicate', type: 'art', id: projectId }));
        const children = await json(await a('/api/proyectos/' + copy.id + '/planeaciones'));
        assert.equal(children.length, 1);
        assert.equal(children[0].titulo, 'Clase revisada');
        await json(await a('/api/workspace/organize', 'POST', { action: 'rename', type: 'art', id: copy.id, title: 'Copia revisada' }));
        assert.equal((await json(await a('/api/proyectos/' + copy.id))).titulo, 'Copia revisada');
        assert.equal((await b('/api/workspace/organize', 'POST', { action: 'move', type: 'planning', id: planId, parentId: copy.id })).status, 400);
        await json(await a('/api/workspace/organize', 'POST', { action: 'move', type: 'planning', id: planId, parentId: copy.id }));
        assert.equal((await json(await a('/api/proyectos/' + copy.id + '/planeaciones'))).length, 2);
        for (const child of await json(await a('/api/proyectos/' + copy.id + '/planeaciones'))) await json(await a('/api/planeaciones/' + child.id, 'DELETE'));
        await json(await a('/api/proyectos/' + copy.id, 'DELETE'));
        await json(await a('/api/proyectos/' + projectId, 'DELETE'));
        await json(await a('/api/programas-analiticos/' + programId, 'DELETE'));
    });

    await t.test('importación de texto conserva el contenido', async () => {
        const form = new FormData();
        form.set('archivo', new File(['# Proyecto importado\nTexto escrito por el docente.'], 'proyecto.md', { type: 'text/markdown' }));
        const response = await fetch(origin + '/api/proyectos', { method: 'POST', headers: { Origin: origin, Cookie: cookieA }, body: form });
        const imported = await json(response);
        const saved = await json(await a('/api/proyectos/' + imported.id));
        assert.match(saved.introduccion, /Texto escrito por el docente/);
        await json(await a('/api/proyectos/' + imported.id, 'DELETE'));
    });

    await t.test('servicios deshabilitados son explícitos; cerrar sesión invalida la cookie', async () => {
        for (const path of ['/api/orientaciones?fase_id=4&lenguaje_id=1', '/api/actividades-libro?grado_id=4&lenguaje_id=1', '/api/material-consulta?lenguaje_id=1']) {
            assert.ok(Array.isArray(await json(await a(path))), path);
        }
        const pdf = await publicRequest('/plananalitico/artes');
        assert.equal(pdf.status, 200);
        assert.match(pdf.headers.get('content-type'), /application\/pdf/);
        assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
        assert.equal((await a('/api/config')).status, 410);
        assert.equal((await a('/api/admin/fix-db')).status, 410);
        assert.equal((await a('/api/upload', 'POST', {})).status, 503);
        const google = await fetch(origin + '/api/auth/google', { redirect: 'manual' });
        assert.match(google.headers.get('location'), /google_no_configurado/);
        const callback = await fetch(origin + '/api/auth/google/callback?code=falso&state=falso', { redirect: 'manual' });
        assert.match(callback.headers.get('location'), /error=/);
        await json(await a('/api/auth/logout', 'POST'));
        assert.equal((await a('/api/proyectos')).status, 401);
    });
});
