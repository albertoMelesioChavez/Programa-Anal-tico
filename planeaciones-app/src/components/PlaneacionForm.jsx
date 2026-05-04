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
            .then(res => res.json())
            .then(data => setCatalogs(data));
    }, []);

    useEffect(() => {
        if (formData.fase_id && formData.lenguaje_id) {
            fetch(`/api/contenidos?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setContenidos(data));
            
            fetch(`/api/orientaciones?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setOrientaciones(data));
            
            fetch(`/api/material-consulta?lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setMateriales(data));
        }
    }, [formData.fase_id, formData.lenguaje_id]);

    useEffect(() => {
        if (formData.contenido_nacional_id) {
            fetch(`/api/pdas?contenido_id=${formData.contenido_nacional_id}`)
                .then(res => res.json())
                .then(data => setPdas(data));
        }
    }, [formData.contenido_nacional_id]);

    useEffect(() => {
        if (formData.grado_id && formData.lenguaje_id) {
            fetch(`/api/actividades-libro?grado_id=${formData.grado_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setActividadesLibro(data));
        }
    }, [formData.grado_id, formData.lenguaje_id]);

    const handleSave = async () => {
        setLoading(true);
        await onSave(formData);
        setLoading(false);
    };

    const filteredGrados = catalogs.grados.filter(g => g.fase_id == formData.fase_id);

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
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Título</label>
                            <input type="text" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Fase</label>
                                <select value={formData.fase_id} onChange={(e) => setFormData({...formData, fase_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                    <option value="">Seleccione...</option>
                                    {catalogs.fases.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
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
                                    {catalogs.lenguajes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Contenido Nacional</label>
                            <select value={formData.contenido_nacional_id} onChange={(e) => setFormData({...formData, contenido_nacional_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                <option value="">Seleccione...</option>
                                {contenidos.nacionales.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>PDA</label>
                            <select value={formData.pda_id} onChange={(e) => setFormData({...formData, pda_id: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
                                <option value="">Seleccione...</option>
                                {pdas.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Metodología</label>
                            <input type="text" value={formData.metodologia} onChange={(e) => setFormData({...formData, metodologia: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <textarea placeholder="Inicio" value={formData.secuencia_inicio} onChange={(e) => setFormData({...formData, secuencia_inicio: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '100px' }} />
                            <textarea placeholder="Desarrollo" value={formData.secuencia_desarrollo} onChange={(e) => setFormData({...formData, secuencia_desarrollo: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '150px' }} />
                            <textarea placeholder="Cierre" value={formData.secuencia_cierre} onChange={(e) => setFormData({...formData, secuencia_cierre: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '100px' }} />
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Evaluación Formativa</label>
                            <textarea value={formData.evaluacion} onChange={(e) => setFormData({...formData, evaluacion: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '120px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Recursos</label>
                            <textarea value={formData.recursos} onChange={(e) => setFormData({...formData, recursos: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', minHeight: '100px' }} />
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
