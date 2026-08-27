import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMateriasPorMesByModalidad, getMateriasPorMesLicenciatura } from '@/lib/modalidades'
import { rangoMateriasDelMes } from '@/lib/acceso-materias'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Verificar sesión ──────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Verificar rol ADMIN (case-insensitive, igual que desbloquear-mes) ─────
    const { data: usuarioAdmin } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    const esAdmin = (usuarioAdmin?.rol as string | undefined)?.toLowerCase() === 'admin'
    if (!esAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    // ── Admin client con service role (bypassa RLS) ───────────────────────────
    const admin = createAdminClient()

    const alumnoId = params.id

    // ── Obtener alumno ────────────────────────────────────────────────────────
    const { data: alumnoData, error: alumnoErr } = await admin
      .from('alumnos')
      .select('id, nivel, carrera, modalidad, meses_desbloqueados')
      .eq('id', alumnoId)
      .single()

    if (alumnoErr || !alumnoData) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const alumno = alumnoData as {
      id: string
      nivel: string
      /** Solo licenciatura. Acota el rango de materias del mes a SU programa. */
      carrera: string | null
      modalidad: string | null
      meses_desbloqueados: number
    }

    if (alumno.meses_desbloqueados <= 0) {
      return NextResponse.json(
        { error: 'No hay meses para cerrar' },
        { status: 400 }
      )
    }

    // ── Calcular rango de materias del mes a cerrar ───────────────────────────
    // Al cerrar el mes N hay que tocar EXACTAMENTE las materias que ese mes
    // abrió. El rango sale de `rangoMateriasDelMes`, que vive junto a la
    // ventana de acceso para que las dos no puedan divergir.
    //
    // Antes se calculaba aquí como [(N-1)*MPM, N*MPM - 1]. Con `materiasPorMes`
    // fraccionario —que es lo que usa el add-on de licenciaturas para repartir
    // 32 materias sobre 9, 12, 18 o 24 meses— eso producía offsets decimales
    // que `postgrest-js` manda tal cual (`?offset=3.56&limit=1.78`) y que
    // además no coincidían con la ventana: se borraba el avance de las materias
    // equivocadas. Con MPM entero el resultado es idéntico al de antes.
    const mesACerrar     = alumno.meses_desbloqueados
    // Igual que en `materiasPorMesDePlan()`: los ids de las dos tablas de
    // modalidades colisionan y `getMateriasPorMesByModalidad` devuelve el del
    // programa de Sec/Prepa. Aquí eso partiría el rango a la mitad. Ver Bug 121.
    const materiasPorMes = (alumno.nivel === 'licenciatura'
      ? getMateriasPorMesLicenciatura(alumno.modalidad)
      : undefined) ?? getMateriasPorMesByModalidad(alumno.modalidad)
    const { desde: offsetInicio, hasta: offsetFin } =
      rangoMateriasDelMes(mesACerrar, materiasPorMes)

    // ── Obtener IDs de las materias del mes ───────────────────────────────────
    // Scope por CARRERA además de por nivel. Sin esto el `.range()` cae sobre
    // el catálogo de TODAS las carreras de licenciatura mezcladas —comparten
    // nivel— y el cierre toca materias de otro programa mientras deja el propio
    // mes cerrado a medias. Y esto BORRA progreso, respuestas de quiz e
    // intentos, así que el rango tiene que ser exacto. Ver Bug 59.
    let materiasQuery = admin
      .from('materias')
      .select('id, nombre')
      .eq('nivel', alumno.nivel)
      .eq('activa', true)

    if (alumno.nivel === 'licenciatura' && alumno.carrera) {
      materiasQuery = materiasQuery.eq('carrera', alumno.carrera)
    }

    const { data: materias, error: matErr } = await materiasQuery
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
      .range(offsetInicio, offsetFin)

    if (matErr || !materias || materias.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron materias para este mes' },
        { status: 400 }
      )
    }

    const materiaIds = (materias as { id: string; nombre: string }[]).map(m => m.id)

    // ── Obtener IDs intermedios para los DELETEs ──────────────────────────────

    // evaluaciones de estas materias
    const { data: evaluaciones } = await admin
      .from('evaluaciones')
      .select('id')
      .in('materia_id', materiaIds)
    const evaluacionIds = (evaluaciones ?? []).map((e: { id: string }) => e.id)

    // meses_contenido → semanas → quiz_semana
    // SIN filtro de `activa` en NINGUNO de los tres niveles: estos ids son para
    // BORRAR los datos del alumno. Filtrar dejaría vivo el progreso y las
    // respuestas de meses y semanas archivados, huérfanos y sin forma de
    // volver a alcanzarlos.
    const { data: mesesContenido } = await admin
      .from('meses_contenido')
      .select('id')
      .in('materia_id', materiaIds)
    const mesesIds = (mesesContenido ?? []).map((m: { id: string }) => m.id)

    let semanaIds: string[] = []
    let quizIds:   string[] = []

    if (mesesIds.length > 0) {
      const { data: semanas } = await admin
        .from('semanas')
        .select('id')
        .in('mes_id', mesesIds)
      semanaIds = (semanas ?? []).map((s: { id: string }) => s.id)

      if (semanaIds.length > 0) {
        // SIN filtro de `activa`: aquí se recogen los ids para BORRAR las
        // respuestas del alumno. Filtrar dejaría huérfanas las de preguntas
        // archivadas.
        const { data: quizzes } = await admin
          .from('quiz_semana')
          .select('id')
          .in('semana_id', semanaIds)
        quizIds = (quizzes ?? []).map((q: { id: string }) => q.id)
      }
    }

    // ── Borrar datos del alumno en orden inverso a dependencias ───────────────
    const datos_borrados = { calificaciones: 0, intentos: 0, progreso: 0, quizzes: 0 }

    // 1. quiz_respuestas
    if (quizIds.length > 0) {
      const { count } = await admin
        .from('quiz_respuestas')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('quiz_id', quizIds)
      datos_borrados.quizzes = count ?? 0
    }

    // 2. progreso_semanas
    if (semanaIds.length > 0) {
      const { count } = await admin
        .from('progreso_semanas')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('semana_id', semanaIds)
      datos_borrados.progreso = count ?? 0
    }

    // 3. intentos_evaluacion
    if (evaluacionIds.length > 0) {
      const { count } = await admin
        .from('intentos_evaluacion')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('evaluacion_id', evaluacionIds)
      datos_borrados.intentos = count ?? 0
    }

    // 4. calificaciones (por materia_id directamente)
    const { count: califCount } = await admin
      .from('calificaciones')
      .delete({ count: 'exact' })
      .eq('alumno_id', alumnoId)
      .in('materia_id', materiaIds)
    datos_borrados.calificaciones = califCount ?? 0

    // ── Decrementar meses_desbloqueados ───────────────────────────────────────
    const nuevoMes = alumno.meses_desbloqueados - 1

    const { error: updateErr } = await admin
      .from('alumnos')
      .update({ meses_desbloqueados: nuevoMes })
      .eq('id', alumnoId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success:                    true,
      mes_cerrado:                mesACerrar,
      materias_cerradas:          (materias as { id: string; nombre: string }[]).map(m => m.nombre),
      datos_borrados,
      meses_desbloqueados_actual: nuevoMes,
    })
  } catch (err) {
    console.error('[POST /api/admin/alumnos/[id]/cerrar-mes]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
