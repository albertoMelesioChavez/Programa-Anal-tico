'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PlaneacionForm from '@/components/PlaneacionForm';
import PlaneacionList from '@/components/PlaneacionList';

export default function Home() {
    const [planeaciones, setPlaneaciones] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

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
        if (!window.confirm('¿Desea eliminar esta planeación?')) return;
        try {
            const res = await fetch(`/api/planeaciones/${id}`, { method: 'DELETE' });
            if (res.ok) fetchPlaneaciones();
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleSaved = () => {
        setShowForm(false);
        fetchPlaneaciones();
    };

    return (
        <main style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-color)', 
            color: 'var(--text-main)', 
            fontFamily: '"Outfit", sans-serif',
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* Background Decor */}
            <div style={{ position: 'fixed', top: '-5%', left: '-5%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
            <div style={{ position: 'fixed', bottom: '-5%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

            {/* Main Content Area */}
            <div style={{ 
                flex: 1, 
                height: showForm ? '100vh' : 'auto', 
                overflow: showForm ? 'hidden' : 'visible',
                padding: showForm ? '0' : '0 60px',
                display: 'flex',
                flexDirection: 'column'
            }} className="main-content-scroll">
                
                {!showForm && (
                    <>
                        {/* Hero Header */}
                        <header style={{ textAlign: 'center', margin: '60px 0' }}>
                            <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: '100px', background: '#eff6ff', border: '1px solid #dbeafe', fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
                                NEM 2025 • Sinaloa
                            </div>
                            <h1 style={{ 
                                fontSize: 'clamp(32px, 8vw, 64px)', 
                                fontWeight: '900', 
                                lineHeight: '1', 
                                marginBottom: '20px', 
                                color: '#0f172a',
                                letterSpacing: '-2px'
                            }}>
                                Programa Analítico <br/> <span style={{ color: '#2563eb' }}>de Artes</span>
                            </h1>
                            <p style={{ fontSize: 'clamp(15px, 4vw, 19px)', color: '#64748b', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6', fontWeight: '500' }}>
                                Plataforma inteligente para la gestión y creación de planeaciones analíticas bajo el nuevo modelo educativo.
                            </p>
                        </header>

                        {/* Main Actions Grid */}
                        <section style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                            gap: '24px', 
                            marginBottom: '60px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            {/* Card 1 */}
                            <Link href="/contenidos/artes" style={{ textDecoration: 'none' }}>
                                <div className="main-card-light">
                                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>📘</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '12px' }}>Programa Analítico</h2>
                                    <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
                                        Editor completo del documento oficial de Artes para Fases 3, 4 y 5.
                                    </p>
                                    <div className="btn-primary">
                                        ABRIR EDITOR →
                                    </div>
                                </div>
                            </Link>

                            {/* Card 2 */}
                            <Link href="/contenidos/tablas" style={{ textDecoration: 'none' }}>
                                <div className="main-card-light card-purple">
                                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>📊</div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '12px' }}>Tablas de Contenidos</h2>
                                    <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
                                        Dosificación y gestión exclusiva de tablas del programa analítico.
                                    </p>
                                    <div className="btn-purple">
                                        VER TABLAS →
                                    </div>
                                </div>
                            </Link>
                        </section>
                    </>
                )}

                {/* Planning Section / Immersive Editor */}
                <section id="planeaciones-section" style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden' // Section itself shouldn't scroll, its children should
                }}>
                    {!showForm && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                            <div>
                                <h3 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '4px', letterSpacing: '-1px' }}>Mis Planeaciones</h3>
                                <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Historial y borradores personalizados.</p>
                            </div>
                            <button onClick={() => setShowForm(true)} className="btn-add">
                                + Crear Nueva
                            </button>
                        </div>
                    )}

                    <main style={{ 
                        flex: 1, 
                        overflowY: 'auto', // HERE IS THE INTERNAL SCROLL
                        padding: '0',
                        background: '#fff', 
                        borderRadius: showForm ? '0' : '32px', 
                        border: showForm ? 'none' : '1px solid #e2e8f0',
                        boxShadow: showForm ? 'none' : '0 20px 50px rgba(0,0,0,0.03)',
                        position: 'relative',
                        height: showForm ? '100%' : 'auto'
                    }}>
                        {showForm ? (
                            <PlaneacionForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
                        ) : (
                            <>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                        <div className="loader-blue"></div>
                                    </div>
                                ) : (
                                    <PlaneacionList planeaciones={planeaciones} onDelete={handleDelete} />
                                )}
                            </>
                        )}
                    </main>
                </section>

                {!showForm && (
                    <footer style={{ textAlign: 'center', padding: '60px 0', borderTop: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px' }}>
                            PLATAFORMA DISEÑADA POR <span style={{ color: '#475569' }}>JOSÉ ALBERTO MELESIO CHÁVEZ</span>
                        </p>
                    </footer>
                )}
            </div>

            <style jsx global>{`
                .main-card-light {
                    background: #fff;
                    border-radius: 40px;
                    padding: 48px 40px;
                    border: 1px solid #e2e8f0;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02);
                }
                .main-card-light:hover {
                    transform: translateY(-12px);
                    border-color: #2563eb;
                    box-shadow: 0 40px 80px rgba(37, 99, 235, 0.1);
                }
                .card-purple:hover {
                    border-color: #7c3aed;
                    box-shadow: 0 40px 80px rgba(124, 58, 237, 0.1);
                }
                .btn-primary {
                    background: #2563eb;
                    color: #fff;
                    padding: 14px 40px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 13px;
                    letter-spacing: 0.5px;
                }
                .btn-purple {
                    background: #7c3aed;
                    color: #fff;
                    padding: 14px 40px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 13px;
                    letter-spacing: 0.5px;
                }
                .btn-add {
                    background: #0f172a;
                    color: #fff;
                    padding: 14px 32px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 14px;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .loader-blue {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f1f5f9;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </main>
    );
}
