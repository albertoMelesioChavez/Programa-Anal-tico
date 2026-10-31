import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceDocuments, filterDocuments, readRecent, rememberDocument, recentDocuments } from '../src/lib/workspace-documents.mjs';

const docs = workspaceDocuments({ projects: [{ id: 1, titulo: 'Voces del océano', programa_analitico_id: 3, configuracion: { grupos: [{ id: '4A' }], producto_final: 'Mural colectivo' } }], programs: [{ id: 3, titulo: 'Programa propio' }], plans: [{ id: 5, titulo: 'Bocetos del agua', grupo: '4A', proyecto_arte_id: 1, programa_analitico_id: 3 }, { id: 6, titulo: 'Clase conservada' }] });
test('biblioteca unifica tipos y conserva rutas, vínculos y búsqueda por grupo sin acentos', () => {
    assert.equal(docs[0].count, 1);
    assert.equal(docs.find(doc => doc.type === 'program').excerpt, '', 'La ficha no inventa un extracto del programa');
    assert.equal(docs[0].editHref, '/proyectos/1/editar');
    assert.equal(filterDocuments(docs, { query: 'oceano' })[0].id, '1');
    assert.equal(filterDocuments(docs, { query: '4a' }).length, 2);
    assert.equal(filterDocuments(docs, { programId: '3' }).length, 3);
    assert.deepEqual(filterDocuments(docs, { type: 'plan', unlinked: true }).map(doc => doc.id), ['6']);
});
test('recientes se aíslan por docente y solo resuelven documentos todavía accesibles', () => {
    const data = new Map(); const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
    rememberDocument(storage, 'ana', 'project', 1, 10);
    rememberDocument(storage, 'ana', 'plan', 5, 20);
    rememberDocument(storage, 'ana', 'project', 1, 30);
    assert.deepEqual(readRecent(storage, 'bea'), []);
    assert.deepEqual(recentDocuments(docs, readRecent(storage, 'ana')).map(doc => doc.key), ['project:1', 'plan:5']);
    assert.deepEqual(recentDocuments(docs.filter(doc => doc.id !== '1'), readRecent(storage, 'ana')).map(doc => doc.key), ['plan:5']);
    assert.ok(![...data.values()][0].includes('Voces'));
});
test('historial dañado o almacenamiento bloqueado no impide abrir documentos', () => {
    assert.deepEqual(readRecent({ getItem: () => '{' }, 'ana'), []);
    const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    assert.doesNotThrow(() => rememberDocument(blocked, 'ana', 'project', 1));
    assert.deepEqual(readRecent(blocked, 'ana'), []);
});
