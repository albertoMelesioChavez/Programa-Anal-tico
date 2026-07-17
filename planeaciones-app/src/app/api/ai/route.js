import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function clean(value, fallback = '') {
    const text = String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text || fallback;
}

function localPlanning(context = {}) {
    const grado = clean(context.grado, 'primaria');
    const contenido = clean(context.contenido, 'el contenido seleccionado');
    const pda = clean(context.pda, 'el proceso de desarrollo de aprendizaje seleccionado');
    const schoolTitle = clean(context.proyecto_escolar?.titulo, 'el contexto de la escuela');
    const schoolContext = clean(context.proyecto_escolar?.contexto_y_problematicas, 'las necesidades identificadas por la comunidad escolar').slice(0, 700);
    const artTitle = clean(context.proyecto_del_maestro_de_arte?.titulo, 'el proyecto artístico del grupo');
    const artTheme = clean(context.proyecto_del_maestro_de_arte?.tematica, 'expresión y creación colectiva');
    const value = clean(context.valor_mensual);
    const valuePhrase = value ? `, practicando el valor de ${value}` : '';

    return JSON.stringify({
        inicio: `Recuperar saberes previos mediante una conversación breve y una observación sensible relacionada con “${contenido}”. Presentar una situación cercana de ${schoolTitle} y formular preguntas para que las y los estudiantes de ${grado} expresen qué observan, sienten y desean transformar${valuePhrase}.`,
        desarrollo: `Organizar equipos con roles incluyentes. Explorar materiales, ideas y referentes vinculados con “${artTitle}” y la temática ${artTheme}. Cada equipo realizará una producción o ensayo que atienda ${pda}. Durante el proceso se contrastarán decisiones con este contexto escolar: ${schoolContext}. La docente o el docente acompañará con preguntas, retroalimentación descriptiva y ajustes de accesibilidad.`,
        cierre: `Realizar una muestra breve de los procesos y productos. Cada equipo explicará qué aprendió, cómo su propuesta se relaciona con ${pda} y qué aporta al proyecto escolar. Cerrar con autoevaluación y un acuerdo concreto para continuar${valuePhrase}.`,
        metodologia_sugerida: 'Aprendizaje Basado en Proyectos con enfoque comunitario',
        evaluacion_sugerida: 'Evaluación formativa mediante observación, bitácora, autoevaluación y retroalimentación entre pares. Valorar la relación con el PDA, la participación, las decisiones creativas y la vinculación con el contexto.',
        recursos_sugeridos: 'Materiales disponibles y reutilizables, referentes visuales o sonoros, hojas de registro, recursos del entorno escolar y evidencias del proceso.'
    }, null, 2);
}

function localIntroduction(context = {}) {
    const title = clean(context.titulo, 'Proyecto del maestro de arte');
    const theme = clean(context.tematica, 'la expresión artística y la vida comunitaria');
    const parent = clean(context.proyecto_escolar_titulo || context.proyecto_escolar?.titulo, 'el proyecto escolar vigente');

    return `El proyecto “${title}” propone que las artes sean un medio para observar, interpretar y transformar la realidad cercana de las niñas y los niños. A partir de la temática ${theme}, las experiencias se vinculan con ${parent} y con los contenidos y PDA seleccionados en el Programa Analítico.\n\nLa ruta de trabajo integra apreciación, diálogo, experimentación, creación y socialización. Se favorecerá la participación incluyente, la colaboración y la toma de decisiones, reconociendo diversas maneras de expresar ideas mediante imágenes, sonidos, movimiento, palabra u objetos.\n\nLos productos esperados se comprenderán como evidencias de un proceso, no únicamente como resultados finales. La evaluación será formativa y permitirá recuperar avances, decisiones creativas, relación con el contexto y aportaciones de cada estudiante al trabajo colectivo.`;
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
    try {
        const { prompt = '', context = {} } = await request.json();
        const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

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
