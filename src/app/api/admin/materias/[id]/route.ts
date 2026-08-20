import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import {
  validarMateria, dependenciasMateria, describirDependencias, type Dependencias,
} from '@/lib/estructura-contenido'
import { decidirRetirada } from '@/lib/retirar-contenido'
import { getCarreras } from '@/lib/licenciatura-utils'

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

    // `activa` no está en la whitelist de `validarMateria`: retirar o
    // restaurar es su propia acción, con su propio conteo de dependencias.
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      const { data, error } = await admin
        .from('materias').update({ activa: body.activa }).eq('id', params.id).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarMateria(body, { crear: false })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const { data: actual } = await admin
      .from('materias').select('nivel, carrera').eq('id', params.id).maybeSingle()
    if (!actual) return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })

    // La coherencia nivel ↔ carrera se cierra AQUÍ, contra la FILA, igual que
    // la coherencia 'd' ↔ opcion_d de F3: `validarMateria` no ve la fila, así
    // que un parche que cambia `carrera` sin tocar `nivel` la deja pasar sin
    // saber si esta materia es de licenciatura. Se evalúa el resultado FINAL.
    const fila = actual as { nivel: string | null; carrera: string | null }
    const datos = { ...validacion.datos }
    const nivelFinal = datos.nivel ?? fila.nivel
    const carreraFinal = 'carrera' in datos ? (datos.carrera ?? null) : fila.carrera

    if (nivelFinal !== 'licenciatura') {
      // Una materia de secundaria con carrera se filtraría por carrera y
      // desaparecería del catálogo de TODOS los alumnos de ese nivel.
      datos.carrera = null
    } else {
      if (!carreraFinal) {
        return NextResponse.json(
          { error: 'No puedes dejar sin carrera una materia de licenciatura' }, { status: 400 })
      }
      // Si el parche trae `carrera` sin `nivel`, el validador solo la recortó:
      // el contraste contra el CONFIG queda para aquí.
      if (datos.nivel === undefined && 'carrera' in datos) {
        const validas = getCarreras().map(c => c.slug)
        if (!validas.includes(carreraFinal)) {
          return NextResponse.json(
            { error: `carrera debe ser una de: ${validas.join(', ') || 'ninguna configurada'}` },
            { status: 400 })
        }
      }
      datos.carrera = carreraFinal
    }

    const { data, error } = await admin
      .from('materias').update(datos).eq('id', params.id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/materias/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // Es el borrado que más duele del sistema: `calificaciones` cuelga con
    // CASCADE —son las NOTAS del alumno—, y con la materia se van también sus
    // meses, sus semanas y todo lo que colgaba de ellas, más los exámenes con
    // sus intentos y el glosario. `constancias.materia_id` es SET NULL: la
    // constancia ya emitida sobrevive, pero se queda sin saber de qué era.
    const antes = await dependenciasMateria(admin, params.id)

    const archivar = (d: Dependencias) =>
      NextResponse.json({
        accion: 'archivada',
        dependencias: d.total,
        detalle: d.detalle,
        mensaje: `Esta materia se archivó en vez de borrarse porque hay ${describirDependencias(d)}. Deja de aparecer para el alumno, pero todo eso queda intacto.`,
      })

    const decision = decidirRetirada(antes.total)

    // Se ARCHIVA siempre primero, incluso con el conteo a cero: el conteo y el
    // borrado son dos viajes sin transacción, y archivar antes deja de servir
    // la materia, así que estrecha la ventana en la que una calificación nueva
    // se iría por la cascada. Si algo falla después, el estado en el que queda
    // es el seguro.
    const { data: tocada, error: errArchivar } = await admin
      .from('materias').update({ activa: false }).eq('id', params.id).select('id')
    if (errArchivar) return NextResponse.json({ error: errArchivar.message }, { status: 500 })
    if (!tocada || tocada.length === 0) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
    }

    if (decision.accion === 'archivar') return archivar(antes)

    // Recuento tras archivar: cierra la ventana que quedaba abierta.
    const despues = await dependenciasMateria(admin, params.id)
    if (despues.total > 0) return archivar(despues)

    const { error } = await admin.from('materias').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/materias/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
