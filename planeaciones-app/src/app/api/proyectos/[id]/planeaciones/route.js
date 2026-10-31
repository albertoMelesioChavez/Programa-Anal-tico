import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureTablesExist } from '@/lib/db-init';
import { ensurePlaneacionContextColumns, ensureProyectoArteTable } from '@/lib/context-schema';
import { gradePdas, normalizeProjectConfig } from '@/lib/art-project-workflow';
import { requireSameOrigin, requireUser } from '@/lib/auth';
import { writeTransaction } from '@/lib/transactions.mjs';
import { domainError } from '@/lib/workspace-operations.mjs';

export const runtime = 'nodejs';

function parseJson(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
}

function baseSequence(stage, group, config, pda) {
    const activity = stage.actividad?.trim() || `explorar y avanzar en ${stage.titulo.toLowerCase()} mediante ${group.producto}`;
    const sourceCare = config.fuentes?.trim() ? 'Identificar de dónde provienen los referentes utilizados y distinguir sus significados.' : 'Preguntar por la procedencia de los referentes antes de incorporarlos; dejar la fuente pendiente de verificación.';
    const duration = Math.max(20, Number(config.duracion_minutos) || 50);
    const opening = Math.round(duration * 0.2);
    const closing = Math.round(duration * 0.2);
    const development = duration - opening - closing;
    return {
        inicio: `${opening} min · Recuperar lo trabajado en la sesión anterior y plantear la pregunta guía: ${config.pregunta_guia || '¿Qué queremos comunicar con nuestro proyecto artístico?'}. Presentar el propósito de hoy: ${stage.proposito}. ${config.vinculacion_escolar ? `Retomar la vinculación escolar: ${config.vinculacion_escolar}.` : ''} ${config.valor_mensual ? `Relacionar las decisiones con el valor de ${config.valor_mensual}.` : ''}`,
        desarrollo: `${development} min · En el grupo ${group.id}, organizar una exploración o creación vinculada con ${group.producto}. Actividad central: ${activity}. Invitar a observar, probar, tomar decisiones y explicar cómo se relacionan con el PDA: ${pda.descripcion}. Ofrecer roles y formas de participación acordes con las necesidades reales del grupo. ${sourceCare}`,
        cierre: `${closing} min · Compartir el avance de ${group.producto}. Registrar ${stage.evidencia || 'una evidencia breve del proceso'} y pedir a cada estudiante que explique una decisión creativa, un aprendizaje y un ajuste para la siguiente sesión.`,
        evaluacion: [stage.criterios, config.evaluacion, ...(config.criterios_evaluacion || []).filter(item => item.criterio).map(item => `${item.criterio}: ${item.indicadores}. Evidencias: ${item.evidencias}.`)].filter(Boolean).join('\n') || 'Observación formativa del proceso, participación y relación con el PDA.',
        ajustes: config.inclusion || 'Definir apoyos según las necesidades observadas del grupo.',
        recursos: stage.recursos || config.recursos || 'Materiales disponibles en la escuela; confirmar antes de la clase.'
    };
}

async function generateAiSequences(project, config, group, assignments) {
    const key = process.env.GOOGLE_AI_STUDIO_API_KEY?.trim();
    if (!key) return null;
    const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash-lite';
    const context = {
        configuracion: config, fundamentacion: project.introduccion,
        proyecto: project.titulo, tema: project.tematica, grupo: group.id, grado: group.grade,
        producto: group.producto, diagnostico: config.diagnostico, pregunta_guia: config.pregunta_guia,
        proposito_general: config.proposito, metodologia: config.metodologia,
        inclusion: config.inclusion, seguridad: config.seguridad, fuentes_verificadas_por_docente: config.fuentes,
        sesiones: config.ruta.map((stage, index) => ({ numero: index + 1, ...stage, contenido: assignments[index].content.descripcion, pda: assignments[index].pda.descripcion }))
    };
    const instruction = `Redacta ${config.ruta.length} sesiones de artes para primaria, una por cada etapa proporcionada. Conserva la ruta, el grupo, el producto, el contenido y el PDA exactamente como fueron proporcionados. Para cada sesión entrega inicio, desarrollo y cierre con tiempos que sumen la duración prevista, consignas concretas, evaluación observable, recursos y ajustes inclusivos. Haz progresar el producto sesión a sesión y evita repetir mecánicamente actividades. No inventes fuentes, fechas, rituales, atribuciones culturales, diagnósticos ni contenidos curriculares. Si falta una fuente, indica que debe verificarse. Devuelve SOLO un objeto JSON con la clave "sesiones", un arreglo de objetos con claves "inicio", "desarrollo", "cierre", "evaluacion", "recursos", "ajustes". Sin Markdown.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nContexto:\n${JSON.stringify(context)}` }] }], generationConfig: { temperature: 0.55, maxOutputTokens: 8192, responseMimeType: 'application/json' } }),
        signal: AbortSignal.timeout(55000)
    });
    if (!response.ok) throw new Error('El proveedor de IA no pudo generar las sesiones.');
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    const parsed = parseJson(text, null);
    if (!Array.isArray(parsed?.sesiones) || parsed.sesiones.length !== config.ruta.length || parsed.sesiones.some(item => !item.inicio || !item.desarrollo || !item.cierre)) throw new Error('La IA devolvió una secuencia incompleta.');
    return parsed.sesiones;
}

export async function GET(request, { params }) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        await ensureTablesExist(); await ensurePlaneacionContextColumns(); await ensureProyectoArteTable();
        const found = await db.execute({ sql: 'SELECT id FROM proyectos WHERE id = ? AND docente_id = ?', args: [id, auth.user.id] });
        if (!found.rows[0]) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        const result = await db.execute({ sql: 'SELECT id, grupo, numero_sesion, fecha_clase, titulo, estado, origen_borrador, programa_analitico_id FROM planeaciones WHERE proyecto_arte_id = ? AND docente_id = ? ORDER BY grupo, numero_sesion', args: [id, auth.user.id] });
        return NextResponse.json(result.rows);
    } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        const { grupo } = await request.json();
        await ensureTablesExist(); await ensurePlaneacionContextColumns(); await ensureProyectoArteTable();
        const found = await db.execute({ sql: 'SELECT * FROM proyectos WHERE id = ? AND docente_id = ?', args: [id, auth.user.id] });
        if (!found.rows.length) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        const project = found.rows[0];
        const config = normalizeProjectConfig(parseJson(project.configuracion, {}));
        const group = config.grupos.find(item => item.id === grupo);
        if (!group) return NextResponse.json({ error: 'El grupo no pertenece a este proyecto.' }, { status: 400 });
        if (!group.producto?.trim() || !group.lenguaje_id) return NextResponse.json({ error: 'Completa producto y lenguaje artístico del grupo.' }, { status: 400 });
        if (config.ruta.length === 0) return NextResponse.json({ error: 'Falta la ruta de sesiones.' }, { status: 400 });
        const current = await db.execute({ sql: 'SELECT id FROM planeaciones WHERE proyecto_arte_id = ? AND grupo = ? AND docente_id = ? LIMIT 1', args: [id, grupo, auth.user.id] });
        if (current.rows.length) return NextResponse.json({ error: 'Este grupo ya tiene planeaciones. Edítalas desde su lista.' }, { status: 409 });

        const links = parseJson(project.vinculacion, []);
        const pdaCatalog = await db.execute('SELECT * FROM pdas');
        const contentCatalog = await db.execute('SELECT * FROM contenidos_estatales');
        const eligible = gradePdas(links, pdaCatalog.rows, group.grade).filter(item => Number(item.lenguaje_id) === Number(group.lenguaje_id) && links.some(link => Number(link.contenido_id) === Number(item.contenido_estatal_id) && (link.pda_ids || []).some(pid => Number(pid) === Number(item.id))));
        if (!eligible.length) return NextResponse.json({ error: `Selecciona un PDA del grado ${group.grade} y del lenguaje artístico de ${group.id}.` }, { status: 400 });
        const assignments = config.ruta.map((_, index) => {
            const requested = group.pda_por_sesion?.[index];
            const pda = requested ? eligible.find(item => Number(item.id) === Number(requested)) : eligible[index % eligible.length];
            const content = contentCatalog.rows.find(item => Number(item.id) === Number(pda?.contenido_estatal_id));
            return { pda, content };
        });
        if (assignments.some(item => !item.pda || !item.content)) return NextResponse.json({ error: 'Algún PDA asignado por sesión no pertenece al catálogo o ya no está vinculado. Revísalo en el proyecto.' }, { status: 400 });
        let aiSessions = null;
        let mode = 'estructura-local';
        try { aiSessions = await generateAiSequences(project, config, group, assignments); if (aiSessions) mode = 'ia-revisable'; } catch (error) { console.warn('AI session draft unavailable:', error.message); }

        const queries = config.ruta.map((stage, index) => {
            const { pda, content } = assignments[index];
            const generated = aiSessions?.[index] || baseSequence(stage, group, config, pda);
            const textByGrade = (value) => JSON.stringify([{ grado_id: String(group.grade), grado_nombre: `${group.grade}.º`, texto: value || '' }]);
            return { sql: `INSERT INTO planeaciones (titulo, fase_id, grado_id, lenguaje_id, contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado, proyecto_arte_id, ejes_articuladores, metodologia, actividades, recursos, evidencias, evaluacion, secuencia_inicio, secuencia_desarrollo, secuencia_cierre, grupo, fecha_clase, numero_sesion, duracion_minutos, proposito, criterios, ajustes, observaciones, estado, origen_borrador, orden, docente_id, valor_mensual) VALUES (${Array(34).fill('?').join(', ')})`, args: [
                `${project.titulo} · ${group.id} · Sesión ${index + 1}: ${stage.titulo}`,
                String(group.faseId), String(group.grade), String(group.lenguaje_id),
                content.contenido_nacional_id ? String(content.contenido_nacional_id) : null,
                String(content.id), String(pda.id),
                JSON.stringify([{ grado_id: String(group.grade), grado_nombre: `${group.grade}.º`, pda_id: String(pda.id), pda_descripcion: pda.descripcion }]),
                textByGrade(generated.evaluacion), textByGrade(generated.recursos), textByGrade(stage.evidencia),
                String(id), (config.ejes || []).join(', '), config.metodologia || '', stage.actividad || '',
                generated.recursos || '', stage.evidencia || '', generated.evaluacion || '',
                generated.inicio, generated.desarrollo, generated.cierre,
                group.id, group.fechas?.[index] || null, index + 1, Number(config.duracion_minutos) || 50,
                stage.proposito || '', stage.criterios || '', generated.ajustes || config.inclusion || '', '',
                'borrador', mode, index + 1, auth.user.id, config.valor_mensual || ''
            ] };
        });
        await writeTransaction(db, async tx => {
            const owner = (await tx.execute({ sql: 'SELECT programa_analitico_id FROM proyectos WHERE id=? AND docente_id=?', args: [id, auth.user.id] })).rows[0];
            if (!owner) throw domainError('El proyecto ya no existe.', 404);
            const existing = await tx.execute({ sql: 'SELECT id FROM planeaciones WHERE proyecto_arte_id=? AND grupo=? AND docente_id=? LIMIT 1', args: [id, grupo, auth.user.id] });
            if (existing.rows.length) throw domainError('Este grupo ya tiene planeaciones. Edítalas desde su lista.', 409);
            await tx.batch(queries);
            await tx.execute({ sql: 'UPDATE planeaciones SET programa_analitico_id=? WHERE proyecto_arte_id=? AND grupo=? AND docente_id=?', args: [owner.programa_analitico_id ?? null, id, grupo, auth.user.id] });
        });
        return NextResponse.json({ count: queries.length, mode }, { status: 201 });
    } catch (error) {
        console.error('Project lesson generation error:', error);
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
}
