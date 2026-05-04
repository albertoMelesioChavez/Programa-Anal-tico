'use client';

export default function PlaneacionList({ planeaciones, onDelete }) {
    if (!planeaciones || planeaciones.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📝</div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Sin planeaciones aún</h3>
                <p style={{ fontSize: '14px', color: '#475569' }}>Crea tu primera planeación con el botón de arriba.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            {planeaciones.map(p => (
                <div key={p.id} style={{
                    padding: '20px', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>{p.titulo}</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontWeight: '500' }}>{p.fase}</span>
                                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontWeight: '500' }}>{p.grado}</span>
                                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#34d399', fontWeight: '500' }}>{p.lenguaje}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#475569' }}>
                                {new Date(p.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }} className="list-actions">
                                <a href={`/api/planeaciones/${p.id}/export`} download
                                    style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60a5fa', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', textDecoration: 'none' }}>
                                    📥 Exportar
                                </a>
                                {onDelete && (
                                    <button onClick={() => onDelete(p.id)}
                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contenido curricular */}
                    {p.contenido_nacional_desc && (
                        <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.04)', borderLeft: '3px solid rgba(59,130,246,0.3)', fontSize: '12px', color: '#94a3b8' }}>
                            <span style={{ color: '#60a5fa', fontWeight: '600' }}>CN:</span> {p.contenido_nacional_desc.substring(0, 120)}...
                        </div>
                    )}
                    {p.pda_desc && (
                        <div style={{ marginTop: '6px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(192,132,252,0.04)', borderLeft: '3px solid rgba(192,132,252,0.3)', fontSize: '12px', color: '#94a3b8' }}>
                            <span style={{ color: '#c084fc', fontWeight: '600' }}>PDA:</span> {p.pda_desc.substring(0, 120)}...
                        </div>
                    )}
                    {p.ejes_articuladores && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.ejes_articuladores.split(', ').map((eje, i) => (
                                <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>{eje}</span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
