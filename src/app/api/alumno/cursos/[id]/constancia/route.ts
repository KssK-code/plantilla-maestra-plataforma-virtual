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
    //
    // B8.2 — con la emisión MANUAL existe un estado nuevo entre "aprobó" y
    // "tiene constancia": el admin aún no emite. Sin distinguirlo, el alumno
    // aprobado caía en `no_aprobado` y la pantalla le decía que no aprobó
    // cuando sí lo hizo — mentirle justo en su mejor momento.
    const { data: resultados } = await supabase
      .from('curso_examen_resultados')
      .select('porcentaje')
      .eq('curso_id', params.id)
      .eq('alumno_id', user.id)
      .order('porcentaje', { ascending: false })
      .limit(1)

    const mejor = (resultados?.[0] as { porcentaje: number } | undefined)?.porcentaje

    let motivo: 'examen_pendiente' | 'no_aprobado' | 'aprobado_en_emision'
    if (mejor === undefined) {
      motivo = 'examen_pendiente'
    } else {
      // El umbral real del curso; el alumno puede leer `cursos` de su
      // inscripción por RLS, y si no llegara, 70 — el mismo default de siempre.
      const { data: curso } = await supabase
        .from('cursos')
        .select('calificacion_minima')
        .eq('id', params.id)
        .maybeSingle()
      const minima = (curso as { calificacion_minima: number | null } | null)?.calificacion_minima ?? 70
      motivo = mejor >= minima ? 'aprobado_en_emision' : 'no_aprobado'
    }

    return NextResponse.json({ constancia: null, motivo })
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
