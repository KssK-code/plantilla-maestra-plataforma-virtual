import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargarAlumnoAcceso, tieneAccesoSemana } from '@/lib/acceso-materias'

/** Tope por llamada: el heartbeat manda 1-5 min; más que esto es ruido o abuso. */
const MAX_MINUTOS_POR_LLAMADA = 15

/**
 * Acumula tiempo de estudio real en `progreso_semanas.tiempo_visto_minutos`.
 *
 * ⚠️ NO CREA FILAS, a propósito.
 *
 * En este esquema, la EXISTENCIA de la fila de `progreso_semanas` significa "el
 * alumno marcó la semana como completada", y de eso dependen dos cosas vivas:
 * el goteo que desbloquea la siguiente semana en el roadmap, y el conteo de
 * "semanas trabajadas" de la ficha admin. Si este endpoint creara la fila por
 * el mero hecho de estar leyendo, ambas cosas se romperían: al alumno se le
 * abrirían semanas que no ha terminado.
 *
 * Por eso: si la fila no existe todavía, se responde `aplicado: false` y el
 * frontend conserva los minutos pendientes hasta que el alumno marque la
 * semana. Así el tiempo de lectura previo al marcado no se pierde ni adelanta
 * el desbloqueo.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { semana_id, minutos } = body as { semana_id?: string; minutos?: number }

    if (!semana_id) return NextResponse.json({ error: 'semana_id requerido' }, { status: 400 })

    const suma = Math.floor(Number(minutos))
    if (!Number.isFinite(suma) || suma <= 0) {
      return NextResponse.json({ error: 'minutos debe ser un entero positivo' }, { status: 400 })
    }
    if (suma > MAX_MINUTOS_POR_LLAMADA) {
      return NextResponse.json({ error: `minutos no puede exceder ${MAX_MINUTOS_POR_LLAMADA}` }, { status: 400 })
    }

    const alumno = await cargarAlumnoAcceso(supabase, user.id)
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    // Mismo gate canon que marcar progreso: nada de acumular tiempo en
    // contenido que la ventana de pago no abre.
    const gate = await tieneAccesoSemana(supabase, alumno, semana_id)
    if (!gate.encontrada) return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })
    if (!gate.acceso)     return NextResponse.json({ error: 'No tienes acceso a este contenido' }, { status: 403 })

    const { data: fila } = await supabase
      .from('progreso_semanas')
      .select('id, tiempo_visto_minutos')
      .eq('alumno_id', alumno.id)
      .eq('semana_id', semana_id)
      .maybeSingle()

    // Sin fila = la semana aún no se ha marcado. No se crea (ver nota de arriba).
    if (!fila) return NextResponse.json({ ok: true, aplicado: false, motivo: 'semana_no_marcada' })

    const actual = Number((fila as { tiempo_visto_minutos: number | null }).tiempo_visto_minutos ?? 0)
    const nuevo = (Number.isFinite(actual) ? actual : 0) + suma

    // Lectura + escritura, no incremento atómico: la alternativa era una función
    // en BD, que obligaría a una migración en cada uno de los clientes de la
    // flota. Para un contador de tiempo por alumno y semana, con el alumno
    // normalmente en una sola pestaña, la carrera es irrelevante y como mucho
    // pierde un minuto. No vale una migración.
    const { error: updateError } = await supabase
      .from('progreso_semanas')
      .update({ tiempo_visto_minutos: nuevo })
      .eq('id', (fila as { id: string }).id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al guardar el tiempo' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, aplicado: true, tiempo_visto_minutos: nuevo })
  } catch (err) {
    console.error('[POST /api/alumno/progreso/tiempo]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
