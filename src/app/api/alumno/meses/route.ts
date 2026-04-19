import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_MATERIA_ID = 'e3f004d8-4451-4a65-9c91-bac3f87d2378' // TUT101 — Tutoría de ingreso I

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Resolver datos del alumno (schema antiguo o nuevo) ────────────────────
    let mesesDesbloqueados = 0
    let inscripcionPagada  = false
    let duracionMeses      = 0
    let alumnoEncontrado   = false

    let nivelAlumno: string | null = null

    // Intento 1: schema antiguo (alumnos.usuario_id)
    const { data: a1 } = await supabase
      .from('alumnos')
      .select('meses_desbloqueados, inscripcion_pagada, nivel, planes_estudio(duracion_meses)')
      .eq('usuario_id', user.id)
      .single()

    if (a1) {
      alumnoEncontrado  = true
      const row = a1 as unknown as {
        meses_desbloqueados: number
        inscripcion_pagada: boolean
        nivel?: string | null
        planes_estudio: { duracion_meses: number } | null
      }
      mesesDesbloqueados = row.meses_desbloqueados ?? 0
      inscripcionPagada  = row.inscripcion_pagada  ?? false
      duracionMeses      = row.planes_estudio?.duracion_meses ?? 6
      nivelAlumno        = row.nivel ?? null
    }

    // Intento 2: schema nuevo (alumnos.id = user.id)
    if (!alumnoEncontrado) {
      const { data: a2 } = await supabase
        .from('alumnos')
        .select('meses_desbloqueados, inscripcion_pagada, modalidad, nivel, duracion_meses')
        .eq('id', user.id)
        .single()

      if (a2) {
        alumnoEncontrado = true
        const row = a2 as unknown as {
          meses_desbloqueados: number
          inscripcion_pagada: boolean
          modalidad?: string
          nivel?: string | null
          duracion_meses?: number | null
        }
        mesesDesbloqueados = row.meses_desbloqueados ?? 0
        inscripcionPagada  = row.inscripcion_pagada  ?? false
        duracionMeses      = row.duracion_meses ?? (row.modalidad === '3_meses' ? 3 : 6)
        nivelAlumno        = row.nivel ?? null
      }
    }

    // Sin perfil → modo demo
    if (!alumnoEncontrado) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    // Sin pago y sin meses → modo demo
    if (!inscripcionPagada && mesesDesbloqueados === 0) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    const materiasPorMes = duracionMeses === 3 ? 4 : 2

    // ── Obtener meses del contenido (filtrado por nivel del alumno) ───────────
    let mesesQuery = supabase
      .from('meses_contenido')
      .select('id, numero_mes, titulo, materias!inner(id, nombre, color)')
      .lte('numero_mes', duracionMeses)
      .order('numero_mes')

    if (nivelAlumno) {
      mesesQuery = mesesQuery.eq('materias.nivel', nivelAlumno)
    }

    const { data: mesesRows, error: mesesError } = await mesesQuery

    // Si la tabla no existe o no hay filas → placeholders con conteo por modalidad
    if (mesesError || !mesesRows || mesesRows.length === 0) {
      const ficticios = Array.from({ length: duracionMeses || 6 }, (_, i) => {
        const n = i + 1
        return {
          id:           `mes-ficticio-${n}`,
          numero:       n,
          numero_mes:   n,
          titulo:       `Mes ${n}`,
          materias:     Array.from({ length: materiasPorMes }, (_, j) => ({
            id:        `ficticio-${n}-${j}`,
            codigo:    '',
            nombre:    '',
            color_hex: '#3AAFA9',
          })),
          desbloqueado: n <= mesesDesbloqueados,
        }
      })
      return NextResponse.json(ficticios)
    }

    type Row = {
      id: string
      numero_mes: number
      titulo: string
      materias: { id: string; nombre: string; color: string | null }
    }

    // Un registro = un mes de una materia; agrupar por numero_mes para el dashboard
    const porNumero = new Map<number, { titulo: string; materias: { id: string; codigo: string; nombre: string; color_hex: string }[] }>()

    for (const raw of mesesRows as unknown as Row[]) {
      const nm = raw.numero_mes
      const mat = raw.materias
      if (!porNumero.has(nm)) {
        porNumero.set(nm, { titulo: raw.titulo || `Mes ${nm}`, materias: [] })
      }
      const bucket = porNumero.get(nm)!
      if (raw.titulo) bucket.titulo = raw.titulo
      bucket.materias.push({
        id:        mat.id,
        codigo:    '',
        nombre:    mat.nombre,
        color_hex: mat.color ?? '#3AAFA9',
      })
    }

    const result = Array.from({ length: duracionMeses || 6 }, (_, i) => {
      const n = i + 1
      const agg = porNumero.get(n)
      return {
        id:           agg?.materias[0]?.id ?? `mes-resumen-${n}`,
        numero:       n,
        numero_mes:   n,
        titulo:       agg?.titulo ?? `Mes ${n}`,
        materias:     agg?.materias ?? [],
        desbloqueado: n <= mesesDesbloqueados,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/alumno/meses] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
