import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ensurePlaneacionContextColumns, ensureProyectoArteTable } from '@/lib/context-schema';

export async function GET(request, { params }) {
    const { id } = await params;

    try {
        await ensurePlaneacionContextColumns();
        await ensureProyectoArteTable();
        const result = await db.execute({
            sql: `
                SELECT 
                    p.*, 
                    f.nombre as fase_nombre, 
                    g.nombre as grado_nombre, 
                    l.nombre as lenguaje_nombre,
                    cn.descripcion as cn_desc,
                    ce.descripcion as ce_desc,
                    pda.descripcion as pda_desc,
                    pr.titulo as proyecto_arte_titulo
                FROM planeaciones p
                LEFT JOIN fases f ON p.fase_id = f.id
                LEFT JOIN grados g ON p.grado_id = g.id
                LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
                LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
                LEFT JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
                LEFT JOIN pdas pda ON p.pda_id = pda.id
                LEFT JOIN proyectos pr ON p.proyecto_arte_id = pr.id
                WHERE p.id = ?
            `,
            args: [id]
        });

        const p = result.rows[0];
        if (!p) return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 });
        let pdasPorGrado = [];
        try { pdasPorGrado = p.pda_por_grado ? JSON.parse(p.pda_por_grado) : []; } catch { pdasPorGrado = []; }
        const gradosAtendidos = pdasPorGrado.length > 0
            ? pdasPorGrado.map((item) => item.grado_nombre).filter(Boolean).join(' y ')
            : p.grado_nombre;
        const pdaTexto = pdasPorGrado.length > 0
            ? pdasPorGrado.map((item) => `- **${item.grado_nombre}:** ${item.pda_descripcion || 'N/A'}`).join('\n')
            : `- **${p.grado_nombre}:** ${p.pda_desc || 'N/A'}`;
        const textosPorGrado = (field, fallback) => {
            try {
                const entries = p[field] ? JSON.parse(p[field]) : [];
                if (entries.length > 0) return entries.map((item) => `- **${item.grado_nombre}:** ${item.texto || 'N/A'}`).join('\n');
            } catch {}
            return `- **${p.grado_nombre}:** ${fallback || 'N/A'}`;
        };

        const content = `
# PLANEACIÓN ANALÍTICA: ${p.titulo}
Fecha: ${new Date(p.fecha_creacion).toLocaleDateString()}

## DATOS GENERALES
- **Fase:** ${p.fase_nombre}
- **Grados atendidos automáticamente:** ${gradosAtendidos}
- **Lenguaje Artístico:** ${p.lenguaje_nombre}
- **Campo Formativo:** Lenguajes
- **Ejes Articuladores:** ${p.ejes_articuladores || 'No especificados'}
- **Valor mensual:** ${p.valor_mensual || 'No especificado'}
- **Proyecto del maestro de arte:** ${p.proyecto_arte_titulo || 'No vinculado'}

## CONTENIDO CURRICULAR
- **Contenido Nacional:** ${p.cn_desc || 'N/A'}
- **Contenido Estatal:** ${p.ce_desc || 'N/A'}
- **PDA (Proceso de Desarrollo de Aprendizaje):**
${pdaTexto}

## DISEÑO DIDÁCTICO
- **Metodología:** ${p.metodologia || 'N/A'}

### SECUENCIA DIDÁCTICA
**Inicio:**
${p.secuencia_inicio || 'N/A'}

**Desarrollo:**
${p.secuencia_desarrollo || 'N/A'}

**Cierre:**
${p.secuencia_cierre || 'N/A'}

## EVALUACIÓN Y RECURSOS
- **Evaluación Formativa por grado:**
${textosPorGrado('evaluacion_por_grado', p.evaluacion)}
- **Recursos por grado:**
${textosPorGrado('recursos_por_grado', p.recursos)}
- **Evidencias del proceso por grado:**
${textosPorGrado('evidencias_por_grado', p.evidencias)}
- **Otras Actividades Sugeridas:** ${p.actividades || 'N/A'}

---
Generado por Plataforma Programa Analítico 2025
`;

        return new Response(content, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="Planeacion_${p.titulo.replace(/\s+/g, '_')}.md"`,
            },
        });

    } catch (error) {
        console.error('Export error in Turso:', error);
        return NextResponse.json({ error: 'Fallo al exportar' }, { status: 500 });
    }
}
