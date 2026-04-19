import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar rol ADMIN (normaliza mayúsculas)
    const { data: usuarioAdmin } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const rolAdmin = (usuarioAdmin?.rol as string | undefined)?.toUpperCase()
    if (rolAdmin !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

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

    const calificaciones = (calificacionesRaw ?? []).map((row: Record<string, unknown>) => {
      const m = row.materias as { nombre?: string } | null | undefined
      const acreditado = Boolean(row.acreditado)
      return {
        id:                  row.id,
        calificacion_final:  acreditado ? 100 : 0,
        aprobada:            acreditado,
        materias:            { nombre: m?.nombre ?? '—', codigo: '' },
      }
    })

    // ── Paso 4: documentos ────────────────────────────────────────────────────
    const { data: documentos } = await admin
      .from('documentos_alumno')
      .select('*')
      .eq('alumno_id', params.id)

    const duracion = (a.modalidad as string) === '3_meses' ? 3 : 6

    return NextResponse.json({
      id:                  a.id,
      matricula:           a.matricula ?? 'IVS-0000',
      nivel:               a.nivel ?? null,
      modalidad:           a.modalidad ?? '6_meses',
      duracion_meses:      duracion,
      meses_desbloqueados: a.meses_desbloqueados ?? 0,
      inscripcion_pagada:  a.inscripcion_pagada ?? false,
      sindicalizado:       Boolean(a.es_sindicalizado ?? a.sindicalizado),
      sindicato:           a.sindicato ?? null,
      notas_admin:         a.notas_admin ?? '',
      created_at:          a.created_at,
      // Objeto plan para compatibilidad con UI existente
      plan: {
        id:             a.id,
        nombre:         a.nivel === 'preparatoria' ? 'Preparatoria' : 'Secundaria',
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
