'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
    return <>
        <div className="account-bar"><span>Espacio de <strong>{user.nombre}</strong></span>{logoutError && <span role="alert">{logoutError}</span>}<button type="button" disabled={leaving} onClick={logout}>{leaving ? 'Saliendo…' : 'Cerrar sesión'}</button></div>
        {children}
    </>;
}
