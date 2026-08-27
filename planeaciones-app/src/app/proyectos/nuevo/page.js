'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoProyectoPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    // Modal state for products
    const [showProductModal, setShowProductModal] = useState(false);
    const [activeFase, setActiveFase] = useState(''); // Usaremos esto para guardar la clave del grado
    const [productInputValue, setProductInputValue] = useState('');
    const [productAIInstruction, setProductAIInstruction] = useState('');
    const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        titulo: '',
        tematica: '',
        introduccion: '',
        productos: {
            grado1: [], grado2: [], grado3: [], grado4: [], grado5: [], grado6: []
        },
        vinculacion: []
    });

    // Database Content for Linking
    const [dbData, setDbData] = useState({ nacionales: [], estatales: [], pdas: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContenido, setSelectedContenido] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurriculumData();
    }, []);

    const fetchCurriculumData = async () => {
        try {
            const res = await fetch('/api/contenidos');
            const data = await res.json();
            setDbData({ 
                nacionales: data.nacionales || [], 
                estatales: data.estatales || [], 
                pdas: data.pdas || [] 
            });
        } catch (error) {
            console.error("Error loading curriculum data", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleContenido = (contenido) => {
        if (!contenido) return;
        const isSelected = formData.vinculacion.some(v => v.contenido_id === contenido.id);
        if (isSelected) {
            setFormData({
                ...formData,
                vinculacion: formData.vinculacion.filter(v => v.contenido_id !== contenido.id)
            });
        } else {
            setFormData({
                ...formData,
                vinculacion: [...formData.vinculacion, { contenido_id: contenido.id, pda_ids: [] }]
            });
            setSelectedContenido(contenido);
        }
    };

    const togglePDA = (contenidoId, pdaId) => {
        const vinculacion = [...formData.vinculacion];
        let contentIndex = vinculacion.findIndex(v => v.contenido_id === contenidoId);
        
        if (contentIndex === -1) {
            vinculacion.push({ contenido_id: contenidoId, pda_ids: [pdaId] });
        } else {
            const pdaIndex = vinculacion[contentIndex].pda_ids.indexOf(pdaId);
            if (pdaIndex === -1) {
                vinculacion[contentIndex].pda_ids.push(pdaId);
            } else {
                vinculacion[contentIndex].pda_ids.splice(pdaIndex, 1);
            }
        }
        setFormData({ ...formData, vinculacion });
    };

    const generateIntroduction = async () => {
        if (!formData.tematica || !formData.titulo) {
            return alert("Por favor completa el Título y la Temática antes de generar el sustento.");
        }

        setIsGenerating(true);
        setFormData(prev => ({ ...prev, introduccion: '' }));
        try {
            const prompt = `MISIÓN: Redacta la "Introducción y Sustento" de un proyecto del maestro de arte titulado "${formData.titulo}" cuya temática central es "${formData.tematica}".
            Menciona cómo los productos esperados ayudarán a los alumnos. Usa un tono formal y pedagógico. 3 párrafos.`;
            
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: formData })
            });
            
            const data = await res.json();
            if (data.error) throw new Error(data.details || data.error);
            setFormData(prev => ({ ...prev, introduccion: data.text }));
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const suggestCurriculum = async () => {
        if (!formData.titulo || dbData.estatales.length === 0) return;
        setIsSuggesting(true);
        try {
            const listado = dbData.estatales.slice(0, 150).map(c => `ID:${c.id} - ${c.descripcion}`).join('\n');
            const prompt = `Selecciona los 3 IDs de contenidos que mejor se vinculen con el proyecto "${formData.titulo}" (${formData.tematica}). Responde solo con un array JSON de IDs, ej: [12, 45, 102].\n\nCATÁLOGO:\n${listado}`;
            
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: formData })
            });
            
            const data = await res.json();
            if (data.text) {
                const match = data.text.match(/\[.*\]/);
                if (match) {
                    try {
                        const suggestedIds = JSON.parse(match[0]);
                        const newVinculacion = suggestedIds.map(id => ({ contenido_id: id, pda_ids: [] }));
                        setFormData(prev => ({ ...prev, vinculacion: newVinculacion }));
                        if (suggestedIds.length > 0) {
                            const first = dbData.estatales.find(c => c.id === suggestedIds[0]);
                            if (first) setSelectedContenido(first);
                        }
                    } catch (e) { console.error("Parse error", e); }
                }
            }
        } catch (error) {
            console.error("AI Suggestion Error:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    useEffect(() => {
        if (step === 4 && formData.vinculacion.length === 0) {
            suggestCurriculum();
        }
    }, [step]);

    const openProductModal = (fase) => {
        setActiveFase(fase);
        setProductInputValue('');
        setProductAIInstruction('');
        setShowProductModal(true);
    };

    const generateProductWithAI = async () => {
        setIsGeneratingProduct(true);
        setProductInputValue('');
        try {
            const gradeMapping = {
                grado1: '1º de primaria', grado2: '2º de primaria', grado3: '3º de primaria',
                grado4: '4º de primaria', grado5: '5º de primaria', grado6: '6º de primaria'
            };
            const prompt = `Propón un producto artístico creativo para alumnos de ${gradeMapping[activeFase]}. Tema: "${formData.titulo}". Responde solo con el nombre del producto (max 12 palabras).`;
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: formData })
            });
            const data = await res.json();
            if (data.text) setProductInputValue(data.text.trim());
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsGeneratingProduct(false);
        }
    };

    const confirmAddProduct = () => {
        if (!productInputValue) return;
        const newProducts = { ...formData.productos };
        newProducts[activeFase] = [...(newProducts[activeFase] || []), productInputValue];
        setFormData({ ...formData, productos: newProducts });
        setShowProductModal(false);
    };

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/proyectos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) router.push('/proyectos');
            else throw new Error("Error al guardar");
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const theme = {
        accent: '#7c3aed',
        bg: '#f8fafc',
        border: '#e2e8f0',
        subtext: '#64748b',
        text: '#0f172a'
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
            <div className="loader"></div>
            <style jsx>{`.loader { border: 4px solid #f3f3f3; border-top: 4px solid ${theme.accent}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, paddingBottom: '100px' }}>
            <header style={{ background: '#fff', borderBottom: `1px solid ${theme.border}`, padding: '24px 40px', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
                    <Link href="/proyectos" style={{ textDecoration: 'none', color: theme.subtext, fontWeight: '700', fontSize: '14px' }}>← CANCELAR</Link>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} style={{ width: '40px', height: '6px', borderRadius: '3px', background: step >= s ? theme.accent : theme.border, transition: 'all 0.3s' }}></div>
                        ))}
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px' }}>
                {step === 1 && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '16px' }}>Proyecto del maestro de arte</h2>
                        <p style={{ color: theme.subtext, lineHeight: '1.6', marginBottom: '28px' }}>Define la temática y los productos de tu proyecto. Después podrás vincularle varias planeaciones.</p>
                        <input value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Título del Proyecto" style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '20px', fontWeight: '700', marginBottom: '24px', outline: 'none' }} />
                        <input value={formData.tematica} onChange={e => setFormData({...formData, tematica: e.target.value})} placeholder="Temática Central" style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '18px', fontWeight: '700', marginBottom: '40px', outline: 'none' }} />
                        <button onClick={() => setStep(2)} disabled={!formData.titulo || !formData.tematica} style={{ width: '100%', padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer', opacity: (!formData.titulo || !formData.tematica) ? 0.5 : 1 }}>CONTINUAR →</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '40px' }}>Introducción y Sustento</h2>
                        <button onClick={generateIntroduction} disabled={isGenerating} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#f5f3ff', color: theme.accent, border: `1px solid ${theme.accent}30`, fontWeight: '900', marginBottom: '24px', cursor: 'pointer' }}>{isGenerating ? '🪄 REDACTANDO...' : '🪄 GENERAR CON IA'}</button>
                        <textarea value={formData.introduccion} onChange={e => setFormData({...formData, introduccion: e.target.value})} style={{ width: '100%', minHeight: '300px', padding: '24px', borderRadius: '24px', border: `1px solid ${theme.border}`, fontSize: '16px', lineHeight: '1.6', outline: 'none', resize: 'none' }} />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '20px', borderRadius: '16px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer' }}>VOLVER</button>
                            <button onClick={() => setStep(3)} style={{ flex: 2, padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' }}>SIGUIENTE PASO</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '40px' }}>Productos Esperados</h2>
                        {['grado1', 'grado2', 'grado3', 'grado4', 'grado5', 'grado6'].map(g => (
                            <div key={g} style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: `1px solid ${theme.border}`, marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontWeight: '900' }}>{g.replace('grado', '')}º Grado</h3>
                                    <button onClick={() => openProductModal(g)} style={{ color: theme.accent, border: 'none', background: 'none', fontWeight: '900', cursor: 'pointer' }}>+ AÑADIR</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                    {formData.productos[g].map((p, i) => <div key={i} style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: '100px', fontSize: '13px' }}>{p}</div>)}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '20px', borderRadius: '16px', background: '#f1f5f9', border: 'none', fontWeight: '900', cursor: 'pointer' }}>VOLVER</button>
                            <button onClick={() => setStep(4)} style={{ flex: 2, padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer' }}>SIGUIENTE PASO</button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="fade-in">
                        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '40px' }}>Vinculación Curricular</h2>
                        {isSuggesting && <div className="pulse-suggest" style={{ padding: '20px', background: '#f5f3ff', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', color: theme.accent, fontWeight: '700' }}>🪄 IA sugiriendo contenidos...</div>}
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar contenidos..." style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '24px', outline: 'none' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '12px' }}>
                                {dbData.estatales.filter(c => c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 20).map(c => (
                                    <div key={c.id} onClick={() => setSelectedContenido(c)} style={{ padding: '16px', borderRadius: '12px', background: selectedContenido?.id === c.id ? '#f5f3ff' : '#fff', border: `1px solid ${selectedContenido?.id === c.id ? theme.accent : theme.border}`, cursor: 'pointer', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '10px', fontWeight: '900', color: theme.accent }}>ID:{c.id}</span> <input type="checkbox" checked={formData.vinculacion.some(v => v.contenido_id === c.id)} onChange={() => toggleContenido(c)} /></div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px' }}>{c.descripcion}</p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                {selectedContenido ? (
                                    <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: `1px solid ${theme.border}`, position: 'sticky', top: '100px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '16px' }}>{selectedContenido.descripcion}</h3>
                                        {dbData.pdas.filter(p => p.contenido_id === selectedContenido.id).map(p => (
                                            <div key={p.id} onClick={() => togglePDA(selectedContenido.id, p.id)} style={{ padding: '12px', borderRadius: '12px', background: formData.vinculacion.find(v => v.contenido_id === selectedContenido.id)?.pda_ids.includes(p.id) ? '#f5f3ff' : '#f8fafc', marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>{p.descripcion}</div>
                                        ))}
                                    </div>
                                ) : <div style={{ textAlign: 'center', color: theme.subtext, padding: '40px' }}>Selecciona un contenido para ver sus PDAs</div>}
                            </div>
                        </div>
                        <button onClick={handleSaveProject} disabled={isSaving || formData.vinculacion.length === 0} style={{ width: '100%', padding: '24px', borderRadius: '20px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', fontSize: '18px', marginTop: '40px', cursor: 'pointer', opacity: (isSaving || formData.vinculacion.length === 0) ? 0.5 : 1 }}>{isSaving ? 'GUARDANDO...' : 'FINALIZAR PROYECTO'}</button>
                    </div>
                )}
            </main>

            {showProductModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '500px' }}>
                        <h3 style={{ fontWeight: '900', marginBottom: '16px' }}>Nuevo Producto ({activeFase.replace('grado', '')}º)</h3>
                        <button onClick={generateProductWithAI} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f5f3ff', color: theme.accent, border: 'none', fontWeight: '900', marginBottom: '16px', cursor: 'pointer' }}>🪄 GENERAR CON IA</button>
                        <textarea value={productInputValue} onChange={e => setProductInputValue(e.target.value)} style={{ width: '100%', minHeight: '100px', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none', marginBottom: '24px' }} />
                        <div style={{ display: 'flex', gap: '12px' }}><button onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#f1f5f9', border: 'none' }}>CANCELAR</button><button onClick={confirmAddProduct} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: theme.accent, color: '#fff', border: 'none' }}>AGREGAR</button></div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .loader { border: 4px solid #f3f3f3; border-top: 4px solid ${theme.accent}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .pulse-suggest { animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
}
