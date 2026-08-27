'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProyectosPage() {
    const [proyectos, setProyectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchProyectos();
    }, []);

    const fetchProyectos = async () => {
        try {
            const res = await fetch('/api/proyectos');
            const data = await res.json();
            setProyectos(data || []);
        } catch (error) {
            console.error("Error fetching projects", error);
        } finally {
            setLoading(false);
        }
    };

    const theme = {
        bg: '#f8fafc',
        sidebar: '#ffffff',
        text: '#0f172a',
        subtext: '#64748b',
        accent: '#7c3aed',
        border: '#e2e8f0',
        card: '#ffffff'
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, display: 'flex' }}>
            {/* Sidebar Simple */}
            <aside style={{ width: '280px', background: theme.sidebar, borderRight: `1px solid ${theme.border}`, padding: '40px 24px', display: 'flex', flexDirection: 'column' }}>
                <Link href="/" style={{ textDecoration: 'none', color: theme.accent, fontWeight: '900', fontSize: '12px', letterSpacing: '2px', marginBottom: '40px', display: 'block' }}>
                    ← DASHBOARD
                </Link>
                <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '8px', lineHeight: '1' }}>Proyecto del maestro de arte</h1>
                <p style={{ fontSize: '14px', color: theme.subtext, fontWeight: '500', marginBottom: '32px' }}>Diseña proyectos artísticos que después podrás vincular a las planeaciones.</p>
                
                <button 
                    onClick={() => router.push('/proyectos/nuevo')}
                    style={{ 
                        background: theme.accent, 
                        color: '#fff', 
                        border: 'none', 
                        padding: '16px', 
                        borderRadius: '16px', 
                        fontWeight: '900', 
                        fontSize: '14px', 
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(124,58,237,0.2)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    + NUEVO PROYECTO DE ARTE
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '60px 80px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>Proyectos de arte guardados</h2>
                        <p style={{ fontSize: '14px', color: theme.subtext }}>Administra los proyectos del maestro de arte.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: '#fff', padding: '12px 24px', borderRadius: '14px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>📁</span>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>{proyectos.length} Proyectos</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', height: '400px', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="loader-blue"></div>
                    </div>
                ) : proyectos.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '32px', padding: '80px', textAlign: 'center', border: `2px dashed ${theme.border}` }}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎨</div>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '12px' }}>Aún no tienes proyectos</h3>
                        <p style={{ color: theme.subtext, maxWidth: '400px', margin: '0 auto 32px', lineHeight: '1.6' }}>
                            Comienza creando tu primer proyecto artístico basado en la temática que desees trabajar con tus alumnos.
                        </p>
                        <button 
                            onClick={() => router.push('/proyectos/nuevo')}
                            style={{ background: '#f1f5f9', color: theme.accent, border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                        >
                            Crear proyecto ahora
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
                        {proyectos.map(p => (
                            <div key={p.id} style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div style={{ background: '#f5f3ff', color: theme.accent, padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900' }}>
                                        {p.tematica?.toUpperCase()}
                                    </div>
                                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋮</button>
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px', letterSpacing: '-0.5px' }}>{p.titulo}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '-2px', marginBottom: '16px' }}>
                                    <span title="Planeaciones vinculadas a este proyecto" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>
                                        <span aria-hidden="true">▤</span>
                                        {Number(p.planeaciones_count || 0)} {Number(p.planeaciones_count || 0) === 1 ? 'planeación' : 'planeaciones'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '14px', color: theme.subtext, lineHeight: '1.6', marginBottom: '32px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {p.introduccion || 'Sin descripción disponible.'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: `1px solid ${theme.border}` }}>
                                    <span style={{ fontSize: '12px', color: theme.subtext, fontWeight: '600' }}>
                                        Creado: {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button 
                                        onClick={() => router.push(`/proyectos/${p.id}`)}
                                        style={{ color: theme.accent, background: 'transparent', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        ABRIR PROYECTO →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <style jsx global>{`
                .loader-blue {
                    width: 48px;
                    height: 48px;
                    border: 5px solid #7c3aed;
                    border-bottom-color: transparent;
                    border-radius: 50%;
                    display: inline-block;
                    animation: rotation 1s linear infinite;
                }
                @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
