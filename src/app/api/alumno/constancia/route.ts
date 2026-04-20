import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONFIG } from '@/lib/config'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Usuario ───────────────────────────────────────────────────────────────
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, email, foto_url')
      .eq('id', user.id)
      .single()

    // ── Alumno (schema nuevo: alumnos.id = user.id) ───────────────────────────
    const { data: alumno } = await supabase
      .from('alumnos')
      .select('matricula, nivel, modalidad, meses_desbloqueados, created_at')
      .eq('id', user.id)
      .single()

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const nombre_completo = [usuario?.nombre, usuario?.apellidos]
      .filter(Boolean)
      .join(' ') || 'Alumno'

    const duracionMeses = alumno.modalidad === '3_meses' ? 3 : 6

    // ── Calificaciones ────────────────────────────────────────────────────────
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id, aprobada')
      .eq('alumno_id', user.id)

    const califMap = new Map<string, boolean>()
    for (const c of (califs ?? [])) {
      const row = c as { materia_id: string; aprobada: boolean }
      califMap.set(row.materia_id, row.aprobada)
    }

    // ── Materias de meses desbloqueados via meses_contenido ───────────────────
    // meses_contenido.materia_id → materias.id (many-to-one → materias es objeto único)
    const { data: meses } = await supabase
      .from('meses_contenido')
      .select('numero_mes, materias(id, nombre)')
      .order('numero_mes')
      .lte('numero_mes', alumno.meses_desbloqueados ?? 0)

    type MesRow = {
      numero_mes: number
      materias: { id: string; nombre: string } | null
    }

    const materias_cursadas: {
      codigo: string; nombre: string; mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      const mat = mes.materias
      if (!mat) continue
      materias_cursadas.push({
        codigo:     '',
        nombre:     mat.nombre,
        mes_numero: mes.numero_mes,
        estado:     califMap.has(mat.id)
          ? (califMap.get(mat.id) ? 'Acreditada' : 'No acreditada')
          : 'Pendiente',
      })
    }

    const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0
    const porcentaje_avance = duracionMeses > 0
      ? Math.round((mesesDesbloqueados / duracionMeses) * 100)
      : 0

    const admin = createAdminClient()
    const { data: fotoDoc } = await admin
      .from('documentos_alumno')
      .select('url_archivo, nombre_archivo')
      .eq('alumno_id', user.id)
      .eq('tipo_documento', 'foto_perfil_doc')
      .order('fecha_subida', { ascending: false })
      .limit(1)
      .maybeSingle()

    let fotoPerfilUrl: string | null = usuario?.foto_url ?? null
    if (fotoDoc) {
      const doc = fotoDoc as { url_archivo?: string | null; nombre_archivo?: string | null }
      let storagePath: string | null = null
      const raw = doc.url_archivo
      if (raw) {
        const marker = '/documentos/'
        const idx = raw.indexOf(marker)
        if (idx !== -1) {
          storagePath = decodeURIComponent(raw.slice(idx + marker.length).split('?')[0])
        }
      }
      if (!storagePath) {
        const ext = (doc.nombre_archivo ?? 'foto.jpg').split('.').pop()?.toLowerCase() || 'jpg'
        storagePath = `${user.id}/foto_perfil_doc.${ext}`
      }
      const { data: signedData, error: signErr } = await admin.storage
        .from('documentos')
        .createSignedUrl(storagePath, 86400)
      if (!signErr && signedData?.signedUrl) {
        fotoPerfilUrl = signedData.signedUrl
      }
    }

    return NextResponse.json({
      nombre_completo,
      nombre:              usuario?.nombre   ?? '',
      apellidos:           usuario?.apellidos ?? '',
      foto_url:            fotoPerfilUrl,
      matricula:           alumno.matricula   ?? `${CONFIG.nombre}-0000`,
      nivel:               alumno.nivel       ?? null,
      modalidad:           alumno.modalidad   ?? '6_meses',
      meses_desbloqueados: mesesDesbloqueados,
      duracion_meses:      duracionMeses,
      plan_nombre:         duracionMeses === 3 ? '3 Meses' : '6 Meses',
      porcentaje_avance,
      fecha_inscripcion:   alumno.created_at,
      avatar_url:          fotoPerfilUrl,
      materias_cursadas,
    })
  } catch (err) {
    console.error('[api/alumno/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
