'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { newProjectConfig } from '@/lib/project-starter';

const initialForm = {
    escuela: '',
    ciclo: newProjectConfig().ciclo,
    fase: 'Fases 3, 4 y 5',
    grados: '1.º, 2.º, 3.º, 4.º, 5.º y 6.º de primaria',
    localidad: '',
    contexto: '',
    aprendizajes: '',
    condiciones: '',
    fortalezas: '',
    prioridades: '',
    contenidos: '',
    vinculaciones: '',
    temporalidad: '',
    estrategias: '',
    ejes: '',
    seguimiento: '',
};

function valueOr(value, fallback) {
    return value.trim() || fallback;
}

function createDocument(form) {
    const escuela = valueOr(form.escuela, 'la escuela');
    const localidad = valueOr(form.localidad, 'la comunidad');
    const contexto = valueOr(form.contexto, 'El colectivo recuperará información sobre las condiciones sociales, culturales, territoriales y económicas de la comunidad, así como las situaciones que inciden en la vida escolar.');
    const aprendizajes = valueOr(form.aprendizajes, 'Se analizarán los logros, intereses, necesidades y barreras para el aprendizaje y la participación de las niñas y los niños.');
    const condiciones = valueOr(form.condiciones, 'Se reconocerán las condiciones de infraestructura, materiales, tiempos, organización y participación de las familias y la comunidad.');
    const fortalezas = valueOr(form.fortalezas, 'El colectivo identificará saberes docentes, redes de apoyo y experiencias previas que fortalezcan el trabajo común.');
    const prioridades = valueOr(form.prioridades, 'Definir prioridades de atención que permitan avanzar en los aprendizajes y en la participación plena de las niñas y los niños.');
    const contenidos = valueOr(form.contenidos, 'Seleccionar los Contenidos nacionales pertinentes y, cuando el colectivo lo determine, contextualizarlos o formular contenidos locales o regionales.');
    const vinculaciones = valueOr(form.vinculaciones, 'Establecer relaciones entre los Campos Formativos, el Perfil de egreso, los Ejes articuladores y los Procesos de desarrollo de aprendizaje.');
    const temporalidad = valueOr(form.temporalidad, 'Organizar los contenidos a lo largo del ciclo escolar, reconociendo que pueden abordarse en diversos momentos y oportunidades.');
    const estrategias = valueOr(form.estrategias, 'Proyectos, indagación, trabajo colaborativo, diálogo con la comunidad y evaluación formativa.');
    const ejes = valueOr(form.ejes, 'Inclusión, Pensamiento crítico, Interculturalidad crítica, Igualdad de género, Vida saludable, Apropiación de las culturas a través de la lectura y la escritura, y Artes y experiencias estéticas.');
    const seguimiento = valueOr(form.seguimiento, 'Revisión periódica en colectivo y en el CTE para recuperar evidencias, ajustar acuerdos y reorientar la planeación didáctica.');

    return `# Programa Analítico\n\n## Datos de identificación\n\n- **Escuela:** ${escuela}\n- **Ciclo escolar:** ${form.ciclo}\n- **Fase:** ${form.fase}\n- **Grados:** ${form.grados}\n- **Comunidad o localidad:** ${localidad}\n\n## Primer plano: Lectura de la realidad\n\nEste Programa Analítico se construye de manera colectiva a partir de la realidad de ${escuela} y su vínculo con ${localidad}.\n\n### Contexto social, cultural y territorial\n\n${contexto}\n\n### Aprendizajes, intereses y necesidades de las niñas y los niños\n\n${aprendizajes}\n\n### Condiciones de la escuela y la comunidad\n\n${condiciones}\n\n### Fortalezas del colectivo docente\n\n${fortalezas}\n\n## Segundo plano: Contextualización\n\n### Prioridades definidas por el colectivo\n\n${prioridades}\n\n### Contenidos que se contextualizarán\n\n${contenidos}\n\n### Vinculaciones curriculares\n\n${vinculaciones}\n\n## Tercer plano: Formulación del Programa Analítico\n\n### Secuenciación y temporalidad\n\n${temporalidad}\n\n### Estrategias y metodologías de trabajo\n\n${estrategias}\n\n### Ejes articuladores presentes\n\n${ejes}\n\n### Seguimiento, revisión y ajuste\n\n${seguimiento}\n\n---\n\n*Documento de trabajo colectivo. Se revisará y ajustará de manera permanente conforme a las necesidades de la escuela y la comunidad.*`;
}

function DocumentPreview({ content }) {
    const lines = content.split('\n');
    const nodes = [];
    let paragraph = [];

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            nodes.push(<p key={`paragraph-${nodes.length}`}>{paragraph.join(' ')}</p>);
            paragraph = [];
        }
    };

    lines.forEach((line, index) => {
        const item = line.match(/^- \*\*(.+?):\*\* (.+)$/);
        if (!line.trim()) { flushParagraph(); return; }
        if (line === '---') { flushParagraph(); nodes.push(<hr key={`rule-${index}`} />); return; }
        if (line.startsWith('# ')) { flushParagraph(); nodes.push(<h1 key={`title-${index}`}>{line.slice(2)}</h1>); return; }
        if (line.startsWith('## ')) { flushParagraph(); nodes.push(<h2 key={`heading-${index}`}>{line.slice(3)}</h2>); return; }
        if (line.startsWith('### ')) { flushParagraph(); nodes.push(<h3 key={`subheading-${index}`}>{line.slice(4)}</h3>); return; }
        if (item) { flushParagraph(); nodes.push(<div className="document-meta-row" key={`meta-${index}`}><strong>{item[1]}</strong><span>{item[2]}</span></div>); return; }
        if (line.startsWith('*') && line.endsWith('*')) { flushParagraph(); nodes.push(<p className="document-note" key={`note-${index}`}>{line.slice(1, -1)}</p>); return; }
        paragraph.push(line);
    });
    flushParagraph();
    return <article className="document-sheet">{nodes}</article>;
}

export default function GeneradorProgramaAnaliticoPage() {
    const [form, setForm] = useState(initialForm);
    const [generated, setGenerated] = useState('');
    const [copied, setCopied] = useState(false);
    const [savedId, setSavedId] = useState('');
    const [savedContent, setSavedContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const preview = useMemo(() => generated || createDocument(form), [generated, form]);

    const update = (field) => (event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setGenerated(''); setCopied(false); };
    const saveProgram = async () => {
        setSaving(true); setSaveError('');
        const snapshot = preview;
        try {
            const contenido = snapshot.split(/\n(?=## (?:Primer|Segundo|Tercer) plano)/).map((part, index) => `<!-- PAGE_START ${index + 1} -->\n${part}\n<!-- PAGE_END -->`).join('\n');
            const titulo = `Programa analítico · ${form.escuela.trim() || 'Mi escuela'} · ${form.ciclo}`;
            const response = await fetch(savedId ? `/api/programas-analiticos/${savedId}` : '/api/programas-analiticos', { method: savedId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', titulo, contenido }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se guardó el programa. Puedes intentarlo de nuevo.');
            setSavedId(savedId || data.id); setSavedContent(snapshot);
        } catch (error) { setSaveError(error.message); }
        finally { setSaving(false); }
    };
    const generate = (event) => { event.preventDefault(); setGenerated(createDocument(form)); setCopied(false); };
    const copy = async () => { await navigator.clipboard.writeText(preview); setCopied(true); };
    const download = () => {
        const blob = new Blob([preview], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'programa-analitico.md';
        document.body.appendChild(anchor);
        anchor.click();
        window.setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 1000);
    };

    return (
        <main className="generator-shell">
            <header className="generator-header">
                <Link href="/" className="generator-back">← Volver al espacio de trabajo</Link>
                <p>PROGRAMA ANALÍTICO · NEM</p>
                <h1>Crea tu programa analítico</h1>
                <span>Organiza un solo documento colectivo para las Fases 3, 4 y 5 de primaria, en los tres planos propuestos por la SEP.</span>
            </header>

            <div className="generator-layout">
                <form className="generator-form" onSubmit={generate}>
                    <section>
                        <h2>Datos de identificación</h2>
                        <div className="generator-grid">
                            <label>Escuela<input value={form.escuela} onChange={update('escuela')} placeholder="Nombre de la escuela" /></label>
                            <label>Comunidad o localidad<input value={form.localidad} onChange={update('localidad')} placeholder="Ej. Culiacán, Sinaloa" /></label>
                            <label>Ciclo escolar<input value={form.ciclo} onChange={update('ciclo')} /></label>
                            <label>Fases que integra<input value={form.fase} readOnly aria-readonly="true" /></label>
                            <label className="span-full">Grados atendidos<input value={form.grados} onChange={update('grados')} /></label>
                        </div>
                    </section>

                    <section>
                        <h2>Primer plano · Lectura de la realidad</h2>
                        <label>Contexto social, cultural y territorial<textarea value={form.contexto} onChange={update('contexto')} placeholder="¿Qué sucede en la comunidad y cómo impacta en la escuela?" /></label>
                        <label>Aprendizajes, intereses y necesidades<textarea value={form.aprendizajes} onChange={update('aprendizajes')} placeholder="Logros, dificultades, intereses y características de las niñas y los niños." /></label>
                        <div className="generator-grid">
                            <label>Condiciones de la escuela<textarea value={form.condiciones} onChange={update('condiciones')} /></label>
                            <label>Fortalezas del colectivo docente<textarea value={form.fortalezas} onChange={update('fortalezas')} /></label>
                        </div>
                    </section>

                    <section>
                        <h2>Segundo plano · Contextualización</h2>
                        <label>Prioridades de atención<textarea value={form.prioridades} onChange={update('prioridades')} placeholder="¿Hacia dónde dirigirá sus esfuerzos el colectivo?" /></label>
                        <label>Contenidos y PDA a contextualizar<textarea value={form.contenidos} onChange={update('contenidos')} placeholder="Anota contenidos nacionales, contextualizados o locales." /></label>
                        <label>Vinculaciones curriculares<textarea value={form.vinculaciones} onChange={update('vinculaciones')} placeholder="Campos Formativos, Perfil de egreso, Ejes y PDA." /></label>
                    </section>

                    <section>
                        <h2>Tercer plano · Formulación</h2>
                        <label>Secuenciación y temporalidad<textarea value={form.temporalidad} onChange={update('temporalidad')} placeholder="¿Cómo se organizarán los contenidos durante el ciclo escolar?" /></label>
                        <div className="generator-grid">
                            <label>Estrategias y metodologías<textarea value={form.estrategias} onChange={update('estrategias')} /></label>
                            <label>Ejes articuladores<textarea value={form.ejes} onChange={update('ejes')} /></label>
                        </div>
                        <label>Seguimiento, revisión y ajuste<textarea value={form.seguimiento} onChange={update('seguimiento')} placeholder="Acuerdos para revisión en colectivo y CTE." /></label>
                    </section>
                    <button className="generator-submit" type="submit">Generar documento</button>
                </form>

                <aside className="generator-preview" aria-live="polite">
                    <div className="preview-heading"><div><p>VISTA PREVIA</p><h2>Documento de trabajo</h2></div><div className="preview-header-actions"><span>{generated ? 'Actualizado' : 'Plantilla'}</span><button className="copy-document-button" type="button" onClick={copy} aria-label={copied ? 'Documento copiado' : 'Copiar documento'} title={copied ? 'Documento copiado' : 'Copiar documento'}>{copied ? '✓' : '⧉'}</button></div></div>
                    <div className="document-sheet-scroll"><DocumentPreview content={preview} /></div>
                    <div className="program-save-actions">
                        <p role="status">{saving ? 'Guardando en tu cuenta…' : savedContent === preview ? 'Guardado en tu cuenta' : savedId ? 'Hay cambios sin guardar' : 'Borrador · aún no está guardado en tu cuenta'}</p>
                        {saveError && <p role="alert">{saveError}</p>}
                        <button type="button" onClick={saveProgram} disabled={saving || savedContent === preview}>{saving ? 'Guardando…' : savedId ? 'Guardar cambios' : 'Guardar programa'}</button>
                        {savedId && savedContent === preview && <div className="program-next"><Link href={`/contenidos/artes?programa=${savedId}`}>Abrir programa guardado →</Link><Link href={`/proyectos/nuevo?programa=${savedId}`}>Crear proyecto con este programa →</Link></div>}
                        <button type="button" className="download-secondary" onClick={download}>Descargar .md</button>
                    </div>
                </aside>
            </div>

            <style jsx global>{`
                .program-save-actions { padding: 20px 24px; border-top: 1px solid #e2e8f0; display: grid; gap: 12px; }
                .program-save-actions p { margin: 0; color: #475569; font-size: 14px; }
                .program-save-actions [role=alert] { color: #a32136; }
                .program-save-actions button { min-height: 44px; padding: 10px 16px; border: 0; border-radius: 10px; background: #2457c5; color: white; font: inherit; cursor: pointer; }
                .program-save-actions button:disabled { background: #e2e8f0; color: #475569; cursor: default; }
                .program-save-actions .download-secondary { background: white; border: 1px solid #cbd5e1; color: #334155; }
                .program-next { display: grid; gap: 12px; }
                .program-next a { color: #214da7; font-size: 14px; font-weight: 700; }
                .program-save-actions :focus-visible { outline: 3px solid #0f3d94; outline-offset: 3px; }
                .generator-shell { min-height: calc(100dvh - 72px); padding: 28px clamp(18px, 3vw, 40px) 56px; background: #f8fafc; color: #0f172a; }
                .generator-header { max-width: 1180px; margin: 0 auto 32px; }
                .generator-back { display: inline-block; margin-bottom: 28px; color: #0b57d0; font-size: 13px; font-weight: 500; text-decoration: none; }
                .generator-header p, .preview-heading p { margin: 0 0 8px; color: #0b57d0; font-size: 11px; font-weight: 500; letter-spacing: .12em; }
                .generator-header h1 { max-width: 720px; margin: 0; font-size: clamp(26px, 3vw, 34px); font-weight: 500; letter-spacing: -.025em; line-height: 1.2; }
                .generator-header > span { display: block; max-width: 720px; margin-top: 16px; color: #475569; font-size: 16px; line-height: 1.6; }
                .generator-layout { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr); gap: 28px; align-items: start; }
                .generator-form { display: grid; gap: 20px; }
                .generator-form section, .generator-preview { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
                .generator-form h2 { margin: 0 0 18px; font-size: 18px; letter-spacing: -.02em; }
                .generator-form label { display: grid; gap: 7px; margin-top: 14px; color: #334155; font-size: 12px; font-weight: 500; }
                .generator-form label:first-of-type { margin-top: 0; }
                .generator-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                .generator-form .span-full { grid-column: 1 / -1; }
                .generator-form input, .generator-form select, .generator-form textarea { width: 100%; min-height: 42px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; color: #0f172a; font: inherit; font-weight: 500; resize: vertical; }
                .generator-form textarea { min-height: 96px; line-height: 1.5; }
                .generator-form input:focus, .generator-form select:focus, .generator-form textarea:focus { outline: 3px solid rgba(37,99,235,.16); border-color: #0b57d0; }
                .generator-submit, .preview-actions button { min-height: 46px; border: 0; border-radius: 12px; background: #0b57d0; color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; }
                .generator-submit:hover, .preview-actions button:hover { background: #1d4ed8; }
                .generator-preview { position: sticky; top: 24px; max-height: calc(100vh - 48px); display: flex; flex-direction: column; padding: 0; overflow: hidden; }
                .preview-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 22px 24px 16px; border-bottom: 1px solid #e2e8f0; }
                .preview-heading h2 { margin: 0; font-size: 18px; }.preview-heading p { margin-bottom: 4px; }.preview-header-actions { display: flex; align-items: center; gap: 8px; }.preview-header-actions > span { color: #047857; font-size: 11px; font-weight: 500; }.copy-document-button { display: inline-grid; place-items: center; width: 36px; height: 36px; border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; color: #1d4ed8; cursor: pointer; font-size: 18px; font-weight: 500; }.copy-document-button:hover { background: #dbeafe; }.copy-document-button:focus-visible { outline: 3px solid rgba(37,99,235,.28); outline-offset: 2px; }
                .document-sheet-scroll { flex: 1; overflow: auto; padding: 20px; background: #e2e8f0; }
                .document-sheet { min-height: 100%; padding: 44px 38px 52px; background: #fff; color: #334155; box-shadow: 0 4px 14px rgba(15,23,42,.12); font-size: 14px; line-height: 1.75; }
                .document-sheet h1 { margin: 0 0 28px; padding-bottom: 18px; border-bottom: 2px solid #1d4ed8; color: #0f172a; font-size: 30px; line-height: 1.1; letter-spacing: -.035em; }
                .document-sheet h2 { margin: 34px 0 14px; padding-top: 18px; border-top: 1px solid #cbd5e1; color: #1d4ed8; font-size: 20px; line-height: 1.2; }
                .document-sheet h3 { margin: 24px 0 8px; color: #0f172a; font-size: 15px; line-height: 1.35; }
                .document-sheet p { margin: 0 0 16px; }.document-sheet hr { margin: 32px 0 18px; border: 0; border-top: 1px solid #cbd5e1; }
                .document-meta-row { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 12px; padding: 9px 0; border-bottom: 1px solid #e2e8f0; }.document-meta-row strong { color: #0f172a; }.document-note { color: #64748b; font-size: 12px; font-style: italic; }
                .preview-actions { padding: 16px 24px 22px; border-top: 1px solid #e2e8f0; }.preview-actions button { width: 100%; }
                @media (max-width: 900px) { .generator-layout { grid-template-columns: 1fr; }.generator-preview { position: static; max-height: none; }.document-sheet-scroll { max-height: 680px; } }
                @media (max-width: 560px) { .generator-shell { padding: 28px 14px 48px; }.generator-header { margin-bottom: 22px; }.generator-header h1 { font-size: 34px; }.generator-header > span { font-size: 15px; }.generator-grid, .preview-actions { grid-template-columns: 1fr; }.generator-form section { padding: 18px; }.document-sheet-scroll { padding: 12px; }.document-sheet { padding: 30px 22px; font-size: 13px; }.document-sheet h1 { font-size: 26px; }.document-meta-row { grid-template-columns: 1fr; gap: 1px; }.generator-back { margin-bottom: 22px; } }
            `}</style>
        </main>
    );
}
