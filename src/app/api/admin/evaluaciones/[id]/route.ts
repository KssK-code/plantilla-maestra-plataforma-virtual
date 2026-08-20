import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarEvaluacion } from '@/lib/preguntas'
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

    // `activa` no está en la whitelist de validarEvaluacion: archivar o
    // restaurar es su propia acción, no una edición de contenido.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      // `.select()` para saber si de verdad tocó una fila: sin esto, un id
      // inexistente devolvería 200 {ok:true} sin haber cambiado nada, mientras
      // que la rama de edición sí da 404 en ese mismo caso.
      const { data, error } = await admin
        .from('evaluaciones').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarEvaluacion(body, { crear: false })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    // Ni `materia_id` ni `mes_id` se pueden reasignar por aquí: no están en la
    // whitelist, así que un examen no puede saltar de materia con un parche.
    const { data, error } = await admin
      .from('evaluaciones').update(validacion.datos).eq('id', params.id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/evaluaciones/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // Dos tablas cuelgan de una evaluación, y las DOS cuentan:
    //   · intentos_evaluacion → ON DELETE CASCADE: se perderían enteros.
    //   · calificaciones      → ON DELETE SET NULL: sobreviven, pero se quedan
    //     huérfanas, con un folio ya emitido que no apunta a ningún examen.
    const contar = async () => {
      const { count: intentos } = await admin
        .from('intentos_evaluacion').select('*', { count: 'exact', head: true })
        .eq('evaluacion_id', params.id)
      const { count: calificaciones } = await admin
        .from('calificaciones').select('*', { count: 'exact', head: true })
        .eq('evaluacion_id', params.id)
      return { intentos: intentos ?? 0, calificaciones: calificaciones ?? 0 }
    }

    const archivar = (c: { intentos: number; calificaciones: number }) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias: c.intentos + c.calificaciones,
        intentos: c.intentos,
        calificaciones: c.calificaciones,
        mensaje: `Esta evaluación ya tiene ${c.intentos} intento(s) y ${c.calificaciones} calificación(es) asociadas, así que se archivó en vez de borrarse: deja de aparecer, pero el historial de los alumnos queda intacto.`,
      })

    const antes = await contar()
    const decision = decidirRetirada(antes.intentos + antes.calificaciones)

    // Se ARCHIVA siempre primero, incluso cuando el conteo dice cero.
    //
    // El conteo y el borrado son dos viajes sin transacción: si un alumno
    // presenta el examen entre medias, su intento se iría con el CASCADE.
    // Archivar antes no cierra la carrera del todo —quien ya tenga el examen
    // en pantalla puede enviarlo— pero deja de servirse. Y si algo falla
    // después, el estado en el que se queda es el seguro.
    const { data: tocada, error: errArchivar } = await admin
      .from('evaluaciones').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocada || tocada.length === 0) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(antes)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const despues = await contar()
    if (despues.intentos + despues.calificaciones > 0) return archivar(despues)

    const { error } = await admin.from('evaluaciones').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/evaluaciones/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
