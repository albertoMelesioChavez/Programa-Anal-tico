'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoProyectoPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    
    // Modal state for products
    const [showProductModal, setShowProductModal] = useState(false);
    const [activeFase, setActiveFase] = useState('');
    const [productInputValue, setProductInputValue] = useState('');
    const [productAIInstruction, setProductAIInstruction] = useState('');
    const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        titulo: '',
        tematica: '',
        introduccion: '',
        productos: {
            grado1: [], grado2: [], grado3: [], grado4: [], grado5: [], grado6: []
        },
        vinculacion: []
    });

    // Database Content for Linking
    const [dbData, setDbData] = useState({ nacionales: [], estatales: [], pdas: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContenido, setSelectedContenido] = useState(null);

    useEffect(() => {
        fetchCurriculumData();
    }, []);

    const fetchCurriculumData = async () => {
        try {
            const res = await fetch('/api/contenidos');
            const data = await res.json();
            setDbData({ 
                nacionales: data.nacionales || [], 
                estatales: data.estatales || [], 
                pdas: data.pdas || [] 
            });
        } catch (error) {
            console.error("Error loading curriculum data", error);
        }
    };

    const toggleContenido = (contenido) => {
        const isSelected = formData.vinculacion.some(v => v.contenido_id === contenido.id);
        if (isSelected) {
            setFormData({
                ...formData,
                vinculacion: formData.vinculacion.filter(v => v.contenido_id !== contenido.id)
            });
            if (selectedContenido?.id === contenido.id) setSelectedContenido(null);
        } else {
            setFormData({
                ...formData,
                vinculacion: [...formData.vinculacion, { contenido_id: contenido.id, pda_ids: [] }]
            });
            setSelectedContenido(contenido);
        }
    };

    const togglePDA = (contenidoId, pdaId) => {
        const vinculacion = [...formData.vinculacion];
        let contentIndex = vinculacion.findIndex(v => v.contenido_id === contenidoId);
        
        if (contentIndex === -1) {
            vinculacion.push({ contenido_id: contenidoId, pda_ids: [pdaId] });
        } else {
            const pdaIndex = vinculacion[contentIndex].pda_ids.indexOf(pdaId);
            if (pdaIndex === -1) {
                vinculacion[contentIndex].pda_ids.push(pdaId);
            } else {
                vinculacion[contentIndex].pda_ids.splice(pdaIndex, 1);
            }
        }
        setFormData({ ...formData, vinculacion });
    };

    const generateIntroduction = async () => {
        if (!formData.tematica || !formData.titulo) {
            return alert("Por favor completa el Título y la Temática antes de generar el sustento.");
        }

        setIsGenerating(true);
        // Borramos el texto anterior para que se muestre el skeleton
        setFormData(prev => ({ ...prev, introduccion: '' }));
        try {
            const prompt = `MISIÓN: Redacta la "Introducción y Sustento" de un proyecto escolar titulado "${formData.titulo}" cuya temática central es "${formData.tematica}".
            
            ESTRUCTURA OBLIGATORIA DEL TEXTO:
            1. PÁRRAFO 1 (EL CORAZÓN): Debe iniciar explicando directamente de qué trata el proyecto "${formData.titulo}" y cómo se vincula específicamente con la temática de "${formData.tematica}". No uses rodeos, entra directo a la relación entre el título y el tema.
            2. PÁRRAFO 2 (EL SUSTENTO): Justifica pedagógicamente por qué el arte es la mejor herramienta para abordar "${formData.tematica}". Menciona cómo los productos (como ${Object.values(formData.productos).flat().join(', ') || 'las actividades artísticas'}) ayudarán a los alumnos.
            3. PÁRRAFO 3 (LA PROYECCIÓN): Describe cómo este trabajo culminará en festivales, muestras o soluciones reales que impacten a la comunidad escolar.

            REGLAS ESTRICTAS DE ESTILO:
            - TONO: Formal, profesional y pedagógico.
            - PROHIBIDO: Saludos informales, exclamaciones, lenguaje infantil o frases tipo "¡Hola!".
            - INTEGRACIÓN: El título "${formData.titulo}" y la temática "${formData.tematica}" deben ser el hilo conductor de toda la redacción, no solo mencionarse al principio.
            - ENTREGA: Entrega ÚNICAMENTE los 3 párrafos de texto.`;
            
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt, 
                    context: { 
                        titulo: formData.titulo,
                        tematica: formData.tematica,
                        productos: formData.productos
                    } 
                })
            });
            
            const data = await res.json();
            if (data.error) throw new Error(data.details || data.error);
            
            setFormData(prev => ({ ...prev, introduccion: data.text }));
        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("No se pudo generar el sustento: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };
    const suggestCurriculum = async () => {
        if (!dbData.estatales.length || formData.vinculacion.length > 0 || isSuggesting) return;
        
        setIsSuggesting(true);
        try {
            const context = {
                titulo: formData.titulo,
                tematica: formData.tematica,
                introduccion: formData.introduccion,
                productos: formData.productos
            };
            
            // Enviamos solo los primeros 100 contenidos para no saturar el prompt, o una muestra relevante
            const listado = dbData.estatales.slice(0, 150).map(c => `ID:${c.id} - ${c.descripcion}`).join('\n');
            
            const prompt = `Como experto pedagogo en artes, analiza este proyecto:
            TÍTULO: ${context.titulo}
            TEMÁTICA: ${context.tematica}
            INTRODUCCIÓN: ${context.introduccion}
            PRODUCTOS ESPERADOS: ${JSON.stringify(context.productos)}

            Tu tarea es seleccionar los 3 IDs de contenidos del catálogo que mejor se vinculen con este proyecto.
            Responde ÚNICAMENTE con un array JSON de IDs, ejemplo: [12, 45, 102].
            Si no encuentras coincidencias perfectas, elige las más cercanas.

            LISTADO DE CONTENIDOS (ID - Descripción):
            ${listado}`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context })
            });
            
            const data = await res.json();
            if (data.text) {
                // Extraer el array del texto (a veces la IA pone markdown)
                const match = data.text.match(/\[.*\]/);
                if (match) {
                    const suggestedIds = JSON.parse(match[0]);
                    const newVinculacion = suggestedIds.map(id => ({ contenido_id: id, pda_ids: [] }));
                    setFormData(prev => ({ ...prev, vinculacion: newVinculacion }));
                    
                    // Seleccionar el primero para que el usuario vea PDAs
                    if (suggestedIds.length > 0) {
                        const firstContent = dbData.estatales.find(c => c.id === suggestedIds[0]);
                        if (firstContent) setSelectedContenido(firstContent);
                    }
                }
            }
        } catch (error) {
            console.error("AI Suggestion Error:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    useEffect(() => {
        if (step === 4) {
            suggestCurriculum();
        }
    }, [step]);
    const openProductModal = (fase) => {
        setActiveFase(fase);
        setProductInputValue('');
        setProductAIInstruction('');
        setShowProductModal(true);
    };

    const generateProductWithAI = async () => {
        setIsGeneratingProduct(true);
        setProductInputValue('');
        try {
            const gradeMapping = {
                grado1: '1º de primaria (6-7 años, pensamiento simbólico, motricidad fina en desarrollo)',
                grado2: '2º de primaria (7-8 años, mayor control de trazos, interés por el detalle)',
                grado3: '3º de primaria (8-9 años, pensamiento más estructurado, interés en técnicas mixtas)',
                grado4: '4º de primaria (9-10 años, capacidad de abstracción, interés en lo social)',
                grado5: '5º de primaria (10-11 años, pensamiento crítico, dominio técnico avanzado)',
                grado6: '6º de primaria (11-12 años, pre-adolescencia, búsqueda de identidad, proyectos complejos)'
            };

            const prompt = `Propón un producto artístico CREATIVO y ORIGINAL para alumnos de ${gradeMapping[activeFase]}.
            Tema del proyecto: "${formData.titulo}"
            Temática central: ${formData.tematica}
            
            Instrucción adicional del docente: ${productAIInstruction || 'Crea algo innovador y acorde a la edad.'}
            
            REGLA DE ORO: Responde ÚNICAMENTE con el nombre del producto (ej. "Mural de siluetas expresivas"). NO des explicaciones, NO pongas comillas, NO saludes. Máximo 12 palabras. Asegúrate de que el producto sea realizable por un niño de este grado específico.`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, context: formData })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setProductInputValue(data.text.trim());
        } catch (error) {
            alert("Error: " + error.message);
            setProductInputValue('');
        } finally {
            setIsGeneratingProduct(false);
        }
    };

    const confirmAddProduct = () => {
        if (!productInputValue || productInputValue.includes('⏳')) return;
        setFormData({
            ...formData,
            productos: {
                ...formData.productos,
                [activeFase]: [...formData.productos[activeFase], productInputValue]
            }
        });
        setShowProductModal(false);
    };

    const addProduct = (fase) => {
        // Esta función ya no se usa, ahora usamos openProductModal
    };

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            console.log("Saving project:", formData);
            const res = await fetch('/api/proyectos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    vinculacion: formData.vinculacion || []
                })
            });
            const data = await res.json();
            if (res.ok) {
                router.push('/proyectos');
            } else {
                throw new Error(data.error || "Error desconocido al guardar");
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const theme = {
        accent: '#7c3aed',
        bg: '#f8fafc',
        card: '#ffffff',
        text: '#0f172a',
        subtext: '#64748b',
        border: '#e2e8f0'
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, paddingBottom: '100px' }}>
            {/* Header / Stepper Nav */}
            <header style={{ background: '#fff', borderBottom: `1px solid ${theme.border}`, padding: '20px 40px', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Link href="/proyectos" style={{ textDecoration: 'none', fontSize: '20px' }}>✕</Link>
                        <h1 style={{ fontSize: '18px', fontWeight: '900' }}>Nuevo Proyecto Artístico</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} style={{ 
                                width: '40px', height: '6px', borderRadius: '3px', 
                                background: step >= s ? theme.accent : theme.border,
                                transition: 'all 0.3s'
                            }}></div>
                        ))}
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px' }}>
                
                {/* STEP 1: IDEA BASE */}
                {step === 1 && (
                    <div className="fade-in">
                        <span style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, letterSpacing: '2px' }}>PASO 01</span>
                        <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '40px' }}>Define el alma del proyecto</h2>
                        
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Título del Proyecto</label>
                            <input 
                                value={formData.titulo}
                                onChange={e => setFormData({...formData, titulo: e.target.value})}
                                placeholder="Ej. Voces por la Paz 2025"
                                style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '20px', fontWeight: '700', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '48px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Temática Central</label>
                            <input 
                                value={formData.tematica}
                                onChange={e => setFormData({...formData, tematica: e.target.value})}
                                placeholder="Ej. El cuidado del agua, La paz, Reciclaje..."
                                style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '18px', fontWeight: '700', outline: 'none' }}
                            />
                            <p style={{ fontSize: '13px', color: theme.subtext, marginTop: '12px' }}>Esta temática servirá como eje para que la IA nos ayude a redactar el sustento.</p>
                        </div>

                        <button 
                            onClick={() => setStep(2)}
                            disabled={!formData.titulo || !formData.tematica}
                            style={{ width: '100%', padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', fontSize: '16px', cursor: 'pointer', opacity: (!formData.titulo || !formData.tematica) ? 0.5 : 1 }}
                        >
                            CONTINUAR →
                        </button>
                    </div>
                )}

                {/* STEP 2: SUSTENTO */}
                {step === 2 && (
                    <div className="fade-in">
                        <span style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, letterSpacing: '2px' }}>PASO 02</span>
                        <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '20px' }}>Introducción y Sustento</h2>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Instrucciones adicionales para la IA (Opcional)</label>
                            <input 
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="Ej. Hazlo más corto, menciona a los padres, usa un tono más formal..."
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.accent}50`, fontSize: '14px', outline: 'none', background: '#f5f3ff' }}
                            />
                        </div>

                        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: `1px solid ${theme.border}`, position: 'relative', minHeight: '364px' }}>
                            {isGenerating ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div className="skeleton-line" style={{ width: '100%', height: '18px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '18px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '92%', height: '18px', borderRadius: '4px' }}></div>
                                    
                                    <div className="skeleton-line" style={{ width: '100%', height: '18px', borderRadius: '4px', marginTop: '16px' }}></div>
                                    <div className="skeleton-line" style={{ width: '96%', height: '18px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '85%', height: '18px', borderRadius: '4px' }}></div>
                                </div>
                            ) : (
                                <textarea 
                                    value={formData.introduccion}
                                    onChange={e => setFormData({...formData, introduccion: e.target.value})}
                                    placeholder="Describe el propósito y sustento del proyecto..."
                                    style={{ width: '100%', minHeight: '300px', border: 'none', fontSize: '16px', lineHeight: '1.8', outline: 'none', resize: 'none' }}
                                />
                            )}
                            <button 
                                onClick={generateIntroduction}
                                disabled={isGenerating}
                                style={{ 
                                    position: 'absolute', bottom: '24px', right: '24px',
                                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
                                    color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', 
                                    fontWeight: '900', fontSize: '13px', cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                                }}
                            >
                                {isGenerating ? '🪄 ESCRIBIENDO...' : '🪄 REDACTAR CON IA'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '20px', borderRadius: '16px', background: '#fff', color: theme.text, border: `1px solid ${theme.border}`, fontWeight: '900' }}>ATRÁS</button>
                            <button onClick={() => setStep(3)} style={{ flex: 2, padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900' }}>CONTINUAR →</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PRODUCTOS */}
                {step === 3 && (
                    <div className="fade-in">
                        <span style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, letterSpacing: '2px' }}>PASO 03</span>
                        <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '40px' }}>Productos Esperados</h2>
                        <p style={{ color: theme.subtext, marginBottom: '40px', fontSize: '15px' }}>Define qué productos tangibles quieres obtener de cada grupo o fase.</p>

                        {['grado1', 'grado2', 'grado3', 'grado4', 'grado5', 'grado6'].map(f => (
                            <div key={f} style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: `1px solid ${theme.border}`, marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>
                                        {f.replace('grado', '')}º Grado
                                    </h3>
                                    <button onClick={() => openProductModal(f)} style={{ background: '#f5f3ff', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>+ AÑADIR PRODUCTO</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {formData.productos[f].length === 0 ? (
                                        <p style={{ fontSize: '13px', color: theme.subtext, fontStyle: 'italic' }}>Sin productos definidos aún.</p>
                                    ) : formData.productos[f].map((p, i) => (
                                        <div key={i} style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span>✨</span> {p}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '20px', borderRadius: '16px', background: '#fff', color: theme.text, border: `1px solid ${theme.border}`, fontWeight: '900' }}>ATRÁS</button>
                            <button onClick={() => setStep(4)} style={{ flex: 2, padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900' }}>CONTINUAR →</button>
                        </div>
                    </div>
                )}

                {/* STEP 4: VINCULACIÓN */}
                {step === 4 && (
                    <div className="fade-in">
                        <span style={{ fontSize: '12px', fontWeight: '900', color: theme.accent, letterSpacing: '2px' }}>PASO 04</span>
                        <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '20px' }}>Vinculación Curricular</h2>
                        <p style={{ color: theme.subtext, marginBottom: '40px', fontSize: '15px' }}>Busca y selecciona los contenidos y PDAs que sustentan tus productos esperados.</p>

                        {isSuggesting && (
                            <div style={{ marginBottom: '24px', padding: '16px 24px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '20px', border: `1px solid ${theme.accent}30`, display: 'flex', alignItems: 'center', gap: '16px', animation: 'pulse 2s infinite' }}>
                                <span style={{ fontSize: '20px' }}>🪄</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: theme.accent }}>IA sugiriendo contenidos basados en tu proyecto...</span>
                                <style jsx>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }`}</style>
                            </div>
                        )}

                        {/* BUSCADOR */}
                        <div style={{ marginBottom: '32px', position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar por contenido o PDA... (ej. ritmo, color, paz)" 
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setSelectedContenido(null); // Limpiar selección al buscar para mostrar resultados globales
                                }}
                                style={{ width: '100%', padding: '24px 32px 24px 64px', borderRadius: '24px', border: `1px solid ${theme.border}`, fontSize: '18px', fontWeight: '600', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}
                            />
                            <span style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', opacity: 0.5 }}>🔎</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', minHeight: '600px' }}>
                            
                            {/* CATÁLOGO / RESULTADOS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase' }}>
                                        {searchTerm ? 'Resultados de búsqueda' : 'Catálogo de Contenidos'}
                                    </label>
                                    <span style={{ fontSize: '11px', color: theme.subtext }}>{dbData.estatales.length} contenidos disponibles</span>
                                </div>
                                
                                <div style={{ flex: 1, maxHeight: '600px', overflowY: 'auto', background: '#fff', borderRadius: '32px', border: `1px solid ${theme.border}`, padding: '16px' }}>
                                    {dbData.estatales
                                        .filter(c => {
                                            const matchesContent = c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesPDA = dbData.pdas.some(p => p.contenido_estatal_id === c.id && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
                                            return matchesContent || matchesPDA;
                                        })
                                        .map(c => {
                                            const vinculacion = formData.vinculacion.find(v => v.contenido_id === c.id);
                                            const isSelected = !!vinculacion;
                                            const pdaMatches = dbData.pdas.filter(p => p.contenido_estatal_id === c.id && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

                                            return (
                                                <div 
                                                    key={c.id} 
                                                    style={{ 
                                                        padding: '20px', borderRadius: '20px', marginBottom: '12px', cursor: 'pointer',
                                                        background: selectedContenido?.id === c.id ? '#f5f3ff' : 'transparent',
                                                        border: `1px solid ${selectedContenido?.id === c.id ? theme.accent : isSelected ? theme.accent + '30' : 'transparent'}`,
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onClick={() => setSelectedContenido(c)}
                                                >
                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); toggleContenido(c); }}
                                                            style={{ 
                                                                minWidth: '24px', height: '24px', borderRadius: '8px', marginTop: '2px',
                                                                border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                                                                background: isSelected ? theme.accent : 'transparent',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px'
                                                            }}
                                                        >
                                                            {isSelected && '✓'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.4', margin: 0, color: isSelected ? theme.text : theme.text + '80' }}>{c.descripcion}</p>
                                                            {searchTerm && pdaMatches.length > 0 && (
                                                                <div style={{ marginTop: '10px' }}>
                                                                    {pdaMatches.map(pm => (
                                                                        <div key={pm.id} style={{ fontSize: '11px', color: theme.accent, background: theme.accent + '10', padding: '4px 8px', borderRadius: '6px', marginTop: '4px', display: 'inline-block', marginRight: '4px' }}>
                                                                            🎯 PDA: {pm.descripcion.substring(0, 40)}...
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* MI SELECCIÓN Y PDAs */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                {/* PDAs DEL CONTENIDO SELECCIONADO */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase' }}>
                                        PDAs del Contenido
                                    </label>
                                    <div style={{ minHeight: '300px', background: '#fff', borderRadius: '32px', border: `1px solid ${theme.border}`, padding: '24px' }}>
                                        {!selectedContenido ? (
                                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: theme.subtext, opacity: 0.5 }}>
                                                <span style={{ fontSize: '40px', marginBottom: '16px' }}>👈</span>
                                                <p style={{ fontSize: '14px', fontWeight: '600' }}>Selecciona un contenido del catálogo para ver y elegir sus PDAs.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ marginBottom: '20px' }}>
                                                    <h4 style={{ fontSize: '13px', fontWeight: '900', color: theme.accent, textTransform: 'uppercase', marginBottom: '4px' }}>Contenido seleccionado:</h4>
                                                    <p style={{ fontSize: '12px', color: theme.subtext, fontWeight: '500' }}>{selectedContenido.descripcion}</p>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {dbData.pdas.filter(p => p.contenido_estatal_id === selectedContenido.id).map(p => {
                                                        const vinculacion = formData.vinculacion.find(v => v.contenido_id === selectedContenido.id);
                                                        const isPDASelected = vinculacion?.pda_ids.includes(p.id);
                                                        
                                                        return (
                                                            <div 
                                                                key={p.id} 
                                                                onClick={() => togglePDA(selectedContenido.id, p.id)}
                                                                style={{ 
                                                                    padding: '16px', borderRadius: '16px', background: isPDASelected ? theme.accent + '05' : 'transparent',
                                                                    border: `1px solid ${isPDASelected ? theme.accent + '30' : theme.border + '50'}`,
                                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                                    <div style={{ 
                                                                        minWidth: '18px', height: '18px', borderRadius: '50%', marginTop: '2px',
                                                                        border: `2px solid ${isPDASelected ? theme.accent : theme.border}`,
                                                                        background: isPDASelected ? theme.accent : 'transparent',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
                                                                    }}>
                                                                        {isPDASelected && '✓'}
                                                                    </div>
                                                                    <p style={{ fontSize: '13px', fontWeight: '500', lineHeight: '1.5', margin: 0, color: isPDASelected ? theme.text : theme.text + '90' }}>{p.descripcion}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* LISTADO DE MI SELECCIÓN */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase' }}>
                                        Mi Selección ({formData.vinculacion.length})
                                    </label>
                                    <div style={{ background: theme.accent + '05', borderRadius: '32px', border: `2px dashed ${theme.accent}30`, padding: '24px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {formData.vinculacion.length === 0 ? (
                                            <p style={{ fontSize: '13px', color: theme.subtext, textAlign: 'center', margin: '20px 0' }}>No hay contenidos seleccionados aún.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {formData.vinculacion.map(v => {
                                                    const content = dbData.estatales.find(c => c.id === v.contenido_id);
                                                    return (
                                                        <div key={v.contenido_id} style={{ background: '#fff', padding: '8px 12px', borderRadius: '12px', border: `1px solid ${theme.accent}30`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '900', color: theme.accent }}>ID:{v.contenido_id}</span>
                                                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{v.pda_ids.length} PDA(s)</span>
                                                            <button onClick={() => toggleContenido(content)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '900' }}>✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div style={{ marginTop: '48px', padding: '40px', background: 'linear-gradient(135deg, #fff, #f5f3ff)', borderRadius: '32px', border: `1px solid ${theme.accent}30`, boxShadow: '0 20px 40px rgba(124,58,237,0.1)', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>¡Todo listo! 🎨</h3>
                            <p style={{ fontSize: '15px', color: theme.subtext, marginBottom: '32px' }}>Has definido el alma, el sustento, los productos esperados y la vinculación de tu proyecto.</p>
                            <button 
                                onClick={handleSaveProject}
                                disabled={isSaving || formData.vinculacion.length === 0}
                                style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '20px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', fontSize: '18px', cursor: 'pointer', opacity: (isSaving || formData.vinculacion.length === 0) ? 0.5 : 1, boxShadow: '0 10px 30px rgba(124,58,237,0.3)' }}
                            >
                                {isSaving ? '📦 GUARDANDO PROYECTO...' : '🚀 FINALIZAR Y CREAR PROYECTO'}
                            </button>
                            {formData.vinculacion.length === 0 && (
                                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '16px', fontWeight: '700' }}>⚠️ Debes seleccionar al menos un contenido antes de finalizar.</p>
                            )}
                        </div>

                        <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: '24px', padding: '20px', borderRadius: '16px', background: 'transparent', color: theme.subtext, border: 'none', fontWeight: '900', cursor: 'pointer' }}>← VOLVER A PRODUCTOS</button>
                    </div>
                )}

            </main>

            {/* PRODUCT MODAL */}
            {showProductModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="fade-in" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Nuevo Producto Esperado</h3>
                        <p style={{ fontSize: '14px', color: theme.subtext, marginBottom: '32px' }}>
                            Define qué van a crear los alumnos de {activeFase === 'fase3' ? '1º y 2º' : activeFase === 'fase4' ? '3º y 4º' : '5º y 6º'}.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Instrucción para la IA (Opcional)</label>
                            <input 
                                value={productAIInstruction}
                                onChange={e => setProductAIInstruction(e.target.value)}
                                placeholder="Ej. Que sea una manualidad, que use música..."
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '14px', outline: 'none', marginBottom: '12px' }}
                            />
                            <button 
                                onClick={generateProductWithAI}
                                disabled={isGeneratingProduct}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f5f3ff', color: theme.accent, border: `1px solid ${theme.accent}30`, fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {isGeneratingProduct ? '🪄 PENSANDO...' : '🪄 GENERAR CON IA'}
                            </button>
                        </div>

                        <div style={{ marginBottom: '40px', minHeight: '140px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Nombre del Producto</label>
                            {isGeneratingProduct ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
                                    <div className="skeleton-line" style={{ width: '100%', height: '16px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '70%', height: '16px', borderRadius: '4px' }}></div>
                                </div>
                            ) : (
                                <textarea 
                                    value={productInputValue}
                                    onChange={e => setProductInputValue(e.target.value)}
                                    placeholder="Ej. Un mural colectivo con materiales reciclados"
                                    style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '16px', fontWeight: '700', outline: 'none', minHeight: '100px', resize: 'none' }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: theme.subtext, fontWeight: '900', cursor: 'pointer' }}>CANCELAR</button>
                            <button onClick={confirmAddProduct} style={{ flex: 2, padding: '16px', borderRadius: '12px', border: 'none', background: theme.accent, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>AGREGAR PRODUCTO</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .skeleton-line {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s infinite;
                }
                
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
