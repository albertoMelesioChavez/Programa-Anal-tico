'use client';

import { useMemo, useState } from 'react';

function EditorShell({ tone, children, message }) {
    return (
        <div className={`inline-editor ${tone}`} onClick={(event) => event.stopPropagation()}>
            {children}
            {message && <p className={`editor-message ${message.type}`}>{message.text}</p>}
            <style jsx global>{`
                .inline-editor { margin-top: 18px; padding: 20px; border-radius: 15px; border: 1px solid #cbd5e1; background: #f8fafc; animation: reveal .2s ease-out; }
                .inline-editor.school { border-color: #99f6e4; background: #f0fdfa; }
                .inline-editor.art { border-color: #ddd6fe; background: #faf5ff; }
                .editor-message { margin: 12px 0 0; font-size: 12px; font-weight: 800; }
                .editor-message.success { color: #047857; }
                .editor-message.error { color: #b91c1c; }
                @keyframes reveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

export function SchoolInlineEditor({ project = {}, onSaved, onCancel }) {
    const isNew = !project.id;
    const [draft, setDraft] = useState({ titulo: project.titulo || '', contenido: project.contenido || '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const save = async () => {
        if (!draft.titulo.trim() || !draft.contenido.trim()) {
            setMessage({ type: 'error', text: 'El título y el contexto son obligatorios.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch('/api/proyecto-escolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...(project.id ? { id: project.id } : {}), ...draft })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
            setMessage({ type: 'success', text: isNew ? 'Proyecto escolar creado.' : 'Proyecto escolar actualizado.' });
            await onSaved();
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <EditorShell tone="school" message={message}>
            <div className="editor-heading"><div><span>{isNew ? 'NUEVO PROYECTO ESCOLAR' : 'EDITAR PROYECTO ESCOLAR'}</span><h4>Contexto que usarán sus proyectos de arte</h4></div>{project.nombre_archivo && <small>Archivo original: {project.nombre_archivo}</small>}</div>
            <div className="editor-grid one">
                <label>Nombre del proyecto<input value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} /></label>
                <label>Contexto, problemáticas y recursos<textarea rows="10" value={draft.contenido} onChange={(event) => setDraft({ ...draft, contenido: event.target.value })} /></label>
            </div>
            <EditorActions saving={saving} onSave={save} onCancel={onCancel} isNew={isNew} />
            <SharedStyles />
        </EditorShell>
    );
}

function normalizeProducts(products) {
    const source = products && !Array.isArray(products) ? products : {};
    return Object.fromEntries([1, 2, 3, 4, 5, 6].map((grade) => [
        `grado${grade}`,
        Array.isArray(source[`grado${grade}`]) ? source[`grado${grade}`].join('\n') : ''
    ]));
}

export function ArtInlineEditor({ project = {}, schoolProjects, onSaved, onCancel }) {
    const isNew = !project.id;
    const [draft, setDraft] = useState({
        proyecto_escolar_id: String(project.proyecto_escolar_id || ''),
        titulo: project.titulo || '',
        tematica: project.tematica || '',
        introduccion: project.introduccion || '',
        productsText: normalizeProducts(project.productos)
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const products = useMemo(() => Object.fromEntries(Object.entries(draft.productsText).map(([key, value]) => [
        key,
        value.split('\n').map((item) => item.trim()).filter(Boolean)
    ])), [draft.productsText]);

    const save = async () => {
        if (!draft.proyecto_escolar_id || !draft.titulo.trim()) {
            setMessage({ type: 'error', text: 'Selecciona el proyecto escolar y escribe un título.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch(isNew ? '/api/proyectos' : `/api/proyectos/${project.id}`, {
                method: isNew ? 'POST' : 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...project,
                    proyecto_escolar_id: draft.proyecto_escolar_id,
                    titulo: draft.titulo,
                    tematica: draft.tematica,
                    introduccion: draft.introduccion,
                    productos: products
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
            setMessage({ type: 'success', text: isNew ? 'Proyecto de arte creado.' : 'Proyecto de arte actualizado.' });
            await onSaved();
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <EditorShell tone="art" message={message}>
            <div className="editor-heading"><div><span>{isNew ? 'NUEVO PROYECTO DE ARTE' : 'EDITAR PROYECTO DE ARTE'}</span><h4>Enfoque y productos esperados</h4></div>{project.nombre_archivo && <small>Archivo original: {project.nombre_archivo}</small>}</div>
            <div className="editor-grid two">
                <label>Dentro del proyecto escolar<select value={draft.proyecto_escolar_id} onChange={(event) => setDraft({ ...draft, proyecto_escolar_id: event.target.value })}><option value="">Selecciona…</option>{schoolProjects.map((school) => <option key={school.id} value={school.id}>{school.titulo}</option>)}</select></label>
                <label>Título<input value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} /></label>
                <label className="full">Temática<input value={draft.tematica} onChange={(event) => setDraft({ ...draft, tematica: event.target.value })} /></label>
                <label className="full">Introducción y sustento<textarea rows="8" value={draft.introduccion} onChange={(event) => setDraft({ ...draft, introduccion: event.target.value })} /></label>
            </div>
            <div className="products-heading"><span>PRODUCTOS ESPERADOS</span><small>Uno por línea</small></div>
            <div className="products-grid">
                {[1, 2, 3, 4, 5, 6].map((grade) => <label key={grade}>{grade}º grado<textarea rows="3" value={draft.productsText[`grado${grade}`]} onChange={(event) => setDraft({ ...draft, productsText: { ...draft.productsText, [`grado${grade}`]: event.target.value } })} /></label>)}
            </div>
            {Array.isArray(project.vinculacion) && project.vinculacion.length > 0 && <p className="preserved-note">La vinculación con {project.vinculacion.length} contenido{project.vinculacion.length === 1 ? '' : 's'} del Programa Analítico se conservará.</p>}
            <EditorActions saving={saving} onSave={save} onCancel={onCancel} isNew={isNew} />
            <SharedStyles />
        </EditorShell>
    );
}

function EditorActions({ saving, onSave, onCancel, isNew = false }) {
    return <div className="editor-actions"><button type="button" onClick={onCancel}>CERRAR</button><button type="button" className="save" onClick={onSave} disabled={saving}>{saving ? 'GUARDANDO…' : isNew ? 'CREAR PROYECTO' : 'GUARDAR CAMBIOS'}</button></div>;
}

function SharedStyles() {
    return <style jsx global>{`
        .inline-editor .editor-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 17px; }
        .inline-editor .editor-heading span, .inline-editor .products-heading span { color: #64748b; font-size: 8px; font-weight: 900; letter-spacing: 1.5px; }
        .inline-editor .editor-heading h4 { margin: 3px 0 0; font-size: 15px; }
        .inline-editor .editor-heading small { color: #64748b; font-size: 9px; }
        .inline-editor .editor-grid { display: grid; gap: 13px; }
        .inline-editor .editor-grid.two { grid-template-columns: 1fr 1fr; }
        .inline-editor .editor-grid .full { grid-column: 1 / -1; }
        .inline-editor label { color: #475569; font-size: 9px; font-weight: 900; letter-spacing: .45px; text-transform: uppercase; }
        .inline-editor input, .inline-editor select, .inline-editor textarea { width: 100%; margin-top: 5px; padding: 10px 11px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #0f172a; font: 500 12px/1.5 inherit; text-transform: none; outline: none; resize: vertical; }
        .inline-editor input:focus, .inline-editor select:focus, .inline-editor textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
        .inline-editor .products-heading { display: flex; justify-content: space-between; margin: 18px 0 8px; }
        .inline-editor .products-heading small { color: #94a3b8; font-size: 9px; }
        .inline-editor .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .inline-editor .preserved-note { margin: 12px 0 0; padding: 9px 11px; border-radius: 8px; background: rgba(255,255,255,.75); color: #6d28d9; font-size: 10px; font-weight: 700; }
        .inline-editor .editor-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px; padding-top: 15px; border-top: 1px solid rgba(148,163,184,.3); }
        .inline-editor .editor-actions button { padding: 10px 15px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #475569; font-size: 10px; font-weight: 900; cursor: pointer; }
        .inline-editor .editor-actions .save { border-color: #2563eb; background: #2563eb; color: #fff; }
        .inline-editor .editor-actions button:disabled { opacity: .6; }
        @media (max-width: 760px) { .inline-editor .editor-grid.two, .inline-editor .products-grid { grid-template-columns: 1fr; } .inline-editor .editor-grid .full { grid-column: auto; } }
    `}</style>;
}
