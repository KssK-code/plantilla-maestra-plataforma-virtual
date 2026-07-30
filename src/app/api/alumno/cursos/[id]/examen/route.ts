import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { leerIntentosPermitidos, leerPreguntas, puedeExamenFinal, puedeVerCurso, sanitizar } from '@/lib/cursos/examen'

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

    // Ventana de pago. Va aquí y no en la RLS porque esta ruta lee con
    // service_role, que la bypasea. Mismo 404 que "curso no disponible": no se
    // revela que el examen existe pero está bloqueado.
    if (!(await puedeExamenFinal(admin, params.id, user.id))) {
      return NextResponse.json(
        { error: 'El examen final se habilita cuando tienes el curso completo desbloqueado.' },
        { status: 403 }
      )
    }

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

    // El límite por curso viaja al cliente solo para pintar "te quedan N".
    // El candado de verdad lo aplica /examen/enviar en el servidor.
    const intentosPermitidos = await leerIntentosPermitidos(admin, params.id)

    return NextResponse.json({
      total: preguntas.length,
      mejor_porcentaje: previos?.[0]?.porcentaje ?? null,
      intentos_permitidos: intentosPermitidos,
      preguntas: preguntas.map(sanitizar),
    })
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]/examen]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
