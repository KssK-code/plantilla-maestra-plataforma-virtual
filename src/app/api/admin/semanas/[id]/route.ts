import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarSemanaPatch } from '@/lib/contenido-semana'
import {
  dependenciasSemana, describirDependencias, type Dependencias,
} from '@/lib/estructura-contenido'
import { decidirRetirada } from '@/lib/retirar-contenido'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

// Ninguna consulta de este archivo filtra `activa`: aquí se opera sobre UNA
// semana concreta por id, archivada o no. Filtrar volvería irrestaurable justo
// lo que se acaba de retirar.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json()

    // `activa` no está en la whitelist de `validarSemanaPatch`: retirar o
    // restaurar es su propia acción, no una edición de contenido. Va con
    // `.select('id')` para que un id inexistente dé 404 y no un 200 mentiroso.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('semanas').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarSemanaPatch(body)
    if (!validacion.ok) {
      return Response.json({ error: validacion.error }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('semanas')
      .update(validacion.update)
      .eq('id', params.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/semanas/[id]]', err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // De una semana cuelgan, con ON DELETE CASCADE, cosas que no son
    // contenido: el progreso del alumno, sus notas PERSONALES, las preguntas
    // del quiz y con ellas las respuestas, y los materiales subidos. Sin este
    // conteo, "Eliminar" destruye todo eso en silencio.
    const antes = await dependenciasSemana(admin, params.id)

    const archivar = (d: Dependencias) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias: d.total,
        detalle: d.detalle,
        mensaje: `Esta semana se archivó en vez de borrarse porque hay ${describirDependencias(d)}. Deja de aparecer para el alumno, pero todo eso queda intacto.`,
      })

    const decision = decidirRetirada(antes.total)

    // Se ARCHIVA siempre primero, incluso cuando el conteo dice cero.
    //
    // El conteo y el borrado son dos viajes sin transacción: si un alumno
    // guarda una nota o marca la semana entre medias, eso se iría con el
    // CASCADE. Archivar antes no cierra la carrera del todo —quien ya tenga la
    // semana en pantalla puede enviar— pero deja de servirse, así que la
    // ventana pasa de "mientras la semana exista" a "lo que tarde en enviar
    // quien ya la tenía cargada". Y si algo falla después, el estado en el que
    // se queda es el seguro: retirada, con todo intacto.
    const { data: tocada, error: errArchivar } = await admin
      .from('semanas').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocada || tocada.length === 0) {
      return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(antes)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const despues = await dependenciasSemana(admin, params.id)
    if (despues.total > 0) return archivar(despues)

    const { error } = await admin.from('semanas').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/semanas/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
