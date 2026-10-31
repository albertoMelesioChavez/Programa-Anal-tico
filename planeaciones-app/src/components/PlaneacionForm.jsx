'use client';

import { useState, useEffect, useRef } from 'react';
import pdasCatalog from '@/lib/data/pdas.json';

function pdaSelectionsFrom(initialData) {
    const source = initialData?.pda_por_grado;
    const entries = Array.isArray(source)
        ? source
        : typeof source === 'string'
            ? (() => { try { return JSON.parse(source); } catch { return []; } })()
            : [];

    if (Array.isArray(entries) && entries.length > 0) {
        return Object.fromEntries(entries.map((item) => [String(item.grado_id), String(item.pda_id || '')]));
    }

    return initialData?.grado_id && initialData?.pda_id
        ? { [String(initialData.grado_id)]: String(initialData.pda_id) }
        : {};
}

function textSelectionsFrom(initialData, field, legacyField) {
    const source = initialData?.[field];
    const entries = Array.isArray(source)
        ? source
        : typeof source === 'string'
            ? (() => { try { return JSON.parse(source); } catch { return []; } })()
            : [];

    if (Array.isArray(entries) && entries.length > 0) {
        return Object.fromEntries(entries.map((item) => [String(item.grado_id), item.texto || '']));
    }

    return initialData?.grado_id && initialData?.[legacyField]
        ? { [String(initialData.grado_id)]: initialData[legacyField] }
        : {};
}

export default function PlaneacionForm({ initialData, onSaved, onCancel, embedded = false }) {
    const titleRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    const [proyectosArte, setProyectosArte] = useState([]);
    const [programasAnaliticos, setProgramasAnaliticos] = useState([]);

    const [formData, setFormData] = useState({
        titulo: '',
        fase_id: '',
        grado_id: '',
        lenguaje_id: '',
        contenido_nacional_id: '',
        contenido_estatal_id: '',
        pda_id: '',
        pda_por_grado: {},
        evaluacion_por_grado: {},
        recursos_por_grado: {},
        evidencias_por_grado: {},
        proyecto_arte_id: '',
        programa_analitico_id: '',
        valor_mensual: '',
        ejes_articuladores: '',
        metodologia: '',
        secuencia_inicio: '',
        secuencia_desarrollo: '',
        secuencia_cierre: '',
        evaluacion: '',
        recursos: '',
        evidencias: '',
        actividades: ''
        ,grupo: '', fecha_clase: '', numero_sesion: '', duracion_minutos: 50,
        proposito: '', criterios: '', ajustes: '', observaciones: '', estado: 'borrador', origen_borrador: ''
    });

    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Cargar datos iniciales si estamos en modo edición
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Asegurar que los IDs sean strings para los selects
                fase_id: initialData.fase_id?.toString() || '',
                grado_id: initialData.grado_id?.toString() || '',
                lenguaje_id: initialData.lenguaje_id?.toString() || '',
                contenido_nacional_id: initialData.contenido_nacional_id?.toString() || '',
                contenido_estatal_id: initialData.contenido_estatal_id?.toString() || '',
                pda_id: initialData.pda_id?.toString() || '',
                pda_por_grado: pdaSelectionsFrom(initialData),
                evaluacion_por_grado: textSelectionsFrom(initialData, 'evaluacion_por_grado', 'evaluacion'),
                recursos_por_grado: textSelectionsFrom(initialData, 'recursos_por_grado', 'recursos'),
                evidencias_por_grado: textSelectionsFrom(initialData, 'evidencias_por_grado', 'evidencias'),
                proyecto_arte_id: initialData.proyecto_arte_id?.toString() || '',
                programa_analitico_id: initialData.programa_analitico_id?.toString() || '',
                valor_mensual: initialData.valor_mensual || '',
                ejes_articuladores: initialData.ejes_articuladores || '',
                evidencias: initialData.evidencias || '',
            });
        }
    }, [initialData]);

    useEffect(() => {
        fetch('/api/catalogos')
            .then(res => res.ok ? res.json() : null)
            .then(data => data && setCatalogs(data))
            .catch(err => console.error("Error loading catalogs:", err));

        fetch('/api/proyectos')
            .then(res => res.ok ? res.json() : [])
            .then(data => setProyectosArte(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error loading art projects:', err));
        fetch('/api/programas-analiticos')
            .then(res => res.ok ? res.json() : [])
            .then(data => setProgramasAnaliticos(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error loading analytic programs:', err));
    }, []);

    useEffect(() => {
        const phaseGrades = (catalogs.grados || [])
            .filter((grade) => String(grade.fase_id) === String(formData.fase_id))
            .sort((a, b) => Number(a.id) - Number(b.id));
        const firstGradeId = phaseGrades[0]?.id?.toString() || '';

        if (firstGradeId && !formData.grupo && formData.grado_id !== firstGradeId) {
            setFormData((current) => ({ ...current, grado_id: firstGradeId }));
        }
    }, [catalogs.grados, formData.fase_id, formData.grado_id, formData.grupo]);

    useEffect(() => {
        if (formData.fase_id && formData.lenguaje_id) {
            fetch(`/api/contenidos?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.ok ? res.json() : { nacionales: [], estatales: [] })
                .then(data => setContenidos(data))
                .catch(() => setContenidos({ nacionales: [], estatales: [] }));
        }
    }, [formData.fase_id, formData.lenguaje_id]);

    useEffect(() => {
        const cId = formData.contenido_nacional_id || formData.contenido_estatal_id;
        if (cId) {
            fetch(`/api/pdas?contenido_id=${cId}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setPdas(data))
                .catch(() => setPdas([]));
        } else {
            setPdas([]);
        }
    }, [formData.contenido_nacional_id, formData.contenido_estatal_id]);

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.titulo?.trim()) newErrors.titulo = true;
        if (!formData.fase_id) newErrors.fase_id = true;
        if (filteredGrados.length !== (formData.grupo ? 1 : 2)) newErrors.fase_id = true;
        if (!formData.lenguaje_id) newErrors.lenguaje_id = true;
        if (!formData.proyecto_arte_id) newErrors.proyecto_arte_id = true;
        if (filteredGrados.some((grade) => !formData.pda_por_grado?.[String(grade.id)])) newErrors.pdas = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generateAISequence = async () => {
        const pdaPorGrado = filteredGrados.map((grade) => ({
            grado: grade,
            pda: allAvailablePdas.find((item) => String(item.id) === String(formData.pda_por_grado?.[String(grade.id)]))
        }));

        if (pdaPorGrado.length !== (formData.grupo ? 1 : 2) || pdaPorGrado.some((item) => !item.pda)) {
            alert("Selecciona un PDA para el grado del grupo.");
            return;
        }

        const selectedContenido = formData.contenido_estatal_id
            ? (contenidos.estatales || []).find(c => c.id == formData.contenido_estatal_id)
            : (contenidos.nacionales || []).find(c => c.id == formData.contenido_nacional_id);
        const selectedProyectoArte = proyectosArte.find(p => p.id == formData.proyecto_arte_id);
        const gradosConPda = pdaPorGrado.map(({ grado, pda }) => ({
            grado: grado.nombre,
            pda: pda.descripcion,
            productos: selectedProyectoArte?.productos?.[`grado${Number(grado.id)}`] || []
        }));

        setIsGeneratingAI(true);
        try {
            const prompt = `Genera una secuencia didáctica completa (Inicio, Desarrollo, Cierre) para una clase de primaria.
            REGLAS PEDAGÓGICAS:
            1. El contenido y el PDA del plan analítico son la base curricular obligatoria: cada momento debe contribuir explícitamente a su aprendizaje.
            2. Vincula la temática y el producto del proyecto del maestro de arte seleccionado.
            3. Integra el valor mensual de manera natural en acciones, convivencia o reflexión, únicamente cuando se haya proporcionado.
            Metodología sugerida: ${formData.metodologia || 'Aprendizaje Basado en Proyectos'}.
            Quiero que el resultado sea un JSON con las claves: "inicio", "desarrollo", "cierre", "metodologia_sugerida", "evaluacion_sugerida", "recursos_sugeridos".
            5. ${formData.grupo ? `La planeación atiende al grupo ${formData.grupo} y su producto específico.` : 'La planeación atiende a dos grados de la misma fase. Diferencia las consignas, productos o apoyos para cada grado según su PDA.'}
            Sé creativo, usa actividades lúdicas acordes a ambos grados y evita inventar datos que no estén en el contexto.`;

            const context = {
                grado: gradosConPda.map((item) => item.grado).join(' y '),
                contenido: selectedContenido?.descripcion,
                pda: gradosConPda.map((item) => `${item.grado}: ${item.pda}`).join('\n'),
                grados_y_pdas: gradosConPda,
                ejes: formData.ejes_articuladores,
            proyecto_del_maestro_de_arte: selectedProyectoArte ? {
                    titulo: selectedProyectoArte.titulo,
                    tematica: selectedProyectoArte.tematica,
                    sustento: selectedProyectoArte.introduccion,
                    productos_por_grado: gradosConPda.map((item) => ({ grado: item.grado, productos: item.productos }))
                } : null,
                valor_mensual: formData.valor_mensual?.trim() || null
            };

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.details || data.error);

            const jsonMatch = data.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);
                setFormData(prev => ({
                    ...prev,
                    secuencia_inicio: aiData.inicio || prev.secuencia_inicio,
                    secuencia_desarrollo: aiData.desarrollo || prev.secuencia_desarrollo,
                    secuencia_cierre: aiData.cierre || prev.secuencia_cierre,
                    metodologia: aiData.metodologia_sugerida || prev.metodologia,
                    evaluacion: aiData.evaluacion_sugerida || prev.evaluacion,
                    recursos: aiData.recursos_sugeridos || prev.recursos,
                    evaluacion_por_grado: Object.fromEntries(filteredGrados.map((grado) => [String(grado.id), prev.evaluacion_por_grado?.[String(grado.id)] || aiData.evaluacion_sugerida || ''])),
                    recursos_por_grado: Object.fromEntries(filteredGrados.map((grado) => [String(grado.id), prev.recursos_por_grado?.[String(grado.id)] || aiData.recursos_sugeridos || '']))
                }));
            } else {
                setFormData(prev => ({ ...prev, secuencia_desarrollo: data.text }));
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert("No se pudo generar la planeación: " + error.message);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSave = async () => {
        if (!validate()) {
            alert('Completa título, fase, lenguaje, PDA y proyecto de contexto.');
            return;
        }

        setLoading(true);
        try {
            const isEdit = !!formData.id;
            const url = isEdit ? `/api/planeaciones/${formData.id}` : '/api/planeaciones';
            const method = isEdit ? 'PUT' : 'POST';

            const pdaPorGrado = filteredGrados.map((grade) => {
                const pdaId = formData.pda_por_grado?.[String(grade.id)] || '';
                const selectedPda = allAvailablePdas.find((item) => String(item.id) === String(pdaId));
                return {
                    grado_id: String(grade.id),
                    grado_nombre: grade.nombre,
                    pda_id: String(pdaId),
                    pda_descripcion: selectedPda?.descripcion || ''
                };
            });
            const textosPorGrado = (field) => filteredGrados.map((grade) => ({
                grado_id: String(grade.id),
                grado_nombre: grade.nombre,
                texto: formData[field]?.[String(grade.id)] || ''
            }));
            const evaluacionPorGrado = textosPorGrado('evaluacion_por_grado');
            const recursosPorGrado = textosPorGrado('recursos_por_grado');
            const evidenciasPorGrado = textosPorGrado('evidencias_por_grado');
            const submissionData = {
                ...formData,
                fase_id: formData.fase_id?.toString(),
                grado_id: filteredGrados[0]?.id?.toString() || formData.grado_id?.toString(),
                lenguaje_id: formData.lenguaje_id?.toString(),
                contenido_nacional_id: formData.contenido_nacional_id?.toString() || null,
                contenido_estatal_id: formData.contenido_estatal_id?.toString() || null,
                proyecto_arte_id: formData.proyecto_arte_id?.toString() || null,
                programa_analitico_id: formData.programa_analitico_id?.toString() || null,
                pda_id: pdaPorGrado[0]?.pda_id || null,
                pda_por_grado: pdaPorGrado,
                evaluacion_por_grado: evaluacionPorGrado,
                recursos_por_grado: recursosPorGrado,
                evidencias_por_grado: evidenciasPorGrado,
                evaluacion: evaluacionPorGrado[0]?.texto || '',
                recursos: recursosPorGrado[0]?.texto || '',
                evidencias: evidenciasPorGrado[0]?.texto || ''
            };

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });
            if (res.ok) {
                onSaved();
            } else {
                const err = await res.json();
                alert('Error al guardar: ' + (err.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error crítico de red');
        }
        setLoading(false);
    };

    const toggleEje = (nombre) => {
        const current = formData.ejes_articuladores ? formData.ejes_articuladores.split(', ') : [];
        const next = current.includes(nombre)
            ? current.filter(e => e !== nombre)
            : [...current, nombre];
        setFormData({ ...formData, ejes_articuladores: next.join(', ') });
    };

    const filteredGrados = (catalogs?.grados || [])
        .filter(g => g.fase_id == formData.fase_id && (!formData.grupo || String(g.id) === String(formData.grado_id)))
        .sort((a, b) => Number(a.id) - Number(b.id));
    const allAvailablePdas = Array.from(new Map([...(pdas || []), ...pdasCatalog].map((pda) => [String(pda.id), pda])).values());
    const contenidoSeleccionado = formData.contenido_estatal_id
        ? `estatal:${formData.contenido_estatal_id}`
        : formData.contenido_nacional_id
            ? `nacional:${formData.contenido_nacional_id}`
            : '';

    const handleContenidoChange = (value) => {
        const [tipo, id] = value.split(':');
        setFormData({
            ...formData,
            contenido_nacional_id: tipo === 'nacional' ? id : '',
            contenido_estatal_id: tipo === 'estatal' ? id : '',
            pda_id: '',
            pda_por_grado: {}
        });
    };

    // Theme Variables
    useEffect(() => {
        const field = titleRef.current;
        if (!field) return;
        const resize = () => { field.style.height = 'auto'; field.style.height = field.scrollHeight + 'px'; };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [formData.titulo]);

    const theme = {
        docBg: '#ffffff',
        text: '#0f172a',
        subtext: '#64748b',
        border: '#e2e8f0',
        sectionBg: '#f8fafc',
        accent: '#0b57d0',
        success: '#10b981'
    };

    return (
        <div className={`form-page-container ${embedded ? 'embedded-planeacion-form' : ''}`} style={{ minHeight: embedded ? 'auto' : '100%', background: theme.docBg, position: 'relative', display: 'flex', flexDirection: 'column' }} onClick={embedded ? (event) => event.stopPropagation() : undefined}>

            {/* Main Scrollable Content */}
            <div style={{ flex: 1, paddingBottom: embedded ? '0' : '120px' }}>
                <div className="document-paper" style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    padding: embedded ? '24px 8px' : '40px 40px',
                    background: '#fff'
                }}>
                    {/* Header Section */}
                    <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                        <textarea
                            ref={titleRef}
                            rows={1}
                            value={formData.titulo}
                            onChange={(e) => {
                                setFormData({...formData, titulo: e.target.value});
                                if (errors.titulo) setErrors({...errors, titulo: false});
                            }}
                            aria-label="Título de la planeación"
                            placeholder="Escribe el título de la planeación"
                            style={{
                                width: '100%',
                                border: 'none',
                                borderBottom: errors.titulo ? '2px solid #ef4444' : `2px solid ${theme.border}`,
                                textAlign: 'center',
                                fontSize: 'clamp(20px, 3vw, 26px)', resize: 'none', overflow: 'hidden', lineHeight: '1.35',
                                fontWeight: '500',
                                color: theme.text,
                                background: 'transparent',
                                outline: 'none',
                                padding: '6px',
                                textTransform: 'none',
                                letterSpacing: '-0.5px'
                            }}
                        />
                        <p style={{ color: theme.subtext, fontSize: '12px', marginTop: '8px', fontWeight: '500', letterSpacing: 'normal' }}>
                            {formData.id ? 'Editando tu planeación' : 'Nueva planeación'}
                        </p>
                    </div>

                    {formData.grupo && <div style={{ marginBottom: '20px', padding: '18px', borderRadius: '10px', background: '#f8fafd', border: '1px solid #dce3ed' }}>
                        <strong style={{ display: 'block', marginBottom: '12px', color: '#0b57d0' }}>Sesión del grupo {formData.grupo} · {{ borrador: 'Borrador', revisada: 'Revisada', aplicada: 'Aplicada' }[formData.estado] || 'Borrador'}</strong>
                        <div className="responsive-meta-grid session-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {[['Fecha tentativa', 'fecha_clase', 'date'], ['Número de sesión', 'numero_sesion', 'number'], ['Duración en minutos', 'duracion_minutos', 'number'], ['Estado', 'estado', 'select']].map(([label, key, type]) => <label key={key} style={{ display: 'grid', gap: '5px', fontSize: '12px', fontWeight: '500' }}>{label}{type === 'select' ? <select value={formData.estado || 'borrador'} onChange={e => setFormData({ ...formData, estado: e.target.value })}><option value="borrador">Borrador</option><option value="revisada">Revisada</option><option value="aplicada">Aplicada</option></select> : <input type={type} value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />}</label>)}
                        </div>
                        {[['Propósito de la sesión', 'proposito'], ['Criterios observables', 'criterios'], ['Ajustes e inclusión', 'ajustes'], ['Observaciones de aplicación', 'observaciones']].map(([label, key]) => <label key={key} style={{ display: 'grid', gap: '5px', marginTop: '12px', fontSize: '12px', fontWeight: '500' }}>{label}<textarea value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })} rows={2} style={{ width: '100%', padding: '9px', border: '1px solid #c4d6f2', borderRadius: '7px' }} /></label>)}
                    </div>}

                    {/* Meta Grid */}
                    <div className="responsive-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px', padding: '12px 16px', background: theme.sectionBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '2px', letterSpacing: 'normal' }}>Fase</label>
                            <select aria-label="Fase" value={formData.fase_id} onChange={(e) => {
                                const faseId = e.target.value;
                                const gradosDeLaFase = (catalogs.grados || []).filter((grade) => String(grade.fase_id) === faseId).sort((a, b) => Number(a.id) - Number(b.id));
                                setFormData({ ...formData, fase_id: faseId, grado_id: gradosDeLaFase[0]?.id?.toString() || '', pda_id: '', pda_por_grado: {} });
                                if (errors.fase_id) setErrors({ ...errors, fase_id: false });
                            }} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: errors.fase_id ? '2px solid #ef4444' : `1px solid ${theme.border}`, color: theme.text, fontSize: '13px', fontWeight: '700', outline: 'none', padding: '1px 0' }}>
                                <option value="">---</option>
                                {(catalogs.fases || []).map((fase) => <option key={fase.id} value={fase.id}>{fase.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '2px', letterSpacing: 'normal' }}>Lenguaje</label>
                            <select aria-label="Lenguaje" value={formData.lenguaje_id} onChange={(e) => setFormData({ ...formData, lenguaje_id: e.target.value })} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '13px', fontWeight: '700', outline: 'none', padding: '1px 0' }}>
                                <option value="">---</option>
                                {(catalogs.lenguajes || []).map((lenguaje) => <option key={lenguaje.id} value={lenguaje.id}>{lenguaje.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px', letterSpacing: 'normal' }}>{formData.grupo ? `Grado del grupo ${formData.grupo}` : 'Grados asignados automáticamente por la fase'}</label>
                            <div className="automatic-grades" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {filteredGrados.length > 0 ? filteredGrados.map((grado) => <div key={grado.id} style={{ padding: '8px 10px', borderRadius: '8px', background: '#fff', border: `1px solid ${theme.border}`, color: theme.text, fontSize: '12px', fontWeight: '500' }}>{grado.nombre}</div>) : <div style={{ gridColumn: '1 / -1', color: theme.subtext, fontSize: '12px' }}>Selecciona una fase para asignar sus grados.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="content-padding-container">
                        {/* Ejes Articuladores */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '8px', letterSpacing: 'normal' }}>Ejes Articuladores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(catalogs?.ejes_articuladores || []).map(eje => {
                                    const selected = formData.ejes_articuladores.includes(eje.nombre);
                                    return (
                                        <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                            style={{ padding: '8px 12px', minHeight: '44px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: '1px solid', borderColor: selected ? theme.accent : theme.border, background: selected ? '#eff6ff' : 'transparent', color: selected ? theme.accent : theme.subtext, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {eje.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section I */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '500', color: theme.accent, textTransform: 'none', marginBottom: '16px', letterSpacing: 'normal', borderLeft: `3px solid ${theme.accent}`, paddingLeft: '10px' }}>
                                I. Contenidos y Procesos de Desarrollo
                            </h4>

                            <div className="responsive-split-grid" style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>Contenido</label>
                                    <select aria-label="Contenido curricular" value={contenidoSeleccionado}
                                        onChange={(e) => handleContenidoChange(e.target.value)}
                                        style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '6px 10px' }}>
                                        <option value="">Seleccione contenido...</option>
                                        <optgroup label="Nacionales">
                                            {(contenidos?.nacionales || []).map(c => <option key={c.id} value={`nacional:${c.id}`}>{c.descripcion}</option>)}
                                        </optgroup>
                                        <optgroup label="Estatales">
                                            {(contenidos?.estatales || []).map(c => <option key={c.id} value={`estatal:${c.id}`}>{c.descripcion}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>PDA por grado</label>
                                    <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {filteredGrados.map((grado) => {
                                            const pdaDelContenido = (pdas || []).filter((pda) => String(pda.grado_id) === String(grado.id));
                                            const pdaDelGrado = pdaDelContenido.length > 0
                                                ? pdaDelContenido
                                                : allAvailablePdas.filter((pda) => String(pda.grado_id) === String(grado.id) && String(pda.lenguaje_id) === String(formData.lenguaje_id));
                                            return <div key={grado.id} style={{ padding: '10px', borderRadius: '9px', border: errors.pdas && !formData.pda_por_grado?.[String(grado.id)] ? '1px solid #ef4444' : `1px solid ${theme.border}`, background: theme.sectionBg }}>
                                                <div style={{ marginBottom: '6px', color: grado === filteredGrados[0] ? '#0b57d0' : '#7c3aed', fontSize: '12px', fontWeight: '500', letterSpacing: '.7px' }}>{grado.nombre.toUpperCase()}</div>
                                                <select aria-label={`PDA de ${grado.nombre}`} value={formData.pda_por_grado?.[String(grado.id)] || ''} onChange={(e) => {
                                                    const nextSelections = { ...formData.pda_por_grado, [String(grado.id)]: e.target.value };
                                                    setFormData({ ...formData, pda_por_grado: nextSelections, pda_id: nextSelections[String(filteredGrados[0]?.id)] || '' });
                                                    if (errors.pdas) setErrors({ ...errors, pdas: false });
                                                }} style={{ width: '100%', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '7px', color: theme.text, fontSize: '12px', fontWeight: '600', outline: 'none', padding: '7px 8px' }}>
                                                    <option value="">Selecciona PDA para {grado.nombre}...</option>
                                                    {pdaDelGrado.map((pda) => <option key={pda.id} value={pda.id}>{pda.descripcion}</option>)}
                                                </select>
                                            </div>;
                                        })}
                                        {!formData.fase_id && <p style={{ gridColumn: '1 / -1', margin: 0, color: theme.subtext, fontSize: '12px' }}>Al elegir una fase aparecerán aquí sus dos grados y sus PDA.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contextos institucionales */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#0f766e', textTransform: 'none', marginBottom: '16px', letterSpacing: 'normal', borderLeft: '3px solid #0f766e', paddingLeft: '10px' }}>
                                II. Contextos para las actividades
                            </h4>
                            <div className="responsive-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>Proyecto del maestro de arte</label>
                                    <select value={formData.proyecto_arte_id} onChange={(e) => setFormData({ ...formData, proyecto_arte_id: e.target.value })} style={{ width: '100%', background: theme.sectionBg, border: errors.proyecto_arte_id ? '1px solid #ef4444' : `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }}>
                                        <option value="">Selecciona un proyecto de arte...</option>
                                        {proyectosArte.map(proyecto => <option key={proyecto.id} value={proyecto.id}>{proyecto.titulo}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>Programa analítico</label>
                                    <select value={formData.programa_analitico_id} onChange={(e) => setFormData({ ...formData, programa_analitico_id: e.target.value })} style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }}>
                                        <option value="">Sin vincular por ahora</option>
                                        {programasAnaliticos.map((programa) => <option key={programa.id} value={programa.id}>{programa.titulo}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>Valor mensual (opcional)</label>
                                    <input value={formData.valor_mensual} onChange={(e) => setFormData({ ...formData, valor_mensual: e.target.value })} placeholder="Ej. Paz, respeto, empatía" style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: '700' }}>
                                La planeación toma como referencia la temática y los productos del proyecto de arte seleccionado.
                            </div>
                        </div>

                        {/* Section II */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: '500', color: theme.success, textTransform: 'none', letterSpacing: 'normal', borderLeft: `3px solid ${theme.success}`, paddingLeft: '10px', margin: 0 }}>
                                    III. Planeación Didáctica
                                </h4>
                                <button
                                    onClick={generateAISequence}
                                    disabled={isGeneratingAI}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        background: '#0b57d0',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: 'none',
                                        opacity: isGeneratingAI ? 0.7 : 1
                                    }}
                                >
                                    {isGeneratingAI ? '⚡ GENERANDO...' : '🪄 GENERAR CON IA'}
                                </button>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '4px' }}>Metodología</label>
                                <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Ej. Aprendizaje Basado en Proyectos" style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '700', outline: 'none', padding: '6px 12px' }} />
                            </div>
                            <div className="responsive-table-grid" style={{ borderRadius: '10px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                {[
                                    { label: 'Inicio', key: 'secuencia_inicio', color: theme.success },
                                    { label: 'Desarrollo', key: 'secuencia_desarrollo', color: theme.accent },
                                    { label: 'Cierre', key: 'secuencia_cierre', color: '#db2777' }
                                ].map((moment) => (
                                    <div key={moment.key} className="moment-row" style={{ display: 'flex', borderBottom: moment.key === 'secuencia_cierre' ? 'none' : `1px solid ${theme.border}` }}>
                                        <div className="moment-label" style={{ width: '100px', padding: '10px', background: '#f8fafc', borderRight: `1px solid ${theme.border}`, display: 'flex', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: '500', fontSize: '12px', color: moment.color, textTransform: 'none' }}>{moment.label}</span>
                                        </div>
                                        <textarea aria-label={`Actividades de ${moment.label.toLowerCase()}`} value={formData[moment.key] || ''} onChange={(e) => setFormData({...formData, [moment.key]: e.target.value})} style={{ flex: 1, border: 'none', padding: '10px', minHeight: '60px', fontSize: '13px', color: theme.text, outline: 'none', lineHeight: '1.4', resize: 'none' }} placeholder={`Actividades de ${moment.label.toLowerCase()}...`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section III */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#f59e0b', textTransform: 'none', marginBottom: '16px', letterSpacing: 'normal', borderLeft: `3px solid #f59e0b`, paddingLeft: '10px' }}>
                                IV. Evaluación y Recursos
                            </h4>
                            <p style={{ color: '#52627b', fontSize: '12px', marginBottom: '12px' }}>Puedes describir recursos y evidencias aquí. Los archivos adjuntos están en pausa hasta habilitar almacenamiento privado.</p>
                            <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {filteredGrados.map((grado, index) => <div key={grado.id} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafd' }}>
                                    <div style={{ marginBottom: '10px', color: '#526076', fontSize: '12px', fontWeight: '500', letterSpacing: '.8px' }}>{grado.nombre.toUpperCase()}</div>
                                    <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none', marginBottom: '6px' }}>Evaluación</label>
                                    <textarea aria-label={`Evaluación de ${grado.nombre}`} value={formData.evaluacion_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, evaluacion_por_grado: { ...formData.evaluacion_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '80px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Evaluación para ${grado.nombre}...`} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: theme.subtext, fontWeight: '500', textTransform: 'none' }}>Recursos</label>
                                    </div>
                                    <textarea aria-label={`Recursos de ${grado.nombre}`} value={formData.recursos_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, recursos_por_grado: { ...formData.recursos_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '80px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Recursos para ${grado.nombre}...`} />
                                </div>)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '500', color: theme.accent, textTransform: 'none', letterSpacing: 'normal', margin: '0 0 12px', borderLeft: `3px solid ${theme.accent}`, paddingLeft: '10px' }}>V. Evidencias del Proceso</h4>
                            <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {filteredGrados.map((grado, index) => <div key={grado.id} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: index === 0 ? '#eff6ff' : '#edf3fd' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ color: index === 0 ? '#0b57d0' : '#7c3aed', fontSize: '12px', fontWeight: '500', letterSpacing: '.8px' }}>{grado.nombre.toUpperCase()}</span>
                                    </div>
                                    <textarea aria-label={`Evidencias de ${grado.nombre}`} value={formData.evidencias_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, evidencias_por_grado: { ...formData.evidencias_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '100px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Evidencias de ${grado.nombre}...`} />
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STICKY ACTION BAR */}
            <div className="sticky-footer-bar" style={{
                position: 'sticky',
                bottom: '0',
                left: 0,
                right: 0,
                background: 'rgba(255,255,255,0.98)',
                backdropFilter: 'none',
                padding: embedded ? '16px 8px 4px' : '20px 40px',
                borderTop: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 50,
                marginTop: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '40px', maxWidth: '1000px', width: '100%', justifyContent: 'space-between' }}>
                    <div className="footer-title-group" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: theme.subtext, textTransform: 'none', letterSpacing: 'normal' }}>
                            {formData.id ? 'Modificando Planeación' : 'Nueva Planeación'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: theme.text, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.titulo || 'Sin Título'}</span>
                    </div>

                    <div className="footer-btn-group" style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                background: theme.accent,
                                color: '#fff',
                                padding: '10px 32px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                boxShadow: 'none',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'GUARDANDO...' : formData.id ? 'ACTUALIZAR PLANEACIÓN' : 'GUARDAR CAMBIOS'}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .form-page-container input, .form-page-container select, .form-page-container button { min-height: 44px; }
                .form-page-container textarea:not([aria-label="Título de la planeación"]) { font-size: 14px !important; line-height: 1.6; }
                .form-page-container label { color: #526076 !important; }
                .form-page-container select, .form-page-container input:not([aria-label="Título de la planeación"]) { font-size: 14px !important; font-weight: 400 !important; }
                .form-page-container .sticky-footer-bar { bottom: 0; }
                @media (max-width: 760px) { .form-page-container .sticky-footer-bar { bottom: calc(64px + env(safe-area-inset-bottom)) !important; } .form-page-container input, .form-page-container textarea, .form-page-container select { font-size: 16px !important; } }
                .form-page-container input:focus-visible, .form-page-container select:focus-visible, .form-page-container textarea:focus-visible { outline: 2px solid #0b57d0 !important; outline-offset: 2px; }
                .form-page-container h4 { border-left: 0 !important; padding-left: 0 !important; color: #30343b !important; font-size: 16px !important; }

                @media (max-width: 1024px) {
                    .document-paper { padding: 40px 30px !important; }
                }
                @media (max-width: 768px) {
                    .responsive-meta-grid, .responsive-pda-grid, .responsive-split-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 16px !important; }
                    .session-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    .session-meta-grid input, .session-meta-grid select { width: 100%; min-width: 0; }
                    .document-paper { padding: 24px 12px !important; }
                    .moment-row { flex-direction: column; }
                    .moment-label { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${theme.border} !important; padding: 12px 20px !important; }
                }
                @media (max-width: 640px) {
                    .footer-title-group { display: none !important; }
                    .footer-btn-group { width: 100%; }
                    .footer-btn-group button { flex: 1; }
                }
            `}</style>
        </div>
    );
}
