import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarPregunta } from '@/lib/preguntas'
import { decidirRetirada } from '@/lib/retirar-contenido'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json()
    // `activa` no está en la whitelist de validarPregunta: restaurar o archivar
    // es su propia acción, no una edición de contenido.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      const admin = createAdminClient()
      // `.select()` para saber si de verdad tocó una fila. Sin esto, un id
      // inexistente devolvía 200 {ok:true} sin haber cambiado nada — y la rama
      // de edición de más abajo sí devuelve 404 en ese mismo caso.
      const { data, error } = await admin
        .from('quiz_semana').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarPregunta(body, { crear: false, tipo: 'quiz' })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const admin = createAdminClient()
    const { data: actual } = await admin
      .from('quiz_semana').select('opcion_d, respuesta_correcta').eq('id', params.id).maybeSingle()
    if (!actual) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

    // La coherencia 'd' ↔ opcion_d se cierra AQUÍ, en los DOS sentidos: el
    // validador puro no ve la fila, así que no puede decidir cuando el parche
    // cambia solo una de las dos cosas. Se evalúa el resultado FINAL.
    //   · llega respuesta_correcta='d' y la fila no tiene opcion_d  → 400
    //   · llega opcion_d='' y la fila ya tenía respuesta_correcta='d' → 400
    const fila = actual as { opcion_d: string | null; respuesta_correcta: string }
    const opcionDFinal = 'opcion_d' in validacion.datos ? validacion.datos.opcion_d : fila.opcion_d
    const correctaFinal = validacion.datos.respuesta_correcta ?? fila.respuesta_correcta
    if (correctaFinal === 'd' && !opcionDFinal) {
      return NextResponse.json(
        { error: 'No puedes dejar la opción D como correcta si está vacía' }, { status: 400 })
    }

    const { error } = await admin.from('quiz_semana').update(validacion.datos).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/quiz/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // quiz_respuestas cuelga con ON DELETE CASCADE: sin este conteo, borrar la
    // pregunta se lleva en silencio lo que los alumnos contestaron.
    const { count } = await admin
      .from('quiz_respuestas').select('*', { count: 'exact', head: true }).eq('quiz_id', params.id)

    const archivar = (dependencias: number) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias,
        mensaje: `${dependencias} alumno(s) ya respondieron esta pregunta, así que se archivó en vez de borrarse: deja de aparecer, pero sus respuestas y calificaciones quedan intactas.`,
      })

    const decision = decidirRetirada(count ?? 0)

    // Se ARCHIVA siempre primero, incluso cuando el conteo dice cero.
    //
    // El conteo y el borrado son dos viajes sin transacción: si un alumno
    // responde entre medias, su respuesta se iría con el ON DELETE CASCADE.
    // Archivar antes no cierra la carrera del todo —quien ya tenga el quiz en
    // pantalla puede enviar— pero la pregunta deja de servirse, así que la
    // ventana pasa de "mientras la pregunta exista" a "lo que tarde en enviar
    // quien ya la tenía cargada". Y si algo falla después, el estado en el que
    // se queda es el seguro.
    const { data: tocada, error: errArchivar } = await admin
      .from('quiz_semana').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocada || tocada.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(decision.dependencias)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const { count: despues } = await admin
      .from('quiz_respuestas').select('*', { count: 'exact', head: true }).eq('quiz_id', params.id)
    if ((despues ?? 0) > 0) return archivar(despues ?? 0)

    const { error } = await admin.from('quiz_semana').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/quiz/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
