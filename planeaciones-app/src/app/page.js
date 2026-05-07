'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PlaneacionForm from '@/components/PlaneacionForm';
import PlaneacionList from '@/components/PlaneacionList';

export default function Home() {
    const [planeaciones, setPlaneaciones] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingPlaneacion, setEditingPlaneacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [aiKey, setAiKey] = useState('');
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const fetchPlaneaciones = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/planeaciones');
            const data = await res.json();
            setPlaneaciones(Array.isArray(data) ? data : (data.planeaciones || []));
        } catch (error) {
            console.error('Failed to fetch planeaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaneaciones();
    }, []);

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/planeaciones/${id}`, { method: 'DELETE' });
            if (res.ok) fetchPlaneaciones();
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleEdit = (p) => {
        setEditingPlaneacion(p);
        setShowForm(true);
    };

    const handleSaved = () => {
        setShowForm(false);
        setEditingPlaneacion(null);
        fetchPlaneaciones();
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPlaneacion(null);
    };

    const saveConfig = async () => {
        setIsSavingConfig(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'GOOGLE_AI_KEY', value: aiKey })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Configuración guardada. La IA ya debería funcionar.");
                setShowConfig(false);
            } else throw new Error(data.error || "Error desconocido");
        } catch (error) {
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSavingConfig(false);
        }
    };

    return (
        <main style={{ 
            minHeight: '100vh', 
            background: '#f8fafc', 
            color: '#0f172a', 
            fontFamily: '"Outfit", sans-serif',
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* Background Decor */}
            <div style={{ position: 'fixed', top: '-5%', left: '-5%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
            <div style={{ position: 'fixed', bottom: '-5%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

            <div style={{ 
                flex: 1, 
                height: showForm ? '100vh' : 'auto', 
                overflow: showForm ? 'hidden' : 'visible',
                padding: showForm ? '0' : '0 60px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1
            }}>
                
                {!showForm && (
                    <>
                        {/* Hero Header */}
                        <header style={{ textAlign: 'center', margin: '60px 0', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <button 
                                onClick={() => setShowConfig(true)}
                                style={{ 
                                    position: 'absolute', 
                                    right: 0, 
                                    top: 0, 
                                    background: '#f1f5f9', 
                                    border: '1px solid #e2e8f0', 
                                    padding: '10px 20px', 
                                    borderRadius: '12px', 
                                    fontSize: '12px', 
                                    fontWeight: '800', 
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                ⚙️ CONFIGURAR IA
                            </button>
                            <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: '100px', background: '#eff6ff', border: '1px solid #dbeafe', fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
                                NEM 2025 • Sinaloa
                            </div>
                            <h1 style={{ fontSize: 'clamp(32px, 8vw, 64px)', fontWeight: '900', lineHeight: '1', marginBottom: '20px', color: '#0f172a', letterSpacing: '-2px' }}>
                                Programa Analítico <br/> <span style={{ color: '#2563eb' }}>de Artes</span>
                            </h1>
                            <p style={{ fontSize: 'clamp(15px, 4vw, 19px)', color: '#64748b', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6', fontWeight: '500' }}>
                                Plataforma inteligente para la gestión y creación de planeaciones analíticas bajo el nuevo modelo educativo.
                            </p>
                        </header>

                        {/* Main Actions Grid */}
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '60px' }}>
                            <Link href="/proyectos" style={{ textDecoration: 'none' }}>
                                <div className="main-card-light" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderColor: 'transparent' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>✨</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginBottom: '12px' }}>Proyectos</h2>
                                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.6' }}>
                                        Gestiona, sube y genera proyectos creativos. Primero el producto, luego el contenido.
                                    </p>
                                    <div className="btn-add" style={{ background: '#fff', color: '#7c3aed', fontWeight: '900' }}>ACCEDER →</div>
                                </div>
                            </Link>

                            <Link href="/contenidos/artes" style={{ textDecoration: 'none' }}>
                                <div className="main-card-light">
                                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>📘</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '12px' }}>Programa Analítico</h2>
                                    <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
                                        Editor completo del documento oficial de Artes para Fases 3, 4 y 5.
                                    </p>
                                    <div className="btn-primary">ABRIR EDITOR →</div>
                                </div>
                            </Link>

                            <Link href="/contenidos/tablas" style={{ textDecoration: 'none' }}>
                                <div className="main-card-light card-purple">
                                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>📊</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '12px' }}>Tablas de Contenidos</h2>
                                    <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
                                        Dosificación y gestión exclusiva de tablas del programa analítico.
                                    </p>
                                    <div className="btn-purple">VER TABLAS →</div>
                                </div>
                            </Link>
                        </section>
                    </>
                )}

                <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!showForm && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                            <div>
                                <h3 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '4px', letterSpacing: '-1px' }}>Mis Planeaciones</h3>
                                <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Historial y borradores personalizados.</p>
                            </div>
                            <button onClick={() => { setEditingPlaneacion(null); setShowForm(true); }} className="btn-add">
                                + Crear Nueva
                            </button>
                        </div>
                    )}

                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto',
                        background: '#fff', 
                        borderRadius: showForm ? '0' : '32px', 
                        border: showForm ? 'none' : '1px solid #e2e8f0',
                        position: 'relative'
                    }}>
                        {showForm ? (
                            <PlaneacionForm 
                                initialData={editingPlaneacion} 
                                onSaved={handleSaved} 
                                onCancel={handleCancel} 
                            />
                        ) : (
                            <>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                        <div className="loader-blue"></div>
                                    </div>
                                ) : (
                                    <PlaneacionList planeaciones={planeaciones} onDelete={handleDelete} onEdit={handleEdit} />
                                )}
                            </>
                        )}
                    </div>
                </section>

                {showConfig && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: '#fff', borderRadius: '32px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 40px 80px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Configuración de IA</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                                Pega tu <strong>API Key de Google AI Studio</strong> para activar el asistente pedagógico.
                            </p>
                            <input 
                                type="password" 
                                value={aiKey}
                                onChange={e => setAiKey(e.target.value)}
                                placeholder="AIza..."
                                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '12px', color: '#0f172a' }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowConfig(false)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#f1f5f9', fontWeight: '800' }}>CANCELAR</button>
                                <button onClick={saveConfig} disabled={isSavingConfig} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: '800' }}>
                                    {isSavingConfig ? 'GUARDANDO...' : 'GUARDAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!showForm && (
                    <footer style={{ textAlign: 'center', padding: '60px 0', borderTop: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>
                            PLATAFORMA DISEÑADA POR <span style={{ color: '#475569' }}>JOSÉ ALBERTO MELESIO CHÁVEZ</span>
                        </p>
                    </footer>
                )}
            </div>

            <style jsx global>{`
                .main-card-light { background: #fff; border-radius: 40px; padding: 48px 40px; border: 1px solid #e2e8f0; transition: all 0.5s ease; text-align: center; }
                .main-card-light:hover { transform: translateY(-12px); border-color: #2563eb; }
                .btn-primary { background: #2563eb; color: #fff; padding: 14px 40px; border-radius: 16px; font-weight: 800; }
                .btn-purple { background: #7c3aed; color: #fff; padding: 14px 40px; border-radius: 16px; font-weight: 800; }
                .btn-add { background: #0f172a; color: #fff; padding: 14px 32px; border-radius: 16px; font-weight: 800; border: none; cursor: pointer; }
                .loader-blue { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </main>
    );
}
