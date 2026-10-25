import { normalizeProjectConfig } from '@/lib/art-project-workflow';
import styles from './ProjectDocument.module.css';

function Paragraph({ title, children }) {
    return <div><h3>{title}</h3><p>{children || 'Por completar'}</p></div>;
}

export default function ProjectDocument({ project, catalog = {}, standalone = false }) {
    const config = normalizeProjectConfig(project.configuracion);
    const Title = standalone ? 'h1' : 'h2';
    const criteria = config.criterios_evaluacion.filter(item => item.criterio || item.indicadores || item.evidencias);
    return <article className={styles.document} aria-label="Documento del proyecto artístico">
        <header><p className={styles.kicker}>PROYECTO DEL MAESTRO DE ARTE</p><Title className={styles.title}>{project.titulo || 'Proyecto sin título'}</Title><p className={styles.theme}>{project.tematica || 'Temática por definir'}</p></header>
        <dl className={styles.meta}>
            {[['Escuela', config.escuela], ['Docente', config.docente], ['Ciclo escolar', config.ciclo], ['Periodo tentativo', [config.periodo_inicio, config.periodo_fin].filter(Boolean).join(' → ')], ['Duración', config.ruta.length + ' sesiones de ' + config.duracion_minutos + ' minutos'], ['Grupos', config.grupos.map(group => group.id).join(', ')], ['Valor que se trabajará', config.valor_mensual], ['Espacios', config.espacios]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Por definir'}</dd></div>)}
        </dl>
        <section><h2>1. Contexto y vinculación escolar</h2><Paragraph title="Proyecto escolar">{config.proyecto_escolar}</Paragraph><Paragraph title="Aportación del proyecto de arte">{config.vinculacion_escolar}</Paragraph><Paragraph title="Diagnóstico y lectura de la realidad">{config.diagnostico}</Paragraph></section>
        <section><h2>2. Intención pedagógica</h2><Paragraph title="Propósito general">{config.proposito}</Paragraph><Paragraph title="Fundamentación">{project.introduccion}</Paragraph><Paragraph title="Metodología">{config.metodologia}</Paragraph></section>
        <section><h2>3. Referentes curriculares</h2><Paragraph title="Ejes articuladores">{config.ejes.join(' · ')}</Paragraph>
            {(project.vinculacion || []).length ? project.vinculacion.map(link => <div key={link.contenido_id}><h3>{catalog.estatales?.find(item => String(item.id) === String(link.contenido_id))?.descripcion || 'Contenido #' + link.contenido_id}</h3>{(link.pda_ids || []).map(id => { const pda = catalog.pdas?.find(item => String(item.id) === String(id)); return <p key={id}><strong>{pda?.grado_id || '—'}.º · PDA:</strong> {pda?.descripcion || 'PDA #' + id}</p>; })}</div>) : <p>Contenidos y PDA por seleccionar en el catálogo.</p>}
            <Paragraph title="Fuentes y referentes verificables">{config.fuentes}</Paragraph>
        </section>
        <section><h2>4. Pregunta y producto artístico</h2><Paragraph title="Pregunta guía">{config.pregunta_guia}</Paragraph><Paragraph title="Producto final y socialización">{config.producto_final}</Paragraph>
            {config.grupos.map(group => <div key={group.id}><h3>Producto de {group.id}</h3><p>{group.producto || 'Por definir'}</p><p className={styles.small}>Lenguaje: {catalog.lenguajes?.find(item => String(item.id) === String(group.lenguaje_id))?.nombre || (group.lenguaje_id ? 'seleccionado en el catálogo' : 'por seleccionar')} · Fechas: {(group.fechas || []).map((date, index) => 'S' + (index + 1) + ': ' + (date || 'por confirmar')).join(' · ')}</p></div>)}
            {!config.grupos.length && project.productos && Object.entries(project.productos).map(([grade, products]) => Array.isArray(products) && products.length > 0 ? <Paragraph key={grade} title={grade.replace('grado', 'Grado ')}>{products.join('\n')}</Paragraph> : null)}
        </section>
        <section><h2>5. Secuencia de experiencias artísticas</h2><div className={styles.route}>{config.ruta.map((stage, index) => <article key={index}><h3>Sesión {index + 1} · {stage.titulo || 'Nombre por definir'}</h3><Paragraph title="Propósito">{stage.proposito}</Paragraph><Paragraph title="Actividad central">{stage.actividad}</Paragraph><div className={styles.two}><Paragraph title="Evidencia">{stage.evidencia}</Paragraph><Paragraph title="Criterios observables">{stage.criterios}</Paragraph></div><Paragraph title="Recursos">{stage.recursos}</Paragraph></article>)}</div></section>
        <section><h2>6. Inclusión y cuidado</h2><Paragraph title="Inclusión y apoyos">{config.inclusion}</Paragraph><Paragraph title="Cuidado cultural y reconocimiento de autorías">{config.cuidado_cultural}</Paragraph><Paragraph title="Seguridad">{config.seguridad}</Paragraph></section>
        <section><h2>7. Evaluación formativa</h2><p>{config.evaluacion || 'Por completar'}</p>{criteria.length > 0 && <div className={styles.tableWrap}><table><caption>Criterios, indicadores de avance y evidencias</caption><thead><tr><th scope="col">Criterio</th><th scope="col">Indicadores de avance</th><th scope="col">Evidencias e instrumentos</th></tr></thead><tbody>{criteria.map((item, index) => <tr key={index}><th scope="row">{item.criterio || 'Por completar'}</th><td>{item.indicadores || 'Por completar'}</td><td>{item.evidencias || 'Por completar'}</td></tr>)}</tbody></table></div>}</section>
        <section><h2>8. Recursos, organización y socialización</h2><Paragraph title="Recursos y gestión">{config.recursos}</Paragraph><Paragraph title="Organización y participación">{config.organizacion}</Paragraph><Paragraph title="Evento o socialización final">{config.evento.nombre ? config.evento.nombre + ' · ' + (config.evento.fecha || 'Fecha por confirmar') : ''}</Paragraph></section>
        <section><h2>9. Conexión con las planeaciones</h2><p>{config.conexion_planeaciones || 'Por completar'}</p></section>
    </article>;
}
