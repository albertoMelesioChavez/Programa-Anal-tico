'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const emptyProject = { id: null, titulo: '', contenido: '', nombre_archivo: '' };

export default function ProyectoEscolarPage() {
    const [proyectos, setProyectos] = useState([]);
    const [selected, setSelected] = useState(emptyProject);
    const [archivo, setArchivo] = useState(null);
    const [entryMode, setEntryMode] = useState('crear');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const loadProjects = async () => {
        const res = await fetch('/api/proyecto-escolar');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los proyectos.');
        setProyectos(data.proyectos || []);
        return data.proyectos || [];
    };

    useEffect(() => {
        const requestedMode = new URLSearchParams(window.location.search).get('modo');
        if (requestedMode === 'pdf') setEntryMode('pdf');
        loadProjects()
            .then((items) => !requestedMode && items[0] && setSelected(items[0]))
            .catch((error) => setMessage(error.message))
            .finally(() => setLoading(false));
    }, []);

    const selectProject = (project) => {
        setSelected(project);
        setArchivo(null);
        setEntryMode('crear');
        setMessage('');
    };

    const startNewProject = (mode) => {
        setSelected(emptyProject);
        setArchivo(null);
        setEntryMode(mode);
        setMessage('');
    };

    const saveText = async () => {
        if (!selected.titulo.trim() || !selected.contenido.trim()) {
            setMessage('Escribe un título y el contexto del proyecto escolar.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/proyecto-escolar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selected.id, titulo: selected.titulo, contenido: selected.contenido })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            setSelected(data.proyecto);
            await loadProjects();
            setMessage('Proyecto escolar guardado. Ya puede contener proyectos de arte y planeaciones.');
        } catch (error) {
            setMessage(error.message);
        } finally { setSaving(false); }
    };

    const uploadFile = async () => {
        if (!archivo) return;
        setSaving(true);
        try {
            const body = new FormData();
            if (selected.id) body.append('id', selected.id);
            body.append('titulo', selected.titulo || archivo.name);
            body.append('archivo', archivo);
            const res = await fetch('/api/proyecto-escolar', { method: 'POST', body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo procesar el archivo.');
            setSelected(data.proyecto);
            await loadProjects();
            setMessage('Documento procesado. Puedes resumir o corregir el contexto antes de usarlo.');
        } catch (error) { setMessage(error.message); }
        finally { setSaving(false); }
    };

    const theme = { bg: '#f8fafc', text: '#0f172a', subtext: '#64748b', accent: '#0f766e', border: '#dbe4e6' };
    const isNew = !selected.id;

    return (
        <main style={{ minHeight: '100vh', background: theme.bg, color: theme.text, padding: '32px 24px 72px' }}>
            <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
                <Link href="/" style={{ color: theme.accent, textDecoration: 'none', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>← INICIO</Link>
                <header style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-end', margin: '28px 0' }}>
                    <div>
                        <p style={{ color: theme.accent, fontSize: '11px', fontWeight: '900', letterSpacing: '1.5px', margin: 0 }}>CONTEXTO DE APOYO</p>
                        <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1, margin: '10px 0', fontWeight: '900', letterSpacing: '-1.8px' }}>Proyectos escolares</h1>
                        <p style={{ color: theme.subtext, maxWidth: '670px', margin: 0, lineHeight: 1.6 }}>Son documentos de contexto ya elaborados. Cada uno puede contener varios proyectos de arte y sus planeaciones.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button onClick={() => startNewProject('crear')} style={{ padding: '13px 18px', border: 'none', borderRadius: '12px', background: theme.accent, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>+ CREAR PROYECTO</button>
                        <button onClick={() => startNewProject('pdf')} style={{ padding: '13px 18px', border: `1px solid ${theme.accent}`, borderRadius: '12px', background: '#ecfdf5', color: theme.accent, fontWeight: '900', cursor: 'pointer' }}>⇧ SUBIR PDF</button>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, .8fr) minmax(0, 2fr)', gap: '24px', alignItems: 'start' }}>
                    <aside style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '16px' }}>
                        <p style={{ margin: '4px 6px 12px', color: theme.subtext, fontSize: '12px', fontWeight: '800' }}>{proyectos.length} contexto{proyectos.length === 1 ? '' : 's'} escolar{proyectos.length === 1 ? '' : 'es'}</p>
                        {loading && <p style={{ color: theme.subtext, padding: '16px 6px' }}>Cargando…</p>}
                        {!loading && proyectos.length === 0 && <p style={{ color: theme.subtext, padding: '16px 6px', lineHeight: 1.5 }}>Agrega el primer documento de contexto para comenzar.</p>}
                        {proyectos.map((project) => (
                            <button key={project.id} onClick={() => selectProject(project)} style={{ width: '100%', textAlign: 'left', marginBottom: '8px', padding: '14px', border: `1px solid ${selected.id === project.id ? theme.accent : theme.border}`, borderRadius: '12px', background: selected.id === project.id ? '#ecfdf5' : '#fff', cursor: 'pointer' }}>
                                <strong style={{ display: 'block', fontSize: '13px', color: theme.text }}>{project.titulo}</strong>
                                <span style={{ color: theme.subtext, fontSize: '11px' }}>{project.nombre_archivo || 'Contexto escrito'}</span>
                            </button>
                        ))}
                    </aside>

                    <section style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '28px' }}>
                        <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>{isNew ? (entryMode === 'pdf' ? 'Subir proyecto escolar desde PDF' : 'Crear proyecto escolar') : 'Editar proyecto escolar'}</h2>
                        <p style={{ color: theme.subtext, fontSize: '13px', margin: '0 0 18px' }}>{isNew && entryMode === 'pdf' ? 'Selecciona el PDF ya elaborado; extraeremos su contenido para usarlo como contexto.' : 'Este contenido se aplicará únicamente a los proyectos de arte que dependan de este contexto.'}</p>
                        {isNew && <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
                            <button onClick={() => setEntryMode('crear')} style={{ padding: '9px 12px', border: `1px solid ${entryMode === 'crear' ? theme.accent : theme.border}`, borderRadius: '9px', background: entryMode === 'crear' ? '#ecfdf5' : '#fff', color: theme.accent, fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>✎ CREAR DESDE CERO</button>
                            <button onClick={() => setEntryMode('pdf')} style={{ padding: '9px 12px', border: `1px solid ${entryMode === 'pdf' ? theme.accent : theme.border}`, borderRadius: '9px', background: entryMode === 'pdf' ? '#ecfdf5' : '#fff', color: theme.accent, fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>⇧ SUBIR ARCHIVO PDF</button>
                        </div>}
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, marginBottom: '7px' }}>NOMBRE DEL CONTEXTO</label>
                        <input value={selected.titulo} onChange={(e) => setSelected({ ...selected, titulo: e.target.value })} placeholder="Ej. Contexto escolar ciclo 2025–2026" style={{ width: '100%', padding: '14px', border: `1px solid ${theme.border}`, borderRadius: '12px', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }} />
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, marginBottom: '7px' }}>{entryMode === 'pdf' ? 'ARCHIVO PDF DEL PROYECTO ESCOLAR' : 'DOCUMENTO OPCIONAL (PDF, DOCX, TXT O MD)'}</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            <input type="file" accept={entryMode === 'pdf' ? '.pdf,application/pdf' : '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'} onChange={(e) => setArchivo(e.target.files?.[0] || null)} style={{ flex: '1 1 280px', padding: '11px', border: `1px dashed ${theme.border}`, borderRadius: '10px' }} />
                            <button onClick={uploadFile} disabled={!archivo || saving} style={{ padding: '11px 16px', border: 'none', borderRadius: '10px', background: '#ecfdf5', color: theme.accent, fontWeight: '900', cursor: 'pointer', opacity: !archivo || saving ? .55 : 1 }}>{saving ? 'PROCESANDO…' : 'EXTRAER TEXTO'}</button>
                        </div>
                        {selected.nombre_archivo && <p style={{ color: theme.subtext, fontSize: '12px', margin: '-10px 0 16px' }}>Documento actual: <strong>{selected.nombre_archivo}</strong></p>}
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, marginBottom: '7px' }}>CONTEXTO PARA LAS ACTIVIDADES</label>
                        <textarea value={selected.contenido} onChange={(e) => setSelected({ ...selected, contenido: e.target.value })} placeholder="Pega o revisa el texto extraído: necesidades, problemáticas y recursos de la escuela…" style={{ width: '100%', minHeight: '350px', padding: '15px', border: `1px solid ${theme.border}`, borderRadius: '12px', resize: 'vertical', lineHeight: 1.6 }} />
                        {message && <p style={{ color: message.includes('guardado') || message.includes('procesado') ? theme.accent : '#b91c1c', fontSize: '13px', fontWeight: '700' }}>{message}</p>}
                        <button onClick={saveText} disabled={saving} style={{ width: '100%', marginTop: '8px', padding: '15px', border: 'none', borderRadius: '12px', background: '#0f172a', color: '#fff', fontWeight: '900', cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? 'GUARDANDO…' : isNew ? 'GUARDAR Y USAR COMO CONTEXTO' : 'GUARDAR CAMBIOS'}</button>
                    </section>
                </div>
            </div>
        </main>
    );
}
