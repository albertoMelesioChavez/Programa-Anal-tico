import { Suspense } from 'react';
import Workspace from '@/components/Workspace';

export default function Home() {
    return <Suspense fallback={<main className="auth-checking" role="status">Cargando tus documentos…</main>}><Workspace /></Suspense>;
}
