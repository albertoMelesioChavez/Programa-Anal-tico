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
        const targetStart = "Programa analítico primaria";
        const targetEnd = "Versión 2025";
        const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const startIndex = plainText.indexOf(targetStart);
        const endIndex = plainText.indexOf(targetEnd);
        let title = 'Información General del Programa';
        let cleanHtml = html;
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            title = plainText.substring(startIndex, endIndex + targetEnd.length).trim();
            const words = title.split(/\s+/).filter(w => w.length > 0);
            const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?:\\s+|<[^>]*>)*\\s*');
            const atomicRegex = new RegExp(pattern, 'i');
            cleanHtml = html.replace(atomicRegex, '').trim();
            cleanHtml = cleanHtml.replace(/^<p>\s*<\/p>/, '').replace(/^<p>&nbsp;<\/p>/, '').replace(/^<p>\s*<br\s*\/?>\s*/, '<p>');
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

    const handleSave = async (idx, newHtml) => {
        setIsSaving(true);
        try {
            const updatedPages = [...pages];
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
        } catch (error) { console.error('Save failed', error); }
        finally { setIsSaving(false); }
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
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
            <div style={{ height: '24px', width: '24px', borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text, overflow: 'hidden', transition: 'all 0.3s ease' }} className="editor-container">
            {/* LEFT NAVIGATION */}
            <aside style={{ width: '280px', height: '100%', background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }} className="desktop-sidebar">
                <div style={{ padding: '32px' }}>
                    <Link href="/" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: theme.subtext, textDecoration: 'none' }}>← Inicio</Link>
                    <div style={{ marginTop: '32px' }}>
                        <h1 style={{ color: theme.text, fontSize: '24px', fontWeight: 'bold', margin: 0, letterSpacing: '-1px' }}>Índice</h1>
                        <p style={{ fontSize: '10px', color: theme.subtext, marginTop: '4px', textTransform: 'uppercase', fontWeight: '900' }}>Artes Primaria 2025</p>
                    </div>
                </div>
                <nav style={{ flexGrow: 1, overflowY: 'auto', padding: '0 24px 40px 24px' }} className="custom-scrollbar">
                    {pages.map((p, idx) => {
                        const displayTitle = p.title.replace("Programa analítico primaria", "").replace("Versión 2025", "").trim() || `Sección ${idx + 1}`;
                        const isMainTitle = idx % 3 === 0;
                        return (
                            <button key={idx} onClick={() => scrollToPage(idx)} 
                                style={{ width: '100%', textAlign: 'left', padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '4px', color: currentPageIdx === idx ? '#2563eb' : '#64748b', transition: 'color 0.2s', fontSize: isMainTitle ? '13px' : '12px', fontWeight: isMainTitle ? 'bold' : 'normal', opacity: currentPageIdx === idx ? 1 : 0.7 }}>
                                <span style={{ flexShrink: 0, maxWidth: '85%' }}>{displayTitle}</span>
                                <div style={{ flexGrow: 1, borderBottom: `1px dotted #e2e8f0`, marginBottom: '4px', margin: '0 4px' }} />
                                <span style={{ flexShrink: 0, fontFamily: 'monospace', fontWeight: 'bold' }}>{idx + 1}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main ref={mainRef} onScroll={handleScroll} style={{ flex: 1, height: '100%', overflowY: 'auto', position: 'relative' }} className="custom-scrollbar main-content">
                {/* HEADER */}
                <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: `1px solid #e2e8f0`, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }} className="editor-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ padding: '4px 8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: '10px', fontWeight: '900', borderRadius: '4px', textTransform: 'uppercase' }}>{isEditMode ? 'MODO EDICIÓN' : 'MODO LECTURA'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleExport} style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>EXPORTAR</button>
                        <button onClick={() => setIsEditMode(!isEditMode)} style={{ background: isEditMode ? '#2563eb' : theme.border, color: isEditMode ? 'white' : theme.text, border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{isEditMode ? 'Listo' : 'Editar'}</button>
                    </div>
                </header>

                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 200px 20px' }}>
                    {pages.map((p, idx) => (
                        <div key={idx} ref={pageRefs.current[idx]} data-page-index={idx} style={{ padding: '40px 0', borderBottom: `1px solid ${theme.border}`, opacity: currentPageIdx === idx ? 1 : 0.4, transition: 'opacity 0.5s' }}>
                            <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Página {idx + 1}</h2>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', color: theme.text, letterSpacing: '-1px', margin: '0 0 24px 0' }}>{p.title}</h1>
                            <RichTextEditor key={`${idx}-${isEditMode}-${darkMode}`} initialContent={p.cleanHtml} onSave={(newHtml) => handleSave(idx, newHtml)} isSaving={isSaving} editable={isEditMode} darkMode={darkMode} />
                        </div>
                    ))}
                </div>
            </main>

            {/* Global Floating Save Button (Only in Edit Mode) */}
            {isEditMode && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fff',
                    padding: '12px 24px',
                    borderRadius: '100px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    zIndex: 1000,
                    animation: 'floatUp 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>PÁGINA ACTUAL</span>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>Sección {currentPageIdx + 1}</span>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                    <button 
                        onClick={() => {
                            // Find the current editor content and save it
                            // Note: In a real app we'd trigger a ref or use a global state
                            // For now, we rely on the individual save buttons or a global save all
                            handleExport(); // As a shortcut or we could implement saveAll
                        }}
                        style={{ 
                            background: '#2563eb', 
                            color: '#fff', 
                            padding: '10px 24px', 
                            borderRadius: '100px', 
                            border: 'none', 
                            fontSize: '12px', 
                            fontWeight: '900', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        💾 GUARDAR TODO
                    </button>
                </div>
            )}

            {/* RIGHT MINIMAP */}
            <aside style={{ width: '60px', height: '100%', background: theme.sidebar, borderLeft: `1px solid ${theme.border}`, position: 'relative', display: 'flex', justifyContent: 'center' }} className="desktop-minimap">
                <div ref={minimapRef} style={{ position: 'absolute', top: '40px', bottom: '40px', width: '12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {pages.map((_, idx) => (
                        <div key={idx} onClick={() => scrollToPage(idx)} style={{ flex: 1, width: '100%', background: currentPageIdx === idx ? 'rgba(37,99,235,0.4)' : 'rgba(128,128,128,0.1)', borderRadius: '1px', cursor: 'pointer' }} />
                    ))}
                    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: '50%', top: `${scrollPercentage}%`, transform: 'translate(-50%, -50%)', width: '32px', height: '32px', background: '#2563eb', borderRadius: '50%', cursor: 'grab', zIndex: 50 }} />
                </div>
            </aside>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 10px; }
                .ProseMirror p { font-size: 1.125rem; line-height: 1.8; margin-bottom: 1.5rem; color: ${darkMode ? '#9ca3af' : '#4b5563'}; }
            `}</style>
        </div>
    );
}

export default function ContenidosArtesPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ContenidosArtesContent />
        </Suspense>
    );
}
