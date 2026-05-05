'use client';

import { useState, useEffect } from 'react';

const STEPS = ['Configuración', 'Currículo', 'Didáctica', 'Evaluación'];

export default function PlaneacionForm({ onSave, onCancel }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], ejes_articuladores: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);
    const [orientaciones, setOrientaciones] = useState([]);
    const [actividadesLibro, setActividadesLibro] = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [showOrientaciones, setShowOrientaciones] = useState(false);

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
        if (formData.contenido_nacional_id) {
            fetch(`/api/pdas?contenido_id=${formData.contenido_nacional_id}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setPdas(data))
                .catch(() => setPdas([]));
        }
    }, [formData.contenido_nacional_id]);

    useEffect(() => {
        if (formData.grado_id && formData.lenguaje_id) {
            fetch(`/api/actividades-libro?grado_id=${formData.grado_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setActividadesLibro(data))
                .catch(() => setActividadesLibro([]));
        }
    }, [formData.grado_id, formData.lenguaje_id]);

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

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }} className="wizard-container">
            {/* Stepper Header */}
            <div style={{ padding: '24px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', gap: '8px' }} className="stepper-header">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= s ? '#2563eb' : 'rgba(255,255,255,0.05)', color: step >= s ? '#fff' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', border: step === s ? '2px solid #60a5fa' : 'none', transition: 'all 0.3s' }}>{s}</div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: step >= s ? '#fff' : '#4b5563' }} className="step-label">
                            {STEPS[s-1]}
                        </span>
                        {s < 4 && <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)' }} className="step-divider" />}
                    </div>
                ))}
            </div>

            <div style={{ padding: '32px' }} className="wizard-body">
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Título de la Planeación</label>
                            <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Ej. El ritmo en la danza" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Fase</label>
                                <select value={formData.fase_id} onChange={(e) => setFormData({...formData, fase_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                    <option value="">Seleccione...</option>
                                    {(catalogs?.fases || []).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Grado</label>
                                <select value={formData.grado_id} onChange={(e) => setFormData({...formData, grado_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                    <option value="">Seleccione...</option>
                                    {filteredGrados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Lenguaje</label>
                                <select value={formData.lenguaje_id} onChange={(e) => setFormData({...formData, lenguaje_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                    <option value="">Seleccione...</option>
                                    {(catalogs?.lenguajes || []).map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Ejes Articuladores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {(catalogs?.ejes_articuladores || []).map(eje => {
                                    const selected = formData.ejes_articuladores.includes(eje.nombre);
                                    return (
                                        <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                            style={{
                                                padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                                                border: selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                                background: selected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: selected ? '#60a5fa' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
                                            }}>
                                            {selected ? '✓ ' : ''}{eje.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Contenido Nacional</label>
                            <select value={formData.contenido_nacional_id} onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                <option value="">Seleccione Contenido...</option>
                                {(contenidos?.nacionales || []).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>PDA (Proceso de Desarrollo)</label>
                            <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                <option value="">Seleccione PDA...</option>
                                {(pdas || []).map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                            </select>
                        </div>
                        {orientaciones.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                                <button type="button" onClick={() => setShowOrientaciones(!showOrientaciones)}
                                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', textAlign: 'left' }}>
                                    📖 {showOrientaciones ? 'Ocultar' : 'Ver'} Orientaciones Didácticas ({orientaciones.length})
                                </button>
                                {showOrientaciones && (
                                    <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto', borderRadius: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', padding: '16px', fontSize: '13px', color: '#d1d5db', lineHeight: '1.6' }}>
                                        {orientaciones.map((o, i) => <div key={i} style={{ marginBottom: '10px' }}>• {o.descripcion}</div>)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Metodología / Proyecto</label>
                            <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Ej. Aprendizaje Basado en Proyectos" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#34d399', marginBottom: '8px', display: 'block' }}>Inicio</label>
                                <textarea value={formData.secuencia_inicio} onChange={(e) => setFormData({...formData, secuencia_inicio: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '80px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px', display: 'block' }}>Desarrollo</label>
                                <textarea value={formData.secuencia_desarrollo} onChange={(e) => setFormData({...formData, secuencia_desarrollo: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '120px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#f472b6', marginBottom: '8px', display: 'block' }}>Cierre</label>
                                <textarea value={formData.secuencia_cierre} onChange={(e) => setFormData({...formData, secuencia_cierre: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '80px' }} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Evaluación Formativa</label>
                            <textarea value={formData.evaluacion} onChange={(e) => setFormData({...formData, evaluacion: e.target.value})} placeholder="Instrumentos de evaluación..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '120px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Recursos</label>
                            <textarea value={formData.recursos} onChange={(e) => setFormData({...formData, recursos: e.target.value})} placeholder="Materiales necesarios..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '100px' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', gap: '16px' }} className="wizard-footer">
                <button onClick={() => step > 1 ? setStep(step - 1) : onCancel()} style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-mobile">{step === 1 ? 'Cancelar' : 'Anterior'}</button>
                <button onClick={() => step < 4 ? setStep(step + 1) : handleSave()} style={{ padding: '12px 32px', borderRadius: '12px', background: '#2563eb', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(37,99,235,0.3)' }} className="btn-mobile">{step === 4 ? (loading ? 'Guardando...' : 'Guardar') : 'Siguiente'}</button>
            </div>

            <style jsx>{`
                @media (max-width: 640px) {
                    .step-label, .step-divider { display: none !important; }
                    .stepper-header { gap: 12px !important; padding: 20px !important; }
                    .wizard-body { padding: 20px !important; }
                    .wizard-footer { padding: 20px !important; flex-direction: column-reverse; }
                    .btn-mobile { width: 100% !important; padding: 16px !important; }
                }
            `}</style>
        </div>
    );
}
