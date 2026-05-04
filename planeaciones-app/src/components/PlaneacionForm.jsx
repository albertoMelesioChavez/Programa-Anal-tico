'use client';

import { useState, useEffect } from 'react';

export default function PlaneacionForm({ onSaved, onCancel }) {
    const [catalogs, setCatalogs] = useState({ fases: [], grados: [], lenguajes: [] });
    const [contenidos, setContenidos] = useState({ nacionales: [], estatales: [] });
    const [pdas, setPdas] = useState([]);

    const [formData, setFormData] = useState({
        titulo: '',
        fase_id: '',
        grado_id: '',
        lenguaje_id: '',
        contenido_nacional_id: '',
        contenido_estatal_id: '',
        pda_id: '',
        metodologia: '',
        actividades: '',
        recursos: '',
        evaluacion: ''
    });

    const [loading, setLoading] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Load base catalogs on mount
    useEffect(() => {
        fetch('/api/catalogos')
            .then(res => res.json())
            .then(data => setCatalogs(data))
            .catch(err => console.error('Error fetching catalogs:', err));
    }, []);

    // Fetch Contenidos based on Fase & Lenguaje
    useEffect(() => {
        if (formData.fase_id && formData.lenguaje_id) {
            setContenidos({ nacionales: [], estatales: [] });
            setFormData(prev => ({ ...prev, contenido_nacional_id: '', contenido_estatal_id: '', pda_id: '' }));

            fetch(`/api/contenidos?fase_id=${formData.fase_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setContenidos(data))
                .catch(err => console.error('Error fetching contenidos:', err));
        }
    }, [formData.fase_id, formData.lenguaje_id]);

    // Fetch PDAs based on Grado & Lenguaje
    useEffect(() => {
        if (formData.grado_id && formData.lenguaje_id) {
            setPdas([]);
            setFormData(prev => ({ ...prev, pda_id: '' }));

            fetch(`/api/pdas?grado_id=${formData.grado_id}&lenguaje_id=${formData.lenguaje_id}`)
                .then(res => res.json())
                .then(data => setPdas(data.pdas || []))
                .catch(err => console.error('Error fetching PDAs:', err));
        }
    }, [formData.grado_id, formData.lenguaje_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/planeaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    onSaved();
                }, 1500);
            } else {
                alert('Error al guardar.');
            }
        } catch (error) {
            console.error(error);
            alert('Error en conexión.');
        } finally {
            setLoading(false);
        }
    };

    const filteredGrados = catalogs.grados.filter(g => g.fase_id === parseInt(formData.fase_id));

    return (
        <div className="glass-panel p-6 md:p-8 animate-fade-in relative overflow-hidden w-full">
            {/* Dynamic Background Glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6 border-b border-[var(--surface-border)] pb-4">
                    <h2 className="text-2xl font-bold text-white">Nueva Planeación</h2>
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="text-[var(--text-muted)] hover:text-white transition">
                            ✕ Cerrar
                        </button>
                    )}
                </div>

                {submitSuccess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--success)] flex items-center justify-center mb-4 shadow-[0_0_20px_var(--success)]">
                            <span className="text-white text-3xl">✓</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">¡Guardada con Exist!</h3>
                        <p className="text-[var(--text-muted)]">Redirigiendo al dashboard...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Header / Titulo */}
                        <div>
                            <label htmlFor="titulo">Título de la Planeación o Proyecto</label>
                            <input
                                type="text" id="titulo" name="titulo" required
                                className="glass-input text-lg font-bold"
                                placeholder="Ej. Descubriendo los sonidos de mi comunidad"
                                value={formData.titulo} onChange={handleChange}
                            />
                        </div>

                        {/* Categorías Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label>Fase Escolar</label>
                                <select name="fase_id" required className="glass-input" value={formData.fase_id} onChange={handleChange}>
                                    <option value="">Seleccione Fase...</option>
                                    {catalogs.fases.map(f => (
                                        <option key={f.id} value={f.id}>{f.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Grado</label>
                                <select name="grado_id" required className="glass-input" value={formData.grado_id} onChange={handleChange} disabled={!formData.fase_id}>
                                    <option value="">Seleccione Grado...</option>
                                    {filteredGrados.map(g => (
                                        <option key={g.id} value={g.id}>{g.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Lenguaje Artístico</label>
                                <select name="lenguaje_id" required className="glass-input" value={formData.lenguaje_id} onChange={handleChange}>
                                    <option value="">Seleccione Lenguaje...</option>
                                    {catalogs.lenguajes.map(l => (
                                        <option key={l.id} value={l.id}>{l.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Contenidos y PDAs (Aparecen solo si hay Fase y Lenguaje) */}
                        {formData.fase_id && formData.lenguaje_id && (
                            <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                                <div>
                                    <label>Contenido Nacional</label>
                                    <select name="contenido_nacional_id" className="glass-input bg-opacity-30" value={formData.contenido_nacional_id} onChange={handleChange}>
                                        <option value="">(Opcional) Seleccione Contenido Nacional...</option>
                                        {contenidos.nacionales.map(c => (
                                            <option key={c.id} value={c.id}>{c.descripcion.substring(0, 100)}...</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[var(--primary)] text-opacity-80">Contenido Estatal de {catalogs.lenguajes.find(l => l.id == formData.lenguaje_id)?.nombre}</label>
                                    <select name="contenido_estatal_id" className="glass-input border-[var(--primary)] border-opacity-30 focus:border-opacity-100" value={formData.contenido_estatal_id} onChange={handleChange}>
                                        <option value="">(Opcional) Seleccione Contenido Estatal...</option>
                                        {contenidos.estatales.map(c => (
                                            <option key={c.id} value={c.id}>{c.descripcion.substring(0, 120)}...</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.grado_id && (
                                    <div>
                                        <label className="text-purple-400">Proceso de Desarrollo de Aprendizaje (PDA)</label>
                                        <select name="pda_id" className="glass-input border-purple-500 border-opacity-30 focus:border-opacity-100" value={formData.pda_id} onChange={handleChange}>
                                            <option value="">(Opcional) Seleccione PDA...</option>
                                            {pdas.map(p => (
                                                <option key={p.id} value={p.id}>{p.descripcion.substring(0, 130)}...</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Secciones de Texto Libre */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--surface-border)]">
                            <div>
                                <label>Metodología / Proyecto</label>
                                <textarea name="metodologia" rows={3} className="glass-input resize-y" placeholder="Ej. Aprendizaje Basado en Proyectos Comunitarios" value={formData.metodologia} onChange={handleChange}></textarea>
                            </div>
                            <div>
                                <label>Recursos y Materiales</label>
                                <textarea name="recursos" rows={3} className="glass-input resize-y" placeholder="Instrumentos musicales, papel, colores..." value={formData.recursos} onChange={handleChange}></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label>Actividades (Secuencia Didáctica)</label>
                                <textarea name="actividades" rows={5} className="glass-input resize-y" placeholder="Inicio: ... Desarrollo: ... Cierre: ..." value={formData.actividades} onChange={handleChange}></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label>Evaluación Formativa</label>
                                <textarea name="evaluacion" rows={3} className="glass-input resize-y" placeholder="Rúbrica, observación directa, producto final..." value={formData.evaluacion} onChange={handleChange}></textarea>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--surface-border)]">
                            {onCancel && (
                                <button type="button" onClick={onCancel} className="btn btn-glass">
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" disabled={loading} className="btn btn-primary min-w-[140px]">
                                {loading ? 'Guardando...' : 'Guardar Planeación'}
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </div>
    );
}
