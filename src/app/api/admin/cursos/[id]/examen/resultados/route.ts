import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

// ─── GET /api/admin/cursos/[id]/examen/resultados ────────────────────────────
// Resultados de TODOS los alumnos del curso, con nombre y correo.
// No se devuelve el JSONB de respuestas: para el panel basta el puntaje, y
// mandar el detalle de cada envío engorda la respuesta sin necesidad.
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
    const { data, error } = await admin
      .from('curso_examen_resultados')
      .select('id, alumno_id, aciertos, total, porcentaje, desglose_temas, created_at')
      .eq('curso_id', params.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const filas = data ?? []
    const ids = [...new Set(filas.map(r => r.alumno_id as string))]

    // El nombre vive en usuarios, y alumnos.id = usuarios.id en este esquema.
    const nombres = new Map<string, { nombre: string | null; email: string | null }>()
    if (ids.length > 0) {
      const { data: usuarios } = await admin
        .from('usuarios')
        .select('id, nombre, email')
        .in('id', ids)
      for (const u of usuarios ?? []) {
        nombres.set(u.id as string, {
          nombre: (u.nombre as string | null) ?? null,
          email: (u.email as string | null) ?? null,
        })
      }
    }

    return NextResponse.json({
      resultados: filas.map(r => ({
        ...r,
        alumno_nombre: nombres.get(r.alumno_id as string)?.nombre ?? null,
        alumno_email: nombres.get(r.alumno_id as string)?.email ?? null,
      })),
    })
  } catch (err) {
    console.error('[GET /api/admin/cursos/[id]/examen/resultados]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
