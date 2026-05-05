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
    const [showOrientaciones, setShowOrientaciones] = useState(true);

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

    const Label = ({ children }) => (
        <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', opacity: 0.8 }}>{children}</label>
    );

    const Select = ({ value, onChange, options, placeholder }) => (
        <select value={value} onChange={onChange} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px', color: '#fff', fontSize: '14px', outline: 'none', transition: 'all 0.3s', cursor: 'pointer', appearance: 'none' }}>
            <option value="">{placeholder || 'Seleccione...'}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.nombre || opt.descripcion}</option>)}
        </select>
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8))', backdropFilter: 'blur(20px)', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.6)' }} className="wizard-container">
            {/* Elegant Stepper */}
            <div style={{ padding: '32px 24px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', gap: '12px' }} className="stepper-header">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: step >= s ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : 'rgba(255,255,255,0.05)', color: step >= s ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', boxShadow: step === s ? '0 0 20px rgba(59,130,246,0.4)' : 'none', transform: step === s ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>{s}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }} className="step-text">
                            <span style={{ fontSize: '10px', fontWeight: '900', color: step >= s ? '#60a5fa' : '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Paso {s}</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: step >= s ? '#fff' : '#64748b' }}>{STEPS[s-1]}</span>
                        </div>
                        {s < 4 && <div style={{ width: '30px', height: '2px', background: step > s ? '#3b82f6' : 'rgba(255,255,255,0.05)', borderRadius: '2px' }} className="step-divider" />}
                    </div>
                ))}
            </div>

            <div style={{ padding: '40px' }} className="wizard-body">
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                        <div>
                            <Label>Título del Proyecto Educativo</Label>
                            <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Ej. Explorando los colores de mi comunidad" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '18px', color: '#fff', fontSize: '16px', fontWeight: '500', outline: 'none', transition: 'all 0.3s' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                            <div>
                                <Label>Fase Educativa</Label>
                                <Select value={formData.fase_id} onChange={(e) => setFormData({...formData, fase_id: e.target.value})} options={catalogs?.fases || []} placeholder="Seleccione Fase..." />
                            </div>
                            <div>
                                <Label>Grado Escolar</Label>
                                <Select value={formData.grado_id} onChange={(e) => setFormData({...formData, grado_id: e.target.value})} options={filteredGrados} placeholder="Seleccione Grado..." />
                            </div>
                            <div>
                                <Label>Lenguaje Artístico</Label>
                                <Select value={formData.lenguaje_id} onChange={(e) => setFormData({...formData, lenguaje_id: e.target.value})} options={catalogs?.lenguajes || []} placeholder="Seleccione Lenguaje..." />
                            </div>
                        </div>
                        <div>
                            <Label>Ejes Articuladores (NEM)</Label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {(catalogs?.ejes_articuladores || []).map(eje => {
                                    const selected = formData.ejes_articuladores.includes(eje.nombre);
                                    return (
                                        <button key={eje.id} type="button" onClick={() => toggleEje(eje.nombre)}
                                            style={{ padding: '10px 18px', borderRadius: '25px', fontSize: '13px', fontWeight: '600', border: selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', background: selected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)', color: selected ? '#60a5fa' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: selected ? '0 4px 12px rgba(59,130,246,0.2)' : 'none' }}>
                                            {selected ? '✓ ' : ''}{eje.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="mobile-stack">
                            <div>
                                <Label>Contenido Nacional</Label>
                                <Select value={formData.contenido_nacional_id} onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value, contenido_estatal_id: ''})} options={contenidos?.nacionales || []} placeholder="Seleccione Nacional..." />
                            </div>
                            <div>
                                <Label>Contenido Estatal / Regional</Label>
                                <Select value={formData.contenido_estatal_id} onChange={(e) => setFormData({...formData, contenido_estatal_id: e.target.value, contenido_nacional_id: ''})} options={contenidos?.estatales || []} placeholder="Seleccione Estatal..." />
                            </div>
                        </div>
                        
                        {pdas.length > 0 && (
                            <div className="animate-fade-in">
                                <Label>Proceso de Desarrollo de Aprendizaje (PDA)</Label>
                                <Select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} options={pdas} placeholder="Seleccione el PDA correspondiente..." />
                            </div>
                        )}

                        {orientaciones.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <Label>Orientaciones Didácticas Sugeridas</Label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                                    {orientaciones.map((o, i) => (
                                        <div key={i} style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.03))', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '20px', padding: '20px', fontSize: '13px', color: '#ecfdf5', lineHeight: '1.6', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '40px', opacity: 0.05, transform: 'rotate(15deg)' }}>💡</div>
                                            <span style={{ fontWeight: '800', color: '#10b981', display: 'block', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Sugerencia {i+1}</span>
                                            {o.descripcion}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '24px', padding: '24px' }}>
                            <Label>Metodología del Proyecto</Label>
                            <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} placeholder="Ej. Aprendizaje Basado en Proyectos Comunitarios" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px', color: '#fff', fontSize: '15px', fontWeight: '600' }} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px' }} className="mobile-stack">
                                <div style={{ background: '#059669', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>Inicio</div>
                                <textarea value={formData.secuencia_inicio} onChange={(e) => setFormData({...formData, secuencia_inicio: e.target.value})} placeholder="Actividades de encuadre, rescate de saberes previos..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', color: '#fff', minHeight: '100px', resize: 'vertical' }} />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px' }} className="mobile-stack">
                                <div style={{ background: '#2563eb', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>Desarrollo</div>
                                <textarea value={formData.secuencia_desarrollo} onChange={(e) => setFormData({...formData, secuencia_desarrollo: e.target.value})} placeholder="Actividades centrales de aprendizaje, experimentación técnica..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', color: '#fff', minHeight: '160px', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px' }} className="mobile-stack">
                                <div style={{ background: '#db2777', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>Cierre</div>
                                <textarea value={formData.secuencia_cierre} onChange={(e) => setFormData({...formData, secuencia_cierre: e.target.value})} placeholder="Evaluación, metacognición y presentación de productos..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', color: '#fff', minHeight: '100px', resize: 'vertical' }} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="mobile-stack">
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Label>Evaluación Formativa</Label>
                            <textarea value={formData.evaluacion} onChange={(e) => setFormData({...formData, evaluacion: e.target.value})} placeholder="Describa los instrumentos y momentos de evaluación..." style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', minHeight: '300px', fontSize: '14px', lineHeight: '1.6', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Label>Recursos y Materiales</Label>
                                <textarea value={formData.recursos} onChange={(e) => setFormData({...formData, recursos: e.target.value})} placeholder="Pinturas, instrumentos, dispositivos electrónicos..." style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', minHeight: '120px', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(245,158,11,0.1)' }}>
                                <Label>Actividades Complementarias</Label>
                                <textarea value={formData.actividades} onChange={(e) => setFormData({...formData, actividades: e.target.value})} placeholder="Tareas, investigación extra, visitas..." style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', minHeight: '100px', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Footer */}
            <div style={{ padding: '32px 40px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="wizard-footer">
                <button onClick={() => step > 1 ? setStep(step - 1) : onCancel()} style={{ padding: '14px 28px', borderRadius: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s' }} className="btn-mobile">{step === 1 ? 'Cancelar' : 'Anterior'}</button>
                <div style={{ display: 'flex', gap: '16px' }} className="btn-group-mobile">
                    {step === 4 ? (
                        <button onClick={handleSave} style={{ padding: '16px 40px', borderRadius: '18px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16,185,129,0.3)', transition: 'all 0.3s' }}>{loading ? 'Procesando...' : 'Finalizar Planeación'}</button>
                    ) : (
                        <button onClick={() => setStep(step + 1)} style={{ padding: '16px 40px', borderRadius: '18px', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px rgba(59,130,246,0.3)', transition: 'all 0.3s' }}>Siguiente Paso</button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .animate-fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                @media (max-width: 640px) {
                    .step-text, .step-divider { display: none !important; }
                    .stepper-header { padding: 24px 16px !important; gap: 8px !important; }
                    .wizard-body { padding: 24px !important; }
                    .wizard-footer { padding: 24px !important; flex-direction: column-reverse; gap: 16px !important; }
                    .btn-mobile, .btn-group-mobile { width: 100% !important; }
                    .btn-group-mobile button { width: 100% !important; }
                    .mobile-stack { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
