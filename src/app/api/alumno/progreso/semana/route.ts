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
      .select('id')
      .eq('alumno_id', alumno.id)
      .eq('semana_id', semana_id)
      .single()

    const ya_existia = !!existente

    // Upsert progreso (ignora si ya existe)
    const { error: upsertError } = await supabase
      .from('progreso_semanas')
      .upsert(
        { alumno_id: alumno.id, semana_id },
        { onConflict: 'alumno_id,semana_id', ignoreDuplicates: true }
      )

    if (upsertError) return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })

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
          { alumno_id: alumno.id, tipo: 'primera_semana' },
          { onConflict: 'alumno_id,tipo', ignoreDuplicates: true }
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
            { alumno_id: alumno.id, tipo: 'materia_completada', metadata: { materia_id } },
            { onConflict: 'alumno_id,tipo', ignoreDuplicates: true }
          )
      }
    }

    // ── Racha de días ─────────────────────────────────────────────────────────
    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

    const { data: rachaActual } = await supabase
      .from('logros_alumno')
      .select('metadata')
      .eq('alumno_id', alumno.id)
      .eq('tipo', 'racha_actual')
      .single()

    const rachaPrevia = (rachaActual?.metadata as { dias?: number; ultima_actividad?: string } | null)

    let diasRacha = 1

    if (rachaPrevia?.ultima_actividad) {
      const ultimaFecha = new Date(rachaPrevia.ultima_actividad)
      const ultimaDia = new Date(ultimaFecha.getFullYear(), ultimaFecha.getMonth(), ultimaFecha.getDate())
      const diffDias = Math.round((hoy.getTime() - ultimaDia.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDias === 0)      diasRacha = rachaPrevia.dias ?? 1
      else if (diffDias === 1) diasRacha = (rachaPrevia.dias ?? 1) + 1
      else                     diasRacha = 1
    }

    await supabase
      .from('logros_alumno')
      .upsert(
        {
          alumno_id: alumno.id,
          tipo: 'racha_actual',
          metadata: { dias: diasRacha, ultima_actividad: ahora.toISOString() },
        },
        { onConflict: 'alumno_id,tipo', ignoreDuplicates: false }
      )

    if (diasRacha >= 3) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo: 'racha_3_dias' },
          { onConflict: 'alumno_id,tipo', ignoreDuplicates: true }
        )
    }
    if (diasRacha >= 7) {
      await supabase
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo: 'racha_7_dias' },
          { onConflict: 'alumno_id,tipo', ignoreDuplicates: true }
        )
    }

    return NextResponse.json({ ok: true, ya_existia: false, diasRacha })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
