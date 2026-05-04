'use client';

export default function PlaneacionList({ planeaciones, onDelete }) {
    if (!planeaciones || planeaciones.length === 0) {
        return (
            <div className="glass-panel p-12 w-full text-center animate-fade-in border-dashed border-2 border-[var(--surface-border)]">
                <h3 className="text-xl text-[var(--text-muted)] mb-2">No hay planeaciones aún.</h3>
                <p className="text-sm opacity-60">Crea tu primera planeación utilizando el botón superior.</p>
            </div>
        );
    }

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {planeaciones.map((p) => (
                <div key={p.id} className="glass-panel p-5 hover:border-[var(--primary)] group relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onDelete(p.id)}
                            className="text-[var(--danger)] bg-red-950/30 hover:bg-red-900/50 p-2 rounded-full backdrop-blur-md transition-colors"
                            title="Eliminar Planeación"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                    </div>

                    <div className="mb-4 pr-10">
                        <h3 className="text-lg font-bold text-white mb-1 leading-tight">{p.titulo}</h3>
                        <span className="text-xs text-[var(--text-muted)]">
                            {new Date(p.fecha_creacion).toLocaleDateString('es-MX', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-800/50">
                            {p.fase}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-900/30 text-purple-300 border border-purple-800/50">
                            {p.grado}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-900/30 text-green-300 border border-green-800/50">
                            {p.lenguaje}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {p.actividades && (
                            <div>
                                <span className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Actividades</span>
                                <p className="text-sm line-clamp-2 mt-1 opacity-90">{p.actividades}</p>
                            </div>
                        )}
                        {p.evaluacion && (
                            <div>
                                <span className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Evaluación</span>
                                <p className="text-sm line-clamp-2 mt-1 opacity-90">{p.evaluacion}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
