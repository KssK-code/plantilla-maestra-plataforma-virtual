import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id, nivel, meses_desbloqueados, modalidad, duracion_meses')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as {
      id: string
      nivel: string
      meses_desbloqueados: number
      modalidad?: string | null
      duracion_meses?: number | null
    }

    const duracionMeses  = alumno.duracion_meses ?? (alumno.modalidad === '3_meses' ? 3 : 6)
    const materiasPorMes = duracionMeses === 3 ? 4 : 2
    const limiteMaterias = Math.max(0, alumno.meses_desbloqueados * materiasPorMes)

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

    const { data: matRow } = await supabase
      .from('materias')
      .select('nivel')
      .eq('id', ev.materia_id ?? '')
      .maybeSingle()

    const nivelMat = (matRow as { nivel?: string } | null)?.nivel
    const esDemo   = nivelMat === 'demo'

    if (!esDemo && ev.materia_id && nivelMat && nivelMat !== alumno.nivel) {
      return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
    }

    if (!esDemo) {
      if (alumno.meses_desbloqueados <= 0) {
        return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
      }

      if (ev.mes_id) {
        const { data: mesRow } = await supabase
          .from('meses_contenido')
          .select('numero_mes')
          .eq('id', ev.mes_id)
          .maybeSingle()
        const nm = (mesRow as { numero_mes?: number } | null)?.numero_mes ?? 0
        if (nm > alumno.meses_desbloqueados) {
          return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
        }
      }

      if (ev.materia_id && nivelMat && nivelMat === alumno.nivel) {
        const { data: planMaterias } = await supabase
          .from('materias')
          .select('id, orden')
          .eq('nivel', alumno.nivel)
          .eq('activa', true)
          .order('orden')

        const ordenadas = ((planMaterias ?? []) as { id: string; orden: number | null }[])
          .slice()
          .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
        const idx = ordenadas.findIndex(m => m.id === ev.materia_id)
        if (idx === -1 || idx >= limiteMaterias) {
          return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
        }
      }
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
