'use client';

export default function PlaneacionList({ planeaciones, onDelete }) {
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
        <div style={{ display: 'grid', gap: '16px' }}>
            {planeaciones.map(p => (
                <div key={p.id} style={{
                    padding: '28px', 
                    borderRadius: '24px',
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }} className="list-item-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h4 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>{p.titulo || 'Sin título'}</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#eff6ff', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' }}>{p.fase}</span>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#f5f3ff', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase' }}>{p.grado}</span>
                                <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '100px', background: '#ecfdf5', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>{p.lenguaje}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                                {new Date(p.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                            </span>
                        </div>
                    </div>

                    {/* Contenido curricular */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {p.contenido_nacional_desc && (
                            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', borderLeft: '4px solid #2563eb', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                <strong style={{ color: '#1e40af' }}>Contenido:</strong> {p.contenido_nacional_desc.substring(0, 150)}...
                            </div>
                        )}
                        {p.pda_desc && (
                            <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fdf4ff', borderLeft: '4px solid #a855f7', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                <strong style={{ color: '#7e22ce' }}>PDA:</strong> {p.pda_desc.substring(0, 150)}...
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {p.ejes_articuladores && p.ejes_articuladores.split(', ').map((eje, i) => (
                                <span key={i} style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>{eje}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <a href={`/api/planeaciones/${p.id}/export`} download style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', textDecoration: 'none', transition: 'all 0.2s' }}>
                                📥 Exportar
                            </a>
                            {onDelete && (
                                <button onClick={() => onDelete(p.id)} style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }}>
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <style jsx>{`
                .list-item-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.06);
                    border-color: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
