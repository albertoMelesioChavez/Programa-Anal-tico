'use client';

import { createContext, Suspense, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppIcon from './AppIcon';
import { rememberDocument } from '@/lib/workspace-documents.mjs';

const TeacherContext = createContext(null);
export const useTeacher = () => useContext(TeacherContext);

function WorkspaceNavigation({ user }) {
    const pathname = usePathname();
    const search = useSearchParams();
    const type = search.get('tipo');
    useEffect(() => {
        const project = pathname.match(/^\/proyectos\/(\d+)/);
        const program = pathname === '/contenidos/artes' && search.get('programa');
        const plan = pathname === '/' && search.get('planeacion');
        try {
            if (project) rememberDocument(localStorage, user.id, 'project', project[1]);
            else if (program) rememberDocument(localStorage, user.id, 'program', program);
            else if (plan) rememberDocument(localStorage, user.id, 'plan', plan);
        } catch { /* Navegadores con almacenamiento deshabilitado conservan la navegación. */ }
    }, [pathname, search, user.id]);
    const items = [
        { label: 'Mi trabajo', icon: 'home', href: '/', active: pathname === '/' && !type && !search.has('planeacion') },
        { label: 'Programas', icon: 'file', href: '/?tipo=program', active: type === 'program' || pathname.includes('contenidos/artes') || pathname.includes('generador-programa') },
        { label: 'Proyectos', icon: 'folder', href: '/?tipo=project', active: type === 'project' || pathname.startsWith('/proyectos') },
        { label: 'Planeaciones', icon: 'calendar', href: '/?tipo=plan', active: type === 'plan' || search.has('planeacion') },
    ];
    return <nav className="app-navigation" aria-label="Navegación principal">{items.map(item => <Link key={item.label} href={item.href} aria-current={item.active ? 'page' : undefined}><span><AppIcon name={item.icon} /></span>{item.label}</Link>)}<Link className="reference-navigation" href="/contenidos/tablas"><span><AppIcon name="book" /></span>Consulta</Link></nav>;
}

export default function AuthGate({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const accessPage = pathname === '/acceso';

    useEffect(() => {
        let live = true;
        fetch('/api/auth/me', { cache: 'no-store' })
            .then(async response => response.ok ? (await response.json()).user : null)
            .then(account => {
                if (!live) return;
                setUser(account);
                setChecking(false);
                if (account && accessPage) router.replace('/');
                if (!account && !accessPage) router.replace('/acceso');
            })
            .catch(() => { if (live) { setChecking(false); if (!accessPage) router.replace('/acceso'); } });
        return () => { live = false; };
    }, [accessPage, router]);

    async function logout() {
        setLeaving(true); setLogoutError('');
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (!response.ok) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
            setUser(null); router.replace('/acceso'); router.refresh();
        } catch (error) { setLogoutError(error.message || 'No se pudo cerrar la sesión.'); }
        finally { setLeaving(false); }
    }

    if (checking && !accessPage) return <main className="auth-checking" role="status">Preparando tu espacio de trabajo…</main>;
    if (!accessPage && !user) return <main className="auth-checking" role="status">Abriendo acceso…</main>;
    if (accessPage) return children;
    return <TeacherContext.Provider value={user}>
        <a className="skip-navigation" href="#app-content">Ir al contenido</a>
        <header className="app-header">
            <Link href="/" className="app-brand"><span className="app-mark"><AppIcon name="book" size={25} /></span><span>Gestión del aula</span></Link>
            <div className="app-account"><span className="account-name">{user.nombre}</span><span className="account-avatar" aria-hidden="true">{user.nombre?.slice(0, 1).toUpperCase()}</span><button type="button" disabled={leaving} onClick={logout}>{leaving ? 'Saliendo…' : 'Cerrar sesión'}</button></div>
        </header>
        {logoutError && <p className="app-account-error" role="alert">{logoutError}</p>}
        <Suspense fallback={null}><WorkspaceNavigation user={user} /></Suspense>
        <div className="app-content" id="app-content" tabIndex={-1}>{children}</div>
    </TeacherContext.Provider>;
}
