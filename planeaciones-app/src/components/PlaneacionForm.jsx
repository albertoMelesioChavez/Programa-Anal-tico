'use client';

import { useState, useEffect } from 'react';

export default function PlaneacionForm({ onSaved, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [darkMode] = useState(false); // Forced Light Mode
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    const [orientaciones, setOrientaciones] = useState([]);
    
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
        actividades: ''
    });

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
            
            fetch(`/api/orientaciones?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setOrientaciones(data))
                .catch(() => setOrientaciones([]));
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

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/planeaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                onSaved();
            }
        } catch (e) {
            console.error(e);
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
        bg: '#f8fafc',
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
                    padding: '60px 40px',
                    background: '#fff'
                }}>
                    {/* Header Section */}
                    <div style={{ marginBottom: '60px', textAlign: 'center' }}>
                        <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="ESCRIBA EL TÍTULO AQUÍ" style={{ width: '100%', border: 'none', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', color: theme.text, background: 'transparent', outline: 'none', padding: '10px', textTransform: 'uppercase', letterSpacing: '-1px' }} />
                        <p style={{ color: theme.subtext, fontSize: '11px', marginTop: '16px', fontWeight: '800', letterSpacing: '3px' }}>SISTEMA DE PLANEACIÓN ANALÍTICA 2025</p>
                    </div>

                    {/* Meta Grid */}
                    <div className="responsive-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '60px', padding: '30px', background: theme.sectionBg, borderRadius: '16px', border: `1px solid ${theme.border}` }}>
                        {['Fase', 'Grado', 'Lenguaje'].map((label, idx) => (
                            <div key={label}>
                                <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{label}</label>
                                <select 
                                    value={idx === 0 ? formData.fase_id : idx === 1 ? formData.grado_id : formData.lenguaje_id} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (idx === 0) setFormData({...formData, fase_id: val});
                                        else if (idx === 1) setFormData({...formData, grado_id: val});
                                        else setFormData({...formData, lenguaje_id: val});
                                    }} 
                                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '15px', fontWeight: '700', outline: 'none', padding: '8px 0' }}>
                                    <option value="">---</option>
                                    {(idx === 0 ? catalogs?.fases : idx === 1 ? filteredGrados : catalogs?.lenguajes || []).map(opt => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="content-padding-container">
                        {/* Ejes Articuladores */}
                        <div style={{ marginBottom: '60px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Ejes Articuladores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {(catalogs?.ejes_articuladores || []).map(eje => {
                                    const selected = formData.ejes_articuladores.includes(eje.nombre);
                                    return (
                                        <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                            style={{ padding: '8px 18px', borderRadius: '100px', fontSize: '11px', fontWeight: '800', border: '1px solid', borderColor: selected ? theme.accent : theme.border, background: selected ? '#eff6ff' : 'transparent', color: selected ? theme.accent : theme.subtext, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {eje.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section I */}
                        <div style={{ marginBottom: '80px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', marginBottom: '32px', letterSpacing: '1px', borderLeft: `4px solid ${theme.accent}`, paddingLeft: '15px' }}>
                                I. Contenidos y Procesos de Desarrollo
                            </h4>
                            
                            <div className="responsive-split-grid" style={{ display: 'grid', gap: '32px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>Contenido</label>
                                    <select value={formData.contenido_nacional_id || formData.contenido_estatal_id} 
                                        onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value, contenido_estatal_id: ''})} 
                                        style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, fontSize: '14px', fontWeight: '600', outline: 'none', padding: '14px' }}>
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
                                    <label style={{ display: 'block', fontSize: '11px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>PDA</label>
                                    <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, fontSize: '14px', fontWeight: '600', outline: 'none', padding: '14px' }}>
                                        <option value="">Seleccione PDA...</option>
                                        {(pdas || []).map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section II */}
                        <div style={{ marginBottom: '80px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '900', color: theme.success, textTransform: 'uppercase', marginBottom: '32px', letterSpacing: '1px', borderLeft: `4px solid ${theme.success}`, paddingLeft: '15px' }}>
                                II. Planeación Didáctica
                            </h4>
                            
                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>Metodología</label>
                                <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Ej. Aprendizaje Basado en Proyectos" style={{ width: '100%', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, fontSize: '14px', fontWeight: '700', outline: 'none', padding: '14px' }} />
                            </div>

                            <div className="responsive-table-grid" style={{ borderRadius: '16px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                {[
                                    { label: 'Inicio', key: 'secuencia_inicio', color: theme.success },
                                    { label: 'Desarrollo', key: 'secuencia_desarrollo', color: theme.accent },
                                    { label: 'Cierre', key: 'secuencia_cierre', color: '#db2777' }
                                ].map((moment) => (
                                    <div key={moment.key} className="moment-row" style={{ display: 'flex', borderBottom: moment.key === 'secuencia_cierre' ? 'none' : `1px solid ${theme.border}` }}>
                                        <div className="moment-label" style={{ width: '140px', padding: '20px', background: '#f8fafc', borderRight: `1px solid ${theme.border}`, display: 'flex', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: '900', fontSize: '11px', color: moment.color, textTransform: 'uppercase' }}>{moment.label}</span>
                                        </div>
                                        <textarea value={formData[moment.key]} onChange={(e) => setFormData({...formData, [moment.key]: e.target.value})} style={{ flex: 1, border: 'none', padding: '20px', minHeight: '140px', fontSize: '14px', color: theme.text, outline: 'none', lineHeight: '1.6', resize: 'none' }} placeholder={`Actividades de ${moment.label.toLowerCase()}...`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section III */}
                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '32px', letterSpacing: '1px', borderLeft: `4px solid #f59e0b`, paddingLeft: '15px' }}>
                                III. Evaluación y Recursos
                            </h4>
                            <div className="responsive-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                {['evaluacion', 'recursos'].map(key => (
                                    <div key={key}>
                                        <label style={{ display: 'block', fontSize: '11px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>{key === 'evaluacion' ? 'Evaluación' : 'Recursos'}</label>
                                        <textarea value={formData[key]} onChange={(e) => setFormData({...formData, [key]: e.target.value})} style={{ width: '100%', height: '160px', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '18px', fontSize: '14px', color: theme.text, outline: 'none', lineHeight: '1.6' }} />
                                    </div>
                                ))}
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
                        <span style={{ fontSize: '10px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', letterSpacing: '1px' }}>Nueva Planeación</span>
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
                            {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .document-paper { padding: 40px 30px !important; }
                    .content-padding-container { padding: 0 !important; }
                }
                @media (max-width: 768px) {
                    .responsive-meta-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
                    .responsive-split-grid { grid-template-columns: 1fr !important; }
                    .moment-row { flex-direction: column; }
                    .moment-label { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${theme.border} !important; padding: 12px 20px !important; }
                }
                @media (max-width: 640px) {
                    .document-paper { padding: 30px 15px !important; border-radius: 0 !important; }
                    .sticky-footer-bar { padding: 15px 20px !important; }
                    .footer-title-group { display: none !important; }
                    .footer-btn-group { width: 100%; justify-content: center; }
                    .footer-btn-group button { flex: 1; }
                }
            `}</style>
        </div>
    );
}
