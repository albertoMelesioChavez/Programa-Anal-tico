'use client';

/* THESIS: retomar trabajo real con una acción inequívoca.
 * OWN-WORLD: superficies claras, azul funcional, iconos lineales y navegación estable.
 * STORY: encontrar un documento, reconocer su contexto y continuar editando.
 * FIRST VIEWPORT: documento destacado a todo el ancho, extracto en papel; biblioteca y ruta debajo.
 * FORM: composición 2 aprobada por el usuario, referencia Google Workspace, sin sorteo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppIcon from './AppIcon';
import { useTeacher } from './AuthGate';
import PlaneacionForm from './PlaneacionForm';
import PlaneacionList from './PlaneacionList';
import { DOCUMENT_TYPES, workspaceDocuments, filterDocuments, readRecent, rememberDocument, recentDocuments } from '@/lib/workspace-documents.mjs';
import styles from './Workspace.module.css';

const icons = { program: 'file', project: 'folder', plan: 'calendar' };
const tabs = { all: 'Todos', program: 'Programas', project: 'Proyectos', plan: 'Planeaciones' };
async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción. Intenta de nuevo.');
    return data;
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function DocumentIcon({ type, large = false }) {
    return <span className={`${styles.documentIcon} ${styles[type]} ${large ? styles.largeIcon : ''}`}><AppIcon name={icons[type]} size={large ? 30 : 22} /></span>;
}
function DocumentMeta({ doc }) {
    return <span className={styles.documentMeta}>{DOCUMENT_TYPES[doc.type]}{doc.groups && <> · {doc.groups}</>}{doc.type === 'project' && <> · {doc.count} planeaciones</>}{doc.type === 'plan' && !doc.projectId && <> · Sin proyecto</>}</span>;
}

export default function Workspace() {
    const user = useTeacher();
    const params = useSearchParams();
    const router = useRouter();
    const [data, setData] = useState({ projects: [], programs: [], plans: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [query, setQuery] = useState('');
    const [programId, setProgramId] = useState('');
    const [selected, setSelected] = useState('');
    const [references, setReferences] = useState([]);
    const [action, setAction] = useState(null);
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [uploading, setUploading] = useState(false);
    const actionRef = useRef(null);
    const uploadRef = useRef(null);
    const contextRef = useRef(null);
    const contextTrigger = useRef(null);
    const type = Object.hasOwn(tabs, params.get('tipo')) ? params.get('tipo') : params.has('conservadas') ? 'plan' : 'all';
    const unlinked = params.has('conservadas') || params.get('sinProyecto') === '1';
    const planningId = params.get('planeacion');
    const createPlan = params.get('nuevo') === 'planeacion';
    const editingPlan = planningId && params.get('editar') === '1';
    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [projects, programs, plans] = await Promise.all([request('/api/proyectos'), request('/api/programas-analiticos'), request('/api/planeaciones')]);
            if (![projects, programs, plans].every(Array.isArray)) throw new Error('Respuesta incompleta.');
            setData({ projects, programs, plans });
        } catch { setError('No pudimos cargar tus documentos. Tu información sigue guardada; vuelve a intentarlo.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { try { setReferences(readRecent(localStorage, user?.id)); } catch { setReferences([]); } }, [user?.id, params]);
    useEffect(() => {
        if (action) { actionRef.current?.querySelector('input, select, button')?.focus(); actionRef.current?.scrollIntoView({ block: 'nearest' }); }
    }, [action]);
    useEffect(() => { if (selected && window.matchMedia('(max-width: 1100px)').matches) contextRef.current?.focus(); }, [selected]);
    function closeContext() { setSelected(''); contextTrigger.current?.focus(); }
    const documents = useMemo(() => workspaceDocuments(data), [data]);
    const recent = useMemo(() => recentDocuments(documents, references), [documents, references]);
    const featured = recent[0] || documents[0];
    const context = documents.find(doc => doc.key === selected) || featured;
    const visible = filterDocuments(documents, { type, query, programId, unlinked });
    const plan = data.plans.find(item => String(item.id) === planningId);
    const contextProject = context?.type === 'project' ? context : documents.find(doc => doc.type === 'project' && doc.id === context?.projectId);
    const linkedProgram = documents.find(doc => doc.type === 'program' && doc.id === context?.programId);
    const linkedPlans = documents.filter(doc => doc.type === 'plan' && doc.projectId === contextProject?.id);

    function remember(doc) {
        try { rememberDocument(localStorage, user?.id, doc.type, doc.id); setReferences(readRecent(localStorage, user?.id)); } catch { /* Historial opcional. */ }
    }
    function changeType(next) { router.push(next === 'all' ? '/' : `/?tipo=${next}`, { scroll: false }); setSelected(''); setAction(null); }
    function beginAction(kind, doc, event) {
        event.currentTarget.closest('details')?.removeAttribute('open');
        setAction({ kind, doc }); setValue(kind === 'rename' ? doc.title : doc.projectId || ''); setActionError('');
    }
    async function applyAction(event) {
        event.preventDefault(); setBusy(true); setActionError('');
        const { kind, doc } = action;
        try {
            if (kind === 'delete') {
                const endpoint = { project: 'proyectos', plan: 'planeaciones', program: 'programas-analiticos' }[doc.type];
                const result = await request(`/api/${endpoint}/${doc.id}`, { method: 'DELETE' });
                setNotice(doc.type === 'project' ? `Proyecto eliminado. Se conservaron ${result.preserved} planeaciones sin proyecto.` : 'Documento eliminado.');
            } else if (doc.type === 'program') {
                await request(kind === 'rename' ? `/api/programas-analiticos/${doc.id}` : '/api/programas-analiticos', json(kind === 'rename' ? 'PATCH' : 'POST', kind === 'rename' ? { titulo: value } : { action: 'duplicate', id: doc.id }));
                setNotice(kind === 'rename' ? 'Nombre actualizado.' : 'Programa duplicado.');
            } else {
                await request('/api/workspace/organize', json('POST', { action: kind, type: doc.type === 'project' ? 'art' : 'planning', id: doc.id, title: value, parentId: value || null }));
                setNotice({ rename: 'Nombre actualizado.', duplicate: 'Documento duplicado con su contenido.', move: 'Planeación movida.' }[kind]);
            }
            setAction(null); await load();
        } catch (cause) { setActionError(cause.message); }
        finally { setBusy(false); }
    }
    async function reorder(doc) {
        setBusy(true); setError('');
        try {
            const ids = [doc.id, ...documents.filter(item => item.type === doc.type && item.id !== doc.id).map(item => item.id)];
            await request(doc.type === 'program' ? '/api/programas-analiticos' : '/api/workspace/organize', json('POST', { action: 'reorder', type: doc.type === 'project' ? 'art' : 'planning', ids }));
            setNotice('Documento colocado al principio de su sección.'); await load();
        } catch (cause) { setError(cause.message); }
        finally { setBusy(false); }
    }
    async function importFile(event) {
        const file = event.target.files?.[0]; if (!file) return;
        setUploading(true); setError('');
        try {
            const body = new FormData(); body.append('archivo', file);
            const result = await request('/api/proyectos', { method: 'POST', body });
            router.push(`/proyectos/${result.id}`);
        } catch (cause) { setError(cause.message); }
        finally { setUploading(false); event.target.value = ''; }
    }
    async function savedPlan() { await load(); router.push('/?tipo=plan'); setNotice('Planeación guardada.'); }
    const nextProject = programId && programId !== 'unlinked' ? `/proyectos/nuevo?programa=${programId}` : '/proyectos/nuevo';

    if ((planningId || createPlan) && !loading) return <main className={styles.workspace}>
        <Link href="/?tipo=plan" className={styles.backLink}>← Mis planeaciones</Link>
        {error && <div role="alert" className={styles.error}>{error}<button onClick={load}>Reintentar carga</button></div>}
        {createPlan || plan ? <div className={styles.planningEditor}>{createPlan || editingPlan ? <PlaneacionForm initialData={plan} embedded onSaved={savedPlan} onCancel={() => router.push('/?tipo=plan')} /> : <PlaneacionList planeaciones={[plan]} expandedId={plan.id} onEdit={() => router.push(`/?planeacion=${plan.id}&editar=1`)} onDelete={() => { router.push('/?tipo=plan'); setAction({ kind: 'delete', doc: documents.find(doc => doc.type === 'plan' && doc.id === planningId) }); }} />}</div> : !error && <div className={styles.empty}><h1>Esta planeación no está disponible</h1><p>Puede haberse eliminado o pertenecer a otra cuenta.</p><Link href="/?tipo=plan">Volver a mis documentos</Link></div>}
    </main>;

    return <main className={styles.workspace} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.querySelectorAll('details[open]').forEach(detail => detail.removeAttribute('open')); if (selected) closeContext(); } }}>
        <header className={styles.heading}>
            <div><p className={styles.greeting}>Mi espacio de trabajo</p><h1>{type === 'all' ? 'Tu trabajo sigue aquí.' : `Mis ${tabs[type].toLocaleLowerCase('es')}`}</h1><p>Retoma tus ideas. Dales forma. Llévalas al aula.</p></div>
            <details className={styles.createMenu}><summary><AppIcon name="plus" size={20} />Crear</summary><div className={styles.menu}><Link href={nextProject}><AppIcon name="folder" />Proyecto de arte</Link><Link href="/generador-programa-analitico"><AppIcon name="file" />Programa analítico</Link><Link href="/?nuevo=planeacion"><AppIcon name="calendar" />Planeación</Link><button onClick={() => uploadRef.current?.click()} disabled={uploading}><AppIcon name="upload" />{uploading ? 'Importando…' : 'Importar proyecto'}</button></div></details>
            <input ref={uploadRef} type="file" accept=".pdf,.docx,.txt,.md" className={styles.fileInput} aria-label="Importar proyecto desde archivo" onChange={importFile} />
        </header>
        {(notice || params.has('conservadas')) && <div className={styles.notice} role="status"><AppIcon name="check" size={18} /><span>{notice || `Proyecto eliminado. Se conservaron ${Number(params.get('conservadas')) || 0} planeaciones sin proyecto.`}</span></div>}
        {error && <div className={styles.error} role="alert"><AppIcon name="alert" /><span>{error}</span><button onClick={load}>Reintentar carga</button></div>}
        {loading && <div className={styles.loading} role="status"><span />Cargando tus documentos…</div>}
        {!loading && !error && <>
                {featured && type === 'all' && <section className={styles.resume} aria-label="Retomar mi trabajo">
                    
                    <div className={styles.resumeContent}><span className={styles.resumeLabel}><span className={styles.liveDot} />{recent.length ? 'Tu último documento abierto' : 'Un documento para continuar'}</span><h2>{featured.title}</h2><DocumentMeta doc={featured} /><p>{featured.product || featured.excerpt || 'Abre el documento para revisar y continuar tu trabajo.'}</p><Link className={styles.primary} href={featured.editHref} onClick={() => remember(featured)}>Continuar editando<AppIcon name="arrow" size={18} /></Link></div>
                    <div className={styles.previewStage} aria-hidden="true"><div className={styles.paper}><div className={styles.paperHeader}><AppIcon name={icons[featured.type]} size={20} /><span>{featured.type === 'program' ? 'Ficha del programa' : 'Extracto del documento'}</span></div><strong>{featured.title}</strong><p>{featured.type === 'program' ? `${featured.count} proyectos vinculados` : featured.excerpt}</p>{featured.product && <div className={styles.paperProduct}><small>Producto del proyecto</small><p>{featured.product}</p></div>}<div className={styles.paperFooter}><span>{featured.groups || DOCUMENT_TYPES[featured.type]}</span><span>{DOCUMENT_TYPES[featured.type]}</span></div></div></div>
                </section>}
        <div className={styles.columns}><div className={styles.library}>
                <section aria-labelledby="documents-heading">
                    <div className={styles.libraryHeading}><h2 id="documents-heading">Tu biblioteca</h2><span>{visible.length} {visible.length === 1 ? 'documento' : 'documentos'}</span></div>
                    <div className={styles.search}><AppIcon name="search" size={20} /><input aria-label="Buscar en tus documentos" placeholder="Buscar por título, tema o grupo" value={query} onChange={event => setQuery(event.target.value)} type="search" />{query && <button aria-label="Borrar búsqueda" onClick={() => setQuery('')}><AppIcon name="close" size={18} /></button>}</div>
                    <div className={styles.filters}><div className={styles.tabs} role="group" aria-label="Tipo de documento">{Object.entries(tabs).map(([key, label]) => <button key={key} type="button" aria-pressed={type === key} onClick={() => changeType(key)}>{label}</button>)}</div><label className={styles.programFilter}><span>Programa analítico</span><select aria-label="Programa analítico" value={programId} onChange={event => setProgramId(event.target.value)}><option value="">Todos los programas</option><option value="unlinked">Sin programa vinculado</option>{data.programs.map(program => <option key={program.id} value={program.id}>{program.titulo}</option>)}</select></label></div>
                    {type === 'plan' && <div className={styles.planFilters}><button aria-pressed={unlinked} onClick={() => router.push(unlinked ? '/?tipo=plan' : '/?tipo=plan&sinProyecto=1', { scroll: false })}>Planeaciones sin proyecto <span>{data.plans.filter(item => !item.proyecto_arte_id).length}</span></button></div>}
                    {action && <section className={styles.actionPanel} ref={actionRef} aria-label="Administrar documento"><form onSubmit={applyAction}><h3>{{ rename: 'Cambiar nombre', duplicate: 'Duplicar documento', move: 'Mover planeación', delete: 'Eliminar documento' }[action.kind]}</h3><p>{action.doc.title}</p>{action.kind === 'rename' && <label>Nombre del documento<input value={value} onChange={event => setValue(event.target.value)} maxLength={action.doc.type === 'program' ? 200 : 160} required /></label>}{action.kind === 'move' && <label>Proyecto de destino<select value={value} onChange={event => setValue(event.target.value)}><option value="">Sin proyecto</option>{data.projects.map(project => <option value={project.id} key={project.id}>{project.titulo}</option>)}</select></label>}{action.kind === 'duplicate' && <p>Crearás una copia editable con su contenido{action.doc.type === 'project' ? ' y sus planeaciones' : ''}.</p>}{action.kind === 'delete' && <p>{action.doc.type === 'project' ? `Sus ${action.doc.count} planeaciones se conservarán sin proyecto.` : 'Esta acción no se puede deshacer.'}</p>}{actionError && <p className={styles.actionError} role="alert">{actionError}</p>}<div><button type="button" className={styles.secondary} disabled={busy} onClick={() => setAction(null)}>Cancelar</button><button className={action.kind === 'delete' ? styles.danger : styles.primary} disabled={busy || (action.kind === 'rename' && !value.trim())}>{busy ? 'Guardando…' : action.kind === 'delete' ? 'Confirmar eliminación' : action.kind === 'duplicate' ? 'Crear copia' : 'Guardar cambios'}</button></div></form></section>}
                    {visible.length ? <div className={`${styles.documentList} ${type === 'project' ? 'art-project-list' : ''}`} aria-label="Documentos de mi cuenta">{visible.map(doc => <article key={doc.key} className={`${styles.documentRow} ${context?.key === doc.key ? styles.selectedRow : ''}`}>
                        <Link className={styles.documentLink} href={doc.editHref} onClick={() => remember(doc)}><DocumentIcon type={doc.type} /><span><strong>{doc.title}</strong><DocumentMeta doc={doc} /></span></Link>
                        <button className={styles.contextButton} aria-label={`Ver detalles de ${doc.title}`} aria-pressed={context?.key === doc.key} onClick={event => { contextTrigger.current = event.currentTarget; setSelected(doc.key); }}><AppIcon name="chevron" size={18} /></button>
                        <details className={styles.rowMenu}><summary aria-label={`Administrar ${doc.title}`}><AppIcon name="more" size={18} /></summary><div className={styles.menu}><Link href={doc.href} onClick={() => remember(doc)}>Abrir documento</Link><button onClick={event => beginAction('rename', doc, event)}>Cambiar nombre</button><button onClick={event => beginAction('duplicate', doc, event)}>Duplicar con contenido</button>{doc.type === 'plan' && <button onClick={event => beginAction('move', doc, event)}>Mover a un proyecto</button>}<button disabled={busy} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); reorder(doc); }}>Colocar al principio</button>{doc.type === 'plan' && <a href={`/api/planeaciones/${doc.id}/export`}>Descargar documento</a>}<button onClick={event => beginAction('delete', doc, event)}>Eliminar</button></div></details>
                    </article>)}</div> : <div className={styles.empty}><AppIcon name={query || programId ? 'search' : 'folder'} size={36} /><h3>{query || programId ? `No hay ${type === 'project' ? 'proyectos' : type === 'plan' ? 'planeaciones' : 'documentos'} con estos filtros` : 'Aquí empieza tu próximo documento'}</h3><p>{query || programId ? 'Prueba otra búsqueda o cambia el programa seleccionado.' : 'Cuando guardes tu trabajo, podrás volver a él desde aquí.'}</p>{query || programId ? <button className={styles.secondary} onClick={() => { setQuery(''); setProgramId(''); }}>Limpiar filtros</button> : <Link className={styles.primary} href={type === 'program' ? '/generador-programa-analitico' : type === 'plan' ? '/?nuevo=planeacion' : nextProject}>Crear {type === 'program' ? 'programa' : type === 'plan' ? 'planeación' : 'proyecto'}</Link>}</div>}
                </section>
            </div>
            {context && <aside className={`${styles.context} ${selected ? styles.contextVisible : ''}`} aria-label="Contexto del documento" ref={contextRef} tabIndex={-1}>
                <div className={styles.contextHeading}><h2>Del contexto al aula</h2><button className={styles.closeContext} aria-label="Cerrar detalles" onClick={closeContext}><AppIcon name="close" /></button></div>
                <div className={styles.documentRoute}>
                    <div className={styles.routeStep}><DocumentIcon type="program" /><div><span>Programa analítico</span>{linkedProgram ? <Link href={linkedProgram.editHref} onClick={() => remember(linkedProgram)}>{linkedProgram.title}</Link> : <p>Sin programa vinculado</p>}</div></div>
                    {contextProject && <div className={styles.routeStep}><DocumentIcon type="project" /><div><span>Proyecto de arte</span><Link href={contextProject.editHref} onClick={() => remember(contextProject)}>{contextProject.title}</Link>{contextProject.groups && <small>Grupos {contextProject.groups}</small>}</div></div>}
                    {context.type === 'plan' && <div className={styles.routeStep}><DocumentIcon type="plan" /><div><span>Planeación{context.groups ? ` · ${context.groups}` : ''}</span><Link href={context.editHref} onClick={() => remember(context)}>{context.title}</Link>{!contextProject && <small>Sin proyecto vinculado</small>}</div></div>}
                </div>
                {contextProject && context.type !== 'plan' && <div className={styles.relatedPlans}><h4>Planeaciones <span>{linkedPlans.length}</span></h4>{linkedPlans.slice(0, 3).map(doc => <Link href={doc.editHref} key={doc.id} onClick={() => remember(doc)}><AppIcon name="calendar" size={18} /><span>{doc.title}<small>{doc.groups || 'Grupo por definir'}</small></span><AppIcon name="chevron" size={14} /></Link>)}{linkedPlans.length > 3 && <Link className={styles.allPlans} href={contextProject.href}>Ver las {linkedPlans.length} planeaciones <AppIcon name="arrow" size={16} /></Link>}{!linkedPlans.length && <p className={styles.routeHint}>Aún no hay planeaciones.<Link href={contextProject.href}>Abrir proyecto para prepararlas <AppIcon name="arrow" size={16} /></Link></p>}</div>}
                {context.type === 'program' && <div className={styles.relationship}><span>Proyectos vinculados</span>{documents.filter(doc => doc.type === 'project' && doc.programId === context.id).map(doc => <Link href={doc.editHref} key={doc.key} onClick={() => remember(doc)}><AppIcon name="folder" size={18} />{doc.title}</Link>)}{!context.count && <p>Aún no tiene proyectos vinculados.</p>}<Link href={`/proyectos/nuevo?programa=${context.id}`}><AppIcon name="plus" size={18} />Crear proyecto con este programa</Link></div>}
                <div className={styles.reference}><AppIcon name="book" size={18} /><Link href="/contenidos/tablas">Consultar contenidos y PDA</Link></div>
            </aside>}
        </div></>}
    </main>;
}
