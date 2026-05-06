'use client';

import { useState, useEffect, useRef, createRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import { marked } from 'marked';

function ContenidosArtesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [pages, setPages] = useState([]);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [darkMode] = useState(false); // Forced Light Mode
    
    const [viewMode, setViewMode] = useState(searchParams.get('view') || 'digital');
    const [scrollPercentage, setScrollPercentage] = useState(0);
    
    const mainRef = useRef(null);
    const isDragging = useRef(false);
    const minimapRef = useRef(null);
    const pageRefs = useRef([]);

    // Theme logic
    const theme = {
        bg: darkMode ? '#000000' : '#ffffff',
        sidebar: darkMode ? '#0a0a0a' : '#f8fafc',
        text: darkMode ? '#ffffff' : '#0f172a',
        subtext: darkMode ? '#9ca3af' : '#64748b',
        border: darkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        header: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    };

    const extractTitleAndClean = (html) => {
        if (!html) return { title: 'Información General', cleanHtml: '' };
        
        // Búsqueda simplificada para evitar errores de parseo que oculten el contenido
        const targetStart = "Programa analítico primaria";
        const targetEnd = "Versión 2025";
        
        const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const startIndex = plainText.indexOf(targetStart);
        const endIndex = plainText.indexOf(targetEnd);
        
        let title = 'Documento de Artes';
        let cleanHtml = html;

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            title = plainText.substring(startIndex, endIndex + targetEnd.length).trim();
            // No eliminamos el título del HTML para asegurar que siempre haya algo visible
            // solo lo extraemos para el índice lateral
        }
        
        return { title, cleanHtml };
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch('/api/documentos/artes');
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.details || errData.error || 'Fallo en la respuesta del servidor');
                }
                const text = await res.text();
                
                // Si el texto parece JSON de error (a veces pasa con 200 pero cuerpo de error)
                if (text.trim().startsWith('{')) {
                    const possibleError = JSON.parse(text);
                    if (possibleError.error) throw new Error(possibleError.error);
                }

                const splitPages = text.split(/<!-- PAGE_START \d+ -->/).filter(p => p.trim());
                const htmlPages = await Promise.all(splitPages.map(async (p) => {
                    const rawContent = p.split('<!-- PAGE_END -->')[0];
                    const html = await marked.parse(rawContent);
                    const { title, cleanHtml } = extractTitleAndClean(html);
                    return { title, cleanHtml };
                }));
                setPages(htmlPages);
                pageRefs.current = htmlPages.map(() => createRef());
            } catch (error) {
                console.error('Error loading content:', error);
                alert('Atención: No se pudo cargar el contenido. ' + error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    useEffect(() => {
        if (loading || pages.length === 0 || viewMode === 'pdf') return;
        const observer = new IntersectionObserver(
            (entries) => {
                let bestEntry = null;
                let maxRatio = 0;
                entries.forEach((entry) => {
                    if (entry.intersectionRatio > maxRatio) {
                        maxRatio = entry.intersectionRatio;
                        bestEntry = entry;
                    }
                });
                if (bestEntry && maxRatio > 0.1) {
                    const idx = parseInt(bestEntry.target.getAttribute('data-page-index'));
                    setCurrentPageIdx(idx);
                }
            },
            { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], root: mainRef.current, rootMargin: '-10% 0px -10% 0px' }
        );
        const currentRefs = pageRefs.current;
        currentRefs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
        return () => { currentRefs.forEach((ref) => { if (ref.current) observer.unobserve(ref.current); }); };
    }, [loading, pages, viewMode]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('view', viewMode);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [viewMode, router, searchParams]);

    const handleSaveDocument = async (updatedPages) => {
        setIsSaving(true);
        try {
            let fullContent = '';
            updatedPages.forEach((p, pIdx) => {
                // Preservar el título en el formato PAGE_START
                fullContent += `<!-- PAGE_START ${pIdx + 1} -->\n<p><strong>${p.title}</strong></p>\n${p.cleanHtml}\n<!-- PAGE_END -->\n`;
            });
            await fetch('/api/documentos/artes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fullContent }),
            });
        } catch (error) { 
            console.error('Save failed', error); 
            alert('Error al guardar cambios estructurales.');
        } finally { setIsSaving(false); }
    };

    const handleSave = async (idx, newHtml) => {
        const updatedPages = [...pages];
        updatedPages[idx] = { ...updatedPages[idx], cleanHtml: newHtml };
        setPages(updatedPages);
        await handleSaveDocument(updatedPages);
    };

    const addSection = async () => {
        const newSection = { title: 'Nueva Sección', cleanHtml: '<p>Contenido de la nueva sección...</p>' };
        const updatedPages = [...pages, newSection];
        setPages(updatedPages);
        pageRefs.current = updatedPages.map(() => createRef());
        await handleSaveDocument(updatedPages);
    };

    const deleteSection = async (idx) => {
        if (!confirm('¿Estás seguro de eliminar esta sección?')) return;
        const updatedPages = pages.filter((_, i) => i !== idx);
        setPages(updatedPages);
        pageRefs.current = updatedPages.map(() => createRef());
        await handleSaveDocument(updatedPages);
        if (currentPageIdx >= updatedPages.length) setCurrentPageIdx(Math.max(0, updatedPages.length - 1));
    };

    const moveSection = async (idx, direction) => {
        if ((idx === 0 && direction === -1) || (idx === pages.length - 1 && direction === 1)) return;
        const updatedPages = [...pages];
        const targetIdx = idx + direction;
        [updatedPages[idx], updatedPages[targetIdx]] = [updatedPages[targetIdx], updatedPages[idx]];
        setPages(updatedPages);
        pageRefs.current = updatedPages.map(() => createRef());
        setCurrentPageIdx(targetIdx);
        await handleSaveDocument(updatedPages);
    };

    const renameSection = async (idx, newTitle) => {
        const updatedPages = [...pages];
        updatedPages[idx] = { ...updatedPages[idx], title: newTitle };
        setPages(updatedPages);
        await handleSaveDocument(updatedPages);
    };

    const handleExport = () => {
        let fullContent = '';
        pages.forEach((p, pIdx) => {
            const fullHtml = `<p><strong>${p.title}</strong></p>\n${p.cleanHtml}`;
            fullContent += `<!-- PAGE_START ${pIdx + 1} -->\n${fullHtml}\n<!-- PAGE_END -->\n`;
        });
        const blob = new Blob([fullContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Programa_Analitico_Artes_2025.md';
        a.click();
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const total = scrollHeight - clientHeight;
        if (total <= 0) return;
        setScrollPercentage((scrollTop / total) * 100);
    };

    const handleMinimapClick = (e) => {
        const rect = minimapRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = y / rect.height;
        const targetScroll = percentage * (mainRef.current.scrollHeight - mainRef.current.clientHeight);
        mainRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    };

    const handleDragStart = (e) => {
        isDragging.current = true;
        handleMinimapClick(e);
    };

    const handleDragMove = (e) => {
        if (isDragging.current) handleMinimapClick(e);
    };

    const handleDragEnd = () => {
        isDragging.current = false;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
                <div className="loader-blue"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text, overflow: 'hidden' }}>
            {/* Sidebar / Navigation */}
            {viewMode !== 'pdf' && (
                <aside style={{ 
                    width: '320px', 
                    background: theme.sidebar, 
                    borderRight: `1px solid ${theme.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 10
                }}>
                    <div style={{ padding: '32px' }}>
                        <Link href="/" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '900', fontSize: '11px', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            ← VOLVER AL DASHBOARD
                        </Link>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '8px' }}>Programa Analítico</h2>
                        <p style={{ fontSize: '13px', color: theme.subtext, fontWeight: '500' }}>Artes • Versión 2025</p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
                        {pages.map((p, idx) => (
                            <div key={idx} style={{ marginBottom: '8px', position: 'relative', group: 'true' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                        onClick={() => {
                                            pageRefs.current[idx].current?.scrollIntoView({ behavior: 'smooth' });
                                            setCurrentPageIdx(idx);
                                        }}
                                        style={{
                                            flex: 1,
                                            textAlign: 'left',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: currentPageIdx === idx ? '#2563eb' : 'transparent',
                                            color: currentPageIdx === idx ? '#fff' : theme.text,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            minWidth: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5 }}>{String(idx + 1).padStart(2, '0')}</span>
                                        {isEditMode ? (
                                            <input 
                                                value={p.title} 
                                                onChange={(e) => renameSection(idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    borderBottom: `1px solid ${currentPageIdx === idx ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`, 
                                                    color: 'inherit', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700', 
                                                    padding: '2px 0',
                                                    width: '100%',
                                                    outline: 'none'
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                        )}
                                    </button>

                                    {isEditMode && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <button onClick={() => moveSection(idx, -1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: theme.subtext, opacity: idx === 0 ? 0.2 : 1 }}>▲</button>
                                            <button onClick={() => moveSection(idx, 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: theme.subtext, opacity: idx === pages.length - 1 ? 0.2 : 1 }}>▼</button>
                                        </div>
                                    )}
                                </div>
                                {isEditMode && (
                                    <button 
                                        onClick={() => deleteSection(idx)}
                                        style={{ 
                                            position: 'absolute', 
                                            right: '-5px', 
                                            top: '-5px', 
                                            background: '#ef4444', 
                                            color: '#fff', 
                                            border: 'none', 
                                            borderRadius: '50%', 
                                            width: '18px', 
                                            height: '18px', 
                                            fontSize: '10px', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}

                        {isEditMode && (
                            <button 
                                onClick={addSection}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: `2px dashed ${theme.border}`,
                                    background: 'transparent',
                                    color: theme.accent,
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    marginTop: '16px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                            >
                                + AÑADIR NUEVA SECCIÓN
                            </button>
                        )}
                    </div>
                </aside>
            )}

            {/* Main Editor / Viewer */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Fixed Top Bar */}
                <header style={{ 
                    height: '80px', 
                    padding: '0 40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${theme.border}`,
                    background: theme.header,
                    backdropFilter: 'blur(10px)',
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => setViewMode('digital')}
                            style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '12px', fontWeight: '800', background: viewMode === 'digital' ? theme.text : 'transparent', color: viewMode === 'digital' ? theme.bg : theme.text, border: `1px solid ${theme.border}`, cursor: 'pointer' }}
                        >
                            VISTA DIGITAL
                        </button>
                        <button 
                            onClick={() => setViewMode('pdf')}
                            style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '12px', fontWeight: '800', background: viewMode === 'pdf' ? theme.text : 'transparent', color: viewMode === 'pdf' ? theme.bg : theme.text, border: `1px solid ${theme.border}`, cursor: 'pointer' }}
                        >
                            MODO DOCUMENTO
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{ padding: '10px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', background: isEditMode ? '#ef4444' : '#0f172a', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                            {isEditMode ? 'SALIR DE EDICIÓN' : 'EDITAR CONTENIDO'}
                        </button>
                        <button 
                            onClick={handleExport}
                            style={{ padding: '10px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                            EXPORTAR .MD
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div 
                    ref={mainRef}
                    onScroll={handleScroll}
                    style={{ 
                        flex: 1, 
                        overflowY: viewMode === 'pdf' ? 'hidden' : 'auto',
                        background: viewMode === 'pdf' ? '#525659' : theme.bg,
                        position: 'relative',
                        scrollBehavior: 'smooth'
                    }}
                >
                    {viewMode === 'pdf' ? (
                        <iframe 
                            src="/artes_primaria_analitico_2025.pdf#pagemode=thumbs&navpanes=1" 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                border: 'none' 
                            }} 
                            title="Programa Analítico Artes PDF"
                        />
                    ) : (
                        <div 
                            style={{ 
                                padding: '60px 0',
                                background: '#f1f5f9', // Grey background for the virtual desk
                                minHeight: '100%'
                            }}
                        >
                            <div style={{ 
                                maxWidth: '850px', // Document width
                                margin: '0 auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px', // Space between "pages"
                                minHeight: '100%'
                            }}>
                                {pages.length === 0 ? (
                                    <div style={{ padding: '100px', textAlign: 'center', color: theme.subtext, background: '#fff', borderRadius: '12px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
                                        <p style={{ fontWeight: '700' }}>No se encontraron secciones en el documento.</p>
                                        <p style={{ fontSize: '13px' }}>Verifica la conexión o intenta recargar la página.</p>
                                    </div>
                                ) : pages.map((p, idx) => (
                                    <div 
                                        key={idx} 
                                        ref={pageRefs.current[idx]}
                                        data-page-index={idx}
                                        style={{ 
                                            background: '#fff',
                                            padding: '80px 100px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            borderBottom: idx !== pages.length - 1 ? '1px solid #f1f5f9' : 'none',
                                            position: 'relative'
                                        }}
                                        className="virtual-page"
                                    >
                                        <h3 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '32px', color: '#2563eb' }}>{p.title}</h3>
                                        {isEditMode ? (
                                            <RichTextEditor 
                                                initialContent={p.cleanHtml} 
                                                editable={true}
                                                onSave={(newHtml) => handleSave(idx, newHtml)} 
                                                isSaving={isSaving}
                                            />
                                        ) : (
                                            <div 
                                                className="prose-custom"
                                                dangerouslySetInnerHTML={{ __html: p.cleanHtml }}
                                                style={{ lineHeight: '1.8', fontSize: '17px', color: theme.text }}
                                            />
                                        )}
                                        {/* Page Number Indicator */}
                                        <div style={{ position: 'absolute', bottom: '30px', right: '40px', fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>
                                            PÁGINA {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Minimap Overlay (Digital mode only) */}
                {viewMode === 'digital' && (
                    <div 
                        ref={minimapRef}
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        style={{ 
                            position: 'absolute', 
                            right: '20px', 
                            top: '100px', 
                            bottom: '20px', 
                            width: '4px', 
                            background: theme.border, 
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ 
                            position: 'absolute', 
                            top: `${scrollPercentage}%`, 
                            left: '-4px', 
                            width: '12px', 
                            height: '40px', 
                            background: '#2563eb', 
                            borderRadius: '10px',
                            transition: 'top 0.1s linear'
                        }}></div>
                    </div>
                )}
            </main>

            <style jsx global>{`
                .prose-custom p { margin-bottom: 24px; }
                .prose-custom h4 { margin: 40px 0 16px; font-size: 20px; font-weight: 800; }
                .prose-custom ul, .prose-custom ol { margin-bottom: 24px; padding-left: 20px; }
                .prose-custom li { margin-bottom: 8px; }
                .loader-blue {
                    width: 48px;
                    height: 48px;
                    border: 5px solid #2563eb;
                    border-bottom-color: transparent;
                    border-radius: 50%;
                    display: inline-block;
                    box-sizing: border-box;
                    animation: rotation 1s linear infinite;
                }
                @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function ContenidosArtesPage() {
    return (
        <Suspense fallback={<div className="loader-blue"></div>}>
            <ContenidosArtesContent />
        </Suspense>
    );
}
