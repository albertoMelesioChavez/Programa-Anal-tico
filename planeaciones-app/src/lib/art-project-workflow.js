export const DEFAULT_ROUTE = [
    { title: 'Mirar el entorno', intent: 'Observar el contexto y recuperar saberes, intereses y preguntas del grupo.' },
    { title: 'Escuchar voces', intent: 'Recuperar relatos e ideas de la comunidad mediante el diálogo y la escucha.' },
    { title: 'Conocer referentes', intent: 'Apreciar manifestaciones artísticas y reconocer su procedencia y recursos expresivos.' },
    { title: 'Experimentar', intent: 'Explorar materiales, técnicas y posibilidades expresivas antes de elegir.' },
    { title: 'Imaginar propuestas', intent: 'Elaborar bocetos o ensayos y explicar las decisiones de creación.' },
    { title: 'Acordar y producir', intent: 'Integrar propuestas y producir con responsabilidades compartidas.' },
    { title: 'Preparar la mediación', intent: 'Revisar la producción y preparar cómo compartirla con otras personas.' },
    { title: 'Compartir y valorar', intent: 'Socializar el trabajo, documentar aprendizajes y acordar su continuidad.' }
];

export const GRADE_PHASE = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3 };

export const GROUP_OPTIONS = Array.from({ length: 6 }, (_, index) => index + 1)
    .flatMap((grade) => ['A', 'B'].map((letter) => ({
        id: `${grade}${letter}`,
        grade,
        letter,
        label: `${grade}.º ${letter}`,
        faseId: GRADE_PHASE[grade]
    })));

export function createProjectConfig() {
    return {
        version: 3,
        escuela: '',
        docente: '',
        ciclo: '',
        periodo_inicio: '',
        periodo_fin: '',
        duracion_minutos: 50,
        proyecto_escolar: '',
        vinculacion_escolar: '',
        valor_mensual: '',
        espacios: '',
        diagnostico: '',
        pregunta_guia: '',
        proposito: '',
        metodologia: 'Proyecto artístico contextualizado',
        ejes: [],
        fuentes: '',
        producto_final: '',
        cuidado_cultural: '',
        inclusion: '',
        seguridad: '',
        evaluacion: '',
        criterios_evaluacion: Array.from({ length: 4 }, () => ({ criterio: '', indicadores: '', evidencias: '' })),
        recursos: '',
        organizacion: '',
        conexion_planeaciones: '',
        evento: { nombre: '', fecha: '' },
        ruta: DEFAULT_ROUTE.map((item, index) => ({
            numero: index + 1,
            titulo: item.title,
            proposito: item.intent,
            actividad: '',
            evidencia: '',
            criterios: '',
            recursos: ''
        })),
        grupos: []
    };
}

export function normalizeProjectConfig(value) {
    const defaults = createProjectConfig();
    const input = value && typeof value === 'object' ? value : {};
    return {
        ...defaults,
        ...input,
        evento: { ...defaults.evento, ...(input.evento || {}) },
        criterios_evaluacion: Array.isArray(input.criterios_evaluacion) ? input.criterios_evaluacion.map(item => ({ criterio: String(item.criterio || ''), indicadores: String(item.indicadores || ''), evidencias: String(item.evidencias || '') })) : defaults.criterios_evaluacion,
        ruta: Array.isArray(input.ruta) && input.ruta.length
            ? input.ruta.map((item, index) => ({
                numero: index + 1,
                titulo: String(item.titulo || ''),
                proposito: String(item.proposito || ''),
                actividad: String(item.actividad || ''),
                evidencia: String(item.evidencia || ''),
                criterios: String(item.criterios || ''),
                recursos: String(item.recursos || '')
            }))
            : defaults.ruta,
        grupos: Array.isArray(input.grupos) ? input.grupos.map(group => ({ ...group, fechas: Array.isArray(group.fechas) ? group.fechas : [], pda_por_sesion: Array.isArray(group.pda_por_sesion) ? group.pda_por_sesion : [] })) : []
    };
}

export function createGroup(id, routeLength = DEFAULT_ROUTE.length) {
    const option = GROUP_OPTIONS.find((group) => group.id === id);
    if (!option) return null;
    return {
        ...option,
        producto: '',
        lenguaje_id: '',
        fechas: Array.from({ length: routeLength }, () => ''),
        pda_por_sesion: Array.from({ length: routeLength }, () => '')
    };
}

export function gradePdas(vinculacion, pdas, grade, languageId = null) {
    const selectedIds = new Set((vinculacion || []).flatMap((item) => item.pda_ids || []).map(String));
    return (pdas || []).filter((pda) => selectedIds.has(String(pda.id)) && Number(pda.grado_id) === Number(grade) && (languageId == null || Number(pda.lenguaje_id) === Number(languageId)));
}
