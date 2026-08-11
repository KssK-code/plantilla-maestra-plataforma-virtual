import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cargarAlumnoAcceso, tieneAccesoEvaluacion } from '@/lib/acceso-materias'

const IDX_TO_LETTER = ['a', 'b', 'c', 'd'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const alumno = await cargarAlumnoAcceso(supabase, user.id)

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    // FIX #4: usar intentos_permitidos (no intentos_max), sin acceso por numero_mes
    const { data: evaluacion, error: evalError } = await supabase
      .from('evaluaciones')
      .select('id, titulo, intentos_permitidos, activa, materia_id, mes_id')
      .eq('id', params.id)
      .single()

    if (evalError || !evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    const ev = evaluacion as {
      id: string; titulo: string; intentos_permitidos: number; activa: boolean
      materia_id: string | null; mes_id: string | null
    }

    if (!ev.activa) {
      return NextResponse.json({ error: 'Esta evaluación no está disponible' }, { status: 403 })
    }

    // ── Gate canon idéntico al GET de evaluacion/[id] (misma función en
    // lib/acceso-materias) — bloquear la vista pero no el submit dejaría el
    // hueco vivo: POST directo a evaluaciones no desbloqueadas.
    const acceso = await tieneAccesoEvaluacion(supabase, alumno, ev)
    if (!acceso) {
      return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
    }

    // Verificar intentos disponibles
    const { count: intentosUsados } = await supabase
      .from('intentos_evaluacion')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)
      .eq('evaluacion_id', params.id)

    const usados = intentosUsados ?? 0
    if (usados >= ev.intentos_permitidos) {
      return NextResponse.json({ error: 'No tienes más intentos disponibles' }, { status: 400 })
    }

    // Obtener respuestas del alumno (índice numérico por pregunta_id)
    const body = await request.json()
    const respuestasAlumno: Record<string, number> = body.respuestas ?? {}

    // FIX #4: preguntas con schema IVS — opcion_a/b/c/d + respuesta_correcta ('a'/'b'/'c'/'d')
    const { data: rawPreguntas, error: pregError } = await supabase
      .from('preguntas')
      .select('id, orden, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta')
      .eq('evaluacion_id', params.id)
      .order('orden')

    if (pregError || !rawPreguntas) {
      return NextResponse.json({ error: 'Error al obtener preguntas' }, { status: 500 })
    }

    type PregRow = {
      id: string; orden: number | null; pregunta: string
      opcion_a: string; opcion_b: string; opcion_c: string; opcion_d: string | null
      respuesta_correcta: string // 'a' | 'b' | 'c' | 'd'
    }

    const pregs = rawPreguntas as unknown as PregRow[]

    // Calificar en el servidor
    let correctas = 0
    let contestadas = 0

    const detalle = pregs.map(p => {
      const selectedIdx    = respuestasAlumno[p.id] ?? -1
      const selectedLetra  = selectedIdx >= 0 ? (IDX_TO_LETTER[selectedIdx] ?? null) : null
      const esCorrecta     = selectedLetra === p.respuesta_correcta

      if (esCorrecta) correctas++
      if (selectedLetra !== null) contestadas++

      const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].filter(Boolean) as string[]
      const correctaIdx = ['a', 'b', 'c', 'd'].indexOf(p.respuesta_correcta)

      const base = {
        pregunta_id:       p.id,
        numero:            p.orden ?? 0,
        texto:             p.pregunta,
        texto_en:          p.pregunta,
        tipo:              'opcion_multiple',
        opciones,
        opciones_en:       opciones,
        respuesta_alumno:  selectedIdx,
        es_correcta:       esCorrecta,
        retroalimentacion: '',
      }

      // ⚠️ SEGURIDAD — la clave SOLO viaja para las preguntas que el alumno
      // contestó en ESTE envío. Antes se adjuntaba siempre, así que un POST con
      // `respuestas: {}` devolvía el índice correcto de TODAS las preguntas:
      // enviar en blanco, leer las claves y reenviar bien daba 100%. La clave se
      // OMITE (no va como -1 ni null) para no revelar su existencia posicional.
      return selectedLetra === null
        ? base
        : { ...base, respuesta_correcta: correctaIdx }
    })

    // Un envío sin una sola respuesta válida no se califica ni consume intento:
    // era el oráculo. Se valida ANTES de insertar el intento.
    if (contestadas === 0) {
      return NextResponse.json(
        { error: 'Contesta al menos una pregunta antes de enviar la evaluación.' },
        { status: 400 }
      )
    }

    const totalPregs  = pregs.length
    const puntaje     = totalPregs > 0 ? Math.round((correctas / totalPregs) * 100) : 0
    const acreditado  = puntaje >= 60
    const numeroIntento = usados + 1

    // FIX #4: insertar con columnas IVS — acreditado + puntaje + numero_intento
    const { error: intentoError } = await supabase
      .from('intentos_evaluacion')
      .insert({
        alumno_id:     alumno.id,
        evaluacion_id: params.id,
        puntaje,
        acreditado,
        numero_intento: numeroIntento,
      })

    if (intentoError) {
      return NextResponse.json({ error: intentoError.message }, { status: 500 })
    }

    if (ev.materia_id) {
      const admin = createAdminClient()
      console.log('[evaluacion/enviar] actualizando calificacion materia:', ev.materia_id, 'acreditado:', acreditado)

      const { data: existingCalif, error: califCheckErr } = await admin
        .from('calificaciones')
        .select('id, acreditado')
        .eq('alumno_id', alumno.id)
        .eq('materia_id', ev.materia_id)
        .maybeSingle()

      if (califCheckErr) {
        console.error('[evaluacion/enviar] calificaciones check falló:', califCheckErr.message)
      } else if (!existingCalif) {
        const { error: califInsErr } = await admin.from('calificaciones').insert({
          alumno_id:          alumno.id,
          materia_id:         ev.materia_id,
          evaluacion_id:      params.id,
          acreditado,
          fecha_acreditacion: acreditado ? new Date().toISOString() : null,
        })
        if (califInsErr) {
          console.error('[evaluacion/enviar] calificaciones insert falló:', califInsErr.code, califInsErr.message)
        } else {
          console.log('[evaluacion/enviar] calificaciones insert OK acreditado:', acreditado)
        }
      } else {
        const row = existingCalif as { id: string; acreditado: boolean }
        if (!row.acreditado && acreditado) {
          const { error: califUpdErr } = await admin.from('calificaciones')
            .update({ acreditado: true, evaluacion_id: params.id, fecha_acreditacion: new Date().toISOString() })
            .eq('id', row.id)
          if (califUpdErr) {
            console.error('[evaluacion/enviar] calificaciones update falló:', califUpdErr.code, califUpdErr.message)
          } else {
            console.log('[evaluacion/enviar] calificaciones actualizada a acreditado: true')
          }
        } else {
          console.log('[evaluacion/enviar] calificaciones sin cambio, acreditado existente:', row.acreditado)
        }
      }
    }

    // Logro: primer examen
    if (usados === 0) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'primer_examen' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
    }

    // Logro: examen perfecto
    if (puntaje === 100) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'examen_perfecto' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
    }

    // ── Logros "Mes completado" y "Mitad del camino" ──────────────────────────
    // Existían en el catálogo de BadgesGrid pero NINGUNA ruta los otorgaba: eran
    // insaculables por diseño. Se calculan aquí, que es el único punto donde una
    // materia pasa a acreditada, con el mismo criterio que usa la palomita del
    // dashboard: acreditación real de las materias del mes.
    if (acreditado) {
      try {
        // `admin` de arriba es local a otro bloque; aqui se crea el propio.
        const adminLogros = createAdminClient()
        const { data: acreditadasRows } = await adminLogros
          .from('calificaciones')
          .select('materia_id')
          .eq('alumno_id', alumno.id)
          .eq('acreditado', true)
        const acreditadasSet = new Set((acreditadasRows ?? []).map(r => (r as { materia_id: string }).materia_id))

        // Materias del MISMO mes que la materia recién acreditada.
        const { data: mesDeEsta } = await adminLogros
          .from('meses_contenido')
          .select('numero_mes')
          .eq('materia_id', ev.materia_id)
        const numerosMes = (mesDeEsta ?? []).map(r => (r as { numero_mes: number }).numero_mes)

        if (numerosMes.length > 0) {
          // OJO: `meses_contenido` numera meses para TODOS los niveles a la vez,
          // así que hay que filtrar por el nivel del alumno. Sin ese filtro, el
          // mes 1 incluiría materias de secundaria, prepa y licenciatura y el
          // every() no se cumpliría nunca.
          const { data: hermanas } = await adminLogros
            .from('meses_contenido')
            .select('materia_id, materias!inner(nivel, activa)')
            .in('numero_mes', numerosMes)
            .eq('materias.nivel', alumno.nivel)
            .eq('materias.activa', true)
          const idsMes = [...new Set((hermanas ?? []).map(r => (r as { materia_id: string }).materia_id))]
          if (idsMes.length > 0 && idsMes.every(id => acreditadasSet.has(id))) {
            await supabase.from('logros_alumno').upsert(
              { alumno_id: alumno.id, tipo_logro: 'mes_completado' },
              { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true })
          }
        }

        // Mitad del camino: la mitad de las materias regulares de su nivel.
        const { count: totalNivel } = await adminLogros
          .from('materias')
          .select('id', { count: 'exact', head: true })
          .eq('nivel', alumno.nivel)
          .eq('activa', true)
        if (totalNivel && acreditadasSet.size >= Math.ceil(totalNivel / 2)) {
          await supabase.from('logros_alumno').upsert(
            { alumno_id: alumno.id, tipo_logro: 'mitad_carrera' },
            { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true })
        }
      } catch (e) {
        // Un logro no debe tumbar el envío del examen.
        console.error('[evaluacion/enviar] logros mes/mitad:', e)
      }
    }

    // Respuesta backward-compatible con el componente EDVEX
    return NextResponse.json({
      calificacion:    puntaje / 10, // escala 0-10 para compatibilidad
      aprobado:        acreditado,
      total_preguntas: totalPregs,
      correctas,
      intento_numero:  numeroIntento,
      detalle,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
