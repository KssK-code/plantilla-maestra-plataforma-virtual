import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Verificar sesión ──────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Verificar rol ADMIN (case-insensitive) ────────────────────────────────
    const { data: usuarioAdmin } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    const esAdmin = (usuarioAdmin?.rol as string | undefined)?.toLowerCase() === 'admin'
    if (!esAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    // ── Usar service role para saltarse RLS ───────────────────────────────────
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Obtener alumno ────────────────────────────────────────────────────────
    const { data: alumno, error: fetchError } = await admin
      .from('alumnos')
      .select('id, meses_desbloqueados, modalidad')
      .eq('id', params.id)
      .single()

    if (fetchError || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const a = alumno as { id: string; meses_desbloqueados: number; modalidad?: string }
    const duracion = a.modalidad === '3_meses' ? 3 : 6

    if (a.meses_desbloqueados >= duracion) {
      return NextResponse.json({ error: 'Todos los meses ya están desbloqueados' }, { status: 400 })
    }

    const nuevoMes = a.meses_desbloqueados + 1

    // ── Desbloquear siguiente mes ─────────────────────────────────────────────
    const { error: updateError } = await admin
      .from('alumnos')
      .update({ meses_desbloqueados: nuevoMes })
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true, meses_desbloqueados: nuevoMes })
  } catch (err) {
    console.error('[POST /api/admin/alumnos/[id]/desbloquear-mes]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
