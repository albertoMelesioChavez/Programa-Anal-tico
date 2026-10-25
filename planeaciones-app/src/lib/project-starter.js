import { createProjectConfig } from './art-project-workflow.js';

export const QUICK_FORMATS = [
    { id: 'mural', label: 'Mural', language: 'Artes Visuales', title: 'Un mural para expresar', product: 'Mural colectivo con cédulas y una presentación para la comunidad escolar', resources: 'Papel o cartón reutilizado, lápices, pinturas al agua y materiales de unión seguros.' },
    { id: 'teatro', label: 'Teatro', language: 'Teatro', title: 'Escenas para compartir', product: 'Escenas breves creadas en equipo y presentadas a la comunidad escolar', resources: 'Espacio libre de obstáculos, objetos de utilería seguros y materiales para registrar guiones.' },
    { id: 'musica', label: 'Música', language: 'Música', title: 'Sonidos para contar', product: 'Composición sonora colectiva y una presentación comentada para la comunidad escolar', resources: 'Voz, percusión corporal, objetos sonoros seguros y medios de registro disponibles.' },
    { id: 'danza', label: 'Danza', language: 'Danza', title: 'Movimientos para expresar', product: 'Secuencia de movimiento creada en equipo y compartida con la comunidad escolar', resources: 'Espacio despejado y accesible, referencias sonoras y medios de registro disponibles.' }
];

export function quickProject(project, idea, formatId, languageId) {
    const format = QUICK_FORMATS.find(item => item.id === formatId) || QUICK_FORMATS[0];
    const theme = idea.trim().replace(/[.!?]+$/, '');
    const previous = project.configuracion.quick_seed || {};
    const seed = { titulo: `${format.title} ${theme}`, tematica: theme, producto_final: `${format.product}, en torno a ${theme}.`, recursos: format.resources };
    const replace = (key, current) => !String(current || '').trim() || current === previous[key] ? seed[key] : current;
    const config = { ...project.configuracion, producto_final: replace('producto_final', project.configuracion.producto_final), recursos: replace('recursos', project.configuracion.recursos), quick_seed: seed };
    const generated = config.quick_generated;
    if (generated) {
        for (const key of ['proposito', 'pregunta_guia']) if (config[key] === generated[key]) config[key] = '';
        config.ruta = config.ruta.map((stage, index) => stage.actividad === generated.actividades?.[index] ? { ...stage, actividad: '' } : stage);
    }
    config.grupos = config.grupos.map(group => ({ ...group, lenguaje_id: group.lenguaje_id || languageId, producto: !group.producto || group.producto === previous.producto_final ? config.producto_final : group.producto }));
    const introduction = generated && project.introduccion === generated.introduccion ? '' : project.introduccion;
    const result = prepareProjectDraft({ ...project, introduccion: introduction, titulo: replace('titulo', project.titulo), tematica: replace('tematica', project.tematica), configuracion: config });
    result.configuracion.quick_generated = { introduccion: !introduction.trim() ? result.introduccion : null, proposito: !config.proposito.trim() ? result.configuracion.proposito : null, pregunta_guia: !config.pregunta_guia.trim() ? result.configuracion.pregunta_guia : null, actividades: result.configuracion.ruta.map((stage, index) => !config.ruta[index].actividad.trim() ? stage.actividad : null) };
    return result;
}

export function curriculumOptions(project, catalog, group) {
    const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const words = new Set(normalize(project.tematica + ' ' + project.configuracion.producto_final).match(/[a-z]{4,}/g) || []);
    return catalog.pdas.filter(pda => Number(pda.grado_id) === Number(group.grade) && Number(pda.lenguaje_id) === Number(group.lenguaje_id)).map(pda => {
        const content = catalog.estatales.find(item => Number(item.id) === Number(pda.contenido_estatal_id));
        if (!content || Number(content.fase_id) !== Number(group.faseId)) return null;
        const text = normalize(content.descripcion + ' ' + pda.descripcion);
        return { content, pda, score: [...words].filter(word => text.includes(word)).length };
    }).filter(Boolean).sort((a, b) => b.score - a.score || Number(a.pda.id) - Number(b.pda.id)).slice(0, 3);
}

export function newProjectConfig({ teacher = '', date = new Date() } = {}) {
    const start = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
    return { ...createProjectConfig(), docente: teacher, ciclo: `${start}–${start + 1}` };
}

const SESSION_BASE = [
    ['Observar el entorno y conversar sobre {tema}. Registrar lo que llama la atención, compartir preguntas y acordar qué se quiere comunicar.', 'Registro de observaciones y preguntas del grupo.', 'Relaciona una observación del entorno con la temática y escucha otras ideas.', 'Hojas, lápices y materiales disponibles para registrar.'],
    ['Compartir relatos y puntos de vista sobre {tema}. En equipos, identificar coincidencias y diferencias; elegir ideas que puedan formar parte de la creación.', 'Mapa de ideas y registro de voces.', 'Escucha con respeto y recupera una idea de otra persona.', 'Registros del encuentro anterior y hojas de trabajo.'],
    ['Apreciar referentes artísticos seleccionados por el docente. Reconocer su autoría o comunidad de origen, describir sus recursos expresivos y relacionarlos con {tema}.', 'Ficha de apreciación de un referente verificado.', 'Describe un recurso expresivo y reconoce la procedencia del referente.', 'Referentes verificados y medios accesibles para apreciarlos.'],
    ['Organizar pequeñas exploraciones de materiales, técnicas o recursos del lenguaje elegido. Comparar resultados y documentar qué posibilidades ayudan a expresar {tema}.', 'Muestras, pruebas o registro de exploraciones.', 'Prueba distintas posibilidades y explica una elección.', 'Materiales de prueba adecuados a la edad y al lenguaje artístico.'],
    ['Crear bocetos, guiones o ensayos para concretar el producto acordado: {producto}. Compartir propuestas y dar retroalimentación respetuosa antes de elegir.', 'Boceto, guion o ensayo con una mejora identificada.', 'Relaciona sus decisiones de creación con lo que desea comunicar.', 'Registros previos y materiales para bocetar o ensayar.'],
    ['Acordar responsabilidades y producir en equipos: {producto}. Hacer pausas para revisar avances, resolver dificultades y ajustar las decisiones de forma colaborativa.', 'Producción en proceso y registro de acuerdos.', 'Contribuye al trabajo y ajusta su propuesta a partir de la revisión.', 'Materiales seleccionados, acuerdos de equipo y espacio seguro.'],
    ['Revisar las producciones con los criterios acordados. Preparar una presentación accesible que explique las decisiones, el proceso y la relación con {tema}.', 'Producción revisada y guion de presentación.', 'Incorpora retroalimentación y explica el sentido de la producción.', 'Producciones y apoyos para la presentación.'],
    ['Compartir las producciones con el público que se acuerde. Recuperar comentarios, valorar los aprendizajes y proponer cómo dar continuidad a lo trabajado sobre {tema}.', 'Registro de presentación, autoevaluación y acuerdos de continuidad.', 'Reconoce un aprendizaje propio y valora las aportaciones del grupo.', 'Producciones terminadas e instrumentos de reflexión.']
];

const CRITERIA = [
    { criterio: 'Apreciación y diálogo', indicadores: 'Describe recursos expresivos, reconoce su procedencia y escucha otras interpretaciones.', evidencias: 'Ficha de apreciación y registro de diálogo.' },
    { criterio: 'Experimentación', indicadores: 'Explora posibilidades y explica sus elecciones a partir de las pruebas.', evidencias: 'Muestras, ensayos y registro de exploración.' },
    { criterio: 'Creación situada', indicadores: 'Relaciona decisiones artísticas con la temática y mejora su producción con retroalimentación.', evidencias: 'Boceto o guion, producción y explicación del proceso.' },
    { criterio: 'Colaboración y cuidado', indicadores: 'Cumple acuerdos, comparte responsabilidades y cuida a las personas y los materiales.', evidencias: 'Registro de acuerdos, observación y coevaluación.' }
];

// This starter is an editable template. It never claims observations or chooses official PDA.
export function prepareProjectDraft(project) {
    const original = project.configuracion;
    const theme = project.tematica.trim().replace(/[.!?]+$/, '');
    const product = (original.producto_final.trim() || original.grupos.map(group => group.producto.trim()).filter(Boolean).join('; ')).replace(/[.!?]+$/, '');
    const defaults = {
        pregunta_guia: `¿Cómo podemos expresar y compartir nuestras ideas sobre ${theme} a través del arte?`,
        proposito: `Explorar ${theme} mediante la apreciación, la experimentación y la creación artística. Elaborar en colaboración el producto acordado: ${product}. Explicar y valorar las decisiones tomadas durante el proceso.`,
        inclusion: 'Ofrecer distintas formas de participar y comunicar ideas; adaptar materiales, tiempos y apoyos a las necesidades que se identifiquen en cada grupo.',
        seguridad: 'Revisar los materiales y el espacio antes de trabajar. Acordar su uso seguro, prever apoyos y adecuar las actividades a la edad del grupo.',
        cuidado_cultural: 'Reconocer la autoría y la comunidad de origen de los referentes. Dialogar sobre su contexto, evitar estereotipos y solicitar los permisos que correspondan.',
        evaluacion: 'Recuperar ideas iniciales, observar el proceso y ofrecer retroalimentación durante la creación. Cerrar con autoevaluación y coevaluación apoyadas en evidencias y en los criterios acordados.',
        recursos: 'Registros del proceso, materiales adecuados al lenguaje artístico y referentes de procedencia verificada. Confirmar disponibilidad antes de cada sesión.',
        organizacion: 'Alternar exploración individual, trabajo en equipos y diálogo grupal. Distribuir responsabilidades y revisar los acuerdos de participación.',
        conexion_planeaciones: 'Cada sesión desarrolla una etapa de la ruta. Ajustar las actividades a cada grupo y vincularlas con los contenidos y PDA seleccionados del catálogo.'
    };
    const config = { ...original, starter_version: 1 };
    for (const [key, text] of Object.entries(defaults)) if (!String(config[key] || '').trim()) config[key] = text;
    config.ruta = original.ruta.map((stage, index) => {
        const result = { ...stage };
        const base = SESSION_BASE[index];
        if (base) ['actividad', 'evidencia', 'criterios', 'recursos'].forEach((key, i) => {
            if (!String(result[key] || '').trim()) result[key] = base[i].replaceAll('{tema}', theme).replaceAll('{producto}', product);
        });
        return result;
    });
    config.criterios_evaluacion = original.criterios_evaluacion.map((item, index) => {
        const result = { ...item };
        for (const [key, value] of Object.entries(CRITERIA[index] || {})) if (!String(result[key] || '').trim()) result[key] = value;
        return result;
    });
    config.grupos = original.grupos.map(group => ({ ...group, producto: group.producto.trim() || product }));
    return {
        ...project,
        introduccion: project.introduccion.trim() || `El proyecto «${project.titulo.trim()}» propone explorar ${theme} desde las experiencias y preguntas del grupo. La ruta articula observación, diálogo, apreciación, experimentación y creación. El producto acordado es: ${product}. Las actividades se ajustarán al contexto y a los aprendizajes seleccionados.`,
        configuracion: config
    };
}
