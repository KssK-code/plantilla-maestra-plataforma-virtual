import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { semana_id } = body as { semana_id: string }
    if (!semana_id) return NextResponse.json({ error: 'semana_id requerido' }, { status: 400 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as { id: string }

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

    // Logro: materia completada — obtener materia_id desde la semana
    const { data: semanaData } = await supabase
      .from('semanas')
      .select('materia_id')
      .eq('id', semana_id)
      .single()

    if (semanaData) {
      const { materia_id } = semanaData as { materia_id: string }

      const { count: totalSemanas } = await supabase
        .from('semanas')
        .select('id', { count: 'exact', head: true })
        .eq('materia_id', materia_id)

      const { count: completadasEnMateria } = await supabase
        .from('progreso_semanas')
        .select('id', { count: 'exact', head: true })
        .eq('alumno_id', alumno.id)
        .in(
          'semana_id',
          (
            await supabase.from('semanas').select('id').eq('materia_id', materia_id)
          ).data?.map((s: { id: string }) => s.id) ?? []
        )

      if ((totalSemanas ?? 0) > 0 && completadasEnMateria === totalSemanas) {
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
