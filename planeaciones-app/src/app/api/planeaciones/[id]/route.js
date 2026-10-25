import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { ensurePlaneacionContextColumns } from '@/lib/context-schema';
import { owns, requireSameOrigin, requireUser } from '@/lib/auth';

export async function DELETE(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        await ensurePlaneacionContextColumns();

        const result = await db.execute({
            sql: 'DELETE FROM planeaciones WHERE id = ? AND docente_id = ?',
            args: [id, auth.user.id]
        });

        if (result.rowsAffected === 0) {
            return NextResponse.json({ error: 'Planeacion no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar planeación en Turso:', error);
        return NextResponse.json({ error: 'Error al eliminar la planeación' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            titulo, fase_id, grado_id, lenguaje_id,
            contenido_nacional_id, contenido_estatal_id, pda_id, pda_por_grado, evaluacion_por_grado, recursos_por_grado, evidencias_por_grado,
            proyecto_arte_id, programa_analitico_id, valor_mensual,
            ejes_articuladores,
            metodologia, actividades, recursos, evidencias, evaluacion,
            secuencia_inicio, secuencia_desarrollo, secuencia_cierre,
            grupo, fecha_clase, numero_sesion, duracion_minutos, proposito, criterios, ajustes, observaciones, estado, origen_borrador
        } = body;

        if (!titulo) {
            return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
        }

        await ensurePlaneacionContextColumns();
        if (!await owns('planeaciones', id, auth.user.id)) return NextResponse.json({ error: 'Planeación no encontrada.' }, { status: 404 });
        const { ensureProyectoArteTable, ensureProgramasAnaliticosTable } = await import('@/lib/context-schema');
        await ensureProyectoArteTable(); await ensureProgramasAnaliticosTable();
        if (proyecto_arte_id && !await owns('proyectos', proyecto_arte_id, auth.user.id)) return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
        if (programa_analitico_id && !await owns('programas_analiticos', programa_analitico_id, auth.user.id)) return NextResponse.json({ error: 'Programa no encontrado.' }, { status: 404 });

        await db.execute({
            sql: `UPDATE planeaciones SET 
                    titulo = ?, fase_id = ?, grado_id = ?, lenguaje_id = ?, 
                    contenido_nacional_id = ?, contenido_estatal_id = ?, pda_id = ?, pda_por_grado = ?, evaluacion_por_grado = ?, recursos_por_grado = ?, evidencias_por_grado = ?,
                    proyecto_arte_id = ?, programa_analitico_id = ?, valor_mensual = ?,
                    ejes_articuladores = ?,
                    metodologia = ?, actividades = ?, recursos = ?, evidencias = ?, evaluacion = ?,
                    secuencia_inicio = ?, secuencia_desarrollo = ?, secuencia_cierre = ?,
                    grupo = ?, fecha_clase = ?, numero_sesion = ?, duracion_minutos = ?, proposito = ?, criterios = ?, ajustes = ?, observaciones = ?, estado = ?, origen_borrador = ?
                  WHERE id = ? AND docente_id = ?`,
            args: [
                titulo, 
                fase_id?.toString(), 
                grado_id?.toString(), 
                lenguaje_id?.toString(),
                contenido_nacional_id?.toString() || null, 
                contenido_estatal_id?.toString() || null, 
                pda_id?.toString() || null,
                JSON.stringify(pda_por_grado || []),
                JSON.stringify(evaluacion_por_grado || []),
                JSON.stringify(recursos_por_grado || []),
                JSON.stringify(evidencias_por_grado || []),
                proyecto_arte_id?.toString() || null,
                programa_analitico_id?.toString() || null,
                valor_mensual?.trim() || '',
                ejes_articuladores || '',
                metodologia || '', actividades || '', recursos || '', evidencias || '', evaluacion || '',
                secuencia_inicio || '', secuencia_desarrollo || '', secuencia_cierre || '',
                grupo || null, fecha_clase || null, numero_sesion || null, duracion_minutos || null,
                proposito || '', criterios || '', ajustes || '', observaciones || '', estado || 'borrador', origen_borrador || null,
                id, auth.user.id
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Turso PUT Error:', error);
        return NextResponse.json({ error: 'Error al actualizar: ' + error.message }, { status: 500 });
    }
}
