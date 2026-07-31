import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getMesesByModalidad } from '@/lib/modalidades'

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
      .select('id, meses_desbloqueados, modalidad, nivel')
      .eq('id', params.id)
      .single()

    if (fetchError || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const a = alumno as { id: string; meses_desbloqueados: number; modalidad?: string; nivel?: string }

    // B7 — `alumnos.meses_desbloqueados` es la ventana del PROGRAMA, una columna
    // DISTINTA de `curso_inscripciones.meses_desbloqueados`, que es la que
    // gobierna el acceso al diplomado. Abrir aquí un mes a un alumno de
    // diplomado no le libera ni un módulo: solo ensucia el dato y contamina el
    // promedio de meses del reporte. Se cierra en el servidor, no en la UI.
    if (a.nivel === 'diplomado') {
      return NextResponse.json(
        { error: 'Este alumno no cursa un programa. Los meses de su diplomado se abren desde la ficha del curso.' },
        { status: 400 }
      )
    }

    const duracion = getMesesByModalidad(a.modalidad)

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
