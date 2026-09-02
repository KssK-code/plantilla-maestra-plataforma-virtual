import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargarAlumnoAcceso, cargarContextoAcceso } from '@/lib/acceso-materias'
import {
  SELECT_CALIFICACIONES_BOLETIN,
  armarBoletin,
  normalizarCalificaciones,
  resumirBoletin,
} from '@/lib/boletin'

const RESPUESTA_VACIA = {
  materias: [],
  resumen: {
    total_materias_plan:     0,
    materias_acreditadas:    0,
    materias_no_acreditadas: 0,
    materias_pendientes:     0,
  },
}

/**
 * Boletín del alumno (lo consumen /alumno/calificaciones y el dashboard).
 *
 * Consume la MISMA fuente de verdad que los gates (lib/acceso-materias) y la
 * regla compartida con la constancia (lib/boletin). Antes esta ruta decidía el
 * universo con `inscripcion_pagada` — que ningún gate real usa — y los
 * Pendientes con `numero_mes` crudo en vez de la ventana posicional: una
 * alumna con 10 materias acreditadas veía "Acreditadas 0 / Pendientes 1" (Bug
 * 138, ticket renacimiento 2026-09-01).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Alumno, por la misma vía que los gates ───────────────────────────────
    // Resuelve alumnos.id = auth.uid() (y pide `carrera` con reintento si el
    // esquema no la tiene). El fallback por `usuario_id` que vivía aquí no lo
    // usa ningún gate: un alumno que solo resolviera por esa vía tendría boletín
    // pero ningún acceso, otra divergencia lista/gate.
    const alumno = await cargarAlumnoAcceso(supabase, user.id)

    // Sin alumno → respuesta vacía (no 404): contrato que ya consumía el panel.
    if (!alumno) return NextResponse.json(RESPUESTA_VACIA)

    // ── Catálogo activo + acreditadas (fuente única) y calificaciones ────────
    // `cargarContextoAcceso` es el mismo universo que lista /api/alumno/materias
    // y con el que los gates calculan la ventana (nivel + demo, y en
    // licenciatura acotado por carrera). Las calificaciones se piden aparte y
    // con la materia embebida SIN filtro de `activa`: son historial y deben
    // verse aunque la materia o su mes se hayan archivado.
    const { materias: catalogo, acreditadas } = await cargarContextoAcceso(
      supabase,
      alumno.id,
      alumno
    )

    const { data: califs, error: califsError } = await supabase
      .from('calificaciones')
      .select(SELECT_CALIFICACIONES_BOLETIN)
      .eq('alumno_id', alumno.id)

    if (califsError) {
      console.error('[api/alumno/calificaciones] query error:', califsError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    const filas = armarBoletin(alumno, catalogo, normalizarCalificaciones(califs), acreditadas)

    return NextResponse.json({
      materias: filas.map(f => ({
        materia_id:     f.materia.id,
        codigo:         '',
        nombre_materia: f.materia.nombre,
        mes_numero:     f.mes_numero,
        estado:         f.estado,
      })),
      resumen: resumirBoletin(filas),
    })
  } catch (err) {
    console.error('[api/alumno/calificaciones] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
