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
            setPlaneaciones(data.planeaciones || []);
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
            background: '#050505', 
            color: '#fff', 
            fontFamily: '"Inter", system-ui, sans-serif',
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* Background Glows */}
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
            <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
                
                {/* Hero Header */}
                <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
                        NEM 2025 • Sinaloa
                    </div>
                    <h1 style={{ 
                        fontSize: 'clamp(32px, 6vw, 56px)', 
                        fontWeight: '900', 
                        lineHeight: '1.1', 
                        marginBottom: '16px', 
                        background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1.5px'
                    }}>
                        Programa Analítico <br/> de Artes
                    </h1>
                    <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' }}>
                        Plataforma inteligente para la gestión, edición y creación de planeaciones analíticas de primaria.
                    </p>
                </header>

                {/* Action Cards Grid */}
                <section style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                    gap: '24px', 
                    marginBottom: '40px' 
                }}>
                    {/* Card 1: Editor Original */}
                    <Link href="/contenidos/artes" style={{ textDecoration: 'none' }}>
                        <div className="main-card" style={{ 
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                            borderRadius: '32px',
                            padding: '24px 32px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer'
                        }}>
                            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📖</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Programa Analítico</h2>
                            <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '32px', flexGrow: 1 }}>
                                Editor íntegro del documento oficial de Artes (Fases 3, 4 y 5).
                            </p>
                            <div style={{ background: '#2563eb', color: 'white', padding: '12px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                                ABRIR EDITOR →
                            </div>
                        </div>
                    </Link>

                    {/* Card 2: Tablas de Contenidos */}
                    <Link href="/contenidos/tablas" style={{ textDecoration: 'none' }}>
                        <div className="main-card-purple" style={{ 
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                            borderRadius: '32px',
                            padding: '24px 32px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer'
                        }}>
                            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📊</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Tablas de Contenidos</h2>
                            <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '32px', flexGrow: 1 }}>
                                Gestión exclusiva de tablas y dosificación del programa analítico.
                            </p>
                            <div style={{ background: '#7c3aed', color: 'white', padding: '12px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                                ABRIR TABLAS →
                            </div>
                        </div>
                    </Link>
                </section>



                <section id="planeaciones-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '4px', letterSpacing: '-1px' }}>Mis Planeaciones</h3>
                            <p style={{ color: '#64748b', fontSize: '15px' }}>Historial de proyectos y borradores personales.</p>
                        </div>
                        {!showForm && (
                            <button 
                                onClick={() => setShowForm(true)}
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    color: '#fff', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    padding: '12px 24px', 
                                    borderRadius: '12px', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                + Nueva
                            </button>
                        )}
                    </div>

                    <div style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '24px', 
                        padding: '32px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        minHeight: '300px',
                        position: 'relative'
                    }}>
                        {showForm ? (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                                    <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                </div>
                                <PlaneacionForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
                            </div>
                        ) : (
                            <>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                        <div className="loader"></div>
                                    </div>
                                ) : (
                                    <PlaneacionList planeaciones={planeaciones} onDelete={handleDelete} />
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Footer Info */}
                <footer style={{ marginTop: '100px', textAlign: 'center', paddingBottom: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px' }}>
                    <div style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                        Diseñado por <span style={{ color: '#94a3b8' }}>José Alberto Melesio Chávez</span>
                    </div>
                </footer>
            </div>

            <style jsx global>{`
                .main-card:hover {
                    transform: translateY(-8px);
                    border-color: rgba(37, 99, 235, 0.4) !important;
                    background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%) !important;
                    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
                }
                .main-card-purple:hover {
                    transform: translateY(-8px);
                    border-color: #7c3aed !important;
                    background: rgba(124,58,237,0.05) !important;
                    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
                }
                .loader {
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(37, 99, 235, 0.2);
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    );
}
