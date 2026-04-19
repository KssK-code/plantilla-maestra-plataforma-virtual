import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET() {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    // ── Query con service role (bypass RLS) ──────────────────────────────────
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('documentos_alumno')
      .select(`
        id,
        alumno_id,
        tipo_documento,
        nombre_archivo,
        url_archivo,
        verificado,
        fecha_subida,
        notas
      `)
      .order('fecha_subida', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/documentos] Error:', error.message, '| code:', error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── Enriquecer con nombre del alumno ─────────────────────────────────────
    const alumnoIds = [...new Set((data ?? []).map((d: { alumno_id: string }) => d.alumno_id))]

    const { data: usuarios } = alumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', alumnoIds)
      : { data: [] }

    const usuarioMap = new Map<string, string>(
      (usuarios ?? []).map((u: { id: string; nombre?: string; apellidos?: string }) => [
        u.id,
        [u.nombre, u.apellidos].filter(Boolean).join(' ') || '—',
      ])
    )

    const result = (data ?? []).map((doc: { alumno_id: string; [key: string]: unknown }) => ({
      ...doc,
      alumno_nombre: usuarioMap.get(doc.alumno_id) ?? '—',
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/admin/documentos] excepción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
