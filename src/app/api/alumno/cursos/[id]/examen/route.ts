import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { leerPreguntas, puedeVerCurso, sanitizar } from '@/lib/cursos/examen'

// ─── GET /api/alumno/cursos/[id]/examen ──────────────────────────────────────
// Devuelve el examen del curso SANITIZADO: sin respuesta_correcta y sin
// explicacion. La tabla tiene RLS solo-admin, así que se lee con el cliente
// admin DESPUÉS de validar sesión y acceso al curso con la sesión del alumno.
// 404 limpio si el curso no tiene examen.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Acceso al curso con el mismo canon que las lecciones: lo decide la RLS.
    if (!(await puedeVerCurso(supabase, params.id))) {
      return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 })
    }

    const admin = createAdminClient()
    const preguntas = await leerPreguntas(admin, params.id)
    if (preguntas.length === 0) {
      return NextResponse.json({ error: 'Este curso no tiene examen final' }, { status: 404 })
    }

    // Mejor puntaje previo, para que la UI pueda mostrar "volver a intentar".
    const { data: previos } = await admin
      .from('curso_examen_resultados')
      .select('porcentaje')
      .eq('curso_id', params.id)
      .eq('alumno_id', user.id)
      .order('porcentaje', { ascending: false })
      .limit(1)

    return NextResponse.json({
      total: preguntas.length,
      mejor_porcentaje: previos?.[0]?.porcentaje ?? null,
      preguntas: preguntas.map(sanitizar),
    })
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]/examen]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
