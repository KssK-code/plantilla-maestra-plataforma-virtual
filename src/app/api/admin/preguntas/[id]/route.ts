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
    const admin = createAdminClient()

    // `activa` no está en la whitelist de validarPregunta: archivar o restaurar
    // es su propia acción, no una edición de contenido.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      // `.select()` para saber si de verdad tocó una fila: sin esto, un id
      // inexistente devolvería 200 {ok:true} sin haber cambiado nada, mientras
      // que la rama de edición sí da 404 en ese mismo caso.
      const { data, error } = await admin
        .from('preguntas').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    // Tipo examen, igual que al crear. Y aquí NO hace falta releer la fila para
    // cerrar la coherencia 'd' ↔ opcion_d, como sí ocurre en el quiz semanal:
    // `preguntas.opcion_d` es NOT NULL, así que la fila nunca puede tener la
    // opción D vacía y el caso simplemente no existe.
    const validacion = validarPregunta(body, { crear: false, tipo: 'examen' })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const { data, error } = await admin
      .from('preguntas').update(validacion.datos).eq('id', params.id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/preguntas/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // De `preguntas` no cuelga nadie, así que el DELETE no arrastra filas. Lo
    // que sí cambia es el PASADO: quitar una pregunta altera retroactivamente
    // el examen contra el que ya se calculó una calificación emitida. Por eso
    // las dependencias son los intentos de SU evaluación.
    const { data: pregunta } = await admin
      .from('preguntas').select('evaluacion_id').eq('id', params.id).maybeSingle()
    if (!pregunta) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    const evaluacionId = (pregunta as { evaluacion_id: string }).evaluacion_id

    const contar = async () => {
      const { count } = await admin
        .from('intentos_evaluacion').select('*', { count: 'exact', head: true })
        .eq('evaluacion_id', evaluacionId)
      return count ?? 0
    }

    const archivar = (dependencias: number) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias,
        mensaje: `${dependencias} intento(s) de este examen ya están calificados, así que la pregunta se archivó en vez de borrarse: deja de aparecer, pero las notas ya emitidas siguen cuadrando con el examen que se presentó.`,
      })

    const antes = await contar()
    const decision = decidirRetirada(antes)

    // Se ARCHIVA siempre primero, incluso cuando el conteo dice cero: el conteo
    // y el borrado son dos viajes sin transacción, y si un alumno presenta el
    // examen entre medias su intento quedaría calificado contra una pregunta
    // que ya no existe. Archivar antes deja de servirla, y si algo falla
    // después el estado en el que se queda es el seguro.
    const { data: tocada, error: errArchivar } = await admin
      .from('preguntas').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocada || tocada.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(decision.dependencias)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const despues = await contar()
    if (despues > 0) return archivar(despues)

    const { error } = await admin.from('preguntas').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/preguntas/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
