'use client';

import { useState, useEffect } from 'react';

export default function PlaneacionForm({ initialData, onSaved, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    
    const [formData, setFormData] = useState({
        titulo: '',
        fase_id: '',
        grado_id: '',
        lenguaje_id: '',
        contenido_nacional_id: '',
        contenido_estatal_id: '',
        pda_id: '',
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
                evidencias: initialData.evidencias || '',
            });
        }
    }, [initialData]);

    useEffect(() => {
        fetch('/api/catalogos')
            .then(res => res.ok ? res.json() : null)
            .then(data => data && setCatalogs(data))
            .catch(err => console.error("Error loading catalogs:", err));
    }, []);

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
        if (!formData.grado_id) newErrors.grado_id = true;
        if (!formData.lenguaje_id) newErrors.lenguaje_id = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileUpload = async (e, fieldName = 'recursos') => {
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
                const currentVal = formData[fieldName] || '';
                const newLine = currentVal ? '\n' : '';
                setFormData({
                    ...formData,
                    [fieldName]: `${currentVal}${newLine}📎 ${file.name}: ${blob.url}`
                });
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

    const handleSubmit = async () => {
        if (!validate()) {
            alert('Por favor complete los campos obligatorios: Título, Fase, Grado y Lenguaje.');
            return;
        }

        setLoading(true);
        try {
            const isEdit = !!formData.id;
            const url = isEdit ? `/api/planeaciones/${formData.id}` : '/api/planeaciones';
            const method = isEdit ? 'PUT' : 'POST';

            const submissionData = {
                ...formData,
                fase_id: formData.fase_id?.toString(),
                grado_id: formData.grado_id?.toString(),
                lenguaje_id: formData.lenguaje_id?.toString(),
                contenido_nacional_id: formData.contenido_nacional_id?.toString() || null,
                pda_id: formData.pda_id?.toString() || null
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

    const filteredGrados = (catalogs?.grados || []).filter(g => g.fase_id == formData.fase_id);

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
        <div className="form-page-container" style={{ minHeight: '100%', background: theme.docBg, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            {/* Main Scrollable Content */}
            <div style={{ flex: 1, paddingBottom: '120px' }}>
                <div className="document-paper" style={{ 
                    maxWidth: '1000px', 
                    margin: '0 auto', 
                    padding: '40px 40px',
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
                    <div className="responsive-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px', padding: '12px 16px', background: theme.sectionBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        {[
                            { label: 'Fase', key: 'fase_id', options: catalogs?.fases },
                            { label: 'Grado', key: 'grado_id', options: filteredGrados },
                            { label: 'Lenguaje', key: 'lenguaje_id', options: catalogs?.lenguajes }
                        ].map((field) => (
                            <div key={field.label}>
                                <label style={{ display: 'block', fontSize: '8px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '1px' }}>{field.label}</label>
                                <select 
                                    value={formData[field.key]} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (field.key === 'fase_id') {
                                            setFormData({...formData, fase_id: val, grado_id: ''});
                                        } else {
                                            setFormData({...formData, [field.key]: val});
                                        }
                                        if (errors[field.key]) setErrors({...errors, [field.key]: false});
                                    }} 
                                    style={{ 
                                        width: '100%', 
                                        background: 'transparent', 
                                        border: 'none', 
                                        borderBottom: errors[field.key] ? '2px solid #ef4444' : `1px solid ${theme.border}`, 
                                        color: theme.text, 
                                        fontSize: '13px', 
                                        fontWeight: '700', 
                                        outline: 'none', 
                                        padding: '1px 0' 
                                    }}>
                                    <option value="">---</option>
                                    {(field.options || []).map(opt => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                                </select>
                            </div>
                        ))}
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
                                    <select value={formData.contenido_nacional_id || formData.contenido_estatal_id} 
                                        onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value, contenido_estatal_id: ''})} 
                                        style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '6px 10px' }}>
                                        <option value="">Seleccione contenido...</option>
                                        <optgroup label="Nacionales">
                                            {(contenidos?.nacionales || []).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                                        </optgroup>
                                        <optgroup label="Estatales">
                                            {(contenidos?.estatales || []).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>PDA</label>
                                    <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, fontSize: '13px', fontWeight: '600', outline: 'none', padding: '6px 10px' }}>
                                        <option value="">Seleccione PDA...</option>
                                        {(pdas || []).map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section II */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '900', color: theme.success, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', borderLeft: `3px solid ${theme.success}`, paddingLeft: '10px' }}>
                                II. Planeación Didáctica
                            </h4>
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
                                III. Evaluación y Recursos
                            </h4>
                            <div className="responsive-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {[
                                    { key: 'evaluacion', label: 'Evaluación' },
                                    { key: 'recursos', label: 'Recursos' }
                                ].map(field => (
                                    <div key={field.key} style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ display: 'block', fontSize: '9px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{field.label}</label>
                                            {field.key === 'recursos' && (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <input type="file" id={`file-upload-${field.key}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, field.key)} />
                                                    <label htmlFor={`file-upload-${field.key}`} style={{ fontSize: '8px', fontWeight: '800', color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', background: '#eff6ff' }}>
                                                        {isUploading ? '...' : '📎 SUBIR'}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                        <textarea value={formData[field.key] || ''} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} style={{ width: '100%', height: '80px', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '10px', fontSize: '13px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder="..." />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Full Width Evidencias Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderLeft: `3px solid ${theme.accent}`, paddingLeft: '10px' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                                    IV. Evidencias del Proceso
                                </h4>
                                <div>
                                    <input type="file" id="file-upload-evidencias" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'evidencias')} />
                                    <label htmlFor="file-upload-evidencias" style={{ fontSize: '8px', fontWeight: '800', color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff' }}>
                                        {isUploading ? '...' : '📸 SUBIR'}
                                    </label>
                                </div>
                            </div>
                            <textarea value={formData.evidencias || ''} onChange={(e) => setFormData({...formData, evidencias: e.target.value})} style={{ width: '100%', height: '100px', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '10px', fontSize: '13px', color: theme.text, outline: 'none', lineHeight: '1.4' }} placeholder="Evidencias..." />
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
                backdropFilter: 'blur(10px)',
                padding: '20px 40px',
                borderTop: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 2000,
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
                            onClick={handleSubmit}
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
