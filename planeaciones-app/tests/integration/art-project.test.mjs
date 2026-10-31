import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectConfig, createGroup, normalizeProjectConfig } from '../../src/lib/art-project-workflow.js';
import { PROJECT_FIELDS, getProjectField, projectAssistContext, projectFieldPrompt, localProjectField } from '../../src/lib/project-field-assistance.js';

function fixture() {
    const configuracion = createProjectConfig();
    Object.assign(configuracion, { producto_final: 'Mural sobre el cuidado del agua', proyecto_escolar: 'Cuidamos el agua', valor_mensual: 'Responsabilidad', recursos: 'Cartón reutilizado y pinturas al agua', vinculacion_escolar: 'Comunicar acuerdos de cuidado del agua.', conexion_planeaciones: 'Cada experiencia avanza hacia el mural.' });
    configuracion.grupos = [{ ...createGroup('4A'), producto: 'Panel de mensajes del agua', lenguaje_id: '1' }, { ...createGroup('4B'), producto: 'Instalación de gotas', lenguaje_id: '1' }];
    configuracion.criterios_evaluacion[0] = { criterio: 'Comunicación visual', indicadores: 'Explica una decisión de color.', evidencias: 'Boceto y explicación oral' };
    return { titulo: 'Voces del agua', tematica: 'cuidado del agua', introduccion: 'Fundamentación todavía sin guardar.', configuracion, vinculacion: [{ contenido_id: 10, pda_ids: [20] }], docente_id: 'private-owner' };
}

test('las propuestas reciben el formulario completo y el currículo seleccionado, sin datos internos', () => {
    const project = fixture();
    const catalog = { estatales: [{ id: 10, descripcion: 'Contenido del catálogo' }], pdas: [{ id: 20, descripcion: 'PDA elegido' }, { id: 21, descripcion: 'No elegido' }] };
    const context = projectAssistContext(project, catalog);
    assert.equal(context.introduccion, project.introduccion);
    assert.deepEqual(context.configuracion, project.configuracion);
    assert.equal(context.configuracion.grupos.length, 2);
    assert.equal(context.configuracion.ruta.length, 8);
    assert.equal(context.vinculacion[0].contenido, 'Contenido del catálogo');
    assert.deepEqual(context.pdas_seleccionados.map(item => item.id), [20]);
    assert.equal(context.docente_id, undefined);
});

test('la instrucción distingue propósito general de propósito de sesión y conserva el texto actual', () => {
    const general = projectFieldPrompt('config', 'proposito', 'Una intención propia', {});
    const session = projectFieldPrompt('route', 'proposito', 'Un avance propio', { index: 3 });
    assert.match(general, /Propósito general/);
    assert.match(session, /Propósito de la sesión/);
    assert.match(session, /"index":3/);
    assert.match(session, /Un avance propio/);
    assert.match(general, /Una intención propia/);
    assert.equal(getProjectField('config', 'password'), null);
    assert.equal(getProjectField('__proto__', 'toString'), null);
});

test('los borradores locales respetan el grupo y la sesión solicitados', () => {
    const context = projectAssistContext(fixture());
    assert.match(localProjectField('route', 'actividad', context, { index: 3 }), /Experimentar/);
    assert.match(localProjectField('route', 'actividad', context, { index: 6 }), /Preparar la mediación/);
    assert.match(localProjectField('group', 'producto', context, { groupId: '4B' }), /4B/);
    assert.match(localProjectField('evaluation', 'indicadores', context, { index: 0 }), /Comunicación visual/);
    for (const [scope, fields] of Object.entries(PROJECT_FIELDS)) {
        for (const field of Object.keys(fields)) assert.ok(localProjectField(scope, field, context, { index: 0, groupId: '4A' })?.trim(), scope + ':' + field);
    }
});

test('ampliar el esquema conserva rutas, fechas y decisiones de proyectos existentes', () => {
    const previous = { version: 2, ruta: [{ titulo: 'Mi etapa', actividad: 'Mi actividad', recursos: 'Mis materiales' }], grupos: [{ id: '4A', producto: 'Mi producto', fechas: ['2026-11-02'] }], evento: { nombre: 'Mi muestra' } };
    const normalized = normalizeProjectConfig(previous);
    assert.equal(normalized.ruta.length, 1);
    assert.equal(normalized.ruta[0].actividad, 'Mi actividad');
    assert.equal(normalized.ruta[0].recursos, 'Mis materiales');
    assert.deepEqual(normalized.grupos[0].fechas, ['2026-11-02']);
    assert.equal(normalized.evento.nombre, 'Mi muestra');
    assert.equal(normalized.criterios_evaluacion.length, 4);
    assert.equal(normalized.producto_final, '');
});

test('API local: sesión, propuestas, guardar, reabrir y editar sin perder apartados', async () => {
    assert.equal(process.env.VERIFY_ISOLATED, '1', 'Usa npm run verify: se necesita una base temporal.');
    const origin = process.env.PROJECT_TEST_ORIGIN;
    assert.match(origin, /^http:\/\/localhost:\d+$/);
    const login = await fetch(origin + '/api/auth/demo', { method: 'POST', headers: { Origin: origin } });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const request = (path, method = 'GET', body) => fetch(origin + path, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    let createdId;
    try {
        const project = fixture();
        const catalog = await (await request('/api/contenidos')).json();
        const pda = catalog.pdas.find(item => Number(item.grado_id) === 4);
        assert.ok(pda);
        project.vinculacion = [{ contenido_id: pda.contenido_estatal_id, pda_ids: [pda.id] }];
        project.configuracion.grupos = [{ ...createGroup('4A'), producto: 'Panel de mensajes del agua', lenguaje_id: String(pda.lenguaje_id) }];
        const ai = await request('/api/ai', 'POST', { task: 'project-field', scope: 'config', field: 'proposito', context: projectAssistContext(project), target: {} });
        assert.equal(ai.status, 200);
        const proposal = await ai.json();
        assert.ok(proposal.text.trim());
        assert.equal(proposal.mode, 'local-template');
        const invalid = await request('/api/ai', 'POST', { task: 'project-field', scope: 'core', field: 'password', context: {} });
        assert.equal(invalid.status, 400);
        const foreignOrigin = await fetch(origin + '/api/ai', { method: 'POST', headers: { Origin: 'https://invalid.example', Cookie: cookie }, body: '{}' });
        assert.equal(foreignOrigin.status, 403);
        const created = await request('/api/proyectos', 'POST', { ...project, titulo: 'Verificación temporal de formulario ' + Date.now() });
        assert.equal(created.status, 200);
        createdId = (await created.json()).id;
        const reopened = await (await request('/api/proyectos/' + createdId)).json();
        assert.deepEqual(reopened.configuracion, project.configuracion);
        const changed = { ...reopened, configuracion: { ...reopened.configuracion, producto_final: 'Mural revisado', evento: { nombre: 'Muestra del agua', fecha: '2026-11-20' } } };
        assert.equal((await request('/api/proyectos/' + createdId, 'PATCH', changed)).status, 200);
        const saved = await (await request('/api/proyectos/' + createdId)).json();
        assert.equal(saved.configuracion.producto_final, 'Mural revisado');
        assert.equal(saved.configuracion.evento.nombre, 'Muestra del agua');
        assert.deepEqual(saved.configuracion.criterios_evaluacion, project.configuracion.criterios_evaluacion);
        assert.equal(saved.configuracion.ruta.length, 8);
        if (proposal.mode === 'local-template') {
            const concurrent = await Promise.all([request('/api/proyectos/' + createdId + '/planeaciones', 'POST', { grupo: '4A' }), request('/api/proyectos/' + createdId + '/planeaciones', 'POST', { grupo: '4A' })]);
            assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]);
            const generated = concurrent.find(response => response.status === 201);
            assert.equal(generated.status, 201, JSON.stringify(await generated.clone().json()));
            assert.equal((await generated.json()).count, 8);
            assert.equal((await request('/api/proyectos/' + createdId + '/planeaciones', 'POST', { grupo: '4A' })).status, 409);
            const plans = await (await request('/api/planeaciones')).json();
            const linked = (Array.isArray(plans) ? plans : plans.planeaciones).filter(plan => String(plan.proyecto_arte_id) === String(createdId));
            assert.equal(linked.length, 8);
            assert.ok(linked.every(plan => plan.valor_mensual === 'Responsabilidad'));
            assert.match(linked[0].evaluacion, /Comunicación visual/);
        }
    } finally {
        if (createdId) {
            const plans = await (await request('/api/proyectos/' + createdId + '/planeaciones')).json();
            for (const plan of Array.isArray(plans) ? plans : []) assert.equal((await request('/api/planeaciones/' + plan.id, 'DELETE')).status, 200);
            assert.equal((await request('/api/proyectos/' + createdId, 'DELETE')).status, 200);
        }
        await request('/api/auth/logout', 'POST');
    }
});
