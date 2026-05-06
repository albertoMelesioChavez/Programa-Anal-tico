'use client';

export default function PlaneacionList({ planeaciones, onDelete, onEdit }) {
    if (!planeaciones || planeaciones.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>📄</div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Sin planeaciones</h3>
                <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '300px' }}>Tu historial de planeaciones aparecerá aquí una vez que crees la primera.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            {planeaciones.map(p => (
                <div key={p.id} 
                    onClick={() => onEdit && onEdit(p)}
                    style={{
                        padding: '28px', 
                        borderRadius: '24px',
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                    }} className="list-item-card">
                    
                    {/* Indicador de edición al hover */}
                    <div className="edit-overlay" style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(37, 99, 235, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: 'none'
                    }}>
                        <span style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                            ✎ Editar Planeación
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>{p.titulo || 'Sin título'}</h4>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px' }}>
                                    #{p.id}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#eff6ff', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' }}>{p.fase_nombre || `Fase ${p.fase_id}`}</span>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#f5f3ff', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase' }}>{p.grado_nombre || `Grado ${p.grado_id}`}</span>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#ecfdf5', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>{p.lenguaje_nombre || `Lenguaje ${p.lenguaje_id}`}</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Creado el</div>
                            <span style={{ fontSize: '13px', color: '#475569', fontWeight: '800' }}>
                                {new Date(p.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Contenido curricular enriquecido */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {p.contenido_nacional_desc && (
                            <div style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2563eb' }}></span>
                                    Contenido Nacional
                                </div>
                                {p.contenido_nacional_desc}
                            </div>
                        )}
                        {p.pda_desc && (
                            <div style={{ padding: '16px', borderRadius: '16px', background: '#fdf4ff', border: '1px solid #fae8ff', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                <div style={{ fontSize: '11px', fontWeight: '900', color: '#a855f7', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#a855f7' }}></span>
                                    Proceso de Desarrollo (PDA)
                                </div>
                                {p.pda_desc}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {p.ejes_articuladores && p.ejes_articuladores.split(',').map((eje, i) => (
                                <span key={i} style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontWeight: '700', border: '1px solid #e2e8f0' }}>{eje.trim()}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                            <a href={`/api/planeaciones/${p.id}/export`} download 
                                style={{ 
                                    background: '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    color: '#475569', 
                                    borderRadius: '12px', 
                                    padding: '10px 20px', 
                                    cursor: 'pointer', 
                                    fontSize: '13px', 
                                    fontWeight: '800', 
                                    textDecoration: 'none', 
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                📥 PDF
                            </a>
                            {onDelete && (
                                <button onClick={() => {
                                    if(confirm('¿Estás seguro de eliminar esta planeación?')) onDelete(p.id);
                                }} 
                                style={{ 
                                    background: '#fff', 
                                    border: '1px solid #fee2e2', 
                                    color: '#ef4444', 
                                    borderRadius: '12px', 
                                    padding: '10px 20px', 
                                    cursor: 'pointer', 
                                    fontSize: '13px', 
                                    fontWeight: '800', 
                                    transition: 'all 0.2s' 
                                }}>
                                    🗑️ Borrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <style jsx>{`
                .list-item-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.08);
                    border-color: #2563eb;
                }
                .list-item-card:hover .edit-overlay {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
