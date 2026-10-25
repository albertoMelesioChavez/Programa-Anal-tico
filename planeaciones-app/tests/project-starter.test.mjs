import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectConfig, createGroup, normalizeProjectConfig } from '../src/lib/art-project-workflow.js';
import { newProjectConfig, prepareProjectDraft, quickProject, curriculumOptions } from '../src/lib/project-starter.js';

test('una idea completa el proyecto y permite cambiarla conservando los ajustes propios', () => {
    const project = { titulo: '', tematica: '', introduccion: '', vinculacion: [], configuracion: createProjectConfig() };
    project.configuracion.grupos = [createGroup('4A')];
    const result = quickProject(project, 'cuidado del agua', 'teatro', '4');
    assert.match(result.titulo, /Escenas.*agua/);
    assert.match(result.configuracion.producto_final, /Escenas breves/);
    assert.ok(result.configuracion.ruta.every(item => item.actividad));
    assert.equal(result.configuracion.grupos[0].producto, result.configuracion.producto_final);
    assert.equal(result.configuracion.grupos[0].lenguaje_id, '4');
    result.configuracion.ruta[0].actividad = 'Mi observación específica';
    const changed = quickProject(result, 'convivencia', 'teatro', '4');
    assert.match(changed.tematica, /convivencia/);
    assert.match(changed.configuracion.proposito, /convivencia/);
    assert.match(changed.configuracion.ruta[1].actividad, /convivencia/);
    assert.equal(changed.configuracion.ruta[0].actividad, 'Mi observación específica');
    changed.configuracion.proposito = 'Mi propósito propio';
    changed.introduccion = 'Mi fundamento propio';
    const third = quickProject(quickProject(changed, 'identidad', 'teatro', '4'), 'emociones', 'teatro', '4');
    assert.equal(third.configuracion.proposito, 'Mi propósito propio');
    assert.equal(third.introduccion, 'Mi fundamento propio');
    assert.equal(third.configuracion.ruta[0].actividad, 'Mi observación específica');
    assert.equal(project.titulo, '');
});

test('los accesos rápidos de currículo usan solo PDA reales del grado, lenguaje y fase', () => {
    const project = { tematica: 'agua', configuracion: { producto_final: 'Mural del agua' } };
    const group = { grade: 4, lenguaje_id: 3, faseId: 2 };
    const catalog = { estatales: [{ id: 1, fase_id: 2, descripcion: 'Agua' }, { id: 2, fase_id: 1, descripcion: 'Agua' }], pdas: [{ id: 10, grado_id: 4, lenguaje_id: 3, contenido_estatal_id: 1, descripcion: 'Representar el agua' }, { id: 11, grado_id: 3, lenguaje_id: 3, contenido_estatal_id: 1 }, { id: 12, grado_id: 4, lenguaje_id: 1, contenido_estatal_id: 1 }, { id: 13, grado_id: 4, lenguaje_id: 3, contenido_estatal_id: 2 }] };
    assert.deepEqual(curriculumOptions(project, catalog, group).map(item => item.pda.id), [10]);
});

test('los valores iniciales usan la cuenta y el ciclo escolar agosto–julio', () => {
    assert.equal(newProjectConfig({ teacher: 'Ana', date: new Date(2026, 6, 31) }).ciclo, '2025–2026');
    const config = newProjectConfig({ teacher: 'Ana', date: new Date(2026, 7, 1) });
    assert.equal(config.ciclo, '2026–2027');
    assert.equal(config.docente, 'Ana');
    assert.equal(config.duracion_minutos, 50);
    assert.equal(config.grupos.length, 0);
    assert.equal(config.escuela, '');
});

test('el inicio rápido prepara una ruta distinta por sesión sin inventar contexto ni currículo', () => {
    const project = { titulo: 'Memorias', tematica: 'convivencia', introduccion: '', vinculacion: [], configuracion: createProjectConfig() };
    project.configuracion.producto_final = 'Un mural colectivo.';
    project.configuracion.grupos = [createGroup('4A')];
    const result = prepareProjectDraft(project);
    assert.equal(result.configuracion.ruta.length, 8);
    assert.equal(new Set(result.configuracion.ruta.map(stage => stage.actividad)).size, 8);
    assert.ok(result.configuracion.ruta.every(stage => stage.evidencia && stage.criterios && stage.recursos));
    assert.equal(result.configuracion.criterios_evaluacion.filter(item => item.criterio).length, 4);
    assert.match(result.configuracion.proposito, /convivencia/);
    assert.match(result.configuracion.proposito, /Un mural colectivo\./);
    assert.doesNotMatch(result.configuracion.proposito, /\.\./);
    assert.equal(result.configuracion.diagnostico, '');
    assert.equal(result.configuracion.fuentes, '');
    assert.deepEqual(result.vinculacion, []);
    assert.equal(project.configuracion.ruta[0].actividad, '');
});

test('preparar, volver y recuperar conserva las decisiones y fechas del docente', () => {
    const config = createProjectConfig();
    config.producto_final = 'Mural';
    config.ruta[0].actividad = 'Mi actividad';
    config.criterios_evaluacion[0].indicadores = 'Mi indicador';
    config.inclusion = 'Mi apoyo acordado';
    config.grupos = [{ ...createGroup('4B'), producto: 'Mi instalación', fechas: ['2026-11-03'], lenguaje_id: '4' }];
    const project = { titulo: 'Memorias', tematica: 'convivencia', introduccion: 'Mi fundamento', vinculacion: [{ contenido_id: 2, pda_ids: [3] }], configuracion: config };
    const prepared = prepareProjectDraft(project);
    assert.equal(prepared.configuracion.ruta[0].actividad, 'Mi actividad');
    assert.equal(prepared.configuracion.criterios_evaluacion[0].indicadores, 'Mi indicador');
    assert.equal(prepared.configuracion.inclusion, 'Mi apoyo acordado');
    assert.equal(prepared.introduccion, 'Mi fundamento');
    assert.deepEqual(prepared.configuracion.grupos, project.configuracion.grupos);
    assert.deepEqual(prepareProjectDraft(prepared), prepared);
    const restored = JSON.parse(JSON.stringify(prepared));
    assert.deepEqual(normalizeProjectConfig(restored.configuracion), prepared.configuracion);
});
