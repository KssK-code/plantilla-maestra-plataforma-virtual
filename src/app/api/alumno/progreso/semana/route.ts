import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargarAlumnoAcceso, tieneAccesoSemana } from '@/lib/acceso-materias'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { semana_id } = body as { semana_id: string }
    if (!semana_id) return NextResponse.json({ error: 'semana_id requerido' }, { status: 400 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const alumno = await cargarAlumnoAcceso(supabase, user.id)

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    // ── Gate canon (lib/acceso-materias): la semana debe pertenecer a una
    // materia accesible; si no, marcar progreso sería registrar avance en
    // contenido que la ventana de pago aún no abre ───────────────────────────
    const gate = await tieneAccesoSemana(supabase, alumno, semana_id)
    if (!gate.encontrada) {
      return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })
    }
    if (!gate.acceso) {
      return NextResponse.json({ error: 'No tienes acceso a este contenido' }, { status: 403 })
    }

    // Verificar si ya existía el progreso
    const { data: existente } = await supabase
      .from('progreso_semanas')
      .select('id, completada, fecha_completada')
      .eq('alumno_id', alumno.id)
      .eq('semana_id', semana_id)
      .single()

    const ya_existia = !!existente

    // ── Marcar la semana como completada ──────────────────────────────────────
    // A esta ruta solo se llega por una acción EXPLÍCITA del alumno ("Marcar
    // semana como completada" o el botón de ReadingProgress al terminar la
    // lectura). Nunca se llama por abrir la semana. Por eso la fila significa
    // "el alumno la dio por terminada", y `completada` debe reflejarlo.
    //
    // Antes solo se insertaba {alumno_id, semana_id}: `completada` se quedaba en
    // su DEFAULT false para siempre y `fecha_completada` en NULL (Bug 89). La UI
    // lo disimulaba contando la EXISTENCIA de la fila, así que el hueco solo se
    // veía al querer construir un reporte encima.
    if (!ya_existia) {
      const { error: insertError } = await supabase
        .from('progreso_semanas')
        .upsert(
          {
            alumno_id: alumno.id,
            semana_id,
            completada: true,
            fecha_completada: new Date().toISOString(),
          },
          { onConflict: 'alumno_id,semana_id', ignoreDuplicates: true }
        )
      if (insertError) return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })
    } else {
      // Idempotente: re-marcar NO mueve la fecha original.
      //
      // Si la fila es anterior al fix (completada=false), se corrige el booleano
      // — es inequívoco: la fila solo existe porque el alumno marcó la semana.
      // Pero NO se rellena `fecha_completada` con la fecha de hoy: esa semana se
      // terminó hace tiempo y estampar "hoy" sería inventar historia, peor que
      // dejarla vacía. Esa fecha la reconstruye el backfill del rollout a partir
      // de `quiz_respuestas`, que sí es evidencia fechada.
      const fila = existente as { id: string; completada: boolean | null; fecha_completada: string | null }
      const parche: Record<string, unknown> = {}
      if (fila.completada !== true) parche.completada = true

      if (Object.keys(parche).length > 0) {
        const { error: updateError } = await supabase
          .from('progreso_semanas')
          .update(parche)
          .eq('id', fila.id)
        if (updateError) return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })
      }
    }

    // Si ya existía, no re-evaluar logros
    if (ya_existia) return NextResponse.json({ ok: true, ya_existia: true })

    // ── Verificar logros ──────────────────────────────────────────────────────

    // Contar total de semanas completadas por el alumno
    const { count: totalCompletadas } = await supabase
      .from('progreso_semanas')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)

    // Logro: primera semana completada
    if ((totalCompletadas ?? 0) === 1) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'primera_semana' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
    }

    // Logro: materia completada — la materia ya viene resuelta por el gate.
    // (Antes se consultaba `semanas.materia_id`, columna que no existe: el
    // select fallaba en silencio y el logro nunca se otorgaba. La relación real
    // es semanas.mes_id → meses_contenido.materia_id.)
    if (gate.materiaId) {
      const materia_id = gate.materiaId

      const { data: mesesDeMateria } = await supabase
        .from('meses_contenido')
        .select('id')
        .eq('materia_id', materia_id)

      const mesIds = ((mesesDeMateria ?? []) as { id: string }[]).map(m => m.id)

      const { data: semanasDeMateria } = await supabase
        .from('semanas')
        .select('id')
        .in('mes_id', mesIds.length > 0 ? mesIds : ['00000000-0000-0000-0000-000000000000'])

      const semanaIds  = ((semanasDeMateria ?? []) as { id: string }[]).map(s => s.id)
      const totalSemanas = semanaIds.length

      const { count: completadasEnMateria } = await supabase
        .from('progreso_semanas')
        .select('id', { count: 'exact', head: true })
        .eq('alumno_id', alumno.id)
        .in('semana_id', semanaIds.length > 0 ? semanaIds : ['00000000-0000-0000-0000-000000000000'])

      if (totalSemanas > 0 && completadasEnMateria === totalSemanas) {
        await supabase
          .from('logros_alumno')
          .upsert(
            { alumno_id: alumno.id, tipo_logro: 'materia_completada' },
            { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
          )
      }
    }

    // ── Racha de días ─────────────────────────────────────────────────────────
    // Antes esta racha se guardaba en `logros_alumno.metadata` con el discriminador
    // `tipo: 'racha_actual'`. Ninguna de esas dos columnas existe en la tabla real
    // (que es `tipo_logro` + `fecha_obtenido`), así que el SELECT devolvía null, el
    // UPSERT fallaba en silencio —nunca se comprobaba el error— y `diasRacha` valía
    // siempre 1: los logros de 3 y 7 días no se otorgaban jamás.
    //
    // La racha real ya la mantiene el trigger de `progreso_semanas` sobre la tabla
    // `racha_actividad` (ver supabase/schema-02-funciones.sql). Aquí solo se lee.
    const { data: racha } = await supabase
      .from('racha_actividad')
      .select('racha_actual')
      .eq('alumno_id', alumno.id)
      .maybeSingle()

    const diasRacha = (racha as { racha_actual?: number } | null)?.racha_actual ?? 1

    if (diasRacha >= 3) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'racha_3_dias' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
    }
    if (diasRacha >= 7) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'racha_7_dias' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
    }

    return NextResponse.json({ ok: true, ya_existia: false, diasRacha })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
