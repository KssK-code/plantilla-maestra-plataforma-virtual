import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { removeFolder } from '@/lib/cursos/storage'
import { moveItem, type Direccion } from '@/lib/cursos/reorder'
import { errorDeRpcCurso } from '@/lib/cursos/inscripciones'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }), supabase }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied, supabase }
  return { denied: null, supabase }
}

/** El módulo debe pertenecer al curso de la URL. */
async function getModuloDelCurso(admin: ReturnType<typeof createAdminClient>, cursoId: string, moduloId: string) {
  const { data } = await admin
    .from('curso_modulos')
    .select('id, curso_id, nombre, orden')
    .eq('id', moduloId)
    .eq('curso_id', cursoId)
    .single()
  return data
}

// ─── PATCH — renombrar o mover (↑↓) ──────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; moduloId: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const modulo = await getModuloDelCurso(admin, params.id, params.moduloId)
    if (!modulo) return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })

    const body = await request.json()

    if (body.move === 'up' || body.move === 'down') {
      const result = await moveItem(admin, 'curso_modulos', 'curso_id', params.id, params.moduloId, body.move as Direccion)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json({ ok: true })
    }

    const nombre = (body.nombre as string | undefined)?.trim()
    if (!nombre) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

    const { data, error } = await admin
      .from('curso_modulos')
      .update({ nombre })
      .eq('id', params.moduloId)
      .select()
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/admin/cursos/[id]/modulos/[moduloId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── DELETE — borrar módulo + materiales de sus lecciones en storage ─────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; moduloId: string } }
) {
  try {
    const { denied, supabase } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const modulo = await getModuloDelCurso(admin, params.id, params.moduloId)
    if (!modulo) return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })

    // Ids de lecciones ANTES de borrar (el cascade elimina las filas)
    const { data: lecciones } = await admin
      .from('curso_lecciones')
      .select('id')
      .eq('modulo_id', params.moduloId)

    // Borrar Y COMPACTAR `orden` en una sola transaccion (B3/T4).
    //
    // Sin compactar, borrar un modulo deja un hueco y el hueco CORRE EL MES DE
    // LIBERACION: con modulos_por_mes = 2 y ordenes 0,1,2,3, si se borra el de
    // orden 1 quedan 0,2,3 y un alumno con 1 mes pagado pasa a ver UN modulo en
    // vez de dos. El error va en contra del alumno, que es la peor direccion
    // posible en un candado de pago.
    //
    // Va por RPC porque el cliente de Supabase no expone transacciones: borrar
    // y renumerar en dos llamadas dejaria una ventana con los ordenes rotos.
    // La funcion se llama con la SESION (no con admin): es SECURITY DEFINER y
    // comprueba es_admin() adentro, y es_admin() usa auth.uid() — con
    // service_role ese uid es NULL y rechazaria al propio administrador.
    const { error } = await supabase.rpc('curso_borrar_modulo', { p_modulo_id: params.moduloId })
    if (error) {
      const { status, mensaje } = errorDeRpcCurso(error)
      return NextResponse.json({ error: mensaje }, { status })
    }

    // Limpieza de materiales huérfanos: {cursoId}/{leccionId}/
    for (const l of lecciones ?? []) {
      await removeFolder(admin, `${params.id}/${l.id}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/cursos/[id]/modulos/[moduloId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
