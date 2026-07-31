/**
 * Reglas de aprobación del examen final de curso.
 *
 * LA CADENA COMPLETA, y ninguna pieza sobra:
 *   curso pagado completo (B2/B3) → examen presentado → APROBADO →
 *   → el ADMIN emite la constancia (B8.2).
 *
 * ⚠️ LA EMISIÓN ES MANUAL, Y ES A PROPÓSITO (decisión de producto de B8.2, que
 * supersede la auto-emisión de B4). Aprobar es la CONDICIÓN de la constancia,
 * no su gatillo: el folio es permanente e irrepetible, y un humano verificando
 * antes de congelar el snapshot es feature (lección Bug 78). El único camino de
 * emisión es POST /api/admin/inscripciones/[id]/constancia, con la sesión del
 * admin — así el evento de bitácora registra QUIÉN emitió. El guard de "sin
 * aprobación no hay emisión" vive en la función SQL `curso_emitir_constancia`,
 * no en el código: nadie lo puede rodear, ni queriendo.
 *
 * Aquí quedan solo las reglas que el `enviar` del examen necesita para dictar
 * su veredicto (aprobado / no aprobado). `emitirConstanciaSiAprobo` e
 * `inscripcionDe` se eliminaron con la auto-emisión — no dejar caminos muertos
 * fue la lección del cadáver `'excel'` de B0.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

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
