'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './acceso.module.css';

export default function AccesoPage() {
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ nombre: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const isRegister = mode === 'register';

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('error');
        if (code?.startsWith('google_')) setError(code === 'google_no_configurado' ? 'El acceso con Google aún necesita configuración.' : 'No fue posible iniciar sesión con Google. Inténtalo de nuevo.');
    }, []);

    async function submit(event) {
        event.preventDefault();
        setError(''); setLoading(true);
        try {
            const response = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No fue posible continuar.');
            router.replace('/'); router.refresh();
        } catch (cause) { setError(cause.message); }
        finally { setLoading(false); }
    }

    async function enterDemo() {
        setError(''); setLoading(true);
        try {
            const response = await fetch('/api/auth/demo', { method: 'POST' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No fue posible abrir la cuenta de prueba.');
            router.replace('/'); router.refresh();
        } catch (cause) { setError(cause.message); }
        finally { setLoading(false); }
    }

    return <main className={styles.page}>
        <div className={styles.shell}>
            <section className={styles.intro} aria-labelledby="access-title">
                <span className={styles.mark} aria-hidden="true">✳</span>
                <p className={styles.kicker}>GESTIÓN DEL AULA</p>
                <h1 id="access-title">Tu trabajo docente, en tu propio espacio.</h1>
                <p>Organiza proyectos de arte, planeaciones y programas analíticos. Cada cuenta conserva su trabajo por separado.</p>
                <div className={styles.sequence}><span>Proyecto de arte</span><b>→</b><span>Planeaciones</span><b>→</b><span>Seguimiento</span></div>
            </section>
            <section className={styles.formPanel} aria-label={isRegister ? 'Crear cuenta' : 'Iniciar sesión'}>
                <div className={styles.tabs} role="group" aria-label="Tipo de acceso">
                    <button type="button" aria-pressed={!isRegister} className={!isRegister ? styles.active : ''} onClick={() => { setMode('login'); setError(''); }}>Iniciar sesión</button>
                    <button type="button" aria-pressed={isRegister} className={isRegister ? styles.active : ''} onClick={() => { setMode('register'); setError(''); }}>Crear cuenta</button>
                </div>
                <h2>{isRegister ? 'Crea tu espacio' : 'Bienvenido de nuevo'}</h2>
                <p className={styles.helper}>{isRegister ? 'Tus nuevos proyectos serán visibles solo en tu cuenta.' : 'Continúa con tus proyectos y planeaciones.'}</p>
                {!isRegister && <>
                    <a className={styles.google} href="/api/auth/google"><span aria-hidden="true">G</span>Continuar con Google</a>
                    <button className={styles.demo} type="button" disabled={loading} onClick={enterDemo}>Entrar como usuario de prueba</button>
                    <div className={styles.divider}><span>o usa tu correo</span></div>
                </>}
                <form onSubmit={submit}>
                    {isRegister && <label>Nombre docente<input autoComplete="name" required minLength={2} maxLength={100} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} /></label>}
                    <label>Correo electrónico<input type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
                    <label>Contraseña<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 12 : undefined} maxLength={128} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
                    {isRegister && <p className={styles.hint}>Usa al menos 12 caracteres. Por ahora no hay recuperación automática de contraseña.</p>}
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <button className={styles.submit} disabled={loading} type="submit">{loading ? 'Un momento…' : isRegister ? 'Crear mi espacio' : 'Entrar a mi espacio'}</button>
                </form>
            </section>
        </div>
    </main>;
}
