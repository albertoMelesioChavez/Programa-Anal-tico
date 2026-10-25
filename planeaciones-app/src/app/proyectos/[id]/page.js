'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { normalizeProjectConfig } from '@/lib/art-project-workflow';
import styles from './project-detail.module.css';
import ProjectDocument from '@/components/ProjectDocument';

export default function ProyectoDetallePage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [plans, setPlans] = useState([]);
    const [catalog, setCatalog] = useState({ estatales: [], pdas: [] });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState('');
    const [notice, setNotice] = useState('');

    const refresh = useCallback(async () => {
        const [projectResponse, planResponse] = await Promise.all([fetch(`/api/proyectos/${id}`), fetch(`/api/proyectos/${id}/planeaciones`)]);
        const [projectData, planData] = await Promise.all([projectResponse.json(), planResponse.json()]);
        if (!projectResponse.ok) throw new Error(projectData.error || 'No se encontró el proyecto.');
        setProject(projectData);
        setPlans(Array.isArray(planData) ? planData : []);
    }, [id]);

    useEffect(() => {
        if (!id) return;
        Promise.all([refresh(), Promise.all([fetch('/api/contenidos').then(r => r.json()), fetch('/api/catalogos').then(r => r.json())]).then(([contents, lists]) => setCatalog({ ...contents, lenguajes: lists.lenguajes || [] }))]).catch(error => setNotice(error.message)).finally(() => setLoading(false));
    }, [id, refresh]);

    const generate = async (groupId) => {
        setGenerating(groupId); setNotice('');
        try {
            const response = await fetch(`/api/proyectos/${id}/planeaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupo: groupId }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudieron crear las planeaciones.');
            await refresh();
            setNotice(`${data.count} planeaciones de ${groupId} creadas como borradores ${data.mode === 'ia-revisable' ? 'con apoyo de IA' : 'con la estructura local'}. Revísalas antes de aplicarlas.`);
        } catch (error) { setNotice(error.message); }
        finally { setGenerating(''); }
    };

    if (loading) return <main className={styles.loading}>Cargando proyecto…</main>;
    if (!project) return <main className={styles.loading}>{notice || 'No se encontró el proyecto.'}</main>;
    const config = normalizeProjectConfig(project.configuracion);
    const hasWorkflow = Number(project.configuracion?.version || 0) >= 2;
    return <div className={styles.shell}>
        <header className={styles.top}><Link href="/">← Mi espacio de trabajo</Link><div><Link className={styles.edit} href={`/proyectos/${id}/editar`}>Editar proyecto</Link><button type="button" onClick={() => window.print()}>Imprimir / PDF</button></div></header>
        <main className={styles.page}>
            {notice && <div role="status" className={styles.notice}>{notice}</div>}
            {!hasWorkflow && <div className={styles.notice}>Este proyecto se creó con el formato anterior. Puedes <Link href={`/proyectos/${id}/editar`}>completar el nuevo recorrido</Link> para generar planeaciones por grupo.</div>}
            <ProjectDocument project={project} catalog={catalog} standalone />
            <section className={styles.workspaceActions}><h2>Planeaciones por grupo</h2><p className={styles.hint}>Cada grupo conserva su propio producto, lenguaje artístico, calendario y borradores editables. Las fechas siguen siendo tentativas.</p><div className={styles.groups}>{config.grupos.map(group => { const groupPlans = plans.filter(plan => plan.grupo === group.id); return <article key={group.id}><div className={styles.groupHead}><span>{group.id}</span><strong>{group.producto || 'Producto por definir'}</strong></div><p>{group.fechas?.filter(Boolean).length || 0}/{config.ruta.length} fechas asignadas · {groupPlans.length}/{config.ruta.length} planeaciones</p>{groupPlans.length ? <div className={styles.planList}>{groupPlans.map(plan => <div key={plan.id}><span>Sesión {plan.numero_sesion} · {plan.fecha_clase || 'Sin fecha'}</span><Link href={`/?planeacion=${plan.id}&editar=1`}>Revisar y editar →</Link></div>)}</div> : <button type="button" disabled={generating === group.id || !hasWorkflow} onClick={() => generate(group.id)}>{generating === group.id ? 'Creando borradores…' : `Crear ${config.ruta.length} planeaciones de ${group.id}`}</button>}</article>; })}</div></section>
        </main>
    </div>;
}
