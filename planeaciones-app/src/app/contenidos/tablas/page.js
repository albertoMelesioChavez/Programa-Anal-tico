'use client';

import { useState, useEffect, useRef, createRef } from 'react';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import { marked } from 'marked';

export default function ContenidosTablasPage() {
    const [pages, setPages] = useState([]);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);
    
    const mainRef = useRef(null);
    const isDragging = useRef(false);
    const minimapRef = useRef(null);
    const pageRefs = useRef([]);

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
                const res = await fetch('/tablasdecontenidos_programa_analitico.md');
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
            } catch (error) { console.error('Error loading content:', error); }
            finally { setLoading(false); }
        };
        fetchContent();
    }, []);

    useEffect(() => {
        if (loading || pages.length === 0) return;
        const observer = new IntersectionObserver((entries) => {
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
            }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], root: mainRef.current, rootMargin: '-10% 0px -10% 0px' }
        );
        const currentRefs = pageRefs.current;
        currentRefs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
        return () => { currentRefs.forEach((ref) => { if (ref.current) observer.unobserve(ref.current); }); };
    }, [loading, pages]);

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
                body: JSON.stringify({ content: fullContent, fileName: 'tablasdecontenidos_programa_analitico.md' }),
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
        a.download = `Plan_Analitico_Tablas_2025_Editado.md`;
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
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ height: '24px', width: '24px', borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', background: '#ffffff', color: '#1e293b', overflow: 'hidden', fontFamily: '"Outfit", sans-serif' }}>
            {/* SIDEBAR */}
            <aside style={{ width: '320px', minWidth: '320px', height: '100%', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div style={{ padding: '32px' }}>
                    <Link href="/" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', textDecoration: 'none' }}>← Volver</Link>
                    <div style={{ marginTop: '32px' }}>
                        <h1 style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-1.5px' }}>Tablas</h1>
                        <p style={{ fontSize: '10px', color: '#2563eb', marginTop: '4px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Contenidos 2025</p>
                    </div>
                </div>
                <nav style={{ flexGrow: 1, overflowY: 'auto', padding: '0 24px 40px 24px' }} className="custom-scrollbar">
                    {pages.map((p, idx) => {
                        const displayTitle = p.title.replace("Programa analítico primaria", "").replace("Versión 2025", "").trim() || `Sección ${idx + 1}`;
                        const isMainTitle = idx % 3 === 0;
                        return (
                            <button key={idx} onClick={() => scrollToPage(idx)} style={{ width: '100%', textAlign: 'left', padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '4px', color: currentPageIdx === idx ? '#2563eb' : '#64748b', transition: 'color 0.2s', fontSize: isMainTitle ? '13px' : '12px', fontWeight: isMainTitle ? 'bold' : 'normal', opacity: currentPageIdx === idx ? 1 : 0.7 }}>
                                <span style={{ flexShrink: 0, maxWidth: '85%' }}>{displayTitle}</span>
                                <div style={{ flexGrow: 1, borderBottom: '1px dotted #cbd5e1', marginBottom: '4px', margin: '0 4px' }} />
                                <span style={{ flexShrink: 0, fontFamily: 'monospace', fontWeight: 'bold' }}>{idx + 1}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* MAIN */}
            <main ref={mainRef} onScroll={handleScroll} style={{ flexGrow: 1, height: '100%', overflowY: 'auto', position: 'relative', scrollBehavior: 'smooth', background: '#fff' }} className="custom-scrollbar">
                <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ padding: '4px 8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: '10px', fontWeight: '900', borderRadius: '4px', textTransform: 'uppercase' }}>{isEditMode ? 'MODO EDICIÓN' : 'MODO LECTURA'}</span>
                        <button onClick={handleExport} style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                            📥 EXPORTAR MD
                        </button>
                    </div>
                    <button onClick={() => setIsEditMode(!isEditMode)} style={{ background: isEditMode ? '#0f172a' : '#f1f5f9', color: isEditMode ? 'white' : '#1e293b', border: 'none', padding: '10px 24px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}>{isEditMode ? 'GUARDAR Y CERRAR' : 'EDITAR CONTENIDO'}</button>
                </header>

                <div className="content-wrapper" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px 100px 40px', position: 'relative' }}>
                    {pages.map((p, idx) => (
                        <div key={idx} ref={pageRefs.current[idx]} data-page-index={idx} style={{ padding: '20px 0', borderBottom: '1px solid #e2e8f0', opacity: currentPageIdx === idx ? 1 : 0.6, transition: 'opacity 0.3s' }}>
                            <h2 style={{ fontSize: '10px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Página {idx + 1}</h2>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px', margin: '0 0 16px 0' }}>{p.title}</h1>
                            <RichTextEditor key={`${idx}-${isEditMode}`} initialContent={p.cleanHtml} onSave={(newHtml) => handleSave(idx, newHtml)} isSaving={isSaving} editable={isEditMode} darkMode={false} />
                        </div>
                    ))}

                    {/* Global Sticky Save Button (Only in Edit Mode) */}
                    {isEditMode && (
                        <div style={{
                            position: 'sticky',
                            bottom: '40px',
                            marginTop: '60px',
                            background: '#fff',
                            padding: '12px 24px',
                            borderRadius: '100px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            zIndex: 1000,
                            width: 'fit-content',
                            margin: '60px auto'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>PÁGINA ACTUAL</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>Sección {currentPageIdx + 1}</span>
                            </div>
                            <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                            <button 
                                onClick={handleExport}
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
                                💾 GUARDAR TABLAS
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* MINIMAP */}
            <aside style={{ width: '64px', height: '100%', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div ref={minimapRef} style={{ position: 'absolute', top: '40px', bottom: '40px', width: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {pages.map((_, idx) => (
                        <div key={idx} onClick={() => scrollToPage(idx)} style={{ flex: 1, width: '100%', background: currentPageIdx === idx ? '#2563eb' : '#e2e8f0', borderRadius: '2px', transition: 'all 0.2s', cursor: 'pointer' }} />
                    ))}
                    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: '50%', top: `${scrollPercentage}%`, transform: 'translate(-50%, -50%)', width: '44px', height: '44px', background: '#2563eb', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37,99,235,0.4)', zIndex: 50 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                    </div>
                </div>
            </aside>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .ProseMirror p { font-size: 1.125rem; line-height: 1.8; margin-bottom: 1.5rem; color: #475569; }
                .ProseMirror h1 { font-size: 3rem; font-weight: 900; color: #0f172a; margin-top: 3rem; margin-bottom: 1.5rem; }
            `}</style>
            <style jsx global>{`
                @media (max-width: 640px) {
                    .main-content { padding: 0 !important; }
                    .content-wrapper { padding: 20px 10px 100px 10px !important; maxWidth: 100% !important; }
                    .editor-header { padding: 12px 10px !important; }
                    .minimap-container { display: none !important; }
                }
            `}</style>
        </div>
    );
}
