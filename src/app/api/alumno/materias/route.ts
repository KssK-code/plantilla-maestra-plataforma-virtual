import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calcularDisponibilidad,
  cargarAlumnoAcceso,
  ordenarCanonico,
  toMateriaVentana,
} from '@/lib/acceso-materias'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Alumno: nivel + meses desbloqueados + plan ────────────────────────────
    const alumno = await cargarAlumnoAcceso(supabase, user.id)
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const nivel              = alumno.nivel
    const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0

    // ── Calificaciones acreditadas del alumno ─────────────────────────────────
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id')
      .eq('alumno_id', user.id)
      .eq('acreditado', true)
    const acreditadasSet = new Set(
      (califs ?? []).map(c => (c as { materia_id: string }).materia_id)
    )

    // ── Materias del nivel del alumno con meses y semanas ───────────────────
    // Este universo debe ser IDÉNTICO al que carga lib/acceso-materias en los
    // gates: si diverge, el índice de la ventana se corre y lista y gate dejan
    // de coincidir (lección Bug 59).
    let materiasQuery = supabase
      .from('materias')
      .select(`
        id,
        nombre,
        descripcion,
        nivel,
        orden,
        icono,
        color,
        activa,
        meses_contenido (
          id,
          numero_mes,
          titulo,
          semanas ( id )
        )
      `)
      .eq('activa', true)

    materiasQuery = nivel
      ? materiasQuery.or(`nivel.eq.${nivel},nivel.eq.demo`)
      : materiasQuery.eq('nivel', 'demo')

    if (nivel === 'licenciatura') {
      if (alumno.carrera)   materiasQuery = materiasQuery.eq('carrera', alumno.carrera)
      if (alumno.modalidad) materiasQuery = materiasQuery.eq('modalidad', alumno.modalidad)
    }

    const { data: materias, error } = await materiasQuery.order('orden')

    if (error) {
      console.error('[api/alumno/materias] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type MesRow    = { id: string; numero_mes: number; titulo: string; semanas: { id: string }[] }
    type MateriaRow = {
      id: string; nombre: string; descripcion: string | null
      nivel: string; orden: number | null; icono: string | null; color: string | null
      activa: boolean; meses_contenido: MesRow[]
    }

    const allMaterias = (materias ?? []) as unknown as MateriaRow[]
    const ventana     = allMaterias.map(toMateriaVentana)

    // ── Gating por ventana (fuente única: lib/acceso-materias) ────────────────
    // Bug 61: las acreditadas siguen disponibles pero consumen su lugar, así que
    // acreditar ya no revela la siguiente materia pendiente.
    const disponibilidad = calcularDisponibilidad(alumno, ventana, acreditadasSet)

    // Mismo orden canónico que usa la ventana, para que la posición que ve el
    // alumno sea la que decide su acceso.
    const porId  = new Map(allMaterias.map(m => [m.id, m]))
    const result = ordenarCanonico(ventana).flatMap(v => {
      const mat = porId.get(v.id)
      if (!mat) return []

      const meses        = mat.meses_contenido ?? []
      const totalSemanas = meses.reduce((acc, mes) => acc + (mes.semanas?.length ?? 0), 0)

      return [{
        id:             mat.id,
        nombre:         mat.nombre,
        descripcion:    mat.descripcion ?? null,
        icono:          mat.icono       ?? '📚',
        color:          mat.color       ?? '#1565C0',
        orden:          mat.orden       ?? 0,
        total_meses:    meses.length,
        total_semanas:  totalSemanas,
        disponible:     disponibilidad.get(mat.id) === true,
      }]
    })

    return NextResponse.json({
      materias:            result,
      meses_desbloqueados: mesesDesbloqueados,
      nivel,
    })
  } catch (err) {
    console.error('[api/alumno/materias]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
