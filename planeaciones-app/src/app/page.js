'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PlaneacionForm from '@/components/PlaneacionForm';
import PlaneacionList from '@/components/PlaneacionList';
import { ArtInlineEditor, SchoolInlineEditor } from '@/components/InlineProjectEditors';

const modes = {
    escolares: {
        title: 'Proyectos escolares',
        eyebrow: 'CONTEXTO DE LA ESCUELA',
        description: 'Documentos base que agrupan los proyectos de arte y sus planeaciones.',
        icon: '🏫',
        color: '#0f766e',
        soft: '#ecfdf5'
    },
    arte: {
        title: 'Proyectos de arte',
        eyebrow: 'PROYECTOS DEL MAESTRO',
        description: 'Propuestas artísticas que viven dentro de un proyecto escolar.',
        icon: '🎨',
        color: '#7c3aed',
        soft: '#f5f3ff'
    },
    planeaciones: {
        title: 'Planeaciones',
        eyebrow: 'TRABAJO DIDÁCTICO',
        description: 'Secuencias didácticas vinculadas a un proyecto escolar y a uno de arte.',
        icon: '🗓️',
        color: '#2563eb',
        soft: '#eff6ff'
    }
};

function EmptyState({ icon, title, description, action }) {
    return (
        <div className="empty-state">
            <span>{icon}</span>
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    );
}

function FileDropAction({ label, tone, onFile, disabled = false, loading = false }) {
    const [isDragging, setIsDragging] = useState(false);

    const receiveFile = (file) => {
        if (file && !disabled && !loading) onFile(file);
    };

    return (
        <label
            className={`file-drop-action ${tone} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
            onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); receiveFile(event.dataTransfer.files?.[0]); }}
        >
            <input
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                disabled={disabled || loading}
                onChange={(event) => { receiveFile(event.target.files?.[0]); event.target.value = ''; }}
            />
            <span>{loading ? 'PROCESANDO…' : '⇧ SUBIR ARCHIVO'}</span>
            {!loading && <small>{label}</small>}
        </label>
    );
}

export default function Home() {
    const [planeaciones, setPlaneaciones] = useState([]);
    const [proyectosArte, setProyectosArte] = useState([]);
    const [proyectosEscolares, setProyectosEscolares] = useState([]);
    const [activeMode, setActiveMode] = useState('escolares');
    const [selectedNode, setSelectedNode] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [expandedEditor, setExpandedEditor] = useState(null);
    const [expandedPreview, setExpandedPreview] = useState(null);
    const [creationPanel, setCreationPanel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState('');
    const [uploadMessage, setUploadMessage] = useState('');
    const [artUploadSchoolId, setArtUploadSchoolId] = useState('');
    const [planningContext, setPlanningContext] = useState(null);
    const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

    const fetchWorkspace = async () => {
        setLoading(true);
        try {
            const [schoolRes, artRes, planningRes] = await Promise.all([
                fetch('/api/proyecto-escolar'),
                fetch('/api/proyectos'),
                fetch('/api/planeaciones')
            ]);
            const [schoolData, artData, planningData] = await Promise.all([
                schoolRes.json(), artRes.json(), planningRes.json()
            ]);
            setProyectosEscolares(schoolData.proyectos || []);
            setProyectosArte(Array.isArray(artData) ? artData : []);
            setPlaneaciones(Array.isArray(planningData) ? planningData : (planningData.planeaciones || []));
        } catch (error) {
            console.error('No se pudo cargar el espacio de trabajo:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspace();
    }, []);

    const tree = useMemo(() => proyectosEscolares.map((school) => ({
        ...school,
        proyectos: proyectosArte
            .filter((project) => String(project.proyecto_escolar_id) === String(school.id))
            .map((project) => ({
                ...project,
                planeaciones: planeaciones.filter((planning) => String(planning.proyecto_arte_id) === String(project.id))
            }))
    })), [proyectosEscolares, proyectosArte, planeaciones]);

    const selectedTreeContext = useMemo(() => {
        if (!selectedNode) return { icon: '⌂', label: 'Toda la organización', detail: 'Sin filtros' };

        if (selectedNode.type === 'school') {
            const school = proyectosEscolares.find((item) => String(item.id) === String(selectedNode.id));
            return { icon: '🏫', label: school?.titulo || 'Proyecto escolar', detail: 'Proyecto escolar' };
        }

        if (selectedNode.type === 'art') {
            const project = proyectosArte.find((item) => String(item.id) === String(selectedNode.id));
            const school = proyectosEscolares.find((item) => String(item.id) === String(project?.proyecto_escolar_id));
            return {
                icon: '🎨',
                label: project?.titulo || 'Proyecto de arte',
                detail: school?.titulo ? `Dentro de ${school.titulo}` : 'Proyecto de arte'
            };
        }

        const planning = planeaciones.find((item) => String(item.id) === String(selectedNode.id));
        const project = proyectosArte.find((item) => String(item.id) === String(planning?.proyecto_arte_id));
        return {
            icon: '🗓️',
            label: planning?.titulo || 'Planeación',
            detail: project?.titulo ? `Dentro de ${project.titulo}` : 'Planeación'
        };
    }, [selectedNode, proyectosEscolares, proyectosArte, planeaciones]);

    const visibleSchools = selectedNode?.type === 'school'
        ? proyectosEscolares.filter((item) => String(item.id) === String(selectedNode.id))
        : proyectosEscolares;

    const visibleArtProjects = selectedNode?.type === 'school'
        ? proyectosArte.filter((item) => String(item.proyecto_escolar_id) === String(selectedNode.id))
        : selectedNode?.type === 'art'
            ? proyectosArte.filter((item) => String(item.id) === String(selectedNode.id))
            : proyectosArte;

    const visiblePlaneaciones = selectedNode?.type === 'school'
        ? planeaciones.filter((item) => String(item.proyecto_escolar_id) === String(selectedNode.id))
        : selectedNode?.type === 'art'
            ? planeaciones.filter((item) => String(item.proyecto_arte_id) === String(selectedNode.id))
            : selectedNode?.type === 'planning'
                ? planeaciones.filter((item) => String(item.id) === String(selectedNode.id))
                : planeaciones;

    const selectMode = (mode) => {
        setActiveMode(mode);
        setSelectedNode(null);
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel(null);
        setMobileTreeOpen(false);
    };

    const selectTreeNode = (type, id) => {
        setSelectedNode({ type, id });
        setActiveMode(type === 'school' ? 'escolares' : type === 'art' ? 'arte' : 'planeaciones');
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel(null);
        setMobileTreeOpen(false);
    };

    const resetExplorer = () => {
        setSelectedNode(null);
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel(null);
        setMobileTreeOpen(false);
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/planeaciones/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (selectedNode?.type === 'planning' && String(selectedNode.id) === String(id)) setSelectedNode(null);
                fetchWorkspace();
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleEdit = (planning) => {
        setCreationPanel(null);
        setExpandedPreview({ type: 'planning', id: planning.id });
        setExpandedEditor((current) => current?.type === 'planning' && String(current.id) === String(planning.id) ? null : { type: 'planning', id: planning.id });
    };

    const handleSaved = () => {
        setShowForm(false);
        setPlanningContext(null);
        setActiveMode('planeaciones');
        setSelectedNode(null);
        fetchWorkspace();
    };

    const handleCancel = () => {
        setShowForm(false);
        setPlanningContext(null);
    };

    const toggleInlineEditor = (type, id) => {
        setCreationPanel(null);
        setExpandedPreview({ type, id });
        setExpandedEditor((current) => current?.type === type && String(current.id) === String(id) ? null : { type, id });
    };

    const handleInlineSaved = async () => {
        await fetchWorkspace();
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel(null);
    };

    const toggleCreationPanel = (type) => {
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel((current) => current === type ? null : type);
    };

    const createArtProjectFromSchool = (schoolId) => {
        setArtUploadSchoolId(String(schoolId));
        setSelectedNode({ type: 'school', id: schoolId });
        setActiveMode('arte');
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel('art');
        setMobileTreeOpen(false);
    };

    const createPlanningFromArtProject = (project) => {
        setPlanningContext({
            proyecto_escolar_id: String(project.proyecto_escolar_id),
            proyecto_arte_id: String(project.id)
        });
        setSelectedNode({ type: 'art', id: project.id });
        setActiveMode('planeaciones');
        setExpandedEditor(null);
        setExpandedPreview(null);
        setCreationPanel(null);
        setShowForm(true);
        setMobileTreeOpen(false);
    };

    const togglePreview = (type, id) => {
        if (expandedEditor?.type === type && String(expandedEditor.id) === String(id)) return;
        setCreationPanel(null);
        setExpandedPreview((current) => current?.type === type && String(current.id) === String(id) ? null : { type, id });
    };

    const inferredArtSchoolId = selectedNode?.type === 'school'
        ? String(selectedNode.id)
        : selectedNode?.type === 'art'
            ? String(proyectosArte.find((project) => String(project.id) === String(selectedNode.id))?.proyecto_escolar_id || '')
            : proyectosEscolares.length === 1 ? String(proyectosEscolares[0].id) : '';
    const selectedArtSchoolId = artUploadSchoolId || inferredArtSchoolId;

    const uploadSchoolFile = async (file) => {
        setUploading('school');
        setUploadMessage('Procesando el proyecto escolar…');
        try {
            const body = new FormData();
            body.append('archivo', file);
            const res = await fetch('/api/proyecto-escolar', { method: 'POST', body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo.');
            setSelectedNode({ type: 'school', id: data.proyecto.id });
            setUploadMessage(`Proyecto escolar “${data.proyecto.titulo}” creado desde el archivo.`);
            await fetchWorkspace();
        } catch (error) {
            setUploadMessage(error.message);
        } finally {
            setUploading('');
        }
    };

    const uploadArtFile = async (file) => {
        if (!selectedArtSchoolId) {
            setUploadMessage('Selecciona el proyecto escolar que contendrá este proyecto de arte.');
            return;
        }
        setUploading('art');
        setUploadMessage('Procesando el proyecto de arte…');
        try {
            const body = new FormData();
            body.append('archivo', file);
            body.append('proyecto_escolar_id', selectedArtSchoolId);
            const res = await fetch('/api/proyectos', { method: 'POST', body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo.');
            setSelectedNode({ type: 'art', id: data.id });
            setUploadMessage('Proyecto de arte creado desde el archivo.');
            await fetchWorkspace();
        } catch (error) {
            setUploadMessage(error.message);
        } finally {
            setUploading('');
        }
    };

    const selectedMode = modes[activeMode];

        return (
        <main className="home-shell">
            <div className="background-glow glow-left" />
            <div className="background-glow glow-right" />

            <div className={showForm ? 'page-frame form-open' : 'page-frame'}>
                {!showForm && (
                    <>
                        <header className="home-header">
                            <div className="workspace-hero">
                                <h1>Gestión del aula</h1>
                            </div>
                            <div className="top-navigation">
                                <nav className="reference-nav">
                                    <Link href="/contenidos/artes" className="top-nav-link">📘 Programa Analítico</Link>
                                    <Link href="/plananalitico/artes" className="top-nav-link">📋 Plan Analítico</Link>
                                </nav>
                                <div className="nem-badge">NEM 2025 • Sinaloa</div>
                                <div className="ai-mode-badge">✦ IA HÍBRIDA ACTIVA</div>
                            </div>
                            <div className="brand-row">
                                <div>
                                    <p>ESPACIO DE TRABAJO</p>
                                </div>
                                <div className="hierarchy-hint">
                                    <span>🏫 Escuela</span><b>›</b><span>🎨 Arte</span><b>›</b><span>🗓️ Planeación</span>
                                </div>
                            </div>
                        </header>

                        <section className="mode-switcher" aria-label="Cambiar funcionalidad">
                            {Object.entries(modes).map(([key, mode]) => (
                                <button
                                    key={key}
                                    className={`mode-button mode-${key} ${activeMode === key ? 'active' : ''}`}
                                    onClick={() => selectMode(key)}
                                >
                                    <span className="mode-icon">{mode.icon}</span>
                                    <span><strong>{mode.title}</strong><small>{mode.description}</small></span>
                                    <span className="mode-count">{key === 'escolares' ? proyectosEscolares.length : key === 'arte' ? proyectosArte.length : planeaciones.length}</span>
                                </button>
                            ))}
                        </section>

                        <section className="finder-layout">
                            <div className="mobile-finder-toolbar">
                                <button
                                    className="mobile-finder-open"
                                    onClick={() => setMobileTreeOpen(true)}
                                    aria-expanded={mobileTreeOpen}
                                    aria-controls="workspace-tree"
                                >
                                    <span className="mobile-context-icon">{selectedTreeContext.icon}</span>
                                    <span className="mobile-context-copy">
                                        <small>EXPLORADOR</small>
                                        <strong>{selectedTreeContext.label}</strong>
                                        <em>{selectedTreeContext.detail}</em>
                                    </span>
                                    <span className="mobile-open-cue">ÁRBOL ›</span>
                                </button>
                                {selectedNode && <button className="mobile-show-all" onClick={resetExplorer}>VER TODO</button>}
                            </div>

                            {mobileTreeOpen && <button className="mobile-tree-backdrop" onClick={() => setMobileTreeOpen(false)} aria-label="Cerrar explorador" />}

                            <aside id="workspace-tree" className={`finder-sidebar ${mobileTreeOpen ? 'mobile-open' : ''}`}>
                                <div className="finder-title">
                                    <div><span>EXPLORADOR</span><strong>Mi organización</strong></div>
                                    <div className="finder-title-actions">
                                        <button onClick={resetExplorer} title="Mostrar todo" aria-label="Mostrar toda la organización">⌂</button>
                                        <button className="mobile-tree-close" onClick={() => setMobileTreeOpen(false)} aria-label="Cerrar explorador">×</button>
                                    </div>
                                </div>

                                <div className="tree-list">
                                    {tree.length === 0 && <p className="tree-empty">Agrega un proyecto escolar para comenzar a construir el árbol.</p>}
                                    {tree.map((school) => (
                                        <div className="tree-school" key={school.id}>
                                            <div className="tree-node-row">
                                                <button className={`tree-node school-node ${selectedNode?.type === 'school' && String(selectedNode.id) === String(school.id) ? 'selected' : ''}`} onClick={() => selectTreeNode('school', school.id)}>
                                                    <span>🏫</span><span className="tree-label"><strong>{school.titulo}</strong><small>{school.proyectos.length} proyecto{school.proyectos.length === 1 ? '' : 's'} de arte</small></span>
                                                </button>
                                                <button className="tree-quick-action school-quick-action" onClick={() => createArtProjectFromSchool(school.id)} title={`Crear proyecto de arte en ${school.titulo}`} aria-label={`Crear proyecto de arte en ${school.titulo}`}>
                                                    <span aria-hidden="true">＋</span><span className="tree-quick-action-label">Arte</span>
                                                </button>
                                            </div>
                                            <div className="tree-children">
                                                {school.proyectos.map((project) => (
                                                    <div className="tree-project" key={project.id}>
                                                        <div className="tree-node-row">
                                                            <button className={`tree-node art-node ${selectedNode?.type === 'art' && String(selectedNode.id) === String(project.id) ? 'selected' : ''}`} onClick={() => selectTreeNode('art', project.id)}>
                                                                <span>🎨</span><span className="tree-label"><strong>{project.titulo}</strong><small>{project.planeaciones.length} planeación{project.planeaciones.length === 1 ? '' : 'es'}</small></span>
                                                            </button>
                                                            <button className="tree-quick-action planning-quick-action" onClick={() => createPlanningFromArtProject(project)} title={`Crear planeación para ${project.titulo}`} aria-label={`Crear planeación para ${project.titulo}`}>
                                                                <span aria-hidden="true">＋</span><span className="tree-quick-action-label">Plan</span>
                                                            </button>
                                                        </div>
                                                        <div className="tree-children planning-children">
                                                            {project.planeaciones.map((planning) => (
                                                                <button key={planning.id} className={`tree-node planning-node ${selectedNode?.type === 'planning' && String(selectedNode.id) === String(planning.id) ? 'selected' : ''}`} onClick={() => selectTreeNode('planning', planning.id)}>
                                                                    <span>🗓️</span><span className="tree-label"><strong>{planning.titulo}</strong><small>{planning.grado_nombre || `Grado ${planning.grado_id}`}</small></span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </aside>

                            <section className="finder-content">
                                <div className="content-header" style={{ '--mode-color': selectedMode.color, '--mode-soft': selectedMode.soft }}>
                                    <div className="content-heading">
                                        <span className="content-icon">{selectedMode.icon}</span>
                                        <div>
                                            <p>{selectedMode.eyebrow}</p>
                                            <h2>{selectedMode.title}</h2>
                                            <small>{selectedNode ? 'Mostrando la selección del explorador.' : selectedMode.description}</small>
                                        </div>
                                    </div>
                                    {activeMode === 'escolares' && (
                                        <div className="module-actions">
                                            <button className="primary-action school-action" onClick={() => toggleCreationPanel('school')}>{creationPanel === 'school' ? 'CERRAR CREACIÓN ↑' : '+ CREAR PROYECTO'}</button>
                                            <FileDropAction tone="school" label="PDF, DOCX, TXT o MD · clic o arrastra" onFile={uploadSchoolFile} loading={uploading === 'school'} />
                                        </div>
                                    )}
                                    {activeMode === 'arte' && (
                                        <div className="module-actions art-module-actions">
                                            <button className="primary-action art-action" onClick={() => toggleCreationPanel('art')} disabled={proyectosEscolares.length === 0}>{creationPanel === 'art' ? 'CERRAR CREACIÓN ↑' : '+ CREAR PROYECTO'}</button>
                                            <FileDropAction tone="art" label="PDF, DOCX, TXT o MD · clic o arrastra" onFile={uploadArtFile} disabled={proyectosEscolares.length === 0} loading={uploading === 'art'} />
                                            {proyectosEscolares.length > 1 && (
                                                <select className="upload-parent-select" value={selectedArtSchoolId} onChange={(event) => setArtUploadSchoolId(event.target.value)} aria-label="Proyecto escolar padre">
                                                    <option value="">Selecciona proyecto escolar</option>
                                                    {proyectosEscolares.map((school) => <option key={school.id} value={school.id}>Dentro de: {school.titulo}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    {activeMode === 'planeaciones' && <button onClick={() => setShowForm(true)} className="primary-action planning-action">+ NUEVA PLANEACIÓN</button>}
                                </div>

                                {uploadMessage && <p className={`upload-message ${uploadMessage.includes('creado') ? 'success' : uploading ? '' : 'error'}`}>{uploadMessage}</p>}

                                <div className="content-body">
                                    {creationPanel === 'school' && activeMode === 'escolares' && (
                                        <div className="create-project-slot">
                                            <SchoolInlineEditor project={{}} onSaved={handleInlineSaved} onCancel={() => setCreationPanel(null)} />
                                        </div>
                                    )}
                                    {creationPanel === 'art' && activeMode === 'arte' && (
                                        <div className="create-project-slot">
                                            <ArtInlineEditor project={{ proyecto_escolar_id: selectedArtSchoolId }} schoolProjects={proyectosEscolares} onSaved={handleInlineSaved} onCancel={() => setCreationPanel(null)} />
                                        </div>
                                    )}
                                    {loading ? (
                                        <div className="loading-area"><div className="loader-blue" /></div>
                                    ) : activeMode === 'escolares' ? (
                                        visibleSchools.length === 0 ? (
                                            <EmptyState icon="🏫" title="Sin proyectos escolares" description="Crea el contexto desde cero o arrastra aquí el archivo que ya elaboró la escuela." action={<div className="empty-school-actions"><button className="empty-action" onClick={() => toggleCreationPanel('school')}>Crear proyecto</button><FileDropAction tone="school" label="Subir archivo" onFile={uploadSchoolFile} loading={uploading === 'school'} /></div>} />
                                        ) : (
                                            <div className="item-list">
                                                {visibleSchools.map((school) => {
                                                    const artChildren = proyectosArte.filter((project) => String(project.proyecto_escolar_id) === String(school.id));
                                                    const planningChildren = planeaciones.filter((planning) => String(planning.proyecto_escolar_id) === String(school.id));
                                                    const isEditing = expandedEditor?.type === 'school' && String(expandedEditor.id) === String(school.id);
                                                    const isExpanded = isEditing || (expandedPreview?.type === 'school' && String(expandedPreview.id) === String(school.id));
                                                    return (
                                                        <article className={`finder-item school-item ${isExpanded ? 'expanded' : ''} ${isEditing ? 'editing' : ''}`} key={school.id} onClick={() => togglePreview('school', school.id)}>
                                                            <div className="item-symbol">🏫</div>
                                                            <div className="item-main">
                                                                <h3>{school.titulo}</h3>
                                                                {!isExpanded && <div className="compact-summary"><span>🎨 {artChildren.length}</span><span>🗓️ {planningChildren.length}</span></div>}
                                                                {isExpanded && <>
                                                                    <span className="parent-placeholder root">PROYECTO ESCOLAR · CONTEXTO PRINCIPAL</span>
                                                                    <p>{school.nombre_archivo ? `Documento: ${school.nombre_archivo}` : 'Contexto escrito directamente en el sistema'}</p>
                                                                    <div className="child-summary"><span>🎨 {artChildren.length} proyectos de arte</span><span>🗓️ {planningChildren.length} planeaciones</span></div>
                                                                </>}
                                                            </div>
                                                            <button className="open-link inline-edit-button" onClick={(event) => { event.stopPropagation(); toggleInlineEditor('school', school.id); }}>{isEditing ? 'CERRAR ↑' : 'EDITAR ✎'}</button>
                                                            {isEditing && <div className="inline-editor-slot" onClick={(event) => event.stopPropagation()}><SchoolInlineEditor project={school} onSaved={handleInlineSaved} onCancel={() => setExpandedEditor(null)} /></div>}
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : activeMode === 'arte' ? (
                                        visibleArtProjects.length === 0 ? (
                                            <EmptyState icon="🎨" title="Sin proyectos de arte" description={proyectosEscolares.length === 0 ? 'Primero crea o sube un proyecto escolar para establecer el contexto.' : selectedNode?.type === 'school' ? 'Este proyecto escolar todavía no contiene proyectos de arte. Puedes crearlo o subirlo aquí.' : 'Crea o sube un proyecto artístico dentro de un proyecto escolar.'} action={<div className="empty-school-actions"><button className="empty-action purple" onClick={() => toggleCreationPanel('art')} disabled={proyectosEscolares.length === 0}>Crear proyecto</button><FileDropAction tone="art" label="Subir archivo" onFile={uploadArtFile} disabled={!selectedArtSchoolId} loading={uploading === 'art'} /></div>} />
                                        ) : (
                                            <div className="item-grid">
                                                {visibleArtProjects.map((project) => {
                                                    const parent = proyectosEscolares.find((school) => String(school.id) === String(project.proyecto_escolar_id));
                                                    const children = planeaciones.filter((planning) => String(planning.proyecto_arte_id) === String(project.id));
                                                    const isEditing = expandedEditor?.type === 'art' && String(expandedEditor.id) === String(project.id);
                                                    const isExpanded = isEditing || (expandedPreview?.type === 'art' && String(expandedPreview.id) === String(project.id));
                                                    return (
                                                        <article className={`finder-item art-item ${isExpanded ? 'expanded' : ''} ${isEditing ? 'editing' : ''}`} key={project.id} onClick={() => togglePreview('art', project.id)}>
                                                            <div className="item-main">
                                                                <div className="art-title-row"><span>🎨</span><h3>{project.titulo}</h3></div>
                                                                {!isExpanded && <div className="compact-summary"><span>🗓️ {children.length}</span></div>}
                                                                {isExpanded && <>
                                                                    <span className="parent-placeholder">🏫 DENTRO DE: {parent?.titulo || 'Sin proyecto escolar asignado'}</span>
                                                                    <p>{project.nombre_archivo ? `Documento: ${project.nombre_archivo}` : project.tematica || project.introduccion || 'Proyecto artístico sin descripción.'}</p>
                                                                    <div className="child-summary"><span>🗓️ {children.length} planeación{children.length === 1 ? '' : 'es'} dentro</span></div>
                                                                </>}
                                                            </div>
                                                            <button className="open-link purple inline-edit-button" onClick={(event) => { event.stopPropagation(); toggleInlineEditor('art', project.id); }}>{isEditing ? 'CERRAR ↑' : 'EDITAR ✎'}</button>
                                                            {isEditing && <div className="inline-editor-slot" onClick={(event) => event.stopPropagation()}><ArtInlineEditor project={project} schoolProjects={proyectosEscolares} onSaved={handleInlineSaved} onCancel={() => setExpandedEditor(null)} /></div>}
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : visiblePlaneaciones.length === 0 ? (
                                        <EmptyState icon="🗓️" title="Sin planeaciones" description={selectedNode ? 'La selección actual todavía no contiene planeaciones.' : 'Crea la primera planeación y vincúlala a un proyecto de arte.'} action={<button onClick={() => setShowForm(true)} className="empty-action blue">Crear planeación</button>} />
                                    ) : (
                                        <PlaneacionList planeaciones={visiblePlaneaciones} onDelete={handleDelete} onEdit={handleEdit} editingId={expandedEditor?.type === 'planning' ? expandedEditor.id : null} expandedId={expandedPreview?.type === 'planning' ? expandedPreview.id : null} onTogglePreview={(planning) => togglePreview('planning', planning.id)} onSaved={handleInlineSaved} onCancel={() => setExpandedEditor(null)} />
                                    )}
                                </div>
                            </section>
                        </section>
                    </>
                )}

                {showForm && (
                    <section className="planning-form-shell">
                        <PlaneacionForm initialData={planningContext} onSaved={handleSaved} onCancel={handleCancel} />
                    </section>
                )}
            </div>

            {!showForm && <footer className="app-footer">@abetochavez</footer>}

            <style jsx global>{`
                * { box-sizing: border-box; }
                .home-shell { min-height: 100vh; display: flex; flex-direction: column; background: #f8fafc; color: #0f172a; font-family: "Outfit", sans-serif; position: relative; overflow-x: clip; }
                .background-glow { position: fixed; border-radius: 999px; filter: blur(10px); pointer-events: none; z-index: 0; }
                .glow-left { width: 420px; height: 420px; left: -180px; top: -180px; background: rgba(37,99,235,.07); }
                .glow-right { width: 520px; height: 520px; right: -240px; bottom: -230px; background: rgba(124,58,237,.07); }
                .page-frame { width: min(1500px, 100%); flex: 1; margin: 0 auto; padding: 26px 42px 70px; position: relative; z-index: 1; }
                .page-frame.form-open { width: 100%; padding: 0; height: 100vh; overflow: hidden; }
                .home-header { margin-bottom: 24px; }
                .workspace-hero { margin-bottom: 14px; }
                .workspace-hero h1 { margin: 0; font-size: clamp(32px, 5vw, 56px); letter-spacing: -2.5px; line-height: .95; }
                .top-navigation { width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
                .reference-nav { display: flex; gap: 10px; justify-self: start; }
                .top-nav-link { color: #475569; font-size: 11px; font-weight: 900; text-decoration: none; padding: 9px 12px; border: 1px solid #e2e8f0; background: rgba(255,255,255,.8); border-radius: 11px; white-space: nowrap; }
                .top-nav-link:hover { border-color: #2563eb; color: #2563eb; }
                .nem-badge { padding: 8px 18px; border-radius: 100px; background: #eff6ff; border: 1px solid #dbeafe; font-size: 10px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 1.8px; }
                .ai-mode-badge { justify-self: end; padding: 9px 12px; border: 1px solid #d1fae5; background: #ecfdf5; color: #047857; border-radius: 11px; font-size: 10px; font-weight: 900; letter-spacing: .5px; white-space: nowrap; }
                .brand-row { margin-top: 22px; display: flex; justify-content: space-between; align-items: center; gap: 24px; }
                .brand-row p { margin: 0 0 8px; color: #2563eb; font-size: 10px; font-weight: 900; letter-spacing: 2px; }
                .hierarchy-hint { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border: 1px solid #e2e8f0; background: #fff; border-radius: 14px; color: #475569; font-size: 11px; font-weight: 800; }
                .hierarchy-hint b { color: #cbd5e1; font-size: 18px; }
                .mode-switcher { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
                .mode-button { min-width: 0; min-height: 86px; padding: 16px 18px; border: 1px solid transparent; border-radius: 18px; display: grid; grid-template-columns: auto 1fr auto; gap: 13px; align-items: center; text-align: left; cursor: pointer; color: #fff; font-family: inherit; opacity: .82; transition: transform .2s ease, opacity .2s ease, box-shadow .2s ease; }
                .mode-button:hover, .mode-button.active { opacity: 1; transform: translateY(-3px); }
                .mode-button.active { box-shadow: 0 14px 30px rgba(15,23,42,.16); outline: 3px solid rgba(255,255,255,.75); outline-offset: -6px; }
                .mode-escolares { background: linear-gradient(135deg, #0f766e, #14b8a6); }
                .mode-arte { background: linear-gradient(135deg, #6d28d9, #8b5cf6); }
                .mode-planeaciones { background: linear-gradient(135deg, #1d4ed8, #0f766e); }
                .mode-icon { font-size: 26px; }
                .mode-button strong { display: block; font-size: 15px; margin-bottom: 3px; }
                .mode-button small { display: block; color: rgba(255,255,255,.78); font-size: 10px; line-height: 1.3; }
                .mode-count { min-width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; background: rgba(255,255,255,.18); font-size: 12px; font-weight: 900; }
                .module-actions { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
                .file-drop-action { min-height: 42px; max-width: 185px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px 12px; border: 2px dashed currentColor; border-radius: 11px; background: rgba(255,255,255,.72); cursor: pointer; text-align: center; transition: background .18s, transform .18s, border-style .18s; }
                .file-drop-action:hover, .file-drop-action.dragging { transform: translateY(-1px); background: #fff; border-style: solid; }
                .file-drop-action input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
                .file-drop-action span { font-size: 10px; font-weight: 900; letter-spacing: .4px; white-space: nowrap; }
                .file-drop-action small { display: block; margin-top: 2px; font-size: 7px; font-weight: 700; opacity: .78; white-space: nowrap; }
                .file-drop-action.school { color: #0f766e; background: #f0fdfa; }
                .file-drop-action.art { color: #7c3aed; background: #f5f3ff; }
                .file-drop-action.disabled { color: #94a3b8; background: #f8fafc; border-color: #cbd5e1; cursor: not-allowed; opacity: .78; }
                .upload-parent-select { max-width: 185px; padding: 8px 10px; border: 1px solid #ddd6fe; border-radius: 10px; background: #fff; color: #6d28d9; font-size: 10px; font-weight: 800; outline: none; }
                .upload-message { margin: 0 24px; padding: 9px 12px; border-radius: 10px; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; }
                .upload-message.success { background: #ecfdf5; color: #047857; }
                .upload-message.error { background: #fef2f2; color: #b91c1c; }
                .empty-school-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
                .empty-school-actions .file-drop-action { min-width: 132px; min-height: 40px; }
                .empty-school-actions .file-drop-action small { display: none; }
                .finder-layout { display: grid; grid-template-columns: minmax(260px, 310px) minmax(0, 1fr); min-height: 620px; border: 1px solid #dbe3ed; border-radius: 24px; overflow: hidden; background: #fff; box-shadow: 0 20px 60px rgba(15,23,42,.06); }
                .mobile-finder-toolbar, .mobile-tree-backdrop { display: none; }
                .finder-sidebar { background: #f1f5f9; border-right: 1px solid #dbe3ed; padding: 16px 12px; overflow-y: auto; max-height: 780px; }
                .finder-title { display: flex; justify-content: space-between; align-items: center; padding: 4px 7px 15px; border-bottom: 1px solid #dbe3ed; margin-bottom: 10px; }
                .finder-title span { display: block; color: #94a3b8; font-size: 8px; font-weight: 900; letter-spacing: 1.5px; }
                .finder-title strong { display: block; margin-top: 3px; font-size: 14px; }
                .finder-title button { border: 1px solid #dbe3ed; background: #fff; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; }
                .finder-title-actions { display: flex; gap: 6px; }
                .mobile-tree-close { display: none; }
                .tree-empty { padding: 18px 10px; color: #64748b; font-size: 12px; line-height: 1.5; }
                .tree-node-row { display: flex; align-items: center; gap: 4px; }
                .tree-node { width: 100%; display: flex; align-items: flex-start; gap: 8px; padding: 9px 8px; border: 1px solid transparent; background: transparent; border-radius: 9px; text-align: left; cursor: pointer; font-family: inherit; color: #334155; }
                .tree-node-row .tree-node { min-width: 0; flex: 1; }
                .tree-node:hover { background: rgba(255,255,255,.72); }
                .tree-node.selected { background: #fff; border-color: #bfdbfe; box-shadow: 0 3px 10px rgba(15,23,42,.06); }
                .tree-quick-action { min-width: 38px; height: 30px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; gap: 1px; border: 1px solid; border-radius: 8px; background: #fff; font-family: inherit; font-size: 11px; font-weight: 900; line-height: 1; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
                .tree-quick-action-label { font-size: 8px; letter-spacing: -.1px; }
                .school-quick-action { border-color: #99f6e4; color: #0f766e; background: #f0fdfa; }
                .planning-quick-action { border-color: #bfdbfe; color: #2563eb; background: #eff6ff; }
                .tree-quick-action:hover { transform: translateY(-1px); background: #fff; box-shadow: 0 4px 10px rgba(15,23,42,.1); }
                .tree-quick-action:focus-visible { outline: 3px solid rgba(37,99,235,.3); outline-offset: 2px; }
                .tree-label { min-width: 0; }
                .tree-label strong { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; line-height: 1.25; }
                .tree-label small { display: block; color: #94a3b8; font-size: 9px; margin-top: 3px; }
                .tree-children { margin-left: 17px; padding-left: 8px; border-left: 1px solid #cbd5e1; }
                .planning-children { margin-left: 18px; }
                .planning-node { padding-top: 7px; padding-bottom: 7px; }
                .finder-content { min-width: 0; background: #fff; }
                .content-header { min-height: 102px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(90deg, var(--mode-soft), #fff 55%); }
                .content-heading { display: flex; align-items: center; gap: 14px; min-width: 0; }
                .content-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: #fff; font-size: 24px; box-shadow: 0 6px 16px rgba(15,23,42,.06); }
                .content-heading p { margin: 0 0 3px; color: var(--mode-color); font-size: 8px; font-weight: 900; letter-spacing: 1.5px; }
                .content-heading h2 { margin: 0; font-size: 24px; letter-spacing: -.7px; }
                .content-heading small { display: block; color: #64748b; margin-top: 3px; font-size: 11px; }
                .primary-action, .empty-action { display: inline-flex; align-items: center; justify-content: center; padding: 12px 16px; border: none; border-radius: 11px; color: #fff; font-size: 10px; font-weight: 900; text-decoration: none; cursor: pointer; white-space: nowrap; font-family: inherit; }
                .primary-action:disabled, .empty-action:disabled { cursor: not-allowed; opacity: .5; }
                .school-action { background: #0f766e; }
                .art-action, .empty-action.purple { background: #7c3aed; }
                .planning-action, .empty-action.blue { background: #2563eb; }
                .content-body { padding: 22px; max-height: 678px; overflow-y: auto; }
                .create-project-slot { margin-bottom: 16px; }
                .create-project-slot .inline-editor { margin-top: 0; box-shadow: 0 14px 30px rgba(15,23,42,.07); }
                .loading-area { min-height: 300px; display: grid; place-items: center; }
                .loader-blue { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .item-list, .item-grid { display: grid; gap: 14px; }
                .item-grid { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
                .finder-item { border: 1px solid #e2e8f0; border-radius: 17px; background: #fff; padding: 18px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: transform .2s, box-shadow .2s, border-color .2s; }
                .finder-item:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(15,23,42,.07); }
                .finder-item.editing { border-color: #bfdbfe; box-shadow: 0 14px 30px rgba(15,23,42,.08); }
                .school-item.editing { flex-wrap: wrap; }
                .item-grid .finder-item.editing { grid-column: 1 / -1; }
                .finder-item.editing:hover { transform: none; }
                .finder-item.editing { cursor: default; }
                .art-item { align-items: stretch; flex-direction: column; }
                .art-item .open-link { align-self: flex-end; }
                .inline-editor-slot { width: 100%; flex-basis: 100%; }
                .item-symbol { width: 48px; height: 48px; border-radius: 14px; background: #ecfdf5; display: grid; place-items: center; font-size: 24px; flex: 0 0 auto; }
                .item-main { min-width: 0; flex: 1; }
                .item-main h3 { margin: 7px 0 5px; font-size: 17px; }
                .item-main p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.5; }
                .compact-summary { display: flex; gap: 6px; margin-top: 7px; }
                .compact-summary span { padding: 4px 7px; border-radius: 7px; background: #f8fafc; color: #64748b; font-size: 9px; font-weight: 800; }
                .card-expand-cue { align-self: center; color: #94a3b8; font-size: 25px; font-weight: 400; line-height: 1; }
                .parent-placeholder { display: inline-block; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 5px 8px; border-radius: 7px; background: #ecfdf5; color: #0f766e; font-size: 8px; font-weight: 900; letter-spacing: .5px; }
                .parent-placeholder.root { background: #f1f5f9; color: #64748b; }
                .art-title-row { display: flex; align-items: center; gap: 8px; }
                .art-title-row h3 { margin-top: 11px; }
                .child-summary { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
                .child-summary span { padding: 5px 8px; border-radius: 7px; background: #f8fafc; color: #475569; font-size: 9px; font-weight: 800; }
                .open-link { color: #0f766e; font-size: 10px; font-weight: 900; text-decoration: none; white-space: nowrap; }
                .open-link.purple { color: #7c3aed; }
                .inline-edit-button { border: none; background: transparent; padding: 8px 0; cursor: pointer; font-family: inherit; }
                .empty-state { min-height: 350px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; }
                .empty-state > span { font-size: 52px; opacity: .35; }
                .empty-state h3 { margin: 16px 0 7px; font-size: 20px; }
                .empty-state p { max-width: 390px; margin: 0 0 20px; color: #64748b; font-size: 12px; line-height: 1.5; }
                .empty-action { background: #0f766e; }
                .planning-form-shell { height: 100vh; overflow: auto; background: #fff; }
                .app-footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; min-height: 28px; margin-top: auto; padding: 7px 16px; background: #09090b; color: rgba(255,255,255,.7); font-size: 9px; font-weight: 800; letter-spacing: 1.2px; }
                .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 3000; display: grid; place-items: center; padding: 20px; backdrop-filter: blur(8px); }
                .config-modal { width: min(500px, 100%); background: #fff; border-radius: 26px; padding: 34px; box-shadow: 0 40px 80px rgba(0,0,0,.2); }
                .config-modal h3 { margin: 0 0 7px; font-size: 23px; }
                .config-modal p { color: #64748b; font-size: 13px; line-height: 1.6; }
                .config-modal input { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 8px 0 14px; }
                .config-modal > div { display: flex; gap: 10px; }
                .config-modal button { flex: 1; padding: 13px; border: none; border-radius: 11px; background: #f1f5f9; font-weight: 900; cursor: pointer; }
                .config-modal .save-config { background: #2563eb; color: #fff; }
                @media (max-width: 980px) {
                    .page-frame { padding: 22px; }
                    .workspace-hero h1 { font-size: 40px; }
                    .mode-switcher { grid-template-columns: 1fr; }
                    .mode-button { min-height: 70px; }
                    .finder-layout { grid-template-columns: 250px minmax(0, 1fr); }
                    .hierarchy-hint { display: none; }
                }
                @media (max-width: 900px) {
                    .page-frame { padding: 16px 14px 45px; }
                    .home-header { margin-bottom: 12px; }
                    .brand-row { margin-top: 14px; }
                    .brand-row p { margin-bottom: 0; }
                    .mode-switcher {
                        position: sticky;
                        top: 8px;
                        z-index: 40;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 5px;
                        margin-bottom: 12px;
                        padding: 5px;
                        border: 1px solid rgba(226,232,240,.9);
                        border-radius: 18px;
                        background: rgba(255,255,255,.9);
                        box-shadow: 0 10px 28px rgba(15,23,42,.1);
                        backdrop-filter: blur(14px);
                    }
                    .mode-button {
                        min-height: 58px;
                        padding: 8px 7px;
                        grid-template-columns: 1fr auto;
                        grid-template-rows: auto auto;
                        gap: 2px 4px;
                        border-radius: 13px;
                        text-align: center;
                    }
                    .mode-button:hover, .mode-button.active { transform: none; }
                    .mode-button.active { outline-width: 2px; outline-offset: -4px; box-shadow: 0 6px 16px rgba(15,23,42,.16); }
                    .mode-icon { grid-row: 1; grid-column: 1; justify-self: center; font-size: 19px; }
                    .mode-button > span:nth-child(2) { grid-row: 2; grid-column: 1 / -1; min-width: 0; }
                    .mode-button strong { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; line-height: 1.15; }
                    .mode-button small { display: none; }
                    .mode-count { grid-row: 1; grid-column: 2; min-width: 21px; width: 21px; height: 21px; border-radius: 7px; font-size: 9px; }
                    .finder-layout { display: block; min-height: 0; border-radius: 20px; overflow: visible; }
                    .mobile-finder-toolbar {
                        position: sticky;
                        top: 78px;
                        z-index: 35;
                        display: flex;
                        align-items: stretch;
                        gap: 7px;
                        padding: 8px;
                        border-bottom: 1px solid #e2e8f0;
                        border-radius: 20px 20px 0 0;
                        background: #f8fafc;
                        box-shadow: 0 9px 18px rgba(15,23,42,.07);
                    }
                    .mobile-finder-open {
                        min-width: 0;
                        min-height: 52px;
                        flex: 1;
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 7px 9px;
                        border: 1px solid #dbe3ed;
                        border-radius: 13px;
                        background: #fff;
                        color: #0f172a;
                        text-align: left;
                        font-family: inherit;
                        cursor: pointer;
                    }
                    .mobile-context-icon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 10px; background: #eff6ff; font-size: 17px; }
                    .mobile-context-copy { min-width: 0; flex: 1; }
                    .mobile-context-copy small { display: block; margin-bottom: 1px; color: #2563eb; font-size: 7px; font-weight: 900; letter-spacing: 1px; }
                    .mobile-context-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
                    .mobile-context-copy em { display: block; margin-top: 2px; overflow: hidden; color: #94a3b8; font-size: 8px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
                    .mobile-open-cue { flex: 0 0 auto; color: #2563eb; font-size: 8px; font-weight: 900; }
                    .mobile-show-all { flex: 0 0 57px; border: 1px solid #dbe3ed; border-radius: 13px; background: #fff; color: #475569; font-family: inherit; font-size: 8px; font-weight: 900; cursor: pointer; }
                    .mobile-tree-backdrop { display: block; position: fixed; inset: 0; z-index: 900; border: none; background: rgba(15,23,42,.42); backdrop-filter: blur(3px); }
                    .finder-sidebar {
                        position: fixed;
                        z-index: 910;
                        right: 10px;
                        bottom: 10px;
                        left: 10px;
                        max-height: min(76dvh, 680px);
                        padding: 14px 12px max(14px, env(safe-area-inset-bottom));
                        overflow-y: auto;
                        border: 1px solid #dbe3ed;
                        border-radius: 22px;
                        background: #f1f5f9;
                        box-shadow: 0 28px 70px rgba(15,23,42,.3);
                        transform: translateY(calc(100% + 24px));
                        visibility: hidden;
                        transition: transform .24s ease, visibility .24s;
                    }
                    .finder-sidebar.mobile-open { transform: translateY(0); visibility: visible; }
                    .finder-title {
                        position: sticky;
                        top: -14px;
                        z-index: 2;
                        margin: 0 0 9px;
                        padding: 14px 7px 12px;
                        background: #f1f5f9;
                    }
                    .finder-title button { width: 36px; height: 36px; font-size: 16px; }
                    .mobile-tree-close { display: inline-grid; place-items: center; }
                    .tree-node { min-height: 44px; align-items: center; padding: 9px 10px; }
                    .tree-quick-action { min-width: 48px; height: 36px; padding: 0 7px; border-radius: 10px; }
                    .tree-quick-action-label { font-size: 9px; }
                    .tree-label strong { font-size: 12px; }
                    .tree-label small { font-size: 9px; }
                    .tree-children { margin-left: 20px; }
                    .finder-content { border-radius: 0 0 20px 20px; overflow: hidden; }
                    .content-header { min-height: 0; padding: 14px; align-items: stretch; flex-direction: column; gap: 12px; }
                    .content-icon { width: 40px; height: 40px; border-radius: 12px; font-size: 20px; }
                    .content-heading { gap: 10px; }
                    .content-heading h2 { font-size: 20px; }
                    .content-heading small { display: none; }
                    .module-actions { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
                    .primary-action { width: 100%; min-height: 42px; padding: 10px 8px; }
                    .file-drop-action, .upload-parent-select { width: 100%; max-width: none; min-height: 42px; }
                    .file-drop-action small { display: none; }
                    .upload-parent-select { grid-column: 1 / -1; }
                    .content-body { max-height: none; padding: 12px; }
                    .finder-item { align-items: flex-start; padding: 14px; border-radius: 15px; }
                    .school-item { flex-wrap: wrap; }
                    .school-item .open-link { margin-left: 0; }
                    .item-symbol { width: 40px; height: 40px; border-radius: 12px; font-size: 19px; }
                    .item-main h3 { font-size: 15px; }
                    .item-grid { grid-template-columns: 1fr; }
                }
                @media (max-width: 560px) {
                    .workspace-hero { margin-bottom: 10px; }
                    .workspace-hero h1 { font-size: 30px; letter-spacing: -1.6px; }
                    .top-navigation { grid-template-columns: 1fr auto; }
                    .reference-nav { grid-column: 1 / -1; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
                    .top-nav-link { padding: 8px 6px; overflow: hidden; font-size: 9px; text-align: center; text-overflow: ellipsis; }
                    .nem-badge { justify-self: start; letter-spacing: .8px; }
                    .ai-mode-badge { padding: 9px 10px; font-size: 8px; }
                    .mobile-finder-toolbar { padding: 7px; }
                    .app-footer { min-height: 25px; margin-top: auto; font-size: 8px; }
                }
            `}</style>
        </main>
    );
}
