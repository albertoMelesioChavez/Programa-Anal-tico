import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = params;

    try {
        const db = getDb();
        const p = db.prepare(`
            SELECT 
                p.*, 
                f.nombre as fase_nombre, 
                g.nombre as grado_nombre, 
                l.nombre as lenguaje_nombre,
                cn.descripcion as cn_desc,
                ce.descripcion as ce_desc,
                pda.descripcion as pda_desc
            FROM planeaciones p
            LEFT JOIN fases f ON p.fase_id = f.id
            LEFT JOIN grados g ON p.grado_id = g.id
            LEFT JOIN lenguajes_artisticos l ON p.lenguaje_id = l.id
            LEFT JOIN contenidos_nacionales cn ON p.contenido_nacional_id = cn.id
            LEFT JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
            LEFT JOIN pdas pda ON p.pda_id = pda.id
            WHERE p.id = ?
        `).get(id);

        if (!p) return NextResponse.json({ error: 'Planeacion not found' }, { status: 404 });

        const content = `
# PLANEACIÓN ANALÍTICA: ${p.titulo}
Fecha: ${new Date(p.fecha_creacion).toLocaleDateString()}

## DATOS GENERALES
- **Fase:** ${p.fase_nombre}
- **Grado:** ${p.grado_nombre}
- **Lenguaje Artístico:** ${p.lenguaje_nombre}
- **Campo Formativo:** Lenguajes
- **Ejes Articuladores:** ${p.ejes_articuladores || 'No especificados'}

## CONTENIDO CURRICULAR
- **Contenido Nacional:** ${p.cn_desc || 'N/A'}
- **Contenido Estatal:** ${p.ce_desc || 'N/A'}
- **PDA (Proceso de Desarrollo de Aprendizaje):** ${p.pda_desc || 'N/A'}

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
- **Evaluación Formativa:** ${p.evaluacion || 'N/A'}
- **Recursos:** ${p.recursos || 'N/A'}
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
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
