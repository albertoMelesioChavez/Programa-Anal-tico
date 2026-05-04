'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import { marked } from 'marked';

export default function ContenidosArtesPage() {
    const [pages, setPages] = useState([]);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const mainRef = useRef(null);
    const isFlipping = useRef(false);
    const isDragging = useRef(false);
    const minimapRef = useRef(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch('/contenidos_programa_analitico.md');
                const text = await res.text();
                const splitPages = text.split(/<!-- PAGE_START \d+ -->/).filter(p => p.trim());
                
                // Convert each page's markdown to HTML
                const htmlPages = splitPages.map(p => {
                    const content = p.split('<!-- PAGE_END -->')[0];
                    return marked.parse(content);
                });
                
                setPages(htmlPages);
            } catch (error) {
                console.error('Error loading content:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);


    // Function to extract and REMOVE title from content with atomic precision
    const processContent = (html) => {
        if (!html) return { title: 'Información General', cleanHtml: '' };
        
        // Define the anchors
        const targetStart = "Programa analítico primaria";
        const targetEnd = "Versión 2025";
        
        let title = 'Información General del Programa';
        let cleanHtml = html;

        // 1. Extract the text content safely
        const tempElement = document.createElement('div');
        tempElement.innerHTML = html;
        const plainText = tempElement.innerText || tempElement.textContent || "";
        
        const startIndex = plainText.indexOf(targetStart);
        const endIndex = plainText.indexOf(targetEnd);

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            // Found the title in plain text
            title = plainText.substring(startIndex, endIndex + targetEnd.length).trim();
            
            // 2. Create a "Tag-Agnostic" regex to find and remove this string from HTML
            // This regex allows for tags and whitespace between words
            const words = title.split(/\s+/);
            const pattern = words
                .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('(?:\\s+|<[^>]*>)*\\s*');
            
            const atomicRegex = new RegExp(pattern, 'i');
            
            // 3. Remove the match
            cleanHtml = html.replace(atomicRegex, '').trim();
            
            // 4. Cleanup leftovers
            cleanHtml = cleanHtml.replace(/^<p>\s*<\/p>/, '');
            cleanHtml = cleanHtml.replace(/^<p>&nbsp;<\/p>/, '');
            cleanHtml = cleanHtml.replace(/^<p>\s*<br\s*\/?>\s*/, '<p>');
            // Handle cases where the removal leaves an empty strong/em tag
            cleanHtml = cleanHtml.replace(/<(strong|em|b|i)>\s*<\/\1>/g, '');
        }
        
        return { title, cleanHtml };
    };

    const handleSave = async (newHtml) => {
        setIsSaving(true);
        try {
            const updatedPages = [...pages];
            const { title } = processContent(pages[currentPageIdx]);
            
            // Re-prepend the title for file integrity
            const fullHtmlToSave = `<p><strong>${title}</strong></p>\n${newHtml}`;
            
            updatedPages[currentPageIdx] = fullHtmlToSave;
            setPages(updatedPages);

            let fullContent = '';
            updatedPages.forEach((content, idx) => {
                fullContent += `<!-- PAGE_START ${idx + 1} -->\n${content}\n<!-- PAGE_END -->\n`;
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

    const handleWheel = (e) => {
        if (isEditMode || isFlipping.current || isDragging.current || !mainRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
        const delta = e.deltaY;
        if (delta > 0) {
            const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;
            if (isAtBottom && currentPageIdx < pages.length - 1) triggerPageFlip(currentPageIdx + 1, 'top');
        }
        if (delta < 0) {
            const isAtTop = scrollTop <= 10;
            if (isAtTop && currentPageIdx > 0) triggerPageFlip(currentPageIdx - 1, 'bottom');
        }
    };

    const triggerPageFlip = (newIdx, targetPos) => {
        isFlipping.current = true;
        setCurrentPageIdx(newIdx);
        setTimeout(() => {
            if (mainRef.current) {
                if (targetPos === 'top') mainRef.current.scrollTop = 0;
                else mainRef.current.scrollTop = mainRef.current.scrollHeight - mainRef.current.clientHeight;
            }
            setTimeout(() => { isFlipping.current = false; }, 800);
        }, 50);
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
        if (!isDragging.current || !minimapRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const percentage = y / rect.height;
        const newIdx = Math.floor(percentage * pages.length);
        const clampedIdx = Math.max(0, Math.min(newIdx, pages.length - 1));
        if (clampedIdx !== currentPageIdx) {
            setCurrentPageIdx(clampedIdx);
            if (mainRef.current) mainRef.current.scrollTop = 0;
        }
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

    const scrubberPos = (currentPageIdx / (pages.length - 1)) * 100;
    const { title, cleanHtml } = processContent(pages[currentPageIdx]);

    return (
        <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', background: '#0a0a0a', color: '#9ca3af', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            {/* LEFT SIDEBAR */}
            <aside style={{ width: '280px', minWidth: '280px', height: '100%', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
                <div style={{ padding: '32px' }}>
                    <Link href="/" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: '#4b5563', textDecoration: 'none' }}>← Dashboard</Link>
                    <div style={{ marginTop: '32px' }}>
                        <h2 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Artes Primaria</h2>
                        <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px', textTransform: 'uppercase' }}>Programa Analítico 2025</p>
                    </div>
                </div>
                <nav style={{ flexGrow: 1, overflowY: 'auto', padding: '0 16px 40px 16px' }} className="custom-scrollbar">
                    {pages.map((_, idx) => (
                        <button key={idx} onClick={() => { if (!isFlipping.current) { setCurrentPageIdx(idx); if (mainRef.current) mainRef.current.scrollTop = 0; } }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '2px', display: 'flex', alignItems: 'center', background: currentPageIdx === idx ? 'rgba(255,255,255,0.05)' : 'transparent', color: currentPageIdx === idx ? 'white' : '#6b7280' }}>
                            <span style={{ opacity: 0.3, marginRight: '12px', fontFamily: 'monospace' }}>{(idx + 1).toString().padStart(3, '0')}</span> Página {idx + 1}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main ref={mainRef} onWheel={handleWheel} style={{ flexGrow: 1, height: '100%', overflowY: 'auto', position: 'relative', scrollBehavior: 'smooth' }} className="custom-scrollbar">
                <header style={{ position: 'sticky', top: 0, zIndex: 50, height: '64px', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ padding: '4px 8px', background: isEditMode ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.05)', color: isEditMode ? '#3b82f6' : '#6b7280', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase' }}>{isEditMode ? 'MODO EDICIÓN' : 'MODO LECTURA'}</span>
                        <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 'bold' }}>PÁGINA {currentPageIdx + 1} DE {pages.length}</span>
                    </div>
                    <button onClick={() => setIsEditMode(!isEditMode)} style={{ background: isEditMode ? '#2563eb' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isEditMode ? '0 4px 12px rgba(37,99,235,0.3)' : 'none' }}>{isEditMode ? 'Finalizar Edición' : 'Activar Edición'}</button>
                </header>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 120px 40px' }}>
                    <div style={{ marginBottom: '60px' }}>
                        <h1 style={{ fontSize: '48px', fontWeight: '900', color: 'white', letterSpacing: '-2px', margin: '0 0 16px 0' }}>{isEditMode ? 'Edición de Contenido' : 'Programa Analítico'}</h1>
                        {/* Dynamic Subtitle - ATOMIC EXTRACTION */}
                        <p style={{ fontSize: '18px', color: '#3b82f6', margin: 0, lineHeight: '1.6', fontWeight: '600', letterSpacing: '-0.5px' }}>
                            {title}
                        </p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <RichTextEditor key={`${currentPageIdx}-${isEditMode}`} initialContent={cleanHtml} onSave={handleSave} isSaving={isSaving} editable={isEditMode} />
                    </div>
                </div>
            </main>

            {/* RIGHT MINIMAP + SCRUBBER */}
            <aside style={{ width: '60px', height: '100%', background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.03)', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div ref={minimapRef} style={{ position: 'absolute', top: '40px', bottom: '40px', width: '12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {pages.map((_, idx) => (
                        <div key={idx} onClick={() => { if (!isFlipping.current) { setCurrentPageIdx(idx); if (mainRef.current) mainRef.current.scrollTop = 0; } }} style={{ flex: 1, width: '100%', background: currentPageIdx === idx ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.05)', borderRadius: '1px', transition: 'all 0.2s', cursor: 'pointer' }} />
                    ))}
                    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: '50%', top: `${scrubberPos}%`, transform: 'translate(-50%, -50%)', width: '40px', height: '40px', background: '#2563eb', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(37,99,235,0.6)', zIndex: 50, transition: 'width 0.2s, height 0.2s, transform 0.1s ease-out' }} onMouseEnter={(e) => { e.currentTarget.style.width = '48px'; e.currentTarget.style.height = '48px'; }} onMouseLeave={(e) => { e.currentTarget.style.width = '40px'; e.currentTarget.style.height = '40px'; }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                        <div style={{ position: 'absolute', right: '55px', background: '#2563eb', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>PAG. {currentPageIdx + 1}</div>
                    </div>
                </div>
            </aside>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .ProseMirror p { font-size: 1.125rem; line-height: 1.8; margin-bottom: 1.5rem; color: #9ca3af; }
                .ProseMirror h1 { font-size: 3rem; font-weight: 900; color: white; margin-top: 3rem; margin-bottom: 1.5rem; letter-spacing: -0.05em; }
            `}</style>
        </div>
    );
}
