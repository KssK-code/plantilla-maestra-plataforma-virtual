import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { errorDeRpcCurso, esEstadoInscripcion, fechaValida } from '@/lib/cursos/inscripciones'

// ─── GET /api/admin/inscripciones/[id] ───────────────────────────────────────
// Vista por inscripción: lo que el admin necesita enfrente para decidir.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { data: insc } = await admin
      .from('curso_inscripciones')
      .select('id, curso_id, alumno_id, meses_desbloqueados, estado, fecha_inscripcion, fecha_vencimiento, created_at')
      .eq('id', params.id)
      .maybeSingle()
    if (!insc) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

    const i = insc as Record<string, unknown>

    const { data: curso } = await admin
      .from('cursos')
      .select('id, nombre, tipo, modulos_por_mes, duracion_meses, precio_inscripcion, precio_mensualidad')
      .eq('id', i.curso_id as string)
      .maybeSingle()

    const { data: usuario } = await admin
      .from('usuarios')
      .select('nombre, apellidos, email')
      .eq('id', i.alumno_id as string)
      .maybeSingle()

    const { data: alumno } = await admin
      .from('alumnos')
      .select('matricula')
      .eq('id', i.alumno_id as string)
      .maybeSingle()

    // Tope real: lo calcula la MISMA función que usa "abrir mes", para que la
    // pantalla no pueda discrepar del servidor.
    const { data: tope } = await admin.rpc('curso_tope_meses', { p_curso_id: i.curso_id as string })

    const { count: modulosTotales } = await admin
      .from('curso_modulos')
      .select('id', { count: 'exact', head: true })
      .eq('curso_id', i.curso_id as string)

    const { data: pagos } = await admin
      .from('pagos')
      .select('id, monto, concepto, mes_desbloqueado, metodo_pago, referencia, fecha_pago, created_at')
      .eq('curso_inscripcion_id', params.id)
      .order('fecha_pago', { ascending: false })
      .order('created_at', { ascending: false })

    const porMes = (curso?.modulos_por_mes as number | undefined) ?? 0
    const meses = (i.meses_desbloqueados as number) ?? 0

    // Bitácora: solo la ve el admin (RLS de curso_inscripcion_eventos).
    const { data: eventos } = await admin
      .from('curso_inscripcion_eventos')
      .select('id, tipo, meses_antes, meses_despues, detalle, actor, created_at')
      .eq('inscripcion_id', params.id)
      .order('created_at', { ascending: false })

    const { data: constancia } = await admin
      .from('curso_constancias')
      .select('folio, emitido_en, calificacion, horas')
      .eq('inscripcion_id', params.id)
      .maybeSingle()

    return NextResponse.json({
      eventos: eventos ?? [],
      constancia: constancia ?? null,
      inscripcion: {
        id: i.id,
        estado: i.estado,
        meses_desbloqueados: meses,
        fecha_inscripcion: i.fecha_inscripcion,
        fecha_vencimiento: i.fecha_vencimiento,
        created_at: i.created_at,
      },
      alumno: {
        id: i.alumno_id,
        nombre: [usuario?.nombre, usuario?.apellidos].filter(Boolean).join(' ') || '—',
        email: usuario?.email ?? null,
        matricula: alumno?.matricula ?? null,
      },
      curso: curso ?? null,
      tope_meses: typeof tope === 'number' ? tope : null,
      modulos_totales: modulosTotales ?? 0,
      // Lo que el alumno ve HOY, con la misma aritmética del gate de B2.
      modulos_visibles: Math.min(meses * porMes, modulosTotales ?? 0),
      pagos: pagos ?? [],
    })
  } catch (err) {
    console.error('[GET /api/admin/inscripciones/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/inscripciones/[id] ─────────────────────────────────────
// Edita estado, fecha_vencimiento y fecha_inscripcion.
//
// ⚠️ NO admite meses_desbloqueados: ese contador solo se mueve por abrir-mes /
// cerrar-mes, que son los que aplican tope, estado y protección de doble clic.
// Dejarlo editable aquí sería una segunda puerta sin candado.
//
// fecha_inscripcion es el dato de NEGOCIO y por eso es editable (una escuela
// registra hoy a alguien que se inscribió la semana pasada); created_at es
// técnico e inmutable y no se toca. Ver los COMMENT de B1.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json().catch(() => ({}))
    const parche: Record<string, unknown> = {}

    // ⚠️ El estado NO se escribe con un UPDATE directo: pasa por
    // curso_cambiar_estado(), que registra el evento 'cambio_estado' con actor.
    //
    // Es la protección del comportamiento de reinscripción: cancelar NO resetea
    // meses_desbloqueados y reactivar los recupera — deliberado, porque esos
    // meses ya se pagaron y resetear cobraría dos veces. Lo que protege eso no es
    // un candado, es el RASTRO de quién reactivó y cuándo.
    let estadoNuevo: string | null = null
    if ('estado' in body) {
      if (!esEstadoInscripcion(body.estado)) {
        return NextResponse.json({ error: 'Estado inválido. Usa: activa, suspendida, completada, cancelada' }, { status: 400 })
      }
      estadoNuevo = body.estado
    }

    if ('fecha_vencimiento' in body) {
      if (body.fecha_vencimiento === null || body.fecha_vencimiento === '') {
        parche.fecha_vencimiento = null // sin vencimiento
      } else if (!fechaValida(body.fecha_vencimiento)) {
        return NextResponse.json({ error: 'fecha_vencimiento inválida. Usa una fecha real YYYY-MM-DD' }, { status: 400 })
      } else {
        parche.fecha_vencimiento = body.fecha_vencimiento
      }
    }

    if ('fecha_inscripcion' in body) {
      if (!fechaValida(body.fecha_inscripcion)) {
        return NextResponse.json({ error: 'fecha_inscripcion inválida. Usa una fecha real YYYY-MM-DD' }, { status: 400 })
      }
      parche.fecha_inscripcion = body.fecha_inscripcion
    }

    if ('meses_desbloqueados' in body) {
      return NextResponse.json(
        { error: 'Los meses se mueven con "Abrir mes" / "Cerrar mes", que aplican el tope y el estado. No se editan a mano.' },
        { status: 400 }
      )
    }

    if (Object.keys(parche).length === 0 && estadoNuevo === null) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    // El cambio de estado va primero y con la SESIÓN: la función comprueba
    // es_admin() adentro y es_admin() usa auth.uid(), que con service_role sería
    // NULL.
    if (estadoNuevo !== null) {
      const { error: errEstado } = await supabase.rpc('curso_cambiar_estado', {
        p_inscripcion_id: params.id,
        p_estado: estadoNuevo,
        p_motivo: typeof body?.motivo === 'string' && body.motivo.trim() !== '' ? body.motivo.trim() : null,
      })
      if (errEstado) {
        const { status, mensaje } = errorDeRpcCurso(errEstado)
        return NextResponse.json({ error: mensaje }, { status })
      }
    }

    const admin = createAdminClient()

    if (Object.keys(parche).length === 0) {
      const { data: actual } = await admin
        .from('curso_inscripciones')
        .select('id, estado, fecha_inscripcion, fecha_vencimiento, meses_desbloqueados')
        .eq('id', params.id)
        .maybeSingle()
      return NextResponse.json({ ok: true, inscripcion: actual })
    }
    const { data, error } = await admin
      .from('curso_inscripciones')
      .update(parche)
      .eq('id', params.id)
      .select('id, estado, fecha_inscripcion, fecha_vencimiento, meses_desbloqueados')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

    return NextResponse.json({ ok: true, inscripcion: data })
  } catch (err) {
    console.error('[PATCH /api/admin/inscripciones/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
