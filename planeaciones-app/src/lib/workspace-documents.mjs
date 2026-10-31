const key = user => `workspace-recent:v1:${user}`;
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/[#*_`]/g, '').trim();
export const DOCUMENT_TYPES = { program: 'Programa analítico', project: 'Proyecto de arte', plan: 'Planeación' };

export function workspaceDocuments({ programs = [], projects = [], plans = [] }) {
    return [
        ...projects.map(row => ({ type: 'project', id: String(row.id), title: row.titulo, programId: String(row.programa_analitico_id || ''), groups: (row.configuracion?.grupos || []).map(group => group.id).join(', '), excerpt: plain(row.configuracion?.proposito || row.tematica || row.introduccion), product: row.configuracion?.producto_final || '', count: plans.filter(plan => String(plan.proyecto_arte_id) === String(row.id)).length, href: `/proyectos/${row.id}`, editHref: `/proyectos/${row.id}/editar`, source: row })),
        ...programs.map(row => ({ type: 'program', id: String(row.id), title: row.titulo, programId: String(row.id), groups: '', excerpt: '', count: Number(row.proyectos_count || 0), href: `/contenidos/artes?programa=${row.id}`, editHref: `/contenidos/artes?programa=${row.id}`, source: row })),
        ...plans.map(row => ({ type: 'plan', id: String(row.id), title: row.titulo, programId: String(row.programa_analitico_id || ''), projectId: String(row.proyecto_arte_id || ''), groups: row.grupo || '', excerpt: plain(row.proposito || row.secuencia_inicio), href: `/?planeacion=${row.id}`, editHref: `/?planeacion=${row.id}&editar=1`, source: row })),
    ].map(doc => ({ ...doc, key: `${doc.type}:${doc.id}`, title: doc.title || 'Sin título' }));
}

export function filterDocuments(docs, { type = 'all', query = '', programId = '', unlinked = false } = {}) {
    return docs.filter(doc => (type === 'all' || doc.type === type)
        && (!programId || (programId === 'unlinked' ? !doc.programId : doc.programId === programId))
        && (!unlinked || (doc.type === 'plan' && !doc.projectId))
        && fold([doc.title, doc.groups, doc.excerpt, doc.product].join(' ')).includes(fold(query.trim())));
}

export function readRecent(storage, user) {
    if (!user) return [];
    try {
        const value = JSON.parse(storage.getItem(key(user)));
        return Array.isArray(value) ? value.filter(item => DOCUMENT_TYPES[item.type] && typeof item.id === 'string' && /^\d+$/.test(item.id) && Number.isFinite(item.at)).slice(0, 20) : [];
    } catch { return []; }
}
export function rememberDocument(storage, user, type, id, now = Date.now()) {
    if (!user || !DOCUMENT_TYPES[type] || !/^\d+$/.test(String(id))) return;
    const next = [{ type, id: String(id), at: now }, ...readRecent(storage, user).filter(item => item.type !== type || item.id !== String(id))].slice(0, 20);
    try { storage.setItem(key(user), JSON.stringify(next)); } catch { /* El historial opcional no bloquea el documento. */ }
}
export function recentDocuments(docs, references) {
    return references.map(ref => docs.find(doc => doc.type === ref.type && doc.id === ref.id)).filter(Boolean);
}
