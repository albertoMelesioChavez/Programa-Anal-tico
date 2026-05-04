'use client';

import { useState, useEffect } from 'react';

const STEPS = ['Configuración', 'Contenido Curricular', 'Diseño Didáctico', 'Evaluación'];

export default function PlaneacionForm({ onSaved, onCancel }) {
    const [step, setStep] = useState(0);
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [], campos_formativos: [], ejes_articuladores: [] });
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
        ejes_articuladores: [],
        metodologia: '',
        actividades: '',
        recursos: '',
        evaluacion: '',
        secuencia_inicio: '',
        secuencia_desarrollo: '',
        secuencia_cierre: ''
    });

    const [loading, setLoading] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        fetch('/api/catalogos').then(r => r.json()).then(setCatalogs).catch(console.error);
    }, []);

    useEffect(() => {
        if (formData.fase_id && formData.lenguaje_id) {
            setContenidos({ nacionales: [], estatales: [] });
            setFormData(prev => ({ ...prev, contenido_nacional_id: '', contenido_estatal_id: '', pda_id: '' }));
            fetch(`/api/contenidos?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(r => r.json()).then(setContenidos).catch(console.error);
            fetch(`/api/orientaciones?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(r => r.json()).then(d => setOrientaciones(d.orientaciones || [])).catch(console.error);
            const lenNombre = catalogs.lenguajes.find(l => l.id == formData.lenguaje_id)?.nombre;
            if (lenNombre) {
                fetch(`/api/material-consulta?lenguaje=${encodeURIComponent(lenNombre)}`)
                    .then(r => r.json()).then(d => setMateriales(d.materiales || [])).catch(console.error);
            }
        }
    }, [formData.fase_id, formData.lenguaje_id]);

    useEffect(() => {
        if (formData.grado_id && formData.lenguaje_id) {
            setPdas([]);
            setFormData(prev => ({ ...prev, pda_id: '' }));
            fetch(`/api/pdas?grado_id=${formData.grado_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(r => r.json()).then(d => setPdas(d.pdas || [])).catch(console.error);
            const grado = catalogs.grados.find(g => g.id == formData.grado_id);
            if (grado) {
                const gradoNum = grado.nombre.match(/(\d+)/)?.[1];
                if (gradoNum) {
                    const lenNombre = catalogs.lenguajes.find(l => l.id == formData.lenguaje_id)?.nombre;
                    fetch(`/api/actividades-libro?grado=${gradoNum}${lenNombre ? `&lenguaje=${encodeURIComponent(lenNombre)}` : ''}`)
                        .then(r => r.json()).then(d => setActividadesLibro(d.actividades || [])).catch(console.error);
                }
            }
        }
    }, [formData.grado_id, formData.lenguaje_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleEje = (nombre) => {
        setFormData(prev => ({
            ...prev,
            ejes_articuladores: prev.ejes_articuladores.includes(nombre)
                ? prev.ejes_articuladores.filter(e => e !== nombre)
                : [...prev.ejes_articuladores, nombre]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData, ejes_articuladores: formData.ejes_articuladores.join(', ') };
            const res = await fetch('/api/planeaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => onSaved(), 1500);
            } else { alert('Error al guardar.'); }
        } catch (error) { console.error(error); alert('Error en conexión.'); }
        finally { setLoading(false); }
    };

    const filteredGrados = catalogs.grados.filter(g => g.fase_id === parseInt(formData.fase_id));
    const lenguajeNombre = catalogs.lenguajes.find(l => l.id == formData.lenguaje_id)?.nombre || '';

    const canGoNext = () => {
        if (step === 0) return formData.titulo && formData.fase_id && formData.grado_id && formData.lenguaje_id;
        if (step === 1) return formData.contenido_nacional_id && formData.pda_id;
        return true;
    };

    // ─── Styles ──────────────────────────────────────────────────────
    const inputStyle = {
        width: '100%', padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#f3f4f6', fontSize: '14px', outline: 'none', transition: 'all 0.2s'
    };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };
    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };
    const sectionTitle = { fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' };

    if (submitSuccess) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
                    <span style={{ color: 'white', fontSize: '28px' }}>✓</span>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>¡Planeación Guardada!</h3>
                <p style={{ color: '#94a3b8' }}>Redirigiendo...</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '32px', padding: '0 16px' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            type="button"
                            onClick={() => i < step && setStep(i)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: i <= step ? 'pointer' : 'default',
                                background: i === step ? '#3b82f6' : i < step ? '#10b981' : 'rgba(255,255,255,0.08)',
                                color: i <= step ? 'white' : '#64748b', fontWeight: 'bold', fontSize: '13px',
                                transition: 'all 0.3s', boxShadow: i === step ? '0 0 16px rgba(59,130,246,0.5)' : 'none'
                            }}
                        >{i < step ? '✓' : i + 1}</button>
                        <span style={{ fontSize: '12px', color: i === step ? '#fff' : '#64748b', fontWeight: i === step ? '600' : '400', display: 'none' }}>{s}</span>
                        {i < STEPS.length - 1 && <div style={{ width: '24px', height: '2px', background: i < step ? '#10b981' : 'rgba(255,255,255,0.08)', borderRadius: '2px' }} />}
                    </div>
                ))}
            </div>
            <div style={{ fontSize: '14px', textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
                Paso {step + 1}: <strong style={{ color: '#fff' }}>{STEPS[step]}</strong>
            </div>

            <form onSubmit={handleSubmit}>
                {/* ─── STEP 0: Configuración Base ─────────────────────── */}
                {step === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Título de la Planeación</label>
                            <input type="text" name="titulo" required style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }}
                                placeholder="Ej. Descubriendo los sonidos de mi comunidad"
                                value={formData.titulo} onChange={handleChange} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Fase Escolar</label>
                                <select name="fase_id" required style={selectStyle} value={formData.fase_id} onChange={handleChange}>
                                    <option value="">Seleccione...</option>
                                    {catalogs.fases.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Grado</label>
                                <select name="grado_id" required style={selectStyle} value={formData.grado_id} onChange={handleChange} disabled={!formData.fase_id}>
                                    <option value="">Seleccione...</option>
                                    {filteredGrados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Lenguaje Artístico</label>
                                <select name="lenguaje_id" required style={selectStyle} value={formData.lenguaje_id} onChange={handleChange}>
                                    <option value="">Seleccione...</option>
                                    {catalogs.lenguajes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Campo Formativo</label>
                            <div style={{ ...inputStyle, background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa', fontWeight: '600' }}>
                                📘 Lenguajes
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Ejes Articuladores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {catalogs.ejes_articuladores.map(eje => {
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

                {/* ─── STEP 1: Contenido Curricular ───────────────────── */}
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Contenido Nacional</label>
                            <select name="contenido_nacional_id" required style={selectStyle} value={formData.contenido_nacional_id} onChange={handleChange}>
                                <option value="">Seleccione Contenido Nacional...</option>
                                {contenidos.nacionales.map(c => (
                                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, color: '#818cf8' }}>Contenido Estatal de {lenguajeNombre}</label>
                            <select name="contenido_estatal_id" style={{ ...selectStyle, borderColor: 'rgba(129,140,248,0.3)' }} value={formData.contenido_estatal_id} onChange={handleChange}>
                                <option value="">(Opcional) Seleccione Contenido Estatal...</option>
                                {contenidos.estatales.map(c => (
                                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, color: '#c084fc' }}>PDA — Proceso de Desarrollo de Aprendizaje</label>
                            <select name="pda_id" required style={{ ...selectStyle, borderColor: 'rgba(192,132,252,0.3)' }} value={formData.pda_id} onChange={handleChange}>
                                <option value="">Seleccione PDA...</option>
                                {pdas.map(p => (
                                    <option key={p.id} value={p.id}>{p.descripcion}</option>
                                ))}
                            </select>
                            {formData.pda_id && (
                                <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)', fontSize: '13px', color: '#e9d5ff' }}>
                                    {pdas.find(p => p.id == formData.pda_id)?.descripcion}
                                </div>
                            )}
                        </div>

                        {/* Orientaciones Panel */}
                        {orientaciones.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                                <button type="button" onClick={() => setShowOrientaciones(!showOrientaciones)}
                                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', textAlign: 'left' }}>
                                    📖 {showOrientaciones ? 'Ocultar' : 'Ver'} Orientaciones Didácticas ({orientaciones.length})
                                </button>
                                {showOrientaciones && (
                                    <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto', borderRadius: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', padding: '16px' }}>
                                        {orientaciones.map((o, i) => (
                                            <div key={o.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < orientaciones.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '13px', color: '#d1d5db', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                                                {o.descripcion.substring(0, 500)}...
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 2: Diseño Didáctico ───────────────────────── */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Metodología / Proyecto</label>
                            <textarea name="metodologia" rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                                placeholder="Ej. Aprendizaje Basado en Proyectos Comunitarios"
                                value={formData.metodologia} onChange={handleChange} />
                        </div>
                        <div style={sectionTitle}>📋 Secuencia Didáctica</div>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ ...labelStyle, color: '#34d399' }}>🟢 Inicio</label>
                                <textarea name="secuencia_inicio" rows={3} style={{ ...inputStyle, resize: 'vertical', borderColor: 'rgba(52,211,153,0.2)' }}
                                    placeholder="Actividades de apertura, exploración de conocimientos previos..."
                                    value={formData.secuencia_inicio} onChange={handleChange} />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, color: '#60a5fa' }}>🔵 Desarrollo</label>
                                <textarea name="secuencia_desarrollo" rows={4} style={{ ...inputStyle, resize: 'vertical', borderColor: 'rgba(96,165,250,0.2)' }}
                                    placeholder="Actividades principales, práctica guiada, trabajo colaborativo..."
                                    value={formData.secuencia_desarrollo} onChange={handleChange} />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, color: '#f472b6' }}>🔴 Cierre</label>
                                <textarea name="secuencia_cierre" rows={3} style={{ ...inputStyle, resize: 'vertical', borderColor: 'rgba(244,114,182,0.2)' }}
                                    placeholder="Reflexión, socialización de productos, retroalimentación..."
                                    value={formData.secuencia_cierre} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Actividades sugeridas */}
                        {actividadesLibro.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                                <div style={sectionTitle}>💡 Actividades Sugeridas de Libros NEM</div>
                                <div style={{ display: 'grid', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                                    {actividadesLibro.slice(0, 10).map(a => (
                                        <div key={a.id} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onClick={() => setFormData(prev => ({ ...prev, actividades: prev.actividades + (prev.actividades ? '\n' : '') + `• ${a.titulo_proyecto} (${a.libro}, pág ${a.pagina})` }))}>
                                            <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>{a.titulo_proyecto}</div>
                                            <div style={{ color: '#64748b', fontSize: '11px' }}>{a.libro} · Pág {a.pagina} · {a.lenguaje_artistico} · {a.ejes_articuladores?.substring(0, 60)}</div>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>Click en una actividad para agregarla</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 3: Evaluación y Recursos ──────────────────── */}
                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Evaluación Formativa</label>
                            <textarea name="evaluacion" rows={4} style={{ ...inputStyle, resize: 'vertical' }}
                                placeholder="Rúbrica, observación directa, producto final..."
                                value={formData.evaluacion} onChange={handleChange} />
                        </div>
                        <div>
                            <label style={labelStyle}>Recursos y Materiales</label>
                            <textarea name="recursos" rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                                placeholder="Instrumentos musicales, papel, colores, proyector..."
                                value={formData.recursos} onChange={handleChange} />
                        </div>
                        {materiales.length > 0 && (
                            <div>
                                <div style={sectionTitle}>🔗 Material de Consulta — {lenguajeNombre}</div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {materiales.map(m => (
                                        <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '12px', textDecoration: 'none', wordBreak: 'break-all', transition: 'all 0.2s' }}>
                                            {m.url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Navigation ──────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        {step > 0 && (
                            <button type="button" onClick={() => setStep(step - 1)}
                                style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                                ← Anterior
                            </button>
                        )}
                        {onCancel && step === 0 && (
                            <button type="button" onClick={onCancel}
                                style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                Cancelar
                            </button>
                        )}
                    </div>
                    <div>
                        {step < STEPS.length - 1 ? (
                            <button type="button" onClick={() => setStep(step + 1)} disabled={!canGoNext()}
                                style={{
                                    padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: canGoNext() ? 'pointer' : 'not-allowed',
                                    background: canGoNext() ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                    color: canGoNext() ? 'white' : '#475569', fontWeight: 'bold', fontSize: '14px',
                                    boxShadow: canGoNext() ? '0 4px 20px rgba(59,130,246,0.4)' : 'none', transition: 'all 0.3s'
                                }}>
                                Siguiente →
                            </button>
                        ) : (
                            <button type="submit" disabled={loading}
                                style={{
                                    padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                                    fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 20px rgba(16,185,129,0.4)', transition: 'all 0.3s'
                                }}>
                                {loading ? 'Guardando...' : '✓ Guardar Planeación'}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
