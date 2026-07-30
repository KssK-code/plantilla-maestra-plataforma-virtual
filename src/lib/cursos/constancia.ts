/**
 * Emisión de la constancia de curso.
 *
 * LA CADENA COMPLETA, y ninguna pieza sobra:
 *   curso pagado completo (B2/B3) → examen presentado → APROBADO → constancia.
 *
 * El avance de lecciones es informativo. Lo que certifica es aprobar el examen
 * final, y el examen final ya exige el curso completo liberado
 * (`puedeExamenFinal`, B2) — así que un diplomado pagado a 1 de 6 meses no
 * puede llegar hasta aquí.
 *
 * Esto reemplaza al folio que se generaba con Math.random() EN EL NAVEGADOR y no
 * se persistía: cambiaba en cada recarga y dos alumnos podían colisionar,
 * mientras el documento decía "para verificar su autenticidad contacte a
 * administración".
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from '@/lib/config'

export interface ConstanciaEmitida {
  id: string
  folio: string
  emitido_en: string
  ya_existia: boolean
}

/** Umbral por curso; si faltara, 70 — nunca "sin umbral". */
export const CALIFICACION_MINIMA_DEFAULT = 70

export async function leerCalificacionMinima(
  admin: SupabaseClient,
  cursoId: string
): Promise<number> {
  const { data } = await admin
    .from('cursos')
    .select('calificacion_minima')
    .eq('id', cursoId)
    .maybeSingle()
  const n = (data as { calificacion_minima: number | null } | null)?.calificacion_minima
  return typeof n === 'number' && n > 0 ? n : CALIFICACION_MINIMA_DEFAULT
}

export function aprobo(porcentaje: number, minima: number): boolean {
  return Number.isFinite(porcentaje) && porcentaje >= minima
}

/**
 * Emite la constancia si el alumno aprobó, o devuelve la existente.
 *
 * IDEMPOTENTE: `curso_constancias` tiene UNIQUE (inscripcion_id) y la función de
 * Postgres devuelve la existente en vez de crear otra. Un reintento del examen,
 * o dos envíos aprobatorios simultáneos, no producen dos diplomas ni queman dos
 * folios.
 *
 * NO LANZA: un fallo emitiendo no puede tumbar el envío del examen. El alumno ya
 * contestó y su resultado ya está guardado; si el diploma falla, el admin puede
 * re-emitirlo a mano. Se registra en consola y se devuelve null.
 */
export async function emitirConstanciaSiAprobo(
  admin: SupabaseClient,
  args: { inscripcionId: string; porcentaje: number; calificacionMinima: number }
): Promise<ConstanciaEmitida | null> {
  if (!aprobo(args.porcentaje, args.calificacionMinima)) return null

  const { data, error } = await admin.rpc('curso_emitir_constancia', {
    p_inscripcion_id: args.inscripcionId,
    p_prefijo: CONFIG.diploma.folioPrefijo,
    p_calificacion: args.porcentaje,
  })

  if (error) {
    console.error('[emitirConstanciaSiAprobo]', error)
    return null
  }

  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) return null

  return {
    id: fila.id as string,
    folio: fila.folio as string,
    emitido_en: fila.emitido_en as string,
    ya_existia: Boolean(fila.ya_existia),
  }
}

/** Inscripción del alumno en ese curso — la constancia cuelga de ella, no del alumno. */
export async function inscripcionDe(
  admin: SupabaseClient,
  cursoId: string,
  alumnoId: string
): Promise<string | null> {
  const { data } = await admin
    .from('curso_inscripciones')
    .select('id')
    .eq('curso_id', cursoId)
    .eq('alumno_id', alumnoId)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}
