import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calificar, leerPreguntas, puedeVerCurso } from '@/lib/cursos/examen'
import type { RespuestaEnviada } from '@/types/cursos-examen'

// ─── POST /api/alumno/cursos/[id]/examen/enviar ──────────────────────────────
// Califica 100% en el servidor (patrón de evaluacion/[id]/enviar), guarda el
// resultado e incluye en la respuesta la revisión completa: tu respuesta, la
// correcta y la explicación. Es el ÚNICO momento en que la clave sale al
// cliente, y ya con el envío calificado.
//
// body { respuestas: [{ pregunta_id, respuesta }] }
// Las preguntas sin contestar cuentan como incorrectas.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (!(await puedeVerCurso(supabase, params.id))) {
      return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 })
    }

    // Mismo canon que evaluacion/[id]/enviar: alumnos.id = user.id.
    // Se resuelve antes de calificar para que un usuario sin fila de alumno
    // (por ejemplo un admin en vista previa) reciba un 404 legible en vez de
    // reventar contra la FK de curso_examen_resultados.alumno_id.
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!alumnoData) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }
    const alumnoId = (alumnoData as { id: string }).id

    const body = await request.json().catch(() => ({}))
    const enviadas = Array.isArray(body?.respuestas) ? (body.respuestas as RespuestaEnviada[]) : []

    const admin = createAdminClient()
    const preguntas = await leerPreguntas(admin, params.id)
    if (preguntas.length === 0) {
      return NextResponse.json({ error: 'Este curso no tiene examen final' }, { status: 404 })
    }

    const { aciertos, total, porcentaje, desglose, respuestas, revision } = calificar(preguntas, enviadas)

    // El INSERT va con cliente admin: la RLS de resultados solo deja escribir a
    // admin justamente para que el alumno no pueda fabricarse una calificación.
    const { data: guardado, error } = await admin
      .from('curso_examen_resultados')
      .insert({
        curso_id: params.id,
        alumno_id: alumnoId,
        aciertos,
        total,
        porcentaje,
        desglose_temas: desglose,
        respuestas,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('[POST /api/alumno/cursos/[id]/examen/enviar] insert', error)
      return NextResponse.json({ error: 'No se pudo guardar el resultado' }, { status: 500 })
    }

    return NextResponse.json({
      id: guardado.id,
      created_at: guardado.created_at,
      aciertos,
      total,
      porcentaje,
      desglose_temas: desglose,
      revision,
    })
  } catch (err) {
    console.error('[POST /api/alumno/cursos/[id]/examen/enviar]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
