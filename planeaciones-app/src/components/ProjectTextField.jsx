'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './ProjectWizard.module.css';

const FIELD_DESCRIPTIONS = {
    'Título del proyecto': 'Escribe el nombre que identificará tu proyecto artístico.',
    'Temática central': 'Describe el tema o la situación que quieres trabajar con tus grupos.',
    'Fundamentación del proyecto': 'Explica por qué es relevante el proyecto y cómo se relaciona con el contexto del grupo.',
    'Producto final y socialización': 'Describe qué crearán, a quién se lo compartirán y cómo lo presentarán.',
    'Escuela': 'Escribe el nombre de tu escuela.',
    'Docente': 'Escribe el nombre de quien coordina el proyecto.',
    'Ciclo escolar': 'Indica los años que abarca el ciclo escolar.',
    'Nombre del proyecto escolar': 'Escribe el nombre del proyecto acordado por la escuela, si existe.',
    'Vinculación con el proyecto escolar': 'Describe cómo aporta este proyecto artístico al trabajo de la escuela.',
    'Diagnóstico y lectura de la realidad': 'Describe los intereses, saberes y necesidades que has observado en tus grupos.',
    'Problema o pregunta guía': 'Escribe la pregunta que orientará la exploración y la creación artística.',
    'Propósito general': 'Describe qué aprenderán y qué lograrán a través del proyecto.',
    'Metodología': 'Explica cómo organizarás la exploración, la creación y la reflexión.',
    'Valor que se trabajará': 'Indica el valor que quieres promover durante el proyecto.',
    'Espacios de trabajo': 'Indica los espacios que podrán utilizar para las actividades.',
    'Fuentes y referentes verificables': 'Anota los referentes que usarán, su autoría o comunidad y su procedencia.',
    'Cuidado cultural y reconocimiento de autorías': 'Describe cómo reconocerán las autorías y respetarán las expresiones culturales.',
    'Inclusión y apoyos': 'Describe las adaptaciones y los apoyos para que todas las personas participen.',
    'Seguridad y cuidado': 'Indica las medidas de cuidado para los materiales, los espacios y las actividades.',
    'Evaluación formativa': 'Explica cómo observarás los avances y darás retroalimentación durante el proceso.',
    'Recursos y gestión': 'Indica los materiales y las herramientas disponibles y los que faltan por conseguir.',
    'Organización y participación': 'Describe cómo se organizarán los equipos y sus responsabilidades.',
    'Conexión con las planeaciones': 'Explica qué aspectos del proyecto retomarán las planeaciones de cada grupo.',
    'Nombre de la etapa': 'Escribe un nombre breve para esta sesión.',
    'Propósito de la sesión': 'Describe qué lograrán en esta sesión y cómo avanzará el proyecto.',
    'Actividad central': 'Describe qué harán, cómo lo harán y cómo cerrarán la actividad.',
    'Evidencia': 'Indica qué registro o producción permitirá reconocer lo aprendido.',
    'Criterios observables': 'Describe qué observarás para reconocer los avances de esta sesión.',
    'Recursos de la sesión': 'Anota los materiales y las herramientas necesarios para esta actividad.',
    'Producto artístico del grupo': 'Describe la producción que realizará este grupo según su grado y lenguaje artístico.',
    'Evento o socialización final': 'Escribe el nombre o describe la actividad en la que compartirán sus producciones.',
    'Criterio de evaluación': 'Escribe el aspecto del aprendizaje que vas a valorar.',
    'Indicadores de avance': 'Describe las acciones observables que mostrarán progreso.',
    'Evidencias e instrumentos': 'Indica qué registros e instrumentos usarás para valorar este criterio.'
};

export function MagicWand() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5 5 5L7 22l-5-5L14 5Z M11 8l5 5 M5 2v4 M3 4h4 M20 1v4 M18 3h4 M20 15v4 M18 17h4" /></svg>;
}

export default function ProjectTextField({ label, value = '', onChange, rows = 0, placeholder, help, onAssist, required = false, type = 'text', min, max }) {
    const id = useId();
    const requestRef = useRef(null);
    const inputRef = useRef(null);
    const buttonRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [proposal, setProposal] = useState(null);
    const [applied, setApplied] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => () => requestRef.current?.abort(), []);
    useEffect(() => {
        if (!rows || !inputRef.current) return;
        const input = inputRef.current;
        const resize = () => {
            if (!input.getClientRects().length) return;
            input.style.height = 'auto';
            input.style.height = Math.min(180, Math.max(48, input.scrollHeight)) + 'px';
        };
        resize();
        let width = 0;
        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width !== width) { width = entry.contentRect.width; resize(); }
        });
        observer.observe(input);
        return () => observer.disconnect();
    }, [value, rows]);

    async function propose() {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setBusy(true); setError('');
        try {
            const result = await onAssist(controller.signal);
            if (!controller.signal.aborted) setProposal({ ...result, original: value });
        } catch (cause) {
            if (!controller.signal.aborted) setError(cause.message || 'No se pudo generar la propuesta. Intenta de nuevo.');
        } finally {
            if (!controller.signal.aborted) setBusy(false);
        }
    }

    const inputProps = { id, ref: inputRef, value: value ?? '', onChange: event => onChange(event.target.value), placeholder: placeholder || FIELD_DESCRIPTIONS[label], required, 'aria-describedby': help ? `${id}-help` : undefined };
    return <div className={styles.field}>
        <div className={styles.inputShell}>
        <div className={styles.fieldTop}>
            <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
            {onAssist && <button ref={buttonRef} type="button" className={styles.assist} onClick={propose} disabled={busy} title={`Proponer ${label.toLowerCase()} con IA usando todo el formulario`} aria-label={`Proponer ${label.toLowerCase()} con IA`} aria-expanded={Boolean(proposal)} aria-controls={proposal ? `${id}-proposal` : undefined}><MagicWand /><span>{busy ? 'Pensando…' : 'IA'}</span></button>}
        </div>
        {rows ? <textarea {...inputProps} rows={2} onFocus={event => { event.currentTarget.style.height = Math.min(240, Math.max(72, event.currentTarget.scrollHeight)) + 'px'; }} /> : <input {...inputProps} type={type} min={min} max={max} />}
        </div>
        {help && <small id={`${id}-help`}>{help}</small>}
        {busy && <small role="status">Preparando una propuesta con el contexto del proyecto…</small>}
        {error && <p role="alert" className={styles.fieldError}>{error}</p>}
        {applied && value === applied.text && <div className={styles.appliedProposal} role="status"><span>Propuesta aplicada.</span><button type="button" onClick={() => { onChange(applied.original); setApplied(null); inputRef.current?.focus(); }}>Deshacer propuesta</button></div>}
        {proposal && <div id={`${id}-proposal`} className={styles.fieldProposal}>
            <strong role="status">{proposal.mode === 'cloud' ? 'Propuesta de IA' : 'Borrador local · IA sin conectar'}</strong>
            <small>{proposal.mode === 'cloud' ? 'Puedes ajustar la propuesta antes de aplicarla.' : 'Esta es una plantilla orientativa adaptada a tus datos, no una respuesta generada por IA.'}</small>
            <label className={styles.proposalLabel} htmlFor={`${id}-draft`}>Propuesta para {label.toLowerCase()}</label>
            <textarea id={`${id}-draft`} rows={Math.max(3, rows)} value={proposal.text} onChange={event => setProposal({ ...proposal, text: event.target.value })} />
            {value !== proposal.original && <small>Has cambiado el campo mientras revisabas la propuesta. Aplicarla reemplazará su texto actual.</small>}
            <div className={styles.actions}>
                <button type="button" onClick={() => { setProposal(null); buttonRef.current?.focus(); }}>Descartar</button>
                <button type="button" className={styles.primary} disabled={busy || !proposal.text.trim()} onClick={() => { const text = proposal.text.trim(); setApplied({ original: value, text }); onChange(text); setProposal(null); inputRef.current?.focus(); }}>Aplicar al campo</button>
            </div>
        </div>}
    </div>;
}
