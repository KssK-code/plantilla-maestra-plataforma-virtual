import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { getMesesByModalidad, getDefaultModalidadId } from '@/lib/modalidades'
import { getPlanNombre } from '@/lib/licenciatura-utils'
import { CONFIG } from '@/lib/config'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Detalle básico: staff (ADMIN o SECRETARIO). El secretario recibe la
    // respuesta SIN notas internas ni documentos (solo lectura básica).
    const { data: usuarioStaff } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const viewerRol = (usuarioStaff?.rol as string | undefined)?.toUpperCase()
    if (viewerRol !== 'ADMIN' && viewerRol !== 'SECRETARIO') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    const esAdminViewer = viewerRol === 'ADMIN'

    const admin = createAdminClient()

    // ── Paso 1: obtener fila de alumnos ───────────────────────────────────────
    const { data: alumno, error } = await admin
      .from('alumnos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado', detail: error?.message }, { status: 404 })
    }

    const a = alumno as Record<string, unknown>

    // ── Paso 2: obtener datos del usuario (mismo id) ──────────────────────────
    const { data: usuario } = await admin
      .from('usuarios')
      .select('nombre, apellidos, email, foto_url, telefono')
      .eq('id', params.id)
      .single()

    const u = usuario as { nombre?: string; apellidos?: string; email?: string; foto_url?: string | null; telefono?: string } | null

    // ── Paso 3: calificaciones (IVS: acreditado; materias sin columna codigo) ───
    const { data: calificacionesRaw } = await admin
      .from('calificaciones')
      .select('id, acreditado, materia_id, evaluacion_id, materias(nombre)')
      .eq('alumno_id', params.id)

    // `calificaciones` no guarda puntaje en este esquema: solo el booleano
    // `acreditado`. La nota real vive en `intentos_evaluacion.puntaje`, asi que
    // se toma de ahi el MEJOR intento por materia. Antes se pintaba
    // `acreditado ? 100 : 0`, que mentia en los dos extremos: un examen de 60
    // aprobado salia como 100, y una materia sin presentar salia como 0 (que se
    // lee «saco cero», no «no ha presentado»).
    const { data: intentosCalif } = await admin
      .from('intentos_evaluacion')
      .select('puntaje, evaluaciones(materia_id)')
      .eq('alumno_id', params.id)

    const mejorPorMateria = new Map<string, number>()
    for (const row of (intentosCalif ?? []) as Record<string, unknown>[]) {
      const ev = row.evaluaciones as { materia_id?: string } | null | undefined
      const materiaId = ev?.materia_id
      const puntaje = Number(row.puntaje)
      if (!materiaId || !Number.isFinite(puntaje)) continue
      const previo = mejorPorMateria.get(materiaId)
      if (previo === undefined || puntaje > previo) mejorPorMateria.set(materiaId, puntaje)
    }

    const calificaciones = (calificacionesRaw ?? []).map((row: Record<string, unknown>) => {
      const m = row.materias as { nombre?: string } | null | undefined
      const acreditado = Boolean(row.acreditado)
      const materiaId  = row.materia_id as string | undefined
      const mejor      = materiaId ? mejorPorMateria.get(materiaId) : undefined
      return {
        id:                  row.id,
        // null = sin intentos registrados. La UI lo pinta como «—», nunca como 0.
        calificacion_final:  mejor ?? null,
        aprobada:            acreditado,
        materias:            { nombre: m?.nombre ?? '—', codigo: '' },
      }
    })

    // ── Paso 4: documentos (solo admin — el secretario no los ve) ─────────────
    const { data: documentos } = esAdminViewer
      ? await admin
          .from('documentos_alumno')
          .select('*')
          .eq('alumno_id', params.id)
      : { data: [] }

    // ── Paso 5: intentos de evaluación con join a evaluaciones y materias ─────
    const { data: intentosRaw } = await admin
      .from('intentos_evaluacion')
      .select(`
        id,
        numero_intento,
        puntaje,
        acreditado,
        fecha_intento,
        evaluaciones (
          id,
          titulo,
          materias ( nombre )
        )
      `)
      .eq('alumno_id', params.id)
      .order('fecha_intento', { ascending: false })

    // B7 — un alumno de diplomado no cursa el PROGRAMA. `getMesesByModalidad`
    // no devuelve null ante una modalidad NULL: cae al fallback «primera
    // modalidad activa» y devuelve 3, así que la ficha pintaba «0/3 meses» —
    // un denominador de un plan que ese alumno no tiene. 0 lo deja sin
    // denominador inventado.
    const esDiplomado = a.nivel === 'diplomado'
    const duracion = esDiplomado ? 0 : getMesesByModalidad(a.modalidad as string | null)

    // ── Paso 6: candados de corrección de plan ────────────────────────────────
    // La fuente de verdad es candado_corregir_plan() (SQL); aquí solo se lee
    // para que la ficha decida entre botón y texto explicativo. Si el cliente
    // no corrió la migración 20260817120000 la RPC no existe: plan_correccion
    // queda null y la UI no pinta ni botón ni texto — degrada, no rompe.
    let planCorreccion: { permitida: boolean; candado: string | null } | null = null
    if (esAdminViewer && !esDiplomado) {
      const { data: candado, error: candadoError } = await admin
        .rpc('candado_corregir_plan', { p_alumno: params.id })
      if (!candadoError) {
        planCorreccion = { permitida: candado === null, candado: (candado as string | null) ?? null }
      }
    }

    return NextResponse.json({
      id:                  a.id,
      matricula:           a.matricula ?? `${CONFIG.prefijoMatricula}-0000`,
      nivel:               a.nivel ?? null,
      carrera:             (a.carrera as string | null) ?? null,
      modalidad:           (a.modalidad as string | null) ?? getDefaultModalidadId(),
      duracion_meses:      duracion,
      meses_desbloqueados: a.meses_desbloqueados ?? 0,
      inscripcion_pagada:  a.inscripcion_pagada ?? false,
      sindicalizado:       Boolean(a.es_sindicalizado ?? a.sindicalizado),
      sindicato:           a.sindicato ?? null,
      // Notas internas: solo visibles para admin (el secretario recibe null)
      notas_admin:         esAdminViewer ? (a.notas_admin ?? '') : null,
      viewer_rol:          viewerRol,
      created_at:          a.created_at,
      plan_correccion:     planCorreccion,
      // Objeto plan para compatibilidad con UI existente
      plan: {
        id:             a.id,
        // getPlanNombre resuelve licenciatura por su carrera; el ternario
        // anterior pintaba 'Secundaria' para un alumno de licenciatura.
        nombre:         esDiplomado
                      ? 'Diplomado'
                      : getPlanNombre(a.nivel as string | null, a.carrera as string | null),
        duracion_meses: duracion,
        precio_mensual: 0,
      },
      activo: Boolean(a.activo),
      usuario: {
        nombre_completo: [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || '—',
        email:           u?.email ?? '—',
        telefono:        u?.telefono ?? null,
        foto_url:        u?.foto_url ?? null,
        activo:          Boolean(a.activo),
      },
      calificaciones: calificaciones ?? [],
      documentos:     documentos ?? [],
      pagos:          [],
      intentos:       intentosRaw ?? [],
    })
  } catch (err) {
    console.error('[GET /api/admin/alumnos/[id]] excepción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json()
    const admin = createAdminClient()

    // Schema nuevo: alumnos.id = user.id — actualizar alumnos.activo directamente
    const { error } = await admin
      .from('alumnos')
      .update({ activo: body.activo })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.contactado_whatsapp === 'boolean') {
      updates.contactado_whatsapp = body.contactado_whatsapp
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('alumnos')
      .update(updates)
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/admin/alumnos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    // Schema nuevo: alumnos.id = user.id — desactivar en alumnos directamente
    const admin = createAdminClient()
    const { error } = await admin
      .from('alumnos')
      .update({ activo: false })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
