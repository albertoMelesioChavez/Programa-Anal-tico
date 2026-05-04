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
    
    // Initialize viewMode from URL or default to 'digital'
    const [viewMode, setViewMode] = useState(searchParams.get('view') || 'digital');
    const [scrollPercentage, setScrollPercentage] = useState(0);
    
    const mainRef = useRef(null);
    const isDragging = useRef(false);
    const minimapRef = useRef(null);
    const pageRefs = useRef([]);

    // Pure string-based title extraction (SSR safe)
    const extractTitleAndClean = (html) => {
        if (!html) return { title: 'Información General', cleanHtml: '' };
        
        const targetStart = "Programa analítico primaria";
        const targetEnd = "Versión 2025";
        
        // Strip tags for text search safely
        const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const startIndex = plainText.indexOf(targetStart);
        const endIndex = plainText.indexOf(targetEnd);

        let title = 'Información General del Programa';
        let cleanHtml = html;

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            title = plainText.substring(startIndex, endIndex + targetEnd.length).trim();
            
            // Build a regex for the title that's tag-agnostic
            const words = title.split(/\s+/).filter(w => w.length > 0);
            const pattern = words
                .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('(?:\\s+|<[^>]*>)*\\s*');
            
            const atomicRegex = new RegExp(pattern, 'i');
            cleanHtml = html.replace(atomicRegex, '').trim();
            
            // Cleanup leftovers
            cleanHtml = cleanHtml.replace(/^<p>\s*<\/p>/, '')
                                .replace(/^<p>&nbsp;<\/p>/, '')
                                .replace(/^<p>\s*<br\s*\/?>\s*/, '<p>');
        }
        
        return { title, cleanHtml };
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch('/contenidos_programa_analitico.md');
                const text = await res.text();
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
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    // Intersection Observer to detect current page
    useEffect(() => {
        if (loading || pages.length === 0 || viewMode === 'pdf') return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the entry with the largest intersection ratio
                let bestEntry = null;
                let maxRatio = 0;

                // We need to keep track of ALL intersecting elements across calls
                // or just process the ones in this tick. 
                // Usually, the one with the highest ratio is what we want.
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
            { 
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], 
                root: mainRef.current,
                rootMargin: '-10% 0px -10% 0px' // Focus on the middle 80% of the screen
            }
        );

        const currentRefs = pageRefs.current;
        currentRefs.forEach((ref) => {
            if (ref.current) observer.observe(ref.current);
        });

        return () => {
            currentRefs.forEach((ref) => {
                if (ref.current) observer.unobserve(ref.current);
            });
        };
    }, [loading, pages, viewMode]);

    // Update URL when viewMode changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('view', viewMode);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [viewMode, router, searchParams]);

    const handleSave = async (idx, newHtml) => {
        setIsSaving(true);
        try {
            const updatedPages = [...pages];
            const currentTitle = pages[idx].title;
            
            // Update local state
            updatedPages[idx] = { ...updatedPages[idx], cleanHtml: newHtml };
            setPages(updatedPages);

            let fullContent = '';
            updatedPages.forEach((p, pIdx) => {
                const fullHtml = `<p><strong>${p.title}</strong></p>\n${p.cleanHtml}`;
                fullContent += `<!-- PAGE_START ${pIdx + 1} -->\n${fullHtml}\n<!-- PAGE_END -->\n`;
            });

            await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fullContent, fileName: 'contenidos_programa_analitico.md' }),
            });
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSaving(false);
        }
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
        a.download = `Plan_Analitico_Artes_2025_Editado.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const scrollToPage = (idx) => {
        if (pageRefs.current[idx]?.current) {
            pageRefs.current[idx].current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleScroll = () => {
        if (!mainRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
        const totalScrollable = scrollHeight - clientHeight;
        if (totalScrollable <= 0) return;
        const percentage = (scrollTop / totalScrollable) * 100;
        setScrollPercentage(percentage);
    };

    const handleMouseDown = (e) => {
        isDragging.current = true;
        handleMouseMove(e);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current || !minimapRef.current || !mainRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const percentage = y / rect.height;
        const scrollTarget = percentage * (mainRef.current.scrollHeight - mainRef.current.clientHeight);
        mainRef.current.scrollTop = scrollTarget;
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'auto';
        document.body.style.cursor = 'auto';
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
            <div style={{ height: '24px', width: '24px', borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }} className="editor-container">
            {/* LEFT NAVIGATION - Hidden on mobile */}
            <aside style={{ width: '280px', height: '100%', background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column' }} className="desktop-sidebar">
                <div style={{ padding: '32px' }}>
                    <Link href="/" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: '#4b5563', textDecoration: 'none' }}>← Dashboard</Link>
                    <div style={{ marginTop: '32px' }}>
                        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0, letterSpacing: '-1px' }}>Índice</h1>
                        <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px', textTransform: 'uppercase', fontWeight: '900' }}>Artes Primaria 2025</p>
                    </div>
                </div>
                <nav style={{ flexGrow: 1, overflowY: 'auto', padding: '0 24px 40px 24px' }} className="custom-scrollbar">
                    {pages.map((p, idx) => {
                        // Extract a clean title for the index
                        // We use the title we already extracted or fallback to Page X
                        const displayTitle = p.title.replace("Programa analítico primaria", "").replace("Versión 2025", "").trim() || `Sección ${idx + 1}`;
                        const isMainTitle = idx % 3 === 0; // Simulation of hierarchy for now

                        return (
                            <button 
                                key={idx} 
                                onClick={() => scrollToPage(idx)} 
                                style={{ 
                                    width: '100%', 
                                    textAlign: 'left', 
                                    padding: '8px 0', 
                                    background: 'transparent',
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'baseline',
                                    gap: '4px',
                                    color: currentPageIdx === idx ? 'white' : '#9ca3af',
                                    transition: 'color 0.2s',
                                    fontSize: isMainTitle ? '13px' : '12px',
                                    fontWeight: isMainTitle ? 'bold' : 'normal',
                                    fontStyle: isMainTitle ? 'italic' : 'normal',
                                    opacity: currentPageIdx === idx ? 1 : 0.7,
                                }}
                            >
                                <span style={{ flexShrink: 0, maxWidth: '85%' }}>{displayTitle}</span>
                                <div style={{ flexGrow: 1, borderBottom: '1px dotted rgba(255,255,255,0.2)', marginBottom: '4px', margin: '0 4px' }} />
                                <span style={{ flexShrink: 0, fontFamily: 'monospace', fontWeight: 'bold' }}>{idx + 1}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main ref={mainRef} onScroll={handleScroll} style={{ flex: 1, height: '100%', overflowY: 'auto', position: 'relative' }} className="custom-scrollbar main-content">
                {/* HEADER */}
                <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }} className="editor-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }} className="header-controls">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ padding: '4px 8px', background: isEditMode ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.05)', color: isEditMode ? '#3b82f6' : '#6b7280', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase' }}>{isEditMode ? 'MODO EDICIÓN' : 'MODO LECTURA'}</span>
                            <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 'bold' }}>PÁGINA {currentPageIdx + 1} DE {pages.length}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button 
                                onClick={handleExport}
                                style={{
                                    background: '#2563eb',
                                    color: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <span>📥</span> EXPORTAR PLAN
                            </button>

                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button 
                                    onClick={() => setViewMode('digital')}
                                    style={{ 
                                        padding: '8px 16px', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold',
                                        background: viewMode === 'digital' ? '#fff' : 'transparent',
                                        color: viewMode === 'digital' ? '#000' : '#9ca3af',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Digital
                                </button>
                                <button 
                                    onClick={() => setViewMode('pdf')}
                                    style={{ 
                                        padding: '8px 16px', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold',
                                        background: viewMode === 'pdf' ? '#fff' : 'transparent',
                                        color: viewMode === 'pdf' ? '#000' : '#9ca3af',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Original (PDF)
                                </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => { if (viewMode === 'pdf') setViewMode('digital'); setIsEditMode(!isEditMode); }} style={{ background: isEditMode ? '#2563eb' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isEditMode ? '0 4px 12px rgba(37,99,235,0.3)' : 'none' }}>{isEditMode ? 'Finalizar Edición' : 'Activar Edición'}</button>
                </header>

                <div style={{ display: viewMode === 'digital' ? 'block' : 'none' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 200px 20px' }} className="digital-content">
                        {pages.map((p, idx) => (
                            <div key={idx} ref={pageRefs.current[idx]} data-page-index={idx} style={{ padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: currentPageIdx === idx ? 1 : 0.3, transition: 'opacity 0.5s' }} className="page-section">
                                <div style={{ marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Página {idx + 1}</h2>
                                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', letterSpacing: '-1px', margin: 0 }} className="page-title">{p.title}</h1>
                                </div>
                                <RichTextEditor key={`${idx}-${isEditMode}`} initialContent={p.cleanHtml} onSave={(newHtml) => handleSave(idx, newHtml)} isSaving={isSaving} editable={isEditMode} />
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: viewMode === 'pdf' ? 'block' : 'none', height: 'calc(100vh - 64px)', width: '100%' }}>
                    <iframe src="/plananalitico/artes" style={{ width: '100%', height: '100%', border: 'none' }} title="Plan Analítico Original" />
                </div>
            </main>

            {/* RIGHT MINIMAP + SCRUBBER - Hidden on mobile */}
            <aside style={{ width: '60px', height: '100%', background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.03)', position: 'relative', display: 'flex', justifyContent: 'center' }} className="desktop-minimap">
                <div ref={minimapRef} style={{ position: 'absolute', top: '40px', bottom: '40px', width: '12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {pages.map((_, idx) => (
                        <div key={idx} onClick={() => scrollToPage(idx)} style={{ flex: 1, width: '100%', background: currentPageIdx === idx ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.05)', borderRadius: '1px', transition: 'all 0.2s', cursor: 'pointer' }} />
                    ))}
                    {viewMode === 'digital' && (
                        <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: '50%', top: `${scrollPercentage}%`, transform: 'translate(-50%, -50%)', width: '40px', height: '40px', background: '#2563eb', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(37,99,235,0.6)', zIndex: 50, transition: 'width 0.2s, height 0.2s' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                        </div>
                    )}
                </div>
            </aside>
            <style jsx global>{`
                @media (max-width: 1024px) {
                    .desktop-sidebar, .desktop-minimap { display: none !important; }
                    .editor-header { flex-direction: column; align-items: stretch !important; height: auto !important; padding: 16px !important; }
                    .header-controls { flex-direction: column; align-items: stretch !important; gap: 12px !important; }
                    .digital-content { padding: 0 20px 100px 20px !important; }
                    .page-title { fontSize: 24px !important; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .ProseMirror p { font-size: 1.125rem; line-height: 1.8; margin-bottom: 1.5rem; color: #9ca3af; }
                .ProseMirror h1 { font-size: 3rem; font-weight: 900; color: white; margin-top: 3rem; margin-bottom: 1.5rem; letter-spacing: -0.05em; }
            `}</style>
        </div>
    );
}

export default function ContenidosArtesPage() {
    return (
        <Suspense fallback={<div>Cargando editor...</div>}>
            <ContenidosArtesContent />
        </Suspense>
    );
}
