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
                        {saving ? '⏳ Guardando...' : lastSaved ? `✓ Guardado ${lastSaved.toLocaleTimeString()}` : 'Vista de Documento'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => window.print()} style={{ background: '#f8fafc', border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Imprimir / PDF</button>
                    <button onClick={deleteProyecto} style={{ background: '#fff', border: `1px solid #fee2e2`, color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Eliminar</button>
                </div>
            </header>

            <main style={{ maxWidth: '850px', margin: '40px auto', padding: '0 20px' }}>
                <div style={{ background: theme.paper, padding: '80px', borderRadius: '4px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', minHeight: '1000px' }}>
                    
                    {/* TITULO Y TEMATICA CENTRAL */}
                    <input 
                        value={proyecto.titulo}
                        onChange={e => handleUpdate({ titulo: e.target.value })}
                        style={{ width: '100%', fontSize: '42px', fontWeight: '900', border: 'none', outline: 'none', marginBottom: '16px', letterSpacing: '-1.5px' }}
                        placeholder="Título del Proyecto"
                    />
                    
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '1px' }}>🎯 Temática Central:</span>
                        </div>
                        <textarea 
                            value={proyecto.tematica}
                            onChange={e => handleUpdate({ tematica: e.target.value })}
                            style={{ width: '100%', fontSize: '18px', fontWeight: '600', color: theme.text, border: 'none', outline: 'none', background: '#f8fafc', padding: '16px', borderRadius: '12px', resize: 'none', minHeight: '60px' }}
                            placeholder="Describe la temática central..."
                        />
                    </div>

                    <div style={{ marginBottom: '60px', color: theme.subtext, fontSize: '13px', fontWeight: '500', display: 'flex', gap: '20px' }}>
                        <span>📅 {new Date(proyecto.created_at).toLocaleString()}</span>
                        <span>🆔 Proyecto #{proyecto.id}</span>
                    </div>

                    {/* INTRODUCCIÓN */}
                    <section style={{ marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px', borderBottom: `2px solid ${theme.accent}20`, paddingBottom: '8px', display: 'inline-block' }}>I. Introducción y Sustento</h2>
                        <textarea 
                            value={proyecto.introduccion}
                            onChange={e => handleUpdate({ introduccion: e.target.value })}
                            style={{ width: '100%', minHeight: '200px', border: 'none', outline: 'none', fontSize: '17px', lineHeight: '1.8', color: '#334155', resize: 'none' }}
                        />
                    </section>

                    {/* PRODUCTOS */}
                    <section style={{ marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px', borderBottom: `2px solid ${theme.accent}20`, paddingBottom: '8px', display: 'inline-block' }}>II. Productos Artísticos</h2>
                        
                        {proyecto.productos && Object.entries(proyecto.productos).map(([fase, items]) => Array.isArray(items) && items.length > 0 && (
                            <div key={fase} style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '12px' }}>
                                    {fase === 'fase3' ? 'Fase 3 (1º y 2º)' : fase === 'fase4' ? 'Fase 4 (3º y 4º)' : 'Fase 5 (5º y 6º)'}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {items.map((it, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <span style={{ color: theme.accent }}>✦</span>
                                            <span style={{ fontSize: '15px', fontWeight: '600' }}>{it}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
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
        </div>
    );
}
