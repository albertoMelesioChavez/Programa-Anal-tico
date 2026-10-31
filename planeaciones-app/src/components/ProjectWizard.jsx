'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createGroup, createProjectConfig, gradePdas, GROUP_OPTIONS, normalizeProjectConfig } from '@/lib/art-project-workflow';
import { PROJECT_FIELDS, projectAssistContext } from '@/lib/project-field-assistance';
import { newProjectConfig, prepareProjectDraft, quickProject, QUICK_FORMATS, curriculumOptions } from '@/lib/project-starter';
import TextField, { MagicWand } from '@/components/ProjectTextField';
import ProjectDocument from '@/components/ProjectDocument';
import styles from './ProjectWizard.module.css';

const STEPS = ['Idea y grupos', 'Ajustes opcionales', 'Currículo', 'Revisar'];

function Fold({ title, summary, children, id }) {
    return <details id={id} className={styles.fold}><summary><span><strong>{title}</strong><small>{summary}</small></span><span className={styles.foldArrow} aria-hidden="true">⌄</span></summary><div className={styles.foldBody}>{children}</div></details>;
}

function productsFromGroups(groups, previous = {}) {
    const products = Object.fromEntries(Array.from({ length: 6 }, (_, index) => ['grado' + (index + 1), Array.isArray(previous['grado' + (index + 1)]) ? previous['grado' + (index + 1)] : []]));
    for (const grade of new Set(groups.map(group => group.grade))) {
        products['grado' + grade] = [...new Set(groups.filter(group => group.grade === grade).map(group => group.producto.trim()).filter(Boolean))];
    }
    return products;
}

async function readJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el proyecto.');
    return data;
}

export default function ProjectWizard({ projectId }) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [project, setProject] = useState({ titulo: '', tematica: '', introduccion: '', vinculacion: [], configuracion: createProjectConfig() });
    const [catalog, setCatalog] = useState({ estatales: [], nacionales: [], pdas: [], lenguajes: [], ejes: [] });
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyKey, setBusyKey] = useState('');
    const [suggestion, setSuggestion] = useState(null);
    const [error, setError] = useState('');
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedContent, setSelectedContent] = useState(null);
    const [activeSession, setActiveSession] = useState(0);
    const [commonLanguage, setCommonLanguage] = useState('');
    const [draftKey, setDraftKey] = useState('');
    const [draftStatus, setDraftStatus] = useState('');
    const [restored, setRestored] = useState(false);
    const [quickIdea, setQuickIdea] = useState('');
    const [quickFormat, setQuickFormat] = useState('mural');
    const [manualEntry, setManualEntry] = useState(Boolean(projectId));
    const [previousProject, setPreviousProject] = useState(null);
    const finished = useRef(false);
    const headingRef = useRef(null);

    useEffect(() => {
        let active = true;
        Promise.all([
            readJson('/api/contenidos'), readJson('/api/catalogos'),
            readJson('/api/programas-analiticos'),
            projectId ? readJson('/api/proyectos/' + projectId) : Promise.resolve(null),
            readJson('/api/auth/me'),
            projectId ? Promise.resolve([]) : readJson('/api/proyectos').catch(() => [])
        ]).then(([contents, lists, programs, existing, session, previous]) => {
            if (!active) return;
            setCatalog({ ...contents, lenguajes: lists.lenguajes || [], ejes: lists.ejes_articuladores || [] });
            setProgramas(Array.isArray(programs) ? programs : []);
            setCommonLanguage(String(existing?.configuracion?.grupos?.[0]?.lenguaje_id || lists.lenguajes?.find(item => item.nombre === 'Artes Visuales')?.id || lists.lenguajes?.[0]?.id || ''));
            if (existing?.id) setProject({ ...existing, configuracion: normalizeProjectConfig(existing.configuracion), vinculacion: existing.vinculacion || [] });
            else {
                const last = (Array.isArray(previous) ? previous : []).filter(item => item.configuracion?.grupos?.length).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
                setPreviousProject(last || null);
                const requestedProgram = new URLSearchParams(window.location.search).get('programa');
                const linkedProgram = programs.find(item => String(item.id) === requestedProgram);
                const key = 'art-project-draft:v1:' + session.user.id + (linkedProgram ? ':' + linkedProgram.id : '');
                setDraftKey(key);
                let draft;
                try { draft = JSON.parse(localStorage.getItem(key)); } catch { /* A blocked browser store must not prevent editing. */ }
                if (draft?.project?.configuracion && typeof draft.project.titulo === 'string' && typeof draft.project.tematica === 'string') {
                    setProject({ ...draft.project, introduccion: draft.project.introduccion || '', vinculacion: draft.project.vinculacion || [], configuracion: normalizeProjectConfig(draft.project.configuracion) });
                    if (draft.commonLanguage) setCommonLanguage(draft.commonLanguage);
                    setQuickIdea(draft.quickIdea ?? draft.project.tematica ?? '');
                    if (QUICK_FORMATS.some(item => item.id === draft.quickFormat)) setQuickFormat(draft.quickFormat);
                    setRestored(true);
                } else {
                    const defaults = newProjectConfig({ teacher: session.user.nombre || '' });
                    for (const key of ['escuela', 'espacios', 'proyecto_escolar']) if (last?.configuracion?.[key]) defaults[key] = last.configuracion[key];
                    setProject(current => ({ ...current, programa_analitico_id: linkedProgram?.id || null, configuracion: defaults }));
                }
            }
        }).catch(cause => active && setLoadError(cause.message)).finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [projectId]);

    useEffect(() => {
        if (loading || loadError || !draftKey || finished.current) return;
        const timeout = setTimeout(() => {
            if (finished.current) return;
            try {
                localStorage.setItem(draftKey, JSON.stringify({ project, commonLanguage, quickIdea, quickFormat }));
                setDraftStatus('Borrador guardado en este navegador');
            } catch { setDraftStatus('No se pudo guardar el borrador en este navegador'); }
        }, 400);
        return () => clearTimeout(timeout);
    }, [project, commonLanguage, quickIdea, quickFormat, draftKey, loading, loadError]);

    const config = project.configuracion;
    const groups = useMemo(() => config.grupos || [], [config.grupos]);
    const selectedGrades = [...new Set(groups.map(group => Number(group.grade)))].sort((a, b) => a - b);
    const selectedIds = new Set(project.vinculacion.map(item => String(item.contenido_id)));
    const selectedPdaIds = new Set(project.vinculacion.flatMap(item => item.pda_ids || []).map(String));
    const curriculumReady = groups.length > 0 && groups.every(group => gradePdas(project.vinculacion, catalog.pdas, group.grade, group.lenguaje_id).length > 0);
    const filteredContents = useMemo(() => catalog.estatales.filter(item =>
        (groups.length === 0 || groups.some(group => Number(item.fase_id) === Number(group.faseId) && Number(item.lenguaje_id) === Number(group.lenguaje_id))) &&
        String(item.descripcion || '').toLowerCase().includes(search.toLowerCase())
    ), [catalog.estatales, groups, search]);

    const setCore = (key, value) => setProject(current => ({ ...current, [key]: value }));
    const setConfig = (key, value) => setProject(current => ({ ...current, configuracion: { ...current.configuracion, [key]: value, ...(key === 'producto_final' ? { grupos: current.configuracion.grupos.map(group => !group.producto || group.producto === current.configuracion.producto_final ? { ...group, producto: value } : group) } : {}) } }));
    const setNested = (list, index, key, value) => setProject(current => ({ ...current, configuracion: { ...current.configuracion, [list]: current.configuracion[list].map((item, i) => i === index ? { ...item, [key]: value } : item) } }));
    const setGroup = (id, key, value) => setProject(current => ({ ...current, configuracion: { ...current.configuracion, grupos: current.configuracion.grupos.map(group => group.id === id ? { ...group, [key]: value } : group) } }));

    function changeRouteLength(delta) {
        setProject(current => {
            const old = current.configuracion;
            if ((delta < 0 && old.ruta.length <= 1) || (delta > 0 && old.ruta.length >= 32)) return current;
            const ruta = delta > 0 ? [...old.ruta, { numero: old.ruta.length + 1, titulo: '', proposito: '', actividad: '', evidencia: '', criterios: '', recursos: '' }] : old.ruta.slice(0, -1);
            const grupos = old.grupos.map(group => ({ ...group, fechas: Array.from({ length: ruta.length }, (_, index) => group.fechas?.[index] || ''), pda_por_sesion: Array.from({ length: ruta.length }, (_, index) => group.pda_por_sesion?.[index] || '') }));
            return { ...current, configuracion: { ...old, ruta, grupos } };
        });
    }

    function changeLanguage(value) {
        setCommonLanguage(value);
        setProject(current => ({ ...current, configuracion: { ...current.configuracion, grupos: current.configuracion.grupos.map(group => !group.lenguaje_id || String(group.lenguaje_id) === String(commonLanguage) ? { ...group, lenguaje_id: value } : group) } }));
        setSelectedContent(null);
    }

    function chooseFormat(format) {
        setQuickFormat(format.id);
        const language = catalog.lenguajes.find(item => item.nombre === format.language);
        if (language) changeLanguage(String(language.id));
    }

    function selectGroups(ids) {
        setProject(current => ({ ...current, configuracion: { ...current.configuracion, grupos: [...new Set([...current.configuracion.grupos.map(group => group.id), ...ids])].map(id => current.configuracion.grupos.find(group => group.id === id) || { ...createGroup(id, current.configuracion.ruta.length), lenguaje_id: commonLanguage, producto: current.configuracion.producto_final }).filter(Boolean).sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter)) } }));
    }

    const toggleGroup = id => setProject(current => {
        const list = current.configuracion.grupos;
        const next = list.some(group => group.id === id) ? list.filter(group => group.id !== id) : [...list, { ...createGroup(id, current.configuracion.ruta.length), lenguaje_id: commonLanguage, producto: current.configuracion.producto_final }].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
        return { ...current, configuracion: { ...current.configuracion, grupos: next } };
    });
    const toggleContent = id => setProject(current => ({ ...current, vinculacion: current.vinculacion.some(item => String(item.contenido_id) === String(id)) ? current.vinculacion.filter(item => String(item.contenido_id) !== String(id)) : [...current.vinculacion, { contenido_id: id, pda_ids: [] }] }));
    const togglePda = (contentId, pdaId) => setProject(current => ({ ...current, vinculacion: current.vinculacion.map(item => String(item.contenido_id) !== String(contentId) ? item : { ...item, pda_ids: (item.pda_ids || []).some(id => String(id) === String(pdaId)) ? item.pda_ids.filter(id => String(id) !== String(pdaId)) : [...(item.pda_ids || []), pdaId] }) }));

    function fullContext() {
        const program = programas.find(item => String(item.id) === String(project.programa_analitico_id));
        return { ...projectAssistContext(project, catalog), programa_analitico: program ? { id: program.id, titulo: program.titulo, contenido: String(program.contenido || '').slice(0, 18000) } : null };
    }

    async function assist(scope, field, current, index, signal) {
        const target = scope === 'group' ? { groupId: index } : { index };
        const context = fullContext();
        if (project.programa_analitico_id) {
            const program = await readJson('/api/programas-analiticos/' + project.programa_analitico_id);
            context.programa_analitico = { id: program.id, titulo: program.titulo, contenido: String(program.contenido).slice(0, 18000) };
        }
        const response = await fetch('/api/ai', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
            body: JSON.stringify({ task: 'project-field', scope, field, current, target, context })
        });
        const data = await response.json();
        if (!response.ok || typeof data.text !== 'string' || !data.text.trim()) throw new Error(data.error || 'No se obtuvo una propuesta. Intenta de nuevo.');
        return data;
    }

    function field(scope, key, options = {}, index = null) {
        const source = scope === 'core' ? project : scope === 'route' ? config.ruta[index] : scope === 'group' ? groups.find(group => group.id === index) : scope === 'event' ? config.evento : scope === 'evaluation' ? config.criterios_evaluacion[index] : config;
        const value = source?.[key] || '';
        const update = next => {
            if (scope === 'core') setCore(key, next);
            else if (scope === 'route') setNested('ruta', index, key, next);
            else if (scope === 'group') setGroup(index, key, next);
            else if (scope === 'event') setConfig('evento', { ...config.evento, [key]: next });
            else if (scope === 'evaluation') setNested('criterios_evaluacion', index, key, next);
            else setConfig(key, next);
        };
        return <TextField key={scope + ':' + key + ':' + index} label={PROJECT_FIELDS[scope][key][0]} value={value} onChange={update} onAssist={signal => assist(scope, key, value, index, signal)} {...options} />;
    }

    async function suggestCurriculum(group) {
        setError(''); setSuggestion(null); setBusyKey(group.id);
        try {
            const candidates = catalog.pdas.filter(pda => Number(pda.grado_id) === Number(group.grade) && Number(pda.lenguaje_id) === Number(group.lenguaje_id)).map(pda => {
                const content = catalog.estatales.find(item => Number(item.id) === Number(pda.contenido_estatal_id));
                return content ? { contenido_id: content.id, pda_id: pda.id, contenido: content.descripcion, pda: pda.descripcion } : null;
            }).filter(Boolean);
            const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'curriculum-suggestion', context: { ...fullContext(), grupo: group }, candidates }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo proponer una vinculación.');
            setSuggestion({ groupId: group.id, ...data });
        } catch (cause) { setError(cause.message); }
        finally { setBusyKey(''); }
    }

    function applyCurriculum() {
        const { contenido_id, pda_id } = suggestion.candidate;
        setProject(current => {
            const existing = current.vinculacion.find(item => Number(item.contenido_id) === Number(contenido_id));
            const vinculacion = existing ? current.vinculacion.map(item => Number(item.contenido_id) === Number(contenido_id) ? { ...item, pda_ids: [...new Set([...(item.pda_ids || []), pda_id])] } : item) : [...current.vinculacion, { contenido_id, pda_ids: [pda_id] }];
            return { ...current, vinculacion };
        });
        setSuggestion(null);
    }

    function goTo(nextStep, foldId) {
        if (nextStep > 0 && step === 0) {
            if (!manualEntry && !projectId) {
                if (!quickIdea.trim()) { setError('Escribe tu idea o elige uno de los temas para empezar.'); return; }
                if (!groups.length) { setError('Selecciona los grupos que participarán.'); return; }
                if (Number(config.duracion_minutos) < 20 || Number(config.duracion_minutos) > 180) { setError('La duración debe estar entre 20 y 180 minutos.'); document.getElementById('school-settings').open = true; return; }
                setProject(current => quickProject(current, quickIdea, quickFormat, commonLanguage));
            } else {
            if (!project.titulo.trim() || !project.tematica.trim() || !groups.length || groups.some(group => !group.producto.trim() || !group.lenguaje_id)) {
                setError('Completa el título, la temática, el producto y al menos un grupo con lenguaje artístico.');
                if (groups.some(group => !group.producto.trim() || !group.lenguaje_id) && config.producto_final.trim()) {
                    const details = document.getElementById('group-settings');
                    if (details) details.open = true;
                }
                return;
            }
            if (Number(config.duracion_minutos) < 20 || Number(config.duracion_minutos) > 180) {
                setError('La duración de cada sesión debe estar entre 20 y 180 minutos.');
                document.getElementById('school-settings').open = true;
                return;
            }
            if (!projectId && !config.starter_version) setProject(current => prepareProjectDraft(current));
            }
        }
        setStep(nextStep); setError(''); setSuggestion(null); window.scrollTo(0, 0);
        requestAnimationFrame(() => {
            const details = foldId && document.getElementById(foldId);
            if (details) { details.open = true; details.querySelector('summary')?.focus(); details.scrollIntoView({ block: 'center' }); }
            else headingRef.current?.focus({ preventScroll: true });
        });
    }
    function next() {
        if (step === 2 && !curriculumReady) { setError('Selecciona al menos un PDA para cada grado y lenguaje antes de revisar.'); return; }
        if (step === 0 && !projectId && !manualEntry) { goTo(curriculumReady ? 3 : 2); return; }
        goTo(Math.min(step + 1, STEPS.length - 1));
    }

    async function save() {
        if (!project.titulo.trim() || !project.tematica.trim()) { goTo(0); setError('Completa el título y la temática.'); return; }
        if (!groups.length || groups.some(group => !group.producto.trim() || !group.lenguaje_id)) { goTo(0); setError('Completa los grupos, productos y lenguajes artísticos.'); return; }
        if (!curriculumReady) { goTo(2); setError('Selecciona un PDA del catálogo para cada grupo y lenguaje artístico.'); return; }
        setSaving(true); setError('');
        try {
            const payload = { ...project, configuracion: { ...config, version: 3 }, productos: productsFromGroups(groups, project.productos) };
            const response = await fetch(projectId ? '/api/proyectos/' + projectId : '/api/proyectos', { method: projectId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
            finished.current = true;
            if (draftKey) try { localStorage.removeItem(draftKey); } catch { /* The project is already saved on the server. */ }
            router.push('/proyectos/' + (projectId || data.id));
        } catch (cause) { setError(cause.message); }
        finally { setSaving(false); }
    }

    if (loading) return <main className={styles.loading} role="status">Cargando proyecto y currículo…</main>;
    if (loadError) return <main className={styles.loading}><div><p role="alert">{loadError}</p><Link href="/">Volver al espacio de trabajo</Link></div></main>;
    const sessionIndex = Math.min(activeSession, config.ruta.length - 1);
    const languageName = catalog.lenguajes.find(item => String(item.id) === String(commonLanguage))?.nombre || 'Arte';
    const curriculumGroups = groups.filter((group, index) => groups.findIndex(item => item.grade === group.grade && String(item.lenguaje_id) === String(group.lenguaje_id)) === index);
    return <div className={styles.shell}>
        <header className={styles.header}><Link href={projectId ? '/proyectos/' + projectId : '/'}>← {projectId ? 'Ver proyecto' : 'Mi espacio'}</Link><span>{projectId ? 'Editar proyecto artístico' : 'Nuevo proyecto artístico'}</span><small role="status">{projectId ? 'Guarda los cambios al finalizar' : draftStatus}</small></header>
        <div className={styles.layout}>
            <nav className={styles.stepper} aria-label="Pasos del proyecto">{STEPS.map((name, index) => <button key={name} type="button" aria-current={step === index ? 'step' : undefined} className={step === index ? styles.activeStep : ''} onClick={() => goTo(index)}><span>{index + 1}</span>{name}</button>)}</nav>
            <main className={styles.main}>
                <div className={styles.pageTitle}><div><div className={styles.eyebrow}>PASO {step + 1} DE {STEPS.length}</div><h1 ref={headingRef} tabIndex={-1}>{step === 0 ? 'Tu idea, el punto de partida.' : STEPS[step]}</h1></div><span className={styles.wandHint}><MagicWand /> Una propuesta para cada campo</span></div>
                {error && <div role="alert" className={styles.error}>{error}</div>}

                <section hidden={step !== 0} aria-label="Idea y grupos">
                    <p className={styles.intro}>{!projectId && !manualEntry ? 'Una idea y tus grupos. Prepararemos el título, el producto, las sesiones y la evaluación; después eliges los aprendizajes y revisas.' : 'Ajusta los datos de tu proyecto. Puedes volver al inicio rápido para completar lo que falta.'}</p>
                    {restored && <p className={styles.restored} role="status">Recuperamos tu borrador de este navegador.</p>}
                    <div className={styles.startGrid}>
                        <div className={styles.ideaFields}>
                            {!projectId && <div className={styles.entryModes} aria-label="Modo de llenado"><button type="button" aria-pressed={!manualEntry} onClick={() => setManualEntry(false)}>Inicio rápido</button><button type="button" aria-pressed={manualEntry} onClick={() => setManualEntry(true)}>Editar campos</button></div>}
                            {!projectId && !manualEntry && <div className={styles.stack}>
                                <TextField label="¿Qué quieres trabajar con tus grupos?" rows={2} value={quickIdea} onChange={setQuickIdea} onAssist={signal => assist('core', 'tematica', quickIdea, null, signal)} placeholder="Describe el tema o la situación que te gustaría explorar a través del arte." />
                                <div className={styles.topicChoices}><span>O elige un tema:</span>{['Convivencia y respeto', 'Cuidado del agua', 'Identidad de mi comunidad', 'Emociones'].map(topic => <button key={topic} type="button" onClick={() => setQuickIdea(topic)}>{topic}</button>)}</div>
                                <fieldset className={styles.choiceField}><legend>¿Cómo lo van a expresar?</legend><div className={styles.formatChoices}>{QUICK_FORMATS.map(format => <button key={format.id} type="button" aria-pressed={quickFormat === format.id} onClick={() => chooseFormat(format)}>{format.label}</button>)}</div></fieldset>
                                <p className={styles.quickExplanation}>Incluye título, producto, {config.ruta.length} sesiones y evaluación. Puedes editar todo al revisar.{project.titulo && ' Conservaremos los campos que ya escribiste.'}</p>
                            </div>}
                            <div hidden={!manualEntry}><div className={styles.ideaFields}>
                            {field('core', 'titulo', { required: true, placeholder: 'Escribe el nombre que identificará tu proyecto artístico.' })}
                            {field('core', 'tematica', { required: true, placeholder: 'Describe el tema o la situación que quieres trabajar con tus grupos.' })}
                            {field('config', 'producto_final', { rows: 2, required: true, placeholder: 'Describe qué crearán, a quién se lo compartirán y cómo lo presentarán.' })}
                            </div></div>
                        </div>
                        <div className={styles.groupPicker}>
                            <div hidden={!manualEntry}><div className={styles.selectField}><label htmlFor="common-language">Lenguaje artístico común</label><select id="common-language" value={commonLanguage} onChange={e => changeLanguage(e.target.value)}>{catalog.lenguajes.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div></div>
                            <fieldset className={styles.choiceField}><legend>¿Qué grupos participan? <span>{groups.length ? groups.length + (groups.length === 1 ? ' seleccionado' : ' seleccionados') : 'Elige al menos uno'}</span></legend><div className={styles.groupGrid}>{GROUP_OPTIONS.map(option => <button key={option.id} type="button" aria-pressed={groups.some(group => group.id === option.id)} className={groups.some(group => group.id === option.id) ? styles.selectedChip : ''} onClick={() => toggleGroup(option.id)}>{option.label}</button>)}</div></fieldset>
                            <div className={styles.groupShortcuts}><button type="button" onClick={() => selectGroups(GROUP_OPTIONS.filter(item => item.letter === 'A').map(item => item.id))}>Todos los A</button><button type="button" onClick={() => selectGroups(GROUP_OPTIONS.filter(item => item.letter === 'B').map(item => item.id))}>Todos los B</button>{previousProject && <button type="button" onClick={() => selectGroups(previousProject.configuracion.grupos.map(group => group.id).filter(id => GROUP_OPTIONS.some(option => option.id === id)))}>Mis grupos anteriores</button>}</div>
                            <small>El producto y el lenguaje se aplican a todos. Las fechas son opcionales.</small>
                        </div>
                    </div>
                    <div className={styles.defaultsStrip}><span><strong>{config.ruta.length}</strong> sesiones</span><span><strong>{config.duracion_minutos}</strong> min por sesión</span><span>Ciclo <strong>{config.ciclo || 'por definir'}</strong></span><span>{languageName}</span></div>
                    <div className={styles.selectField}><label htmlFor="programa-analitico">Programa analítico de este proyecto</label><select id="programa-analitico" value={project.programa_analitico_id || ''} onChange={e => setCore('programa_analitico_id', e.target.value || null)}><option value="">Sin vincular por ahora</option>{programas.map(program => <option key={program.id} value={program.id}>{program.titulo}</option>)}</select>{project.programa_analitico_id && <Link href={`/contenidos/artes?programa=${project.programa_analitico_id}`} target="_blank" rel="noopener noreferrer">Consultar programa ↗</Link>}</div>
                    <div className={styles.foldList}>
                        <Fold id="school-settings" title="Datos de la escuela y calendario" summary={[config.escuela || 'Escuela pendiente', config.docente, 'Fechas opcionales'].filter(Boolean).join(' · ')}>
                            <div className={styles.three}><TextField label="Escuela" value={config.escuela} onChange={v => setConfig('escuela', v)} /><TextField label="Docente" value={config.docente} onChange={v => setConfig('docente', v)} /><TextField label="Ciclo escolar" value={config.ciclo} onChange={v => setConfig('ciclo', v)} /></div>
                            <div className={styles.three}><TextField label="Inicio tentativo" type="date" value={config.periodo_inicio} onChange={v => setConfig('periodo_inicio', v)} /><TextField label="Fin tentativo" type="date" value={config.periodo_fin} onChange={v => setConfig('periodo_fin', v)} /><TextField label="Minutos por sesión" type="number" min="20" max="180" value={config.duracion_minutos} onChange={v => setConfig('duracion_minutos', v === '' ? '' : Number(v))} /></div>
                            <TextField label="Nombre del proyecto escolar" value={config.proyecto_escolar} onChange={v => setConfig('proyecto_escolar', v)} placeholder="Escribe el nombre del proyecto acordado por la escuela, si existe." />
                            {field('config', 'vinculacion_escolar', { rows: 2 })}
                        </Fold>
                        {groups.length > 0 && <Fold id="group-settings" title="Adaptar productos y fechas por grupo" summary={groups.map(group => group.id).join(', ') + ' · Fechas opcionales'}>
                            {groups.map(group => <div key={group.id} className={styles.groupRow}><h3>Grupo {group.id}</h3><div className={styles.two}>{field('group', 'producto', { required: true, rows: 2 }, group.id)}<div className={styles.selectField}><label htmlFor={'language-' + group.id}>Lenguaje de {group.id}</label><select id={'language-' + group.id} value={group.lenguaje_id || ''} onChange={e => { setGroup(group.id, 'lenguaje_id', e.target.value); setSelectedContent(null); }}><option value="">Selecciona…</option>{catalog.lenguajes.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div></div>
                                <Fold title={'Fechas de ' + group.id} summary={group.fechas.filter(Boolean).length + ' de ' + config.ruta.length + ' definidas'}>
                                    <div className={styles.dateGrid}>{config.ruta.map((stage, index) => <TextField key={index} label={'Sesión ' + (index + 1) + ' · ' + stage.titulo} type="date" value={group.fechas?.[index] || ''} onChange={v => setGroup(group.id, 'fechas', config.ruta.map((_, i) => i === index ? v : (group.fechas?.[i] || '')))} />)}</div>
                                </Fold>
                            </div>)}
                        </Fold>}
                    </div>
                </section>

                <section hidden={step !== 1} aria-label="Afinar borrador">
                    <p className={styles.intro}>{config.starter_version ? 'Ya tienes una base editable. Revisa lo que propone, ajusta lo que necesites y usa la varita para afinar cada campo.' : 'Revisa la intención y la ruta del proyecto. Abre los apartados que quieras ajustar.'}</p>
                    {config.starter_version && <p className={styles.baseNote}>Base de plantilla · El diagnóstico, las fuentes y el currículo se completan con información real.</p>}
                    <div className={styles.stack}>
                        {field('config', 'proposito', { rows: 2 })}
                        <Fold id="context-settings" title="Fundamentación y contexto" summary={config.diagnostico ? 'Diagnóstico añadido · Revisa la intención' : 'Pendiente: añade tus observaciones reales del grupo'}>
                            {field('config', 'diagnostico', { rows: 3, help: 'Este campo parte de tus observaciones; la base no inventa necesidades del grupo.' })}
                            {field('core', 'introduccion', { rows: 3 })}
                            {field('config', 'pregunta_guia', { rows: 2 })}
                            <div className={styles.two}>{field('config', 'metodologia', { rows: 2 })}{field('config', 'valor_mensual')}</div>
                            <fieldset className={styles.choiceField}><legend>Ejes articuladores</legend><div className={styles.chips}>{catalog.ejes.map(eje => <button key={eje.id} type="button" aria-pressed={config.ejes.includes(eje.nombre)} className={config.ejes.includes(eje.nombre) ? styles.selectedChip : ''} onClick={() => setConfig('ejes', config.ejes.includes(eje.nombre) ? config.ejes.filter(v => v !== eje.nombre) : [...config.ejes, eje.nombre])}>{eje.nombre}</button>)}</div></fieldset>
                        </Fold>
                        <section className={styles.routeSection} aria-labelledby="route-title">
                            <div className={styles.sectionHeading}><div><h2 id="route-title">La ruta del proyecto</h2><p>{config.ruta.length} sesiones de {config.duracion_minutos} minutos. Revisa una a la vez.</p></div><div className={styles.routeActions}><button type="button" onClick={() => { changeRouteLength(1); setActiveSession(config.ruta.length); }} disabled={config.ruta.length >= 32}>+ Sesión</button></div></div>
                            <div className={styles.sessionLayout}>
                                <nav className={styles.sessionNav} aria-label="Sesiones del proyecto">{config.ruta.map((stage, index) => <button key={index} type="button" aria-current={sessionIndex === index ? 'true' : undefined} onClick={() => setActiveSession(index)}><span>{String(index + 1).padStart(2, '0')}</span><span>{stage.titulo || 'Nueva sesión'}</span></button>)}</nav>
                                <div className={styles.sessionEditor}>{config.ruta.map((stage, index) => <div key={index} hidden={sessionIndex !== index}><div className={styles.stack}>
                                    <div className={styles.sessionCaption}>SESIÓN {index + 1} DE {config.ruta.length}</div>
                                    {field('route', 'titulo', {}, index)}
                                    {field('route', 'proposito', { rows: 2 }, index)}
                                    {field('route', 'actividad', { rows: 3 }, index)}
                                    <Fold title="Evidencia, criterios y materiales" summary={[stage.evidencia && 'Evidencia', stage.criterios && 'Criterios', stage.recursos && 'Materiales'].filter(Boolean).join(' · ') || 'Por completar'}>
                                        {field('route', 'evidencia', { rows: 2 }, index)}{field('route', 'criterios', { rows: 2 }, index)}{field('route', 'recursos', { rows: 2 }, index)}
                                    </Fold>
                                </div></div>)}</div>
                            </div>
                            <details className={styles.removeSession}><summary>Ajustar cantidad de sesiones</summary><p>Quitar la última sesión elimina su contenido y sus fechas del borrador.</p><button type="button" onClick={() => changeRouteLength(-1)} disabled={config.ruta.length <= 1}>Quitar sesión {config.ruta.length}</button></details>
                        </section>
                        <div className={styles.foldList}>
                            <Fold title="Evaluación y evidencias" summary={config.criterios_evaluacion.filter(item => item.criterio).length + ' criterios preparados · Editables'}>
                                {field('config', 'evaluacion', { rows: 2 })}
                                {config.criterios_evaluacion.map((item, index) => <Fold key={index} title={item.criterio || 'Criterio ' + (index + 1)} summary={item.indicadores || 'Añadir indicadores y evidencias'}>{field('evaluation', 'criterio', {}, index)}<div className={styles.two}>{field('evaluation', 'indicadores', { rows: 2 }, index)}{field('evaluation', 'evidencias', { rows: 2 }, index)}</div></Fold>)}
                                <div className={styles.routeActions}><button type="button" disabled={config.criterios_evaluacion.length >= 12} onClick={() => setConfig('criterios_evaluacion', [...config.criterios_evaluacion, { criterio: '', indicadores: '', evidencias: '' }])}>+ Criterio</button><button type="button" disabled={config.criterios_evaluacion.length <= 1} onClick={() => setConfig('criterios_evaluacion', config.criterios_evaluacion.slice(0, -1))}>Quitar último criterio</button></div>
                            </Fold>
                            <Fold id="care-settings" title="Inclusión, seguridad y referentes" summary={(config.fuentes ? 'Fuentes añadidas' : 'Fuentes pendientes') + ' · Revisa los apoyos y cuidados'}>
                                <div className={styles.two}>{field('config', 'inclusion', { rows: 3 })}{field('config', 'seguridad', { rows: 3 })}</div>
                                {field('config', 'cuidado_cultural', { rows: 2 })}
                                {field('config', 'fuentes', { rows: 2, help: 'Registra solo referentes verificados: autoría o comunidad y procedencia.' })}
                            </Fold>
                            <Fold title="Materiales, organización y presentación" summary={config.evento.nombre || 'Recursos editables · Evento y espacios por definir'}>
                                <div className={styles.two}>{field('config', 'recursos', { rows: 2 })}{field('config', 'organizacion', { rows: 2 })}</div>
                                {field('config', 'espacios')}
                                <div className={styles.two}>{field('event', 'nombre')}<TextField label="Fecha del evento" type="date" value={config.evento.fecha} onChange={v => setConfig('evento', { ...config.evento, fecha: v })} /></div>
                                {field('config', 'conexion_planeaciones', { rows: 2 })}
                            </Fold>
                        </div>
                    </div>
                </section>

                <section hidden={step !== 2} aria-label="Currículo"><div className={styles.stack}>
                    <p className={styles.intro}>Elige los aprendizajes del catálogo. Los grupos del mismo grado y lenguaje comparten la selección; los PDA se distribuyen entre las sesiones.</p>
                    <div className={styles.curriculumStatus}>{curriculumGroups.map(group => <span key={group.id} className={gradePdas(project.vinculacion, catalog.pdas, group.grade, group.lenguaje_id).length ? styles.ready : ''}>{gradePdas(project.vinculacion, catalog.pdas, group.grade, group.lenguaje_id).length ? '✓' : '○'} {group.grade}.º · {catalog.lenguajes.find(item => String(item.id) === String(group.lenguaje_id))?.nombre} · {gradePdas(project.vinculacion, catalog.pdas, group.grade, group.lenguaje_id).length} PDA</span>)}</div>
                    {groups.length > 0 && <div className={styles.aiCurriculum}><div><strong>Ayuda para elegir</strong><span>Revisa la propuesta de IA antes de vincularla.</span></div><div className={styles.chips}>{curriculumGroups.map(group => <button key={group.id} type="button" onClick={() => suggestCurriculum(group)} disabled={Boolean(busyKey) || !group.lenguaje_id}><MagicWand /> {busyKey === group.id ? 'Buscando…' : 'Sugerir para ' + group.grade + '.º · ' + catalog.lenguajes.find(item => String(item.id) === String(group.lenguaje_id))?.nombre}</button>)}</div></div>}
                    {suggestion && <div className={styles.suggestion}><strong>Propuesta de IA para {suggestion.groupId}</strong><p>{suggestion.candidate.contenido}</p><p>PDA: {suggestion.candidate.pda}</p><p>{suggestion.justificacion}</p><div className={styles.actions}><button type="button" onClick={() => setSuggestion(null)}>Descartar</button><button type="button" className={styles.primary} onClick={applyCurriculum}>Vincular contenido y PDA</button></div></div>}
                    <div className={styles.curriculumQuick}><div className={styles.sectionHeading}><div><h2>Elige un aprendizaje por grado</h2><p>Opciones del catálogo ordenadas por coincidencias con tu tema y producto. Lee el PDA y pulsa para vincularlo.</p></div></div>{curriculumGroups.map(group => <fieldset key={group.id} className={styles.choiceField}><legend>{group.grade}.º · {catalog.lenguajes.find(item => String(item.id) === String(group.lenguaje_id))?.nombre}</legend><div className={styles.pdaChoices}>{curriculumOptions(project, catalog, group).map(({content, pda}) => <button key={pda.id} type="button" aria-pressed={selectedPdaIds.has(String(pda.id))} onClick={() => setProject(current => {
                        const linked = current.vinculacion.find(item => String(item.contenido_id) === String(content.id));
                        const exists = linked?.pda_ids?.some(id => String(id) === String(pda.id));
                        return { ...current, vinculacion: linked ? current.vinculacion.map(item => String(item.contenido_id) === String(content.id) ? { ...item, pda_ids: exists ? item.pda_ids.filter(id => String(id) !== String(pda.id)) : [...(item.pda_ids || []), pda.id] } : item) : [...current.vinculacion, { contenido_id: content.id, pda_ids: [pda.id] }] };
                    })}><span>{selectedPdaIds.has(String(pda.id)) ? '✓ Vinculado' : '+ Vincular este PDA'}</span><strong>{pda.descripcion}</strong><small>{content.descripcion}</small></button>)}</div></fieldset>)}</div>
                    <Fold title="Buscar otros contenidos y PDA" summary="Abre el catálogo completo si prefieres otro aprendizaje">
                    <TextField label="Buscar contenido estatal" value={search} onChange={setSearch} placeholder="Busca por palabra clave" />
                    <div className={styles.curriculum} data-detail={Boolean(selectedContent)}><div className={styles.results}>{filteredContents.map(item => <button key={item.id} type="button" onClick={() => setSelectedContent(item)} className={selectedContent?.id === item.id ? styles.selectedResult : ''}><span>{catalog.lenguajes.find(l => Number(l.id) === Number(item.lenguaje_id))?.nombre || 'Arte'} · {selectedIds.has(String(item.id)) ? 'Vinculado' : 'Ver PDA'}</span><strong>{item.descripcion}</strong></button>)}{!filteredContents.length && <p>No hay contenidos para esta búsqueda.</p>}</div>
                        <div className={styles.pdaPanel}>{selectedContent ? <><button className={styles.backToContents} type="button" onClick={() => setSelectedContent(null)}>← Volver a contenidos</button><h2>Contenido seleccionado</h2><p>{selectedContent.descripcion}</p><label className={styles.checkRow}><input type="checkbox" checked={selectedIds.has(String(selectedContent.id))} onChange={() => toggleContent(selectedContent.id)} />Vincular este contenido</label>{selectedIds.has(String(selectedContent.id)) && catalog.pdas.filter(pda => Number(pda.contenido_estatal_id) === Number(selectedContent.id) && selectedGrades.includes(Number(pda.grado_id))).map(pda => <label key={pda.id} className={styles.checkRow}><input type="checkbox" checked={selectedPdaIds.has(String(pda.id))} onChange={() => togglePda(selectedContent.id, pda.id)} /><span><strong>{pda.grado_id}.º:</strong> {pda.descripcion}</span></label>)}</> : <div className={styles.emptyPda}><span>←</span><h2>Elige un contenido</h2><p>Aquí verás los PDA disponibles para tus grupos.</p></div>}</div>
                    </div>
                    </Fold>
                    <Fold title="Personalizar PDA por sesión" summary="Distribución automática activa donde no hayas elegido un PDA específico">
                        {groups.map(group => <div key={group.id} className={styles.groupRow}><h3>Grupo {group.id}</h3><div className={styles.dateGrid}>{config.ruta.map((stage, index) => <div key={index} className={styles.selectField}><label htmlFor={'pda-' + group.id + '-' + index}>Sesión {index + 1} · {stage.titulo}</label><select id={'pda-' + group.id + '-' + index} value={group.pda_por_sesion?.[index] || ''} onChange={e => setGroup(group.id, 'pda_por_sesion', config.ruta.map((_, i) => i === index ? e.target.value : (group.pda_por_sesion?.[i] || '')))}><option value="">Distribuir automáticamente</option>{gradePdas(project.vinculacion, catalog.pdas, group.grade, group.lenguaje_id).map(pda => <option key={pda.id} value={pda.id}>{pda.descripcion}</option>)}</select></div>)}</div></div>)}
                    </Fold>
                </div></section>

                <section hidden={step !== 3} aria-label="Revisar"><div className={styles.stack}>
                    <p className={styles.intro}>Tu proyecto completo, listo para revisar. Después de guardarlo podrás imprimirlo y crear las planeaciones por grupo.</p>
                    <div className={styles.reviewSummary}><div><strong>{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'} · {config.ruta.length} sesiones</strong><span>{config.duracion_minutos} minutos por sesión · {selectedPdaIds.size} PDA {selectedPdaIds.size === 1 ? 'vinculado' : 'vinculados'}</span></div><button type="button" onClick={() => goTo(1)}>Editar borrador</button></div>
                    {(!config.diagnostico || !config.fuentes || !config.escuela || !curriculumReady) && <div className={styles.reviewPending}><strong>Para completar después o antes de guardar</strong><div>{!config.escuela && <button type="button" onClick={() => goTo(0, 'school-settings')}>Añadir escuela ↗</button>}{!config.diagnostico && <button type="button" onClick={() => goTo(1, 'context-settings')}>Añadir diagnóstico ↗</button>}{!config.fuentes && <button type="button" onClick={() => goTo(1, 'care-settings')}>Añadir fuentes ↗</button>}{!curriculumReady && <button type="button" onClick={() => goTo(2)}>Completar PDA (obligatorio) ↗</button>}</div></div>}
                    <ProjectDocument project={project} catalog={catalog} />
                </div></section>
            </main>
        </div>
        <footer className={styles.footer}><div><span>Paso {step + 1} de {STEPS.length}</span><div className={styles.actions}>{step > 0 && <button type="button" onClick={() => goTo(step - 1)}>← Anterior</button>}{step < STEPS.length - 1 ? <button type="button" className={styles.primary} onClick={next}>{step === 0 && !projectId && !manualEntry ? 'Preparar proyecto →' : step === 0 && !projectId && !config.starter_version ? 'Preparar mi borrador →' : step === 2 ? 'Revisar proyecto →' : 'Continuar →'}</button> : <button type="button" className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : projectId ? 'Guardar cambios' : 'Crear proyecto'}</button>}</div></div></footer>
    </div>;
}
