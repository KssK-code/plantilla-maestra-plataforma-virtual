import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  calificar,
  leerIntentosPermitidos,
  leerPreguntas,
  puedeVerCurso,
} from '@/lib/cursos/examen'
import type { RespuestaEnviada } from '@/types/cursos-examen'

// ─── POST /api/alumno/cursos/[id]/examen/enviar ──────────────────────────────
// Califica 100% en el servidor (patrón de evaluacion/[id]/enviar), guarda el
// resultado e incluye en la respuesta la revisión del envío: tu respuesta y,
// SOLO para las preguntas que contestaste, la correcta y la explicación.
//
// body { respuestas: [{ pregunta_id, respuesta }] }
// Las preguntas sin contestar cuentan como incorrectas, pero su clave NO viaja.
//
// DOS CANDADOS, ambos server-side (la UI no es una defensa):
//   1. Envío vacío rechazado: sin al menos una respuesta válida contra el banco
//      no se califica ni se guarda. Antes, un POST con todo en null devolvía el
//      banco completo con las claves — un oráculo de una sola petición.
//   2. Límite de intentos: se cuentan las filas previas del alumno en
//      curso_examen_resultados. Sin esto, el punto 1 se podía sortear
//      contestando una pregunta al azar y repitiendo hasta reconstruir el banco.
//      Los dos candados juntos son los que cierran el agujero; por separado, no.
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

    // ── Candado 2: intentos ──────────────────────────────────────────────────
    // Se cuenta con el cliente admin, filtrando por alumno_id: la RLS de
    // resultados deja al alumno leer los suyos, pero el conteo no puede
    // depender de eso porque el INSERT también va con admin.
    const { count: intentosUsados } = await admin
      .from('curso_examen_resultados')
      .select('id', { count: 'exact', head: true })
      .eq('curso_id', params.id)
      .eq('alumno_id', alumnoId)

    // El límite es POR CURSO (cursos.intentos_permitidos, B1). Si la columna
    // viniera nula se cae al default: un error de lectura no abre el candado.
    const permitidos = await leerIntentosPermitidos(admin, params.id)

    const usados = intentosUsados ?? 0
    if (usados >= permitidos) {
      // Sin revisión en el cuerpo: un envío rechazado no puede ser una vía
      // alterna para leer claves.
      return NextResponse.json(
        {
          error: `Ya usaste tus ${permitidos} intentos para este examen.`,
          intentos_usados: usados,
          intentos_permitidos: permitidos,
        },
        { status: 409 }
      )
    }

    const { aciertos, total, porcentaje, desglose, respuestas, revision, contestadas } =
      calificar(preguntas, enviadas)

    // ── Candado 1: envío vacío ───────────────────────────────────────────────
    // Se valida DESPUÉS de calificar (para reutilizar el conteo contra el banco)
    // pero ANTES de insertar: un envío vacío no consume intento, no deja fila y
    // no devuelve revisión.
    if (contestadas === 0) {
      return NextResponse.json(
        { error: 'Contesta al menos una pregunta antes de enviar el examen.' },
        { status: 400 }
      )
    }

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
      // Para que la UI pueda mostrar los intentos restantes sin otra petición.
      intentos_usados: usados + 1,
      intentos_permitidos: permitidos,
    })
  } catch (err) {
    console.error('[POST /api/alumno/cursos/[id]/examen/enviar]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
