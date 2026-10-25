import { NextResponse } from 'next/server';
import { requireSameOrigin, requireUser } from '@/lib/auth';
import { getProjectField, localProjectField, projectFieldPrompt } from '@/lib/project-field-assistance';

export const runtime = 'nodejs';

function clean(value, fallback = '') {
    const text = String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text || fallback;
}

function localPlanning(context = {}) {
    const grado = clean(context.grado, 'primaria');
    const contenido = clean(context.contenido, 'el contenido seleccionado');
    const pda = clean(context.pda, 'el proceso de desarrollo de aprendizaje seleccionado');
    const artTitle = clean(context.proyecto_del_maestro_de_arte?.titulo, 'el proyecto artístico del grupo');
    const artTheme = clean(context.proyecto_del_maestro_de_arte?.tematica, 'expresión y creación colectiva');
    const value = clean(context.valor_mensual);
    const valuePhrase = value ? `, practicando el valor de ${value}` : '';

    return JSON.stringify({
        inicio: `Recuperar saberes previos mediante una conversación breve y una observación sensible relacionada con “${contenido}”. Presentar el reto creativo de “${artTitle}” y formular preguntas para que las y los estudiantes de ${grado} expresen qué observan, sienten y desean crear${valuePhrase}.`,
        desarrollo: `Organizar equipos con roles incluyentes. Explorar materiales, ideas y referentes vinculados con “${artTitle}” y la temática ${artTheme}. Cada equipo realizará una producción o ensayo que atienda ${pda}. La docente o el docente acompañará con preguntas, retroalimentación descriptiva y ajustes de accesibilidad.`,
        cierre: `Realizar una muestra breve de los procesos y productos. Cada equipo explicará qué aprendió y cómo su propuesta se relaciona con ${pda}. Cerrar con autoevaluación y un acuerdo concreto para continuar${valuePhrase}.`,
        metodologia_sugerida: 'Aprendizaje Basado en Proyectos con enfoque comunitario',
        evaluacion_sugerida: 'Evaluación formativa mediante observación, bitácora, autoevaluación y retroalimentación entre pares. Valorar la relación con el PDA, la participación, las decisiones creativas y la vinculación con el contexto.',
        recursos_sugeridos: 'Materiales disponibles y reutilizables, referentes visuales o sonoros, hojas de registro, recursos del entorno escolar y evidencias del proceso.'
    }, null, 2);
}

function localIntroduction(context = {}) {
    const title = clean(context.titulo, 'Proyecto del maestro de arte');
    const theme = clean(context.tematica, 'la expresión artística y la vida comunitaria');

    return `El proyecto “${title}” propone que las artes sean un medio para observar, interpretar y transformar la realidad cercana de las niñas y los niños. A partir de la temática ${theme}, las experiencias se vinculan con los contenidos y PDA seleccionados en el Programa Analítico.\n\nLa ruta de trabajo integra apreciación, diálogo, experimentación, creación y socialización. Se favorecerá la participación incluyente, la colaboración y la toma de decisiones, reconociendo diversas maneras de expresar ideas mediante imágenes, sonidos, movimiento, palabra u objetos.\n\nLos productos esperados se comprenderán como evidencias de un proceso, no únicamente como resultados finales. La evaluación será formativa y permitirá recuperar avances, decisiones creativas y aportaciones de cada estudiante al trabajo colectivo.`;
}

function localProduct(context = {}) {
    const theme = clean(context.tematica || context.titulo, 'nuestra comunidad');
    return `Muestra colectiva: ${theme}`.slice(0, 90);
}

function localHtml(context = {}) {
    const title = clean(context.titulo_seccion, 'Contenido enriquecido');
    const current = String(context.contenido_actual || '').trim();
    return `${current}\n<h3>${title}: orientación pedagógica</h3><p>Este contenido se contextualiza desde la realidad de la escuela y la comunidad. Se propone articular observación, diálogo, creación y evaluación formativa, ofreciendo distintas maneras de participación para que todas y todos puedan aportar.</p>`;
}

function generateLocalFallback(prompt = '', context = {}) {
    const normalized = prompt.toLowerCase();

    if (normalized.includes('array json de ids')) {
        const ids = [...prompt.matchAll(/ID:(\d+)/g)].slice(0, 3).map((match) => Number(match[1]));
        return JSON.stringify(ids);
    }
    if (normalized.includes('secuencia didáctica') || normalized.includes('"inicio"')) return localPlanning(context);
    if (normalized.includes('introducción') || normalized.includes('sustento')) return localIntroduction(context);
    if (normalized.includes('producto esperado') || normalized.includes('producto artístico')) return localProduct(context);
    if (normalized.includes('mantén el formato html')) return localHtml(context);

    return localIntroduction(context);
}

async function generateWithGoogle(apiKey, prompt, context) {
    const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Contexto:\n${JSON.stringify(context)}\n\nInstrucción:\n${prompt}` }] }],
            generationConfig: { temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'El proveedor de IA no respondió correctamente.');
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) throw new Error('El proveedor devolvió una respuesta vacía.');
    return text;
}

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { prompt = '', context = {}, task, field, scope = 'config', target = {}, current = '', candidates = [] } = await request.json();
        const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

        if (task === 'curriculum-suggestion') {
            if (!apiKey) return NextResponse.json({ error: 'La asistencia de IA no está configurada. Selecciona contenido y PDA manualmente.' }, { status: 503 });
            const valid = Array.isArray(candidates) ? candidates.slice(0, 80).filter(item => Number.isInteger(Number(item.contenido_id)) && Number.isInteger(Number(item.pda_id))) : [];
            if (!valid.length) return NextResponse.json({ error: 'No hay pares de contenido y PDA disponibles para este grupo.' }, { status: 400 });
            const instruction = `Elige UN par de contenido y PDA del catálogo proporcionado, pertinente al tema, producto y grado del proyecto. Responde únicamente JSON {"contenido_id": número, "pda_id": número, "justificacion": "una oración"}. Debes escoger ambos IDs de la misma opción y no inventar otros. Si el ajuste temático es débil, dilo en la justificación. Opciones: ${JSON.stringify(valid)}`;
            const raw = await generateWithGoogle(apiKey, instruction, context);
            const match = raw.match(/\{[\s\S]*\}/);
            let chosen;
            try { chosen = JSON.parse(match?.[0] || ''); } catch { return NextResponse.json({ error: 'La IA no devolvió una selección válida; elige manualmente.' }, { status: 502 }); }
            const candidate = valid.find(item => Number(item.contenido_id) === Number(chosen.contenido_id) && Number(item.pda_id) === Number(chosen.pda_id));
            if (!candidate) return NextResponse.json({ error: 'La sugerencia no coincide con el catálogo; no se aplicó.' }, { status: 502 });
            return NextResponse.json({ candidate, justificacion: clean(chosen.justificacion).slice(0, 500), mode: 'cloud' });
        }

        if (task === 'project-field') {
            if (!getProjectField(scope, field)) return NextResponse.json({ error: 'Campo no compatible con la asistencia de IA.' }, { status: 400 });
            if (!context || typeof context !== 'object' || JSON.stringify(context).length > 180000) return NextResponse.json({ error: 'El formulario es demasiado extenso para generar una propuesta.' }, { status: 400 });
            if (!apiKey?.trim()) return NextResponse.json({ text: localProjectField(scope, field, context, target), mode: 'local-template' });
            try {
                const text = await generateWithGoogle(apiKey, projectFieldPrompt(scope, field, current, target), context);
                return NextResponse.json({ text, mode: 'cloud' });
            } catch {
                return NextResponse.json({ error: 'La IA no pudo responder. Tu texto sigue intacto; intenta de nuevo en unos momentos.' }, { status: 502 });
            }
        }

        if (apiKey) {
            try {
                const text = await generateWithGoogle(apiKey, prompt, context);
                return NextResponse.json({ text, mode: 'cloud' });
            } catch (error) {
                console.warn('Proveedor de IA no disponible; se usará el generador local:', error.message);
            }
        }

        return NextResponse.json({
            text: generateLocalFallback(prompt, context),
            mode: 'local-template'
        });
    } catch (error) {
        console.error('AI route error:', error);
        return NextResponse.json({ error: 'No se pudo generar el contenido.', details: error.message }, { status: 500 });
    }
}
