import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import {
  validarMes, dependenciasMes, describirDependencias, type Dependencias,
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json()
    const admin = createAdminClient()

    // `activa` no está en la whitelist de `validarMes`: retirar o restaurar es
    // su propia acción, con su propio conteo de dependencias.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      const { data, error } = await admin
        .from('meses_contenido').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarMes(body, { crear: false })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const { data, error } = await admin
      .from('meses_contenido').update(validacion.datos).eq('id', params.id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/meses/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // Un mes arrastra sus semanas con CASCADE, y con ellas todo lo del alumno:
    // progreso, notas personales, quiz y respuestas. Los exámenes cuentan
    // aparte y AUNQUE nadie los haya respondido: `evaluaciones.mes_id` es SET
    // NULL, así que sobreviven al borrado pero quedan huérfanos e inalcanzables
    // por la API, que lista por mes.
    const antes = await dependenciasMes(admin, params.id)

    const archivar = (d: Dependencias) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias: d.total,
        detalle: d.detalle,
        mensaje: `Este mes se archivó en vez de borrarse porque hay ${describirDependencias(d)}. Deja de aparecer para el alumno, pero todo eso queda intacto.`,
      })

    const decision = decidirRetirada(antes.total)

    // Se ARCHIVA siempre primero, incluso con el conteo a cero: el conteo y el
    // borrado son dos viajes sin transacción, y archivar antes deja de servir
    // el mes, así que estrecha la ventana en la que algo nuevo se iría por la
    // cascada. Si algo falla después, el estado en el que queda es el seguro.
    const { data: tocado, error: errArchivar } = await admin
      .from('meses_contenido').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocado || tocado.length === 0) {
      return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(antes)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const despues = await dependenciasMes(admin, params.id)
    if (despues.total > 0) return archivar(despues)

    const { error } = await admin.from('meses_contenido').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrado' })
  } catch (err) {
    console.error('[DELETE /api/admin/meses/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
