import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargarAlumnoAcceso, tieneAccesoEvaluacion } from '@/lib/acceso-materias'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const alumno = await cargarAlumnoAcceso(supabase, user.id)

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { data: evaluacion, error: evalError } = await supabase
      .from('evaluaciones')
      .select('id, titulo, intentos_permitidos, activa, materia_id, mes_id')
      .eq('id', params.id)
      .single()

    if (evalError || !evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    const ev = evaluacion as {
      id: string
      titulo: string
      intentos_permitidos: number
      activa: boolean
      materia_id: string | null
      mes_id: string | null
    }

    if (!ev.activa) {
      return NextResponse.json({ error: 'Esta evaluación no está disponible' }, { status: 403 })
    }

    // ── Gate canon (lib/acceso-materias): el MISMO criterio que decide
    // `disponible` en /api/alumno/materias, para que lista y gate no diverjan.
    const acceso = await tieneAccesoEvaluacion(supabase, alumno, ev)
    if (!acceso) {
      return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
    }

    const { count: intentosUsados } = await supabase
      .from('intentos_evaluacion')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)
      .eq('evaluacion_id', params.id)

    const { data: rawPreguntas, error: pregError } = await supabase
      .from('preguntas')
      .select('id, orden, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta')
      .eq('evaluacion_id', params.id)
      .order('orden')

    if (pregError) return NextResponse.json({ error: pregError.message }, { status: 500 })

    type PregRow = {
      id: string
      orden: number | null
      pregunta: string
      opcion_a: string
      opcion_b: string
      opcion_c: string
      opcion_d: string | null
      respuesta_correcta: string
    }

    const pregs = (rawPreguntas ?? []) as unknown as PregRow[]
    const preguntas = pregs.map((p, i) => {
      const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].filter(Boolean) as string[]
      return {
        id:          p.id,
        numero:      p.orden ?? i + 1,
        pregunta:    p.pregunta,
        texto:       p.pregunta,
        texto_en:    p.pregunta,
        tipo:        'OPCION_MULTIPLE' as const,
        opciones,
        opciones_en: opciones,
        puntos:      1,
      }
    })

    return NextResponse.json({
      evaluacion: {
        id:            ev.id,
        titulo:        ev.titulo,
        titulo_en:     ev.titulo,
        tipo:          'final',
        intentos_max:  ev.intentos_permitidos,
      },
      intentos_usados: intentosUsados ?? 0,
      preguntas,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
