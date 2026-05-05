'use client';

import { useState, useEffect } from 'react';

export default function PlaneacionForm({ onSave, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    const [orientaciones, setOrientaciones] = useState([]);
    const [actividadesLibro, setActividadesLibro] = useState([]);
    const [materiales, setMateriales] = useState([]);

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
            
            fetch(`/api/material-consulta?lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setMateriales(data))
                .catch(() => setMateriales([]));
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

    // Document Style Components
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid rgba(59,130,246,0.2)', pb: '8px' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{children}</h3>
        </div>
    );

    const InlineSelect = ({ value, onChange, options, placeholder, label }) => (
        <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</label>
            <select value={value} onChange={onChange} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', padding: '8px 0', outline: 'none', cursor: 'pointer' }}>
                <option value="" style={{ background: '#0f172a' }}>{placeholder || '---'}</option>
                {options.map(opt => <option key={opt.id} value={opt.id} style={{ background: '#0f172a' }}>{opt.nombre || opt.descripcion}</option>)}
            </select>
        </div>
    );

    const BlockTextarea = ({ label, value, onChange, placeholder, color = '#3b82f6' }) => (
        <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: color, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {label}
            </label>
            <textarea value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '14px', lineHeight: '1.6', minHeight: '100px', outline: 'none', transition: 'all 0.3s' }} />
        </div>
    );

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', color: '#1e293b', borderRadius: '2px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', overflow: 'hidden' }} className="document-container">
            {/* Toolbar / Header */}
            <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontWeight: '800', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Nuevo Programa Analítico 2025</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cerrar</button>
                    <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: '6px', background: '#2563eb', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>
            </div>

            {/* Document Content */}
            <div style={{ padding: '60px 80px', background: '#fff' }} className="document-paper">
                
                {/* Header Section */}
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="ESCRIBA EL TÍTULO DE LA PLANEACIÓN AQUÍ" style={{ width: '100%', border: 'none', borderBottom: '2px solid #f1f5f9', textAlign: 'center', fontSize: '24px', fontWeight: '800', color: '#0f172a', outline: 'none', padding: '10px', textTransform: 'uppercase' }} />
                    <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '10px', fontWeight: '600' }}>FORMATO DE PLANEACIÓN ARTES PRIMARIA - NEM</p>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Fase</label>
                        <select value={formData.fase_id} onChange={(e) => setFormData({...formData, fase_id: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none' }}>
                            <option value="">Seleccione...</option>
                            {(catalogs?.fases || []).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Grado</label>
                        <select value={formData.grado_id} onChange={(e) => setFormData({...formData, grado_id: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none' }}>
                            <option value="">Seleccione...</option>
                            {filteredGrados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Lenguaje</label>
                        <select value={formData.lenguaje_id} onChange={(e) => setFormData({...formData, lenguaje_id: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none' }}>
                            <option value="">Seleccione...</option>
                            {(catalogs?.lenguajes || []).map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* Ejes Articuladores */}
                <div style={{ marginBottom: '40px' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px' }}>Ejes Articuladores Seleccionados</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(catalogs?.ejes_articuladores || []).map(eje => {
                            const selected = formData.ejes_articuladores.includes(eje.nombre);
                            return (
                                <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                    style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', border: '1px solid', borderColor: selected ? '#3b82f6' : '#e2e8f0', background: selected ? '#eff6ff' : '#fff', color: selected ? '#2563eb' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {eje.nombre}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 1: Contenidos */}
                <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', borderLeft: '4px solid #2563eb', paddingLeft: '12px', marginBottom: '20px' }}>I. Contenidos y Procesos de Aprendizaje</h4>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Contenido Programático</label>
                        <select value={formData.contenido_nacional_id || formData.contenido_estatal_id} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({...formData, contenido_nacional_id: val, contenido_estatal_id: ''});
                            }} 
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '500', outline: 'none', padding: '8px 0' }}>
                            <option value="">Seleccione el contenido de la fase...</option>
                            <optgroup label="Contenidos Nacionales">
                                {(contenidos?.nacionales || []).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                            </optgroup>
                            <optgroup label="Contenidos Estatales">
                                {(contenidos?.estatales || []).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                            </optgroup>
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Proceso de Desarrollo de Aprendizaje (PDA)</label>
                        <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '500', outline: 'none', padding: '8px 0' }}>
                            <option value="">Seleccione el PDA correspondiente...</option>
                            {(pdas || []).map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                        </select>
                    </div>

                    {orientaciones.length > 0 && (
                        <div style={{ marginTop: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '4px', border: '1px dashed #10b981' }}>
                            <p style={{ fontSize: '10px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', marginBottom: '10px' }}>Orientaciones Didácticas Sugeridas</p>
                            <div style={{ fontSize: '13px', color: '#065f46', lineHeight: '1.6' }}>
                                {orientaciones.map((o, i) => <div key={i} style={{ marginBottom: '6px' }}>• {o.descripcion}</div>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 2: Didáctica */}
                <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', borderLeft: '4px solid #10b981', paddingLeft: '12px', marginBottom: '20px' }}>II. Secuencia Didáctica y Metodología</h4>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Metodología / Proyecto</label>
                        <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Escriba la metodología a utilizar..." style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', outline: 'none', padding: '8px 0' }} />
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '11px', color: '#64748b', width: '150px' }}>MOMENTO</th>
                                <th style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '11px', color: '#64748b' }}>ACTIVIDADES Y DESARROLLO</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #e2e8f0', verticalAlign: 'top', fontWeight: 'bold', fontSize: '12px', color: '#059669' }}>INICIO</td>
                                <td style={{ padding: '0', border: '1px solid #e2e8f0' }}>
                                    <textarea value={formData.secuencia_inicio} onChange={(e) => setFormData({...formData, secuencia_inicio: e.target.value})} style={{ width: '100%', border: 'none', padding: '12px', minHeight: '80px', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Actividades de encuadre..." />
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #e2e8f0', verticalAlign: 'top', fontWeight: 'bold', fontSize: '12px', color: '#2563eb' }}>DESARROLLO</td>
                                <td style={{ padding: '0', border: '1px solid #e2e8f0' }}>
                                    <textarea value={formData.secuencia_desarrollo} onChange={(e) => setFormData({...formData, secuencia_desarrollo: e.target.value})} style={{ width: '100%', border: 'none', padding: '12px', minHeight: '150px', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Actividades centrales..." />
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px', border: '1px solid #e2e8f0', verticalAlign: 'top', fontWeight: 'bold', fontSize: '12px', color: '#db2777' }}>CIERRE</td>
                                <td style={{ padding: '0', border: '1px solid #e2e8f0' }}>
                                    <textarea value={formData.secuencia_cierre} onChange={(e) => setFormData({...formData, secuencia_cierre: e.target.value})} style={{ width: '100%', border: 'none', padding: '12px', minHeight: '80px', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Conclusiones y evaluación..." />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section 3: Recursos y Evaluación */}
                <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', borderLeft: '4px solid #f59e0b', paddingLeft: '12px', marginBottom: '20px' }}>III. Evaluación y Recursos</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Evaluación Formativa</label>
                            <textarea value={formData.evaluacion} onChange={(e) => setFormData({...formData, evaluacion: e.target.value})} placeholder="Instrumentos y criterios..." style={{ width: '100%', height: '120px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px', fontSize: '13px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Recursos Didácticos</label>
                            <textarea value={formData.recursos} onChange={(e) => setFormData({...formData, recursos: e.target.value})} placeholder="Materiales necesarios..." style={{ width: '100%', height: '120px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px', fontSize: '13px', outline: 'none' }} />
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Style */}
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <p>© 2025 Sistema de Planeación de Artes - Nueva Escuela Mexicana</p>
                <p>Documento generado digitalmente - Confidencialidad Docente</p>
            </div>

            <style jsx>{`
                @media print {
                    .document-paper { box-shadow: none !important; padding: 0 !important; }
                    .document-container { box-shadow: none !important; }
                }
                select:hover, input:hover, textarea:hover {
                    background: rgba(0,0,0,0.02) !important;
                }
            `}</style>
        </div>
    );
}
