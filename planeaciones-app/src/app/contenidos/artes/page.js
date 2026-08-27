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
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    
    const mainRef = useRef(null);
    const isDragging = useRef(false);
    const minimapRef = useRef(null);
    const pageRefs = useRef([]);

    const syncPageRefs = (nextPages) => {
        pageRefs.current = nextPages.map((_, index) => pageRefs.current[index] || createRef());
    };

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
                syncPageRefs(htmlPages);
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
        // Desactivamos el observer en modo edición para evitar bucles infinitos de renderizado
        // y asegurar que el editor no se destruya mientras el usuario hace scroll
        if (loading || pages.length === 0 || viewMode === 'pdf' || isEditMode) return;
        
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
    }, [loading, pages, viewMode, isEditMode]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('view', viewMode);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [viewMode, router, searchParams]);

    useEffect(() => {
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setIsMobileNavOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, []);

    const handleSaveDocument = async (updatedPages) => {
        // No guardar si no hay cambios reales o si está vacío
        if (!updatedPages || updatedPages.length === 0) return;
        setIsSaving(true);
        try {
            let fullContent = '';
            updatedPages.forEach((p, pIdx) => {
                fullContent += `<!-- PAGE_START ${pIdx + 1} -->\n<p><strong>${p.title}</strong></p>\n${p.cleanHtml}\n<!-- PAGE_END -->\n`;
            });
            const response = await fetch('/api/documentos/artes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fullContent }),
            });
            if (!response.ok) throw new Error('No se pudo guardar el documento. Intenta de nuevo.');
        } catch (error) { 
            console.error('Save failed', error);
            alert(error.message);
        } finally { setIsSaving(false); }
    };

    const handleSave = async (idx, newHtml) => {
        const updatedPages = [...pages];
        updatedPages[idx] = { ...updatedPages[idx], cleanHtml: newHtml };
        setPages(updatedPages);
        syncPageRefs(updatedPages);
        await handleSaveDocument(updatedPages);
    };

    const addSection = async () => {
        const newSection = { title: 'Nueva Sección', cleanHtml: '<p>Contenido de la nueva sección...</p>' };
        const updatedPages = [...pages, newSection];
        setPages(updatedPages);
        syncPageRefs(updatedPages);
        setCurrentPageIdx(updatedPages.length - 1);
        await handleSaveDocument(updatedPages);
    };

    const deleteSection = async (idx) => {
        if (!confirm('¿Estás seguro de eliminar esta sección?')) return;
        const updatedPages = pages.filter((_, i) => i !== idx);
        setPages(updatedPages);
        syncPageRefs(updatedPages);
        setCurrentPageIdx((current) => Math.min(current, Math.max(0, updatedPages.length - 1)));
        await handleSaveDocument(updatedPages);
    };

    const moveSection = async (idx, direction) => {
        if ((idx === 0 && direction === -1) || (idx === pages.length - 1 && direction === 1)) return;
        const updatedPages = [...pages];
        const targetIdx = idx + direction;
        [updatedPages[idx], updatedPages[targetIdx]] = [updatedPages[targetIdx], updatedPages[idx]];
        setPages(updatedPages);
        syncPageRefs(updatedPages);
        setCurrentPageIdx(targetIdx);
        await handleSaveDocument(updatedPages);
    };

    const renameSection = (idx, newTitle) => {
        const updatedPages = [...pages];
        updatedPages[idx] = { ...updatedPages[idx], title: newTitle };
        setPages(updatedPages);
        syncPageRefs(updatedPages);
    };

    const selectSection = (idx) => {
        pageRefs.current[idx]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPageIdx(idx);
        setIsMobileNavOpen(false);
    };

    const toggleDocumentVersion = () => {
        const nextView = viewMode === 'pdf' ? 'digital' : 'pdf';
        setViewMode(nextView);
        setIsMobileNavOpen(false);
        if (nextView === 'pdf') setIsEditMode(false);
    };

    const improveWithAI = async (idx) => {
        setIsSaving(true);
        try {
            const prompt = `Actúa como un experto en artes y educación. Mejora el siguiente contenido para un programa analítico de primaria, haciéndolo más profesional, detallado y pedagógicamente rico. Mantén el formato HTML pero mejora la redacción y los conceptos.`;
            const context = {
                titulo_seccion: pages[idx].title,
                contenido_actual: pages[idx].cleanHtml
            };

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Limpiar la respuesta de posibles bloques de código markdown
            const cleanText = data.text.replace(/```html|```/g, '').trim();
            handleSave(idx, cleanText);
        } catch (error) {
            console.error("AI Error:", error);
            alert("No se pudo mejorar el texto: " + error.message);
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
        a.download = 'Programa_Analitico_Artes_2025.md';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        window.setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
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
        <div className="analitico-shell" style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text, overflow: 'hidden' }}>
            {/* Sidebar / Navigation */}
            {viewMode !== 'pdf' && (
                <aside id="artes-secciones" className={`analitico-sidebar ${isMobileNavOpen ? 'is-open' : ''}`} style={{
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
                            <div key={idx} style={{ marginBottom: '8px', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isEditMode ? (
                                        <div 
                                            style={{
                                                flex: 1,
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                background: currentPageIdx === idx ? '#2563eb' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                minWidth: 0,
                                                border: `1px solid ${currentPageIdx === idx ? 'transparent' : theme.border}`
                                            }}
                                        >
                                            <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5, color: currentPageIdx === idx ? '#fff' : theme.subtext }}>{String(idx + 1).padStart(2, '0')}</span>
                                            <input 
                                                value={p.title} 
                                                onChange={(e) => renameSection(idx, e.target.value)}
                                                onBlur={() => handleSaveDocument(pages)}
                                                onFocus={() => selectSection(idx)}
                                                aria-label={`Nombre de la sección ${idx + 1}`}
                                                style={{ 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    borderBottom: `1px solid ${currentPageIdx === idx ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`, 
                                                    color: currentPageIdx === idx ? '#fff' : theme.text, 
                                                    fontSize: '13px', 
                                                    fontWeight: '700', 
                                                    padding: '2px 0',
                                                    width: '100%',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => selectSection(idx)}
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
                                            <span style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                        </button>
                                    )}

                                    {isEditMode && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <button aria-label={`Subir sección ${idx + 1}`} disabled={idx === 0} onClick={() => moveSection(idx, -1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: theme.subtext, opacity: idx === 0 ? 0.2 : 1 }}>▲</button>
                                            <button aria-label={`Bajar sección ${idx + 1}`} disabled={idx === pages.length - 1} onClick={() => moveSection(idx, 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: theme.subtext, opacity: idx === pages.length - 1 ? 0.2 : 1 }}>▼</button>
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
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            zIndex: 5
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
                                                    color: '#2563eb',
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
            {viewMode !== 'pdf' && isMobileNavOpen && (
                <button className="analitico-overlay" aria-label="Cerrar secciones" onClick={() => setIsMobileNavOpen(false)} />
            )}

            {/* Main Editor / Viewer */}
            <main className="analitico-main" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Fixed Top Bar */}
                <header className="analitico-header" style={{
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
                    <div className="analitico-header-tabs" style={{ display: 'flex', gap: '8px' }}>
                        {viewMode !== 'pdf' && <button className="mobile-sections-button" onClick={() => setIsMobileNavOpen(true)} aria-expanded={isMobileNavOpen} aria-controls="artes-secciones">☰ <span>SECCIONES</span></button>}
                        <button
                            className="document-version-toggle"
                            onClick={toggleDocumentVersion}
                            aria-label={viewMode === 'pdf' ? 'Abrir la versión digital del Programa Analítico del departamento de Artística' : 'Abrir el PDF del Programa Analítico del departamento de Artística'}
                            style={{ padding: '9px 18px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', background: theme.text, color: theme.bg, border: 'none', cursor: 'pointer' }}
                        >
                            <span className="document-version-title">Programa Analítico del departamento de Artística</span>
                            <span className="document-version-action">{viewMode === 'pdf' ? 'Ver versión digital' : 'Abrir PDF'}</span>
                        </button>
                    </div>

                    <div className="analitico-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{ padding: '10px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', background: isEditMode ? '#ef4444' : '#0f172a', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                            {isEditMode ? 'SALIR DE EDICIÓN' : 'EDITAR'}
                        </button>
                        <button 
                            onClick={handleExport}
                            style={{ padding: '10px 24px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                            EXPORTAR
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div 
                    ref={mainRef}
                    onScroll={handleScroll}
                    className="analitico-content-area"
                    style={{ 
                        flex: 1, 
                        overflowY: viewMode === 'pdf' ? 'hidden' : 'auto',
                        background: viewMode === 'pdf' ? '#525659' : '#f1f5f9',
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
                        <div className="analitico-content" style={{
                            maxWidth: '850px', 
                            margin: '0 auto',
                            padding: '60px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
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
                                    className="virtual-page analitico-page"
                                >
                                        <h3 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '32px', color: '#2563eb' }}>{p.title}</h3>
                                        {isEditMode && currentPageIdx === idx ? (
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
                                        <div className="analitico-page-footer" style={{ position: 'absolute', bottom: '30px', right: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            {isEditMode && currentPageIdx === idx && (
                                                <button 
                                                    onClick={() => improveWithAI(idx)}
                                                    disabled={isSaving}
                                                    className="ai-improve-button"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        padding: '6px 14px',
                                                        borderRadius: '100px',
                                                        fontSize: '10px',
                                                        fontWeight: '900',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                                                        opacity: isSaving ? 0.7 : 1
                                                    }}
                                                >
                                                    {isSaving ? '🪄 PROCESANDO...' : '🪄 MEJORAR CON IA'}
                                                </button>
                                            )}
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>
                                                PÁGINA {idx + 1} {isEditMode && currentPageIdx === idx && <span style={{ color: '#2563eb', marginLeft: '10px' }}>(MODO EDICIÓN ACTIVO)</span>}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>

                {/* Minimap Overlay (Digital mode only) */}
                {viewMode === 'digital' && (
                    <div 
                        ref={minimapRef}
                        className="analitico-minimap"
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
                .programa-cover-art {
                    display: block;
                    width: 100%;
                    height: auto;
                    margin: 30px 0 18px;
                    border-radius: 18px;
                    box-shadow: 0 18px 42px rgba(234, 88, 12, .18);
                }
                .programa-inline-visual {
                    margin: 24px 0 34px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    background: #fff;
                    box-shadow: 0 12px 30px rgba(15, 23, 42, .08);
                }
                .programa-inline-visual img {
                    display: block;
                    width: 100%;
                    max-height: 540px;
                    object-fit: contain;
                    background: #f8fafc;
                }
                .programa-inline-visual figcaption {
                    padding: 12px 16px;
                    border-top: 1px solid #e2e8f0;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 700;
                    line-height: 1.45;
                }
                .pdf-source-line { margin: 0 0 10px !important; line-height: 1.55; }
                .pdf-section-title { margin: 24px 0 14px; color: #1d4ed8; font-size: 20px; line-height: 1.25; }
                .pdf-subtitle { margin: 18px 0 10px !important; color: #0f172a; font-size: 16px !important; }
                .pdf-table-scroll {
                    width: 100%;
                    margin: 20px 0 30px;
                    overflow-x: auto;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    background: #fff;
                    box-shadow: 0 5px 18px rgba(15, 23, 42, .06);
                }
                .pdf-table {
                    width: 100%;
                    min-width: 620px;
                    border-collapse: collapse;
                    table-layout: auto;
                    font-size: 13px;
                    line-height: 1.45;
                }
                .pdf-table th, .pdf-table td {
                    padding: 12px 14px;
                    border: 1px solid #cbd5e1;
                    vertical-align: top;
                    text-align: left;
                    overflow-wrap: anywhere;
                }
                .pdf-table th { background: #eff6ff; color: #1e3a8a; font-weight: 900; }
                .pdf-table tr:nth-child(even) td { background: #f8fafc; }
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

                .mobile-sections-button, .analitico-overlay { display: none; }
                .document-version-toggle { display: inline-flex; align-items: center; gap: 12px; text-align: left; }
                .document-version-title { line-height: 1.2; }
                .document-version-action { color: #bfdbfe; font-size: 10px; white-space: nowrap; }

                @media (max-width: 768px) {
                    .analitico-shell { height: 100dvh !important; }
                    .analitico-sidebar {
                        position: fixed !important;
                        inset: 0 auto 0 0;
                        width: min(86vw, 320px) !important;
                        z-index: 200 !important;
                        transform: translateX(-105%);
                        transition: transform .22s ease;
                        box-shadow: 12px 0 30px rgba(15, 23, 42, .16);
                    }
                    .analitico-sidebar.is-open { transform: translateX(0); }
                    .analitico-overlay {
                        display: block;
                        position: fixed;
                        inset: 0;
                        z-index: 150;
                        border: 0;
                        background: rgba(15, 23, 42, .35);
                    }
                    .analitico-header {
                        height: auto !important;
                        min-height: 64px;
                        padding: 10px 12px !important;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    .analitico-header-tabs {
                        flex: 1 1 100%;
                        min-width: 0;
                        overflow-x: auto;
                        padding-bottom: 2px;
                        scrollbar-width: none;
                    }
                    .analitico-header-tabs::-webkit-scrollbar { display: none; }
                    .analitico-header-tabs button { flex: 0 0 auto; white-space: nowrap; padding: 8px 13px !important; font-size: 10px !important; }
                    .document-version-toggle { flex: 1 1 230px !important; min-height: 44px; justify-content: space-between; gap: 8px; white-space: normal !important; text-align: left; }
                    .document-version-title { line-height: 1.2; }
                    .document-version-action { flex: 0 0 auto; color: #bfdbfe; font-size: 9px; }
                    .mobile-sections-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                        border: 1px solid #cbd5e1;
                        background: #fff;
                        color: #0f172a;
                        border-radius: 999px;
                        font-weight: 900;
                        cursor: pointer;
                    }
                    .analitico-header-actions { width: 100%; justify-content: stretch; gap: 8px !important; }
                    .analitico-header-actions button { flex: 1; min-width: 0; min-height: 44px; padding: 9px 8px !important; font-size: 10px !important; white-space: nowrap; }
                    .analitico-content-area { overflow-x: hidden !important; }
                    .analitico-content {
                        width: 100%;
                        box-sizing: border-box;
                        padding: 18px 10px 40px !important;
                        gap: 10px !important;
                    }
                    .analitico-page {
                        box-sizing: border-box;
                        width: 100%;
                        padding: 30px 18px 68px !important;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(15, 23, 42, .06) !important;
                        overflow-wrap: anywhere;
                    }
                    .analitico-page h3 { font-size: 25px !important; line-height: 1.12; margin-bottom: 22px !important; }
                    .analitico-page .prose-custom { font-size: 16px !important; line-height: 1.7 !important; }
                    .analitico-page .prose-custom h4 { font-size: 18px; margin: 28px 0 12px; }
                    .analitico-page .prose-custom table { display: block; max-width: 100%; overflow-x: auto; }
                    .analitico-page-footer { right: 18px !important; bottom: 20px !important; gap: 10px !important; max-width: calc(100% - 36px); }
                    .ai-improve-button { min-height: 36px; padding: 8px 10px !important; }
                    .analitico-sidebar input { min-height: 44px; }
                    .analitico-sidebar button:focus-visible, .analitico-header button:focus-visible { outline: 3px solid rgba(37, 99, 235, .4); outline-offset: 2px; }
                    .analitico-minimap { display: none; }
                }
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
