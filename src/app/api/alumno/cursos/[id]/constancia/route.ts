import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/alumno/cursos/[id]/constancia ──────────────────────────────────
// La constancia del alumno en ESTE curso, o el motivo por el que aún no existe.
//
// ⚠️ Se lee con la SESIÓN DEL ALUMNO, deliberadamente SIN service_role: la RLS
// de curso_constancias (B1) es la que garantiza que cada quien vea solo la suya.
// Usar el cliente admin aquí saltaría esa política y habría que reimplementarla
// a mano — justo el patrón que este repo ya pagó caro.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Inscripción propia (RLS de curso_inscripciones: alumno_id = auth.uid()).
    const { data: insc } = await supabase
      .from('curso_inscripciones')
      .select('id')
      .eq('curso_id', params.id)
      .eq('alumno_id', user.id)
      .maybeSingle()

    if (!insc) {
      return NextResponse.json({ constancia: null, motivo: 'sin_inscripcion' })
    }

    const inscripcionId = (insc as { id: string }).id

    const { data: constancia } = await supabase
      .from('curso_constancias')
      .select('folio, emitido_en, horas, alumno_nombre, curso_nombre, calificacion')
      .eq('inscripcion_id', inscripcionId)
      .maybeSingle()

    if (constancia) {
      return NextResponse.json({ constancia, motivo: null })
    }

    // Sin constancia: se dice POR QUÉ, en vez de un vacío mudo.
    const { count: intentos } = await supabase
      .from('curso_examen_resultados')
      .select('id', { count: 'exact', head: true })
      .eq('curso_id', params.id)
      .eq('alumno_id', user.id)

    return NextResponse.json({
      constancia: null,
      motivo: (intentos ?? 0) === 0 ? 'examen_pendiente' : 'no_aprobado',
    })
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
