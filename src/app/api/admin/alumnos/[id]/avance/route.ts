import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Avance intra-materia de un alumno, para la ficha del panel admin.
 *
 * SOLO LECTURA. Responde qué semanas de cada materia tienen evidencia de
 * trabajo, sin inventar nada donde no la hay.
 *
 * Qué cuenta como evidencia (y por qué):
 *  - Una fila en `progreso_semanas` — por su EXISTENCIA, no por la columna
 *    `completada`: ese campo nunca se escribe (Bug 89 del PLAYBOOK) y vale
 *    `false` en el 100% de la flota. La UI del alumno ya opera así.
 *  - Respuestas en `quiz_respuestas` de un quiz de esa semana. Es la única
 *    señal FECHADA confiable, así que de ahí sale "última actividad".
 *
 * Lo que NO se hace aquí: tiempo dedicado ni fecha de cierre de semana. Eso es
 * la fase 2 del issue #54 y depende de arreglar la captura (Bug 89).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Mismo criterio que la ficha de alumno: staff (ADMIN o SECRETARIO)
    const { data: usuarioStaff } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const viewerRol = (usuarioStaff?.rol as string | undefined)?.toUpperCase()
    if (viewerRol !== 'ADMIN' && viewerRol !== 'SECRETARIO') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const admin = createAdminClient()

    // ── 1. Nivel del alumno ───────────────────────────────────────────────────
    const { data: alumnoRow } = await admin
      .from('alumnos')
      .select('nivel, carrera')
      .eq('id', params.id)
      .single()

    if (!alumnoRow) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    const { nivel, carrera } = alumnoRow as { nivel: string | null; carrera: string | null }

    // ── 2. Materias del plan ──────────────────────────────────────────────────
    // Scope por CARRERA además de por nivel: todas las de licenciatura
    // comparten `nivel`, así que filtrar solo por nivel listaba en la ficha el
    // catálogo de TODOS los programas del cliente —48 materias en vez de 24— y
    // el avance salía calculado sobre el plan equivocado. Mismo criterio que
    // `cargarContextoAcceso()` en lib/acceso-materias. Ver Bug 59.
    let materiasQuery = admin
      .from('materias')
      .select('id, nombre, orden')
      .eq('nivel', nivel ?? '')
      .eq('activa', true)

    if (nivel === 'licenciatura' && carrera) {
      materiasQuery = materiasQuery.eq('carrera', carrera)
    }

    const { data: materiasRaw } = await materiasQuery.order('orden')

    const materias = ((materiasRaw ?? []) as { id: string; nombre: string; orden: number | null }[])
    if (materias.length === 0) return NextResponse.json({ materias: [] })

    // ── 3. Semanas por materia: semanas.mes_id -> meses_contenido.materia_id ──
    //    (`semanas` NO tiene materia_id; ese camino no existe)
    // SIN filtro de `activa` en meses ni en semanas: esto mide lo que el alumno
    // YA hizo. Ocultar una semana archivada le borraría del avance el trabajo
    // que sí entregó, y movería el "en curso" a una semana que nunca tocó.
    const { data: mesesRaw } = await admin
      .from('meses_contenido')
      .select('id, materia_id')
      .in('materia_id', materias.map(m => m.id))

    const meses = ((mesesRaw ?? []) as { id: string; materia_id: string }[])
    const materiaDeMes = new Map(meses.map(m => [m.id, m.materia_id]))

    const { data: semanasRaw } = meses.length > 0
      ? await admin
          .from('semanas')
          .select('id, numero_semana, titulo, mes_id')
          .in('mes_id', meses.map(m => m.id))
          .order('numero_semana')
      : { data: [] }

    const semanas = ((semanasRaw ?? []) as {
      id: string; numero_semana: number; titulo: string; mes_id: string
    }[])

    // ── 4. Evidencia A: filas de progreso (por existencia) ────────────────────
    const { data: progresoRaw } = await admin
      .from('progreso_semanas')
      .select('semana_id, completada, fecha_completada, tiempo_visto_minutos')
      .eq('alumno_id', params.id)

    type ProgresoRow = {
      semana_id: string
      completada: boolean | null
      fecha_completada: string | null
      tiempo_visto_minutos: number | null
    }
    const progreso = ((progresoRaw ?? []) as ProgresoRow[])
    const conProgreso = new Set(progreso.map(p => p.semana_id))
    const datosProgreso = new Map(progreso.map(p => [p.semana_id, p]))

    // ── 5. Evidencia B: respuestas de quiz (con fecha) ────────────────────────
    //    Se filtra primero por alumno para acotar el conjunto; despues se
    //    resuelven solo los quizzes que ese alumno tocó.
    const { data: respuestasRaw } = await admin
      .from('quiz_respuestas')
      .select('quiz_id, fecha')
      .eq('alumno_id', params.id)

    const respuestas = ((respuestasRaw ?? []) as { quiz_id: string; fecha: string | null }[])
    const quizIds = [...new Set(respuestas.map(r => r.quiz_id).filter(Boolean))]

    // SIN filtro de `activa`: el avance se calcula sobre lo que el alumno YA
    // respondió. Una pregunta archivada que contestó sigue contando igual.
    const { data: quizzesRaw } = quizIds.length > 0
      ? await admin.from('quiz_semana').select('id, semana_id').in('id', quizIds)
      : { data: [] }

    const semanaDeQuiz = new Map(
      ((quizzesRaw ?? []) as { id: string; semana_id: string }[]).map(q => [q.id, q.semana_id])
    )

    // semana_id -> fecha mas reciente de actividad de quiz
    const ultimaPorSemana = new Map<string, string>()
    for (const r of respuestas) {
      const semanaId = semanaDeQuiz.get(r.quiz_id)
      if (!semanaId || !r.fecha) continue
      const previa = ultimaPorSemana.get(semanaId)
      if (!previa || r.fecha > previa) ultimaPorSemana.set(semanaId, r.fecha)
    }

    // ── 6. Armado por materia ─────────────────────────────────────────────────
    const porMateria = new Map<string, typeof semanas>()
    for (const s of semanas) {
      const materiaId = materiaDeMes.get(s.mes_id)
      if (!materiaId) continue
      if (!porMateria.has(materiaId)) porMateria.set(materiaId, [])
      porMateria.get(materiaId)!.push(s)
    }

    const resultado = materias.map(mat => {
      const lista = (porMateria.get(mat.id) ?? []).slice()
        .sort((a, b) => a.numero_semana - b.numero_semana)

      const conEvidencia = lista.map(s => conProgreso.has(s.id) || ultimaPorSemana.has(s.id))

      // "En curso" = la primera semana sin evidencia, siempre que ya haya al
      // menos una trabajada antes. Sin ninguna evidencia, todo queda Pendiente:
      // no hay dato que permita afirmar que empezó.
      let idxEnCurso = -1
      const primeraTrabajada = conEvidencia.indexOf(true)
      if (primeraTrabajada !== -1) {
        for (let i = primeraTrabajada + 1; i < conEvidencia.length; i++) {
          if (!conEvidencia[i]) { idxEnCurso = i; break }
        }
      }

      return {
        materia_id:    mat.id,
        nombre:        mat.nombre,
        orden:         mat.orden ?? 0,
        total_semanas: lista.length,
        trabajadas:    conEvidencia.filter(Boolean).length,
        semanas: lista.map((s, i) => {
          const p = datosProgreso.get(s.id)
          // Telemetría real (issue #54 F2). Puede venir vacía en dos casos
          // legítimos: filas anteriores al fix del Bug 89, y semanas que el
          // alumno aún no marca. La UI pinta «—»; nunca se rellena con nada.
          const tiempo = Number(p?.tiempo_visto_minutos ?? 0)
          return {
            id:                s.id,
            numero:            s.numero_semana,
            titulo:            s.titulo,
            estado:            conEvidencia[i] ? 'trabajada' : i === idxEnCurso ? 'en_curso' : 'pendiente',
            ultima_actividad:  ultimaPorSemana.get(s.id) ?? null,
            fecha_completada:  p?.fecha_completada ?? null,
            tiempo_minutos:    Number.isFinite(tiempo) && tiempo > 0 ? tiempo : null,
          }
        }),
      }
    })

    return NextResponse.json({ materias: resultado })
  } catch (err) {
    console.error('[GET /api/admin/alumnos/[id]/avance]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
