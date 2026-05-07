'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoProyectoPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
            fase3: [], // 1º y 2º
            fase4: [], // 3º y 4º
            fase5: []  // 5º y 6º
        },
        vinculacion: []
    });

    // Database Content for Linking
    const [dbData, setDbData] = useState({ contenidos: [], pdas: [] });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCurriculumData();
    }, []);

    const fetchCurriculumData = async () => {
        try {
            const res = await fetch('/api/contenidos');
            const data = await res.json();
            // Aplanamos los contenidos para búsqueda fácil
            const allContenidos = [...(data.nacionales || []), ...(data.estatales || [])];
            setDbData({ contenidos: allContenidos, pdas: [] });
        } catch (error) {
            console.error("Error loading curriculum data", error);
        }
    };

    const generateIntroduction = async () => {
        if (!formData.tematica || !formData.titulo) {
            return alert("Por favor completa el Título y la Temática antes de generar el sustento.");
        }

        setIsGenerating(true);
        // Borramos el texto anterior para que se muestre el skeleton
        setFormData(prev => ({ ...prev, introduccion: '' }));
        try {
            const prompt = `Redacta la "Introducción y Sustento" para un nuevo proyecto escolar de Educación Artística. El texto debe tener un tono FORMAL, PROFESIONAL y PEDAGÓGICO, adecuado para un documento oficial de planeación escolar.
            
            Título del proyecto: "${formData.titulo}"
            Temática central a abordar: ${formData.tematica}
            
            Productos esperados por fase:
            - 1º y 2º grado: ${formData.productos.fase3.join(', ') || 'Actividades de exploración'}
            - 3º y 4º grado: ${formData.productos.fase4.join(', ') || 'Creaciones guiadas'}
            - 5º y 6º grado: ${formData.productos.fase5.join(', ') || 'Proyectos avanzados'}

            INSTRUCCIONES EXTRA DEL MAESTRO (OBLIGATORIO CUMPLIR):
            ${customPrompt ? customPrompt : 'Proporciona un sustento sólido.'}

            INSTRUCCIONES ESTRICTAS DE REDACCIÓN:
            1. TONO: Formal y académico. PROHIBIDO usar lenguaje coloquial, entusiasta o saludos informales (ej. prohibido decir "¡Hola a todos!", "Prepárense", "Me tiene saltando de emoción").
            2. CONTENIDO: Explica de qué trata el proyecto y dale un sustento pedagógico claro. Propón cómo este proyecto dará soluciones a la temática planteada.
            3. CREATIVIDAD FORMAL: Imagina y menciona posibles eventos de cierre, festivales, o exposiciones donde se mostrarán los productos de los alumnos.
            4. ESTRUCTURA: Redacta 2 a 3 párrafos fluidos y bien estructurados. No uses plantillas rígidas ni viñetas.
            5. MUY IMPORTANTE: Entrega ÚNICAMENTE el texto final de la introducción. Empieza directamente con el primer párrafo del documento.`;
            
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

    const openProductModal = (fase) => {
        setActiveFase(fase);
        setProductInputValue('');
        setProductAIInstruction('');
        setShowProductModal(true);
    };

    const generateProductWithAI = async () => {
        setIsGeneratingProduct(true);
        // Borramos lo que esté escrito para mostrar que está pensando
        setProductInputValue('⏳ Pensando producto...');
        try {
            const prompt = `Propón un producto artístico CREATIVO y ORIGINAL para alumnos de ${activeFase === 'fase3' ? '1º y 2º de primaria' : activeFase === 'fase4' ? '3º y 4º de primaria' : '5º y 6º de primaria'}.
            Tema del proyecto: "${formData.titulo}"
            Temática central: ${formData.tematica}
            
            Instrucción adicional del docente: ${productAIInstruction || 'Crea algo innovador y acorde a la edad.'}
            
            REGLA DE ORO: Responde ÚNICAMENTE con el nombre del producto (ej. "Un mural de plastilina sobre la biodiversidad"). NO des explicaciones, NO pongas comillas, NO saludes. Máximo 15 palabras.`;

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
            const res = await fetch('/api/proyectos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) router.push('/proyectos');
            else throw new Error("Error al guardar");
        } catch (error) {
            alert(error.message);
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
                        <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '40px' }}>Productos por Fase</h2>
                        <p style={{ color: theme.subtext, marginBottom: '40px', fontSize: '15px' }}>Define qué productos artísticos quieres obtener de cada grupo o fase.</p>

                        {['fase3', 'fase4', 'fase5'].map(f => (
                            <div key={f} style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: `1px solid ${theme.border}`, marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>
                                        {f === 'fase3' ? 'Fase 3 (1º y 2º)' : f === 'fase4' ? 'Fase 4 (3º y 4º)' : 'Fase 5 (5º y 6º)'}
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
                        <p style={{ color: theme.subtext, marginBottom: '40px', fontSize: '15px' }}>Selecciona los contenidos y PDA que encajan con los productos que definiste.</p>

                        <div style={{ marginBottom: '32px' }}>
                            <input 
                                type="text" 
                                placeholder="Buscar contenido o PDA... (ej. paz, ritmo, colores)" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '16px', fontWeight: '600', outline: 'none' }}
                            />
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#fff', borderRadius: '24px', border: `1px solid ${theme.border}`, padding: '24px' }}>
                            {dbData.contenidos.filter(c => c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                                <div key={c.id} style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }} onClick={() => {
                                    if (!formData.vinculacion.includes(c.id)) {
                                        setFormData({...formData, vinculacion: [...formData.vinculacion, c.id]});
                                    }
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>{c.descripcion}</p>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${formData.vinculacion.includes(c.id) ? theme.accent : theme.border}`, background: formData.vinculacion.includes(c.id) ? theme.accent : 'transparent' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '40px', padding: '32px', background: '#fff', borderRadius: '24px', border: `1px solid ${theme.accent}`, boxShadow: '0 10px 40px rgba(124,58,237,0.1)' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Resumen del Proyecto</h3>
                            <p style={{ fontSize: '14px', color: theme.subtext, marginBottom: '24px' }}>Todo listo para guardar y empezar a planear tus sesiones.</p>
                            <button 
                                onClick={handleSaveProject}
                                disabled={isSaving}
                                style={{ width: '100%', padding: '20px', borderRadius: '16px', background: theme.accent, color: '#fff', border: 'none', fontWeight: '900', fontSize: '16px', cursor: 'pointer' }}
                            >
                                {isSaving ? 'GUARDANDO...' : 'FINALIZAR Y CREAR PROYECTO 🎨'}
                            </button>
                        </div>

                        <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: '16px', padding: '20px', borderRadius: '16px', background: 'transparent', color: theme.subtext, border: 'none', fontWeight: '900' }}>ATRÁS</button>
                    </div>
                )}

            </main>

            {/* PRODUCT MODAL */}
            {showProductModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="fade-in" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Nuevo Producto Artístico</h3>
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

                        <div style={{ marginBottom: '40px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', marginBottom: '8px' }}>Nombre del Producto</label>
                            <textarea 
                                value={productInputValue}
                                onChange={e => setProductInputValue(e.target.value)}
                                placeholder="Ej. Un mural colectivo con materiales reciclados"
                                style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, fontSize: '16px', fontWeight: '700', outline: 'none', minHeight: '100px', resize: 'none' }}
                            />
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
