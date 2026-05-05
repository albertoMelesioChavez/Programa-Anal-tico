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
                const res = await fetch('/api/documentos/tablas');
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
            await fetch('/api/documentos/tablas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fullContent }),
            });
        } catch (error) { console.error('Save failed', error); }
        finally { setIsSaving(false); }
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const total = scrollHeight - clientHeight;
        if (total <= 0) return;
        setScrollPercentage((scrollTop / total) * 100);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loader-blue"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#ffffff', color: '#0f172a', overflow: 'hidden' }}>
            {/* Sidebar */}
            <aside style={{ width: '320px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '32px' }}>
                    <Link href="/" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '900', fontSize: '11px', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        ← VOLVER
                    </Link>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '8px' }}>Tablas</h2>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>Dosificación Curricular</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
                    {pages.map((p, idx) => (
                        <button 
                            key={idx}
                            onClick={() => {
                                pageRefs.current[idx].current?.scrollIntoView({ behavior: 'smooth' });
                                setCurrentPageIdx(idx);
                            }}
                            style={{
                                width: '100%', textAlign: 'left', padding: '16px', borderRadius: '12px', border: 'none',
                                background: currentPageIdx === idx ? '#2563eb' : 'transparent',
                                color: currentPageIdx === idx ? '#fff' : '#0f172a',
                                cursor: 'pointer', marginBottom: '4px', fontWeight: '700', fontSize: '13px'
                            }}
                        >
                            {p.title}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <header style={{ height: '80px', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
                    <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>EDITOR DE TABLAS</span>
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        style={{ padding: '10px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                        {isEditMode ? 'SALIR' : 'EDITAR'}
                    </button>
                </header>

                <div 
                    ref={mainRef}
                    onScroll={handleScroll}
                    style={{ flex: 1, overflowY: 'auto', padding: '60px 80px' }}
                >
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        {pages.map((p, idx) => (
                            <div key={idx} ref={pageRefs.current[idx]} data-page-index={idx} style={{ marginBottom: '80px' }}>
                                <h3 style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb', marginBottom: '32px' }}>{p.title}</h3>
                                {isEditMode ? (
                                    <RichTextEditor initialValue={p.cleanHtml} onSave={(h) => handleSave(idx, h)} isSaving={isSaving} />
                                ) : (
                                    <div className="prose-custom" dangerouslySetInnerHTML={{ __html: p.cleanHtml }} style={{ lineHeight: '1.8', fontSize: '17px' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
