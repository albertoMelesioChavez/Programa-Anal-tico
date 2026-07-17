'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ProyectoDetallePage() {
    const { id } = useParams();
    const router = useRouter();
    const [proyecto, setProyecto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    // Curriculum data for names
    const [curriculum, setCurriculum] = useState({ estatales: [], pdas: [] });

    useEffect(() => {
        if (id) {
            fetchProyecto();
            fetchCurriculum();
        }
    }, [id]);

    const fetchProyecto = async () => {
        try {
            const res = await fetch(`/api/proyectos/${id}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setProyecto(data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurriculum = async () => {
        try {
            const res = await fetch('/api/contenidos');
            const data = await res.json();
            setCurriculum(data);
        } catch (e) {}
    };

    const handleUpdate = async (updatedFields) => {
        const newProyecto = { ...proyecto, ...updatedFields };
        setProyecto(newProyecto);
        setSaving(true);
        try {
            const res = await fetch(`/api/proyectos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProyecto)
            });
            if (res.ok) setLastSaved(new Date());
        } catch (e) {
            console.error("Error saving:", e);
        } finally {
            setSaving(false);
        }
    };

    const deleteProyecto = async () => {
        if (!confirm("¿Seguro que quieres eliminar este proyecto?")) return;
        try {
            await fetch(`/api/proyectos/${id}`, { method: 'DELETE' });
            router.push('/proyectos');
        } catch (e) {}
    };

    const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);
    const [generatingGrade, setGeneratingGrade] = useState(null);

    const generateIntroAI = async () => {
        setIsGeneratingIntro(true);
        try {
            const prompt = `Redacta la "Introducción y Sustento" del proyecto "${proyecto.titulo}" (Temática: ${proyecto.tematica}). Usa un tono formal y pedagógico, 3 párrafos.`;
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: proyecto })
            });
            const data = await res.json();
            if (data.text) handleUpdate({ introduccion: data.text });
        } catch (e) { alert("Error al generar: " + e.message); }
        finally { setIsGeneratingIntro(false); }
    };

    const generateProductAI = async (gradeKey) => {
        setGeneratingGrade(gradeKey);
        try {
            const gradeMapping = {
                grado1: '1º de primaria', grado2: '2º de primaria', grado3: '3º de primaria',
                grado4: '4º de primaria', grado5: '5º de primaria', grado6: '6º de primaria'
            };
            const prompt = `Propón un producto esperado original para ${gradeMapping[gradeKey]}. Título: "${proyecto.titulo}". Responde solo con el nombre del producto, max 12 palabras.`;
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: proyecto })
            });
            const data = await res.json();
            if (data.text) {
                const newProducts = { ...proyecto.productos };
                newProducts[gradeKey] = [...(newProducts[gradeKey] || []), data.text.trim()];
                handleUpdate({ productos: newProducts });
            }
        } catch (e) { alert("Error: " + e.message); }
        finally { setGeneratingGrade(null); }
    };

    const addManualProduct = (gradeKey) => {
        const product = prompt("Nombre del nuevo producto esperado:");
        if (product) {
            const newProducts = { ...proyecto.productos };
            newProducts[gradeKey] = [...(newProducts[gradeKey] || []), product];
            handleUpdate({ productos: newProducts });
        }
    };

    const removeProduct = (gradeKey, index) => {
        const newProducts = { ...proyecto.productos };
        newProducts[gradeKey].splice(index, 1);
        handleUpdate({ productos: newProducts });
    };

    const theme = {
        bg: '#f1f5f9',
        paper: '#ffffff',
        accent: '#7c3aed',
        text: '#0f172a',
        subtext: '#64748b',
        border: '#e2e8f0'
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
            <div className="loader"></div>
            <style jsx>{`.loader { border: 4px solid #f3f3f3; border-top: 4px solid ${theme.accent}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!proyecto) return <div>No se encontró el proyecto.</div>;

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, paddingBottom: '100px' }}>
            {/* TOOLBAR */}
            <header style={{ background: '#fff', borderBottom: `1px solid ${theme.border}`, padding: '16px 40px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link href="/proyectos" style={{ textDecoration: 'none', color: theme.subtext, fontWeight: '700', fontSize: '14px' }}>← VOLVER</Link>
                    <div style={{ width: '1px', height: '24px', background: theme.border }}></div>
                    <span style={{ fontSize: '12px', color: theme.subtext, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {saving ? '⏳ Guardando...' : lastSaved ? `✓ Guardado ${lastSaved.toLocaleTimeString()}` : 'Proyecto del maestro de arte'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => window.print()} style={{ background: '#f8fafc', border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Imprimir / PDF</button>
                    <button onClick={deleteProyecto} style={{ background: '#fff', border: `1px solid #fee2e2`, color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Eliminar</button>
                </div>
            </header>

            <main style={{ maxWidth: '850px', margin: '40px auto', padding: '0 20px' }}>
                <div style={{ background: theme.paper, padding: '80px', borderRadius: '4px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', minHeight: '1000px' }}>
                    
                    {/* TITULO Y TEMATICA */}
                    <input 
                        value={proyecto.titulo}
                        onChange={e => handleUpdate({ titulo: e.target.value })}
                        style={{ width: '100%', fontSize: '42px', fontWeight: '900', border: 'none', outline: 'none', marginBottom: '8px', letterSpacing: '-1.5px' }}
                        placeholder="Título del Proyecto"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '12px', fontSize: '14px' }}>🎯</span>
                            <input 
                                value={proyecto.tematica}
                                onChange={e => handleUpdate({ tematica: e.target.value })}
                                style={{ background: theme.accent + '10', color: theme.accent, padding: '6px 16px 6px 36px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', border: 'none', outline: 'none', width: 'auto', minWidth: '200px' }}
                                placeholder="Añadir temática..."
                            />
                        </div>
                        <span style={{ color: theme.subtext, fontSize: '13px', fontWeight: '500' }}>📅 {new Date(proyecto.created_at).toLocaleString()}</span>
                    </div>

                    {/* INTRODUCCIÓN */}
                    <section style={{ marginBottom: '60px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `2px solid ${theme.accent}20`, paddingBottom: '8px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px' }}>I. Introducción y Sustento</h2>
                            <button 
                                onClick={generateIntroAI}
                                disabled={isGeneratingIntro}
                                style={{ background: 'none', border: 'none', color: theme.accent, fontSize: '12px', fontWeight: '800', cursor: 'pointer', opacity: isGeneratingIntro ? 0.5 : 1 }}
                            >
                                {isGeneratingIntro ? '🪄 Generando...' : '🪄 Redactar con IA'}
                            </button>
                        </div>
                        <textarea 
                            value={proyecto.introduccion}
                            onChange={e => handleUpdate({ introduccion: e.target.value })}
                            style={{ width: '100%', minHeight: '200px', border: 'none', outline: 'none', fontSize: '17px', lineHeight: '1.8', color: '#334155', resize: 'none' }}
                        />
                    </section>

                    {/* PRODUCTOS */}
                    <section style={{ marginBottom: '60px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `2px solid ${theme.accent}20`, paddingBottom: '8px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px' }}>II. Productos Esperados</h2>
                        </div>
                        
                        {['grado1', 'grado2', 'grado3', 'grado4', 'grado5', 'grado6'].map(grade => {
                            const items = proyecto.productos?.[grade] || [];
                            return (
                                <div key={grade} style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '12px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase' }}>{grade.replace('grado', '')}º Grado</h3>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button onClick={() => generateProductAI(grade)} disabled={generatingGrade === grade} style={{ background: 'none', border: 'none', color: theme.accent, fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                                                {generatingGrade === grade ? '⏳...' : '✨ IA'}
                                            </button>
                                            <button onClick={() => addManualProduct(grade)} style={{ background: 'none', border: 'none', color: theme.subtext, fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>+ Añadir</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {items.length === 0 && <p style={{ fontSize: '13px', color: theme.subtext, fontStyle: 'italic' }}>Sin productos definidos.</p>}
                                        {items.map((it, i) => (
                                            <div key={i} className="product-item" style={{ display: 'flex', gap: '12px', alignItems: 'center', group: 'true' }}>
                                                <span style={{ color: theme.accent }}>✦</span>
                                                <input 
                                                    value={it}
                                                    onChange={e => {
                                                        const newProducts = { ...proyecto.productos };
                                                        newProducts[grade][i] = e.target.value;
                                                        handleUpdate({ productos: newProducts });
                                                    }}
                                                    style={{ flex: 1, fontSize: '15px', fontWeight: '600', border: 'none', outline: 'none', background: 'none' }}
                                                />
                                                <button onClick={() => removeProduct(grade, i)} style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.3, cursor: 'pointer', fontSize: '14px' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* VINCULACIÓN */}
                    <section>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px', borderBottom: `2px solid ${theme.accent}20`, paddingBottom: '8px', display: 'inline-block' }}>III. Vinculación Curricular</h2>
                        
                        {Array.isArray(proyecto.vinculacion) && proyecto.vinculacion.map((v, i) => {
                            const content = curriculum.estatales?.find(c => c.id === v.contenido_id);
                            return (
                                <div key={i} style={{ marginBottom: '32px', padding: '24px', borderRadius: '16px', background: '#f8fafc', border: `1px solid ${theme.border}` }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '12px', color: theme.text }}>{content?.descripcion || `Contenido ID: ${v.contenido_id}`}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {Array.isArray(v.pda_ids) && v.pda_ids.map(pid => {
                                            const pda = curriculum.pdas?.find(p => p.id === pid);
                                            return (
                                                <div key={pid} style={{ display: 'flex', gap: '10px', paddingLeft: '12px', borderLeft: `2px solid ${theme.accent}30` }}>
                                                    <span style={{ fontSize: '13px', color: theme.subtext, fontStyle: 'italic' }}>PDA:</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '500', color: theme.subtext }}>{pda?.descripcion || `PDA ID: ${pid}`}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                </div>
            </main>
            <style jsx>{`
                .product-item button { opacity: 0; transition: opacity 0.2s; }
                .product-item:hover button { opacity: 1; }
            `}</style>
        </div>
    );
}
