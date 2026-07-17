'use client';

import { useState, useEffect } from 'react';
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
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    const [proyectosArte, setProyectosArte] = useState([]);
    const [proyectosEscolares, setProyectosEscolares] = useState([]);
    
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
        proyecto_escolar_id: '',
        proyecto_arte_id: '',
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
    });

    const [isUploading, setIsUploading] = useState(false);
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
                proyecto_escolar_id: initialData.proyecto_escolar_id?.toString() || '',
                proyecto_arte_id: initialData.proyecto_arte_id?.toString() || '',
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

        fetch('/api/proyecto-escolar')
            .then(res => res.ok ? res.json() : { proyectos: [] })
            .then(data => setProyectosEscolares(data.proyectos || []))
            .catch(err => console.error('Error loading school project:', err));
    }, []);

    useEffect(() => {
        if (!formData.proyecto_escolar_id) {
            setProyectosArte([]);
            return;
        }
        fetch(`/api/proyectos?proyecto_escolar_id=${formData.proyecto_escolar_id}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setProyectosArte(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error loading art projects:', err));
    }, [formData.proyecto_escolar_id]);

    useEffect(() => {
        const phaseGrades = (catalogs.grados || [])
            .filter((grade) => String(grade.fase_id) === String(formData.fase_id))
            .sort((a, b) => Number(a.id) - Number(b.id));
        const firstGradeId = phaseGrades[0]?.id?.toString() || '';

        if (firstGradeId && formData.grado_id !== firstGradeId) {
            setFormData((current) => ({ ...current, grado_id: firstGradeId }));
        }
    }, [catalogs.grados, formData.fase_id, formData.grado_id]);

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
        if (filteredGrados.length !== 2) newErrors.fase_id = true;
        if (!formData.lenguaje_id) newErrors.lenguaje_id = true;
        if (!formData.proyecto_escolar_id) newErrors.proyecto_escolar_id = true;
        if (!formData.proyecto_arte_id) newErrors.proyecto_arte_id = true;
        if (filteredGrados.some((grade) => !formData.pda_por_grado?.[String(grade.id)])) newErrors.pdas = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileUpload = async (e, fieldName = 'recursos', gradoId = null) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
                body: file,
            });

            if (response.ok) {
                const blob = await response.json();
                const currentVal = gradoId ? formData[fieldName]?.[String(gradoId)] || '' : formData[fieldName] || '';
                const newLine = currentVal ? '\n' : '';
                const nextValue = `${currentVal}${newLine}📎 ${file.name}: ${blob.url}`;
                setFormData(gradoId ? {
                    ...formData,
                    [fieldName]: { ...formData[fieldName], [String(gradoId)]: nextValue }
                } : { ...formData, [fieldName]: nextValue });
            } else {
                const err = await response.json();
                alert('Error al subir: ' + (err.error || 'Asegúrate de conectar Vercel Blob.'));
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Fallo de conexión al subir.');
        } finally {
            setIsUploading(false);
        }
    };

    const generateAISequence = async () => {
        const pdaPorGrado = filteredGrados.map((grade) => ({
            grado: grade,
            pda: allAvailablePdas.find((item) => String(item.id) === String(formData.pda_por_grado?.[String(grade.id)]))
        }));

        if (pdaPorGrado.length !== 2 || pdaPorGrado.some((item) => !item.pda)) {
            alert("Selecciona un PDA para cada grado de la fase.");
            return;
        }

        const selectedContenido = formData.contenido_estatal_id
            ? (contenidos.estatales || []).find(c => c.id == formData.contenido_estatal_id)
            : (contenidos.nacionales || []).find(c => c.id == formData.contenido_nacional_id);
        const selectedProyectoArte = proyectosArte.find(p => p.id == formData.proyecto_arte_id);
        const selectedProyectoEscolar = proyectosEscolares.find(p => p.id == formData.proyecto_escolar_id);
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
            2. Contextualiza las actividades con las problemáticas y necesidades del proyecto escolar cuando esté disponible.
            3. Vincula la temática y el producto del proyecto del maestro de arte cuando se haya seleccionado uno.
            4. Integra el valor mensual de manera natural en acciones, convivencia o reflexión, únicamente cuando se haya proporcionado.
            Metodología sugerida: ${formData.metodologia || 'Aprendizaje Basado en Proyectos'}.
            Quiero que el resultado sea un JSON con las claves: "inicio", "desarrollo", "cierre", "metodologia_sugerida", "evaluacion_sugerida", "recursos_sugeridos".
            5. La planeación atiende a dos grados de la misma fase. Diferencia las consignas, productos o apoyos para cada grado según su PDA.
            Sé creativo, usa actividades lúdicas acordes a ambos grados y evita inventar datos que no estén en el contexto.`;

            const context = {
                grado: gradosConPda.map((item) => item.grado).join(' y '),
                contenido: selectedContenido?.descripcion,
                pda: gradosConPda.map((item) => `${item.grado}: ${item.pda}`).join('\n'),
                grados_y_pdas: gradosConPda,
                ejes: formData.ejes_articuladores,
                proyecto_escolar: selectedProyectoEscolar ? {
                    titulo: selectedProyectoEscolar.titulo,
                    contexto_y_problematicas: selectedProyectoEscolar.contenido?.slice(0, 20000)
                } : null,
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
            alert('Completa título, fase, lenguaje, los dos PDA y los proyectos de contexto.');
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
                proyecto_escolar_id: formData.proyecto_escolar_id?.toString() || null,
                proyecto_arte_id: formData.proyecto_arte_id?.toString() || null,
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
        .filter(g => g.fase_id == formData.fase_id)
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
    const theme = {
        docBg: '#ffffff',
        text: '#0f172a',
        subtext: '#64748b',
        border: '#e2e8f0',
        sectionBg: '#f8fafc',
        accent: '#2563eb',
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
                        <input 
                            type="text" 
                            value={formData.titulo} 
                            onChange={(e) => {
                                setFormData({...formData, titulo: e.target.value});
                                if (errors.titulo) setErrors({...errors, titulo: false});
                            }} 
                            placeholder="ESCRIBA EL TÍTULO AQUÍ" 
                            style={{ 
                                width: '100%', 
                                border: 'none', 
                                borderBottom: errors.titulo ? '2px solid #ef4444' : `2px solid ${theme.border}`, 
                                textAlign: 'center', 
                                fontSize: 'clamp(18px, 3vw, 24px)', 
                                fontWeight: '900', 
                                color: theme.text, 
                                background: 'transparent', 
                                outline: 'none', 
                                padding: '6px', 
                                textTransform: 'uppercase', 
                                letterSpacing: '-0.5px' 
                            }} 
                        />
                        <p style={{ color: theme.subtext, fontSize: '9px', marginTop: '8px', fontWeight: '800', letterSpacing: '2px' }}>
                            {formData.id ? `EDITANDO PLANEACIÓN #${formData.id}` : 'SISTEMA DE PLANEACIÓN ANALÍTICA 2025'}
                        </p>
                    </div>

                    {/* Meta Grid */}
                    <div className="responsive-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px', padding: '12px 16px', background: theme.sectionBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '8px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '1px' }}>Fase</label>
                            <select value={formData.fase_id} onChange={(e) => {
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
                            <label style={{ display: 'block', fontSize: '8px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '1px' }}>Lenguaje</label>
                            <select value={formData.lenguaje_id} onChange={(e) => setFormData({ ...formData, lenguaje_id: e.target.value })} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '13px', fontWeight: '700', outline: 'none', padding: '1px 0' }}>
                                <option value="">---</option>
                                {(catalogs.lenguajes || []).map((lenguaje) => <option key={lenguaje.id} value={lenguaje.id}>{lenguaje.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '8px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '1px' }}>Grados asignados automáticamente por la fase</label>
                            <div className="automatic-grades" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {filteredGrados.length === 2 ? filteredGrados.map((grado) => <div key={grado.id} style={{ padding: '8px 10px', borderRadius: '8px', background: '#fff', border: `1px solid ${theme.border}`, color: theme.text, fontSize: '12px', fontWeight: '800' }}>{grado.nombre}</div>) : <div style={{ gridColumn: '1 / -1', color: theme.subtext, fontSize: '11px' }}>Selecciona una fase para asignar sus dos grados.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="content-padding-container">
                        {/* Ejes Articuladores */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Ejes Articuladores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(catalogs?.ejes_articuladores || []).map(eje => {
                                    const selected = formData.ejes_articuladores.includes(eje.nombre);
                                    return (
                                        <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                            style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '8px', fontWeight: '800', border: '1px solid', borderColor: selected ? theme.accent : theme.border, background: selected ? '#eff6ff' : 'transparent', color: selected ? theme.accent : theme.subtext, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {eje.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section I */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', borderLeft: `3px solid ${theme.accent}`, paddingLeft: '10px' }}>
                                I. Contenidos y Procesos de Desarrollo
                            </h4>
                            
                            <div className="responsive-split-grid" style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>Contenido</label>
                                    <select value={contenidoSeleccionado}
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
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>PDA por grado</label>
                                    <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {filteredGrados.map((grado) => {
                                            const pdaDelContenido = (pdas || []).filter((pda) => String(pda.grado_id) === String(grado.id));
                                            const pdaDelGrado = pdaDelContenido.length > 0
                                                ? pdaDelContenido
                                                : allAvailablePdas.filter((pda) => String(pda.grado_id) === String(grado.id) && String(pda.lenguaje_id) === String(formData.lenguaje_id));
                                            return <div key={grado.id} style={{ padding: '10px', borderRadius: '9px', border: errors.pdas && !formData.pda_por_grado?.[String(grado.id)] ? '1px solid #ef4444' : `1px solid ${theme.border}`, background: theme.sectionBg }}>
                                                <div style={{ marginBottom: '6px', color: grado === filteredGrados[0] ? '#2563eb' : '#7c3aed', fontSize: '9px', fontWeight: '900', letterSpacing: '.7px' }}>{grado.nombre.toUpperCase()}</div>
                                                <select value={formData.pda_por_grado?.[String(grado.id)] || ''} onChange={(e) => {
                                                    const nextSelections = { ...formData.pda_por_grado, [String(grado.id)]: e.target.value };
                                                    setFormData({ ...formData, pda_por_grado: nextSelections, pda_id: nextSelections[String(filteredGrados[0]?.id)] || '' });
                                                    if (errors.pdas) setErrors({ ...errors, pdas: false });
                                                }} style={{ width: '100%', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '7px', color: theme.text, fontSize: '12px', fontWeight: '600', outline: 'none', padding: '7px 8px' }}>
                                                    <option value="">Selecciona PDA para {grado.nombre}...</option>
                                                    {pdaDelGrado.map((pda) => <option key={pda.id} value={pda.id}>{pda.descripcion}</option>)}
                                                </select>
                                            </div>;
                                        })}
                                        {!formData.fase_id && <p style={{ gridColumn: '1 / -1', margin: 0, color: theme.subtext, fontSize: '11px' }}>Al elegir una fase aparecerán aquí sus dos grados y sus PDA.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contextos institucionales */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '900', color: '#0f766e', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', borderLeft: '3px solid #0f766e', paddingLeft: '10px' }}>
                                II. Contextos para las actividades
                            </h4>
                            <div className="responsive-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>Proyecto escolar</label>
                                    <select value={formData.proyecto_escolar_id} onChange={(e) => setFormData({ ...formData, proyecto_escolar_id: e.target.value, proyecto_arte_id: '' })} style={{ width: '100%', background: theme.sectionBg, border: errors.proyecto_escolar_id ? '1px solid #ef4444' : `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }}>
                                        <option value="">Selecciona el contexto escolar...</option>
                                        {proyectosEscolares.map(proyecto => <option key={proyecto.id} value={proyecto.id}>{proyecto.titulo}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>Proyecto del maestro de arte</label>
                                    <select value={formData.proyecto_arte_id} disabled={!formData.proyecto_escolar_id} onChange={(e) => setFormData({ ...formData, proyecto_arte_id: e.target.value })} style={{ width: '100%', background: theme.sectionBg, border: errors.proyecto_arte_id ? '1px solid #ef4444' : `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }}>
                                        <option value="">Selecciona un proyecto de arte...</option>
                                        {proyectosArte.map(proyecto => <option key={proyecto.id} value={proyecto.id}>{proyecto.titulo}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>Valor mensual (opcional)</label>
                                    <input value={formData.valor_mensual} onChange={(e) => setFormData({ ...formData, valor_mensual: e.target.value })} placeholder="Ej. Paz, respeto, empatía" style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '8px 10px' }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: '700' }}>
                                La planeación toma el contexto del proyecto escolar seleccionado y el enfoque de su proyecto de arte.
                            </div>
                        </div>

                        {/* Section II */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '900', color: theme.success, textTransform: 'uppercase', letterSpacing: '1px', borderLeft: `3px solid ${theme.success}`, paddingLeft: '10px', margin: 0 }}>
                                    III. Planeación Didáctica
                                </h4>
                                <button 
                                    onClick={generateAISequence}
                                    disabled={isGeneratingAI}
                                    style={{ 
                                        padding: '4px 12px', 
                                        borderRadius: '100px', 
                                        fontSize: '9px', 
                                        fontWeight: '900', 
                                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
                                        color: '#fff', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                                        opacity: isGeneratingAI ? 0.7 : 1
                                    }}
                                >
                                    {isGeneratingAI ? '⚡ GENERANDO...' : '🪄 GENERAR CON IA'}
                                </button>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Metodología</label>
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
                                            <span style={{ fontWeight: '900', fontSize: '9px', color: moment.color, textTransform: 'uppercase' }}>{moment.label}</span>
                                        </div>
                                        <textarea value={formData[moment.key] || ''} onChange={(e) => setFormData({...formData, [moment.key]: e.target.value})} style={{ flex: 1, border: 'none', padding: '10px', minHeight: '60px', fontSize: '13px', color: theme.text, outline: 'none', lineHeight: '1.4', resize: 'none' }} placeholder={`Actividades de ${moment.label.toLowerCase()}...`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section III */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', borderLeft: `3px solid #f59e0b`, paddingLeft: '10px' }}>
                                IV. Evaluación y Recursos
                            </h4>
                            <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {filteredGrados.map((grado, index) => <div key={grado.id} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: index === 0 ? '#fffbeb' : '#fff7ed' }}>
                                    <div style={{ marginBottom: '10px', color: index === 0 ? '#b45309' : '#c2410c', fontSize: '10px', fontWeight: '900', letterSpacing: '.8px' }}>{grado.nombre.toUpperCase()}</div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>Evaluación</label>
                                    <textarea value={formData.evaluacion_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, evaluacion_por_grado: { ...formData.evaluacion_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '80px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Evaluación para ${grado.nombre}...`} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                                        <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase' }}>Recursos</label>
                                        <input type="file" id={`file-upload-recursos-${grado.id}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'recursos_por_grado', grado.id)} />
                                        <label htmlFor={`file-upload-recursos-${grado.id}`} style={{ fontSize: '8px', fontWeight: '800', color: theme.accent, cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: '#eff6ff' }}>{isUploading ? '...' : '📎 SUBIR'}</label>
                                    </div>
                                    <textarea value={formData.recursos_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, recursos_por_grado: { ...formData.recursos_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '80px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Recursos para ${grado.nombre}...`} />
                                </div>)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px', borderLeft: `3px solid ${theme.accent}`, paddingLeft: '10px' }}>V. Evidencias del Proceso</h4>
                            <div className="responsive-pda-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {filteredGrados.map((grado, index) => <div key={grado.id} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: index === 0 ? '#eff6ff' : '#f5f3ff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ color: index === 0 ? '#2563eb' : '#7c3aed', fontSize: '10px', fontWeight: '900', letterSpacing: '.8px' }}>{grado.nombre.toUpperCase()}</span>
                                        <input type="file" id={`file-upload-evidencias-${grado.id}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'evidencias_por_grado', grado.id)} />
                                        <label htmlFor={`file-upload-evidencias-${grado.id}`} style={{ fontSize: '8px', fontWeight: '800', color: theme.accent, cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: '#fff' }}>{isUploading ? '...' : '📸 SUBIR'}</label>
                                    </div>
                                    <textarea value={formData.evidencias_por_grado?.[String(grado.id)] || ''} onChange={(e) => setFormData({ ...formData, evidencias_por_grado: { ...formData.evidencias_por_grado, [String(grado.id)]: e.target.value } })} style={{ width: '100%', height: '100px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '9px', fontSize: '12px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder={`Evidencias de ${grado.nombre}...`} />
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STICKY ACTION BAR */}
            <div className="sticky-footer-bar" style={{
                position: embedded ? 'static' : 'sticky',
                bottom: '0',
                left: 0,
                right: 0,
                background: 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(10px)',
                padding: embedded ? '16px 8px 4px' : '20px 40px',
                borderTop: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: embedded ? 1 : 2000,
                marginTop: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '40px', maxWidth: '1000px', width: '100%', justifyContent: 'space-between' }}>
                    <div className="footer-title-group" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {formData.id ? 'Modificando Planeación' : 'Nueva Planeación'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: theme.text, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.titulo || 'Sin Título'}</span>
                    </div>
                    
                    <div className="footer-btn-group" style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={onCancel}
                            style={{ 
                                background: '#f1f5f9', 
                                color: '#475569', 
                                padding: '10px 24px', 
                                borderRadius: '100px', 
                                border: 'none', 
                                fontSize: '12px', 
                                fontWeight: '800', 
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
                                borderRadius: '100px', 
                                border: 'none', 
                                fontSize: '12px', 
                                fontWeight: '900', 
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.2)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'GUARDANDO...' : formData.id ? 'ACTUALIZAR PLANEACIÓN' : 'GUARDAR CAMBIOS'}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .document-paper { padding: 40px 30px !important; }
                }
                @media (max-width: 768px) {
                    .responsive-meta-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
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
