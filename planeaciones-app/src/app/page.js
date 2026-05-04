'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PlaneacionForm from '@/components/PlaneacionForm';
import PlaneacionList from '@/components/PlaneacionList';

export default function Home() {
    const [planeaciones, setPlaneaciones] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchPlaneaciones = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/planeaciones');
            const data = await res.json();
            setPlaneaciones(data.planeaciones || []);
        } catch (error) {
            console.error('Failed to fetch planeaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaneaciones();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Desea eliminar esta planeación?')) return;

        try {
            const res = await fetch(`/api/planeaciones/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchPlaneaciones();
            } else {
                alert('Error al eliminar');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleSaved = () => {
        setShowForm(false);
        fetchPlaneaciones();
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 items-center bg-[#0d1117] text-white">
            <header className="w-full flex flex-col gap-4 items-center text-center animate-fade-in pt-8 pb-4 border-b border-white/10">
                <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 max-w-4xl">
                    Programa Analítico de Artes
                </h1>
                <p className="text-gray-400 text-lg">
                    Fases 3, 4 y 5 • Versión 2025
                </p>
                <div className="flex flex-col items-center mt-2 mb-4">
                    <span className="text-sm font-semibold text-gray-300">Por José Alberto Melesio Chávez</span>
                    <span className="text-xs text-blue-400 opacity-80">alberto.perse@gmail.com</span>
                </div>
            </header>

            {!showForm && (
                <div className="w-full mb-10 animate-fade-in">
                    <Link href="/contenidos/artes" className="glass-panel flex flex-col md:flex-row items-center justify-between w-full p-6 md:p-8 hover:border-blue-500/50 transition-all group cursor-pointer text-left shadow-2xl relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 group-hover:opacity-30 transition-opacity"></div>
                        <div className="z-10 text-center md:text-left">
                            <h3 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-1">
                                📖 Editor Íntegro del Programa Analítico 2025
                            </h3>
                            <p className="text-gray-400 text-sm md:text-base">
                                Consulta y edita la información oficial del documento de Artes (Fases 3, 4 y 5).
                            </p>
                        </div>
                        <div className="z-10 mt-6 md:mt-0">
                            <span className="btn bg-white/5 border border-white/10 px-8 py-3 rounded-full text-white font-semibold group-hover:bg-blue-500 group-hover:border-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all">
                                Entrar al Editor →
                            </span>
                        </div>
                    </Link>
                </div>
            )}

            <div className="w-full flex justify-between items-center mb-4 md:mb-8 pb-4 border-b border-white/10">
                <div>
                    <h2 className="text-2xl font-semibold">Tus Planeaciones</h2>
                    <p className="text-gray-500 text-sm">Gestiona y crea tus proyectos escolares.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all"
                    >
                        + Nueva Planeación
                    </button>
                )}
            </div>

            <div className="w-full relative min-h-[500px]">
                {showForm ? (
                    <div className="absolute inset-0 z-10 animate-fade-in bg-[#0d1117]/95 backdrop-blur-sm -mx-4 md:-mx-8 px-4 md:px-8 pt-4 pb-20 overflow-y-auto">
                        <PlaneacionForm
                            onSaved={handleSaved}
                            onCancel={() => setShowForm(false)}
                        />
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <PlaneacionList
                                planeaciones={planeaciones}
                                onDelete={handleDelete}
                            />
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
