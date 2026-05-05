'use client';

import { useState, useEffect } from 'react';

export default function PlaneacionForm({ onSave, onCancel }) {
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

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(formData);
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
        bg: darkMode ? '#0f172a' : '#f1f5f9',
        docBg: darkMode ? '#1e293b' : '#ffffff',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        subtext: darkMode ? '#94a3b8' : '#64748b',
        border: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
        inputBg: darkMode ? 'rgba(255,255,255,0.02)' : 'transparent',
        sectionBg: darkMode ? 'rgba(59,130,246,0.05)' : '#f8fafc',
        accent: '#2563eb',
        success: '#10b981'
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, transition: 'all 0.3s ease', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', background: theme.docBg, color: theme.text, borderRadius: '4px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', overflow: 'hidden' }} className="document-container">
                
                {/* Toolbar (Header) */}
                <div style={{ padding: '16px 40px', background: '#f8fafc', borderBottom: `1px solid #e2e8f0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: '900', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Editor de Planeación</span>
                    </div>
                    <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: '6px', background: 'transparent', border: `1px solid #e2e8f0`, color: '#64748b', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Cerrar</button>
                </div>

                {/* Paper Content */}
                <div style={{ padding: '60px 80px' }} className="document-paper">
                    
                    {/* Header Section */}
                    <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                        <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="ESCRIBA EL TÍTULO AQUÍ" style={{ width: '100%', border: 'none', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontSize: '24px', fontWeight: '800', color: theme.text, background: 'transparent', outline: 'none', padding: '10px', textTransform: 'uppercase' }} />
                        <p style={{ color: theme.subtext, fontSize: '11px', marginTop: '10px', fontWeight: '700', letterSpacing: '2px' }}>PROGRAMA ANALÍTICO ARTES 2025</p>
                    </div>

                    {/* Meta Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px', padding: '24px', background: theme.sectionBg, borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                        {['Fase', 'Grado', 'Lenguaje'].map((label, idx) => (
                            <div key={label}>
                                <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</label>
                                <select 
                                    value={idx === 0 ? formData.fase_id : idx === 1 ? formData.grado_id : formData.lenguaje_id} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (idx === 0) setFormData({...formData, fase_id: val});
                                        else if (idx === 1) setFormData({...formData, grado_id: val});
                                        else setFormData({...formData, lenguaje_id: val});
                                    }} 
                                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '14px', fontWeight: '600', outline: 'none' }}>
                                    <option value="" style={{ background: theme.docBg }}>---</option>
                                    {(idx === 0 ? catalogs?.fases : idx === 1 ? filteredGrados : catalogs?.lenguajes || []).map(opt => <option key={opt.id} value={opt.id} style={{ background: theme.docBg }}>{opt.nombre}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Ejes Articuladores */}
                    <div style={{ marginBottom: '40px' }}>
                        <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px' }}>Ejes Articuladores</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {(catalogs?.ejes_articuladores || []).map(eje => {
                                const selected = formData.ejes_articuladores.includes(eje.nombre);
                                return (
                                    <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                        style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid', borderColor: selected ? theme.accent : theme.border, background: selected ? (darkMode ? 'rgba(37,99,235,0.2)' : '#eff6ff') : 'transparent', color: selected ? (darkMode ? '#60a5fa' : '#2563eb') : theme.subtext, cursor: 'pointer', transition: 'all 0.2s' }}>
                                        {eje.nombre}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Currículo Section */}
                    <div style={{ marginBottom: '50px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', borderLeft: `4px solid ${theme.accent}`, paddingLeft: '12px', marginBottom: '24px' }}>I. Contenidos y PDA</h4>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Contenido Seleccionado</label>
                            <select value={formData.contenido_nacional_id || formData.contenido_estatal_id} 
                                onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value, contenido_estatal_id: ''})} 
                                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '14px', fontWeight: '500', outline: 'none', padding: '8px 0' }}>
                                <option value="" style={{ background: theme.docBg }}>Seleccione Contenido...</option>
                                <optgroup label="Nacionales" style={{ background: theme.docBg }}>
                                    {(contenidos?.nacionales || []).map(c => <option key={c.id} value={c.id} style={{ background: theme.docBg }}>{c.descripcion}</option>)}
                                </optgroup>
                                <optgroup label="Estatales" style={{ background: theme.docBg }}>
                                    {(contenidos?.estatales || []).map(c => <option key={c.id} value={c.id} style={{ background: theme.docBg }}>{c.descripcion}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Proceso de Desarrollo (PDA)</label>
                            <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '14px', fontWeight: '500', outline: 'none', padding: '8px 0' }}>
                                <option value="" style={{ background: theme.docBg }}>Seleccione PDA...</option>
                                {(pdas || []).map(p => <option key={p.id} value={p.id} style={{ background: theme.docBg }}>{p.descripcion}</option>)}
                            </select>
                        </div>

                        {orientaciones.length > 0 && (
                            <div style={{ marginTop: '20px', padding: '24px', background: darkMode ? 'rgba(16,185,129,0.05)' : '#f0fdf4', borderRadius: '8px', border: `1px dashed ${theme.success}` }}>
                                <p style={{ fontSize: '10px', fontWeight: '900', color: theme.success, textTransform: 'uppercase', marginBottom: '12px' }}>💡 Orientaciones Didácticas Sugeridas</p>
                                <div style={{ fontSize: '13px', color: darkMode ? '#a7f3d0' : '#065f46', lineHeight: '1.6' }}>
                                    {orientaciones.map((o, i) => <div key={i} style={{ marginBottom: '8px' }}>• {o.descripcion}</div>)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Didáctica Section */}
                    <div style={{ marginBottom: '50px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: theme.success, textTransform: 'uppercase', borderLeft: `4px solid ${theme.success}`, paddingLeft: '12px', marginBottom: '24px' }}>II. Secuencia Didáctica</h4>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Metodología de Trabajo</label>
                            <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Ej. Aprendizaje Basado en Proyectos" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: '14px', fontWeight: '600', outline: 'none', padding: '8px 0' }} />
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${theme.border}` }}>
                            <tbody>
                                {[
                                    { label: 'INICIO', key: 'secuencia_inicio', color: theme.success },
                                    { label: 'DESARROLLO', key: 'secuencia_desarrollo', color: theme.accent },
                                    { label: 'CIERRE', key: 'secuencia_cierre', color: '#db2777' }
                                ].map(moment => (
                                    <tr key={moment.key}>
                                        <td style={{ padding: '16px', border: `1px solid ${theme.border}`, verticalAlign: 'top', background: theme.sectionBg, width: '140px' }}>
                                            <span style={{ fontWeight: '900', fontSize: '11px', color: moment.color }}>{moment.label}</span>
                                        </td>
                                        <td style={{ padding: '0', border: `1px solid ${theme.border}` }}>
                                            <textarea value={formData[moment.key]} onChange={(e) => setFormData({...formData, [moment.key]: e.target.value})} style={{ width: '100%', border: 'none', padding: '16px', minHeight: moment.key === 'secuencia_desarrollo' ? '180px' : '100px', fontSize: '14px', background: 'transparent', color: theme.text, outline: 'none', resize: 'none' }} placeholder={`Describa las actividades de ${moment.label.toLowerCase()}...`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Evaluación Section */}
                    <div>
                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', borderLeft: '4px solid #f59e0b', paddingLeft: '12px', marginBottom: '24px' }}>III. Evaluación y Recursos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            {['evaluacion', 'recursos'].map(key => (
                                <div key={key}>
                                    <label style={{ display: 'block', fontSize: '10px', color: theme.subtext, fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>{key === 'evaluacion' ? 'Instrumentos de Evaluación' : 'Recursos Didácticos'}</label>
                                    <textarea value={formData[key]} onChange={(e) => setFormData({...formData, [key]: e.target.value})} style={{ width: '100%', height: '140px', background: theme.sectionBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', fontSize: '14px', color: theme.text, outline: 'none' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Floating Action Bar */}
            <div style={{
                position: 'fixed',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                padding: '12px 32px',
                borderRadius: '100px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                zIndex: 1000,
                animation: 'floatUp 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Documento</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{formData.titulo || 'Sin Título'}</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />
                <button 
                    onClick={handleSave} 
                    disabled={loading}
                    style={{ 
                        background: '#2563eb', 
                        color: '#fff', 
                        padding: '12px 40px', 
                        borderRadius: '100px', 
                        border: 'none', 
                        fontSize: '13px', 
                        fontWeight: '900', 
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {loading ? 'GUARDANDO...' : '💾 GUARDAR PLANEACIÓN'}
                </button>
            </div>

            <style jsx>{`
                @keyframes floatUp {
                    from { transform: translate(-50%, 40px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @media (max-width: 640px) {
                    .document-paper { padding: 40px 20px !important; }
                    table tr { display: flex; flex-direction: column; }
                    table td { width: 100% !important; border: none !important; }
                }
            `}</style>
        </div>
    );
}
