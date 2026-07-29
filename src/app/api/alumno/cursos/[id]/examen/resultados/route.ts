import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { puedeVerCurso } from '@/lib/cursos/examen'
import type { ResultadoHistorial } from '@/types/cursos-examen'

// ─── GET /api/alumno/cursos/[id]/examen/resultados ───────────────────────────
// Historial propio del alumno en este curso, más su mejor puntaje.
// Cada envío es un renglón, así que el historial sale gratis: no hay estados
// de intento ni "intento en curso" que administrar.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (!(await puedeVerCurso(supabase, params.id))) {
      return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 })
    }

    // Se filtra por alumno_id del usuario en sesión: aunque se use el cliente
    // admin, un alumno nunca puede pedir el historial de otro.
    const admin = createAdminClient()
    const { data } = await admin
      .from('curso_examen_resultados')
      .select('id, aciertos, total, porcentaje, created_at')
      .eq('curso_id', params.id)
      .eq('alumno_id', user.id)
      .order('created_at', { ascending: false })

    const historial = (data ?? []) as ResultadoHistorial[]
    const mejor = historial.reduce<number | null>(
      (max, r) => (max === null || Number(r.porcentaje) > max ? Number(r.porcentaje) : max),
      null
    )

    return NextResponse.json({
      total_intentos: historial.length,
      mejor_porcentaje: mejor,
      historial,
    })
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]/examen/resultados]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
