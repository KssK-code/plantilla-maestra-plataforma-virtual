import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { semanaId } = params

    // Obtener preguntas del quiz para esta semana
    const { data: preguntas } = await supabase
      .from('quiz_semana')
      .select('id, pregunta, opciones, respuesta_correcta, explicacion, orden')
      .eq('semana_id', semanaId)
      .order('orden')

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { id: alumnoId } = alumnoData as { id: string }

    // Verificar si el alumno ya completó este quiz
    const { data: respuestaPrevia } = await supabase
      .from('quiz_respuestas')
      .select('respuestas, completado_en')
      .eq('alumno_id', alumnoId)
      .eq('semana_id', semanaId)
      .single()

    return NextResponse.json({
      preguntas: preguntas ?? [],
      respuesta_previa: respuestaPrevia ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { semanaId } = params
    const body = await request.json()
    const { respuestas } = body as { respuestas: Record<string, number> }

    if (!respuestas) return NextResponse.json({ error: 'respuestas requeridas' }, { status: 400 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { id: alumnoId } = alumnoData as { id: string }

    // Guardar respuestas (upsert — permite re-intentar si no se guardó antes)
    const { error } = await supabase
      .from('quiz_respuestas')
      .upsert(
        {
          alumno_id: alumnoId,
          semana_id: semanaId,
          respuestas,
          completado_en: new Date().toISOString(),
        },
        { onConflict: 'alumno_id,semana_id', ignoreDuplicates: false }
      )

    if (error) return NextResponse.json({ error: 'Error al guardar respuestas' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
