import { CONFIG } from './config'

/**
 * Helpers de modalidades para plantilla MEV.
 *
 * Toda la lógica de "cuántos meses dura, cuánto cuesta, cuáles están activas"
 * se centraliza aquí. Los 11 archivos de API y las páginas de UI consumen estas
 * funciones en lugar de tener ternarios duplicados tipo:
 *
 *   modalidad === '3_meses' ? 3 : 6   ← bug latente para clientes con configuración no binaria
 *
 * Uso típico:
 *   const meses = getMesesByModalidad(alumno.modalidad)
 *   const mensualidad = getMensualidadByModalidad(alumno.modalidad)
 *   const opciones = getModalidadesActivas()
 */

export type ModalidadId = typeof CONFIG.modalidades[number]['id']

export type Modalidad = typeof CONFIG.modalidades[number]

/**
 * Obtiene la modalidad por ID. Solo devuelve modalidades ACTIVAS.
 * Si el ID no existe o está desactivado, devuelve undefined.
 */
export function getModalidad(id: string | null | undefined): Modalidad | undefined {
  if (!id) return undefined
  return CONFIG.modalidades.find(m => m.id === id && m.activa)
}

/**
 * Obtiene la duración en meses por ID de modalidad.
 * Fallback inteligente: si el ID no existe o está desactivado,
 * devuelve los meses de la primera modalidad activa configurada.
 * Si no hay modalidades activas (config rota), devuelve 3 como último recurso.
 */
export function getMesesByModalidad(id: string | null | undefined): number {
  const found = getModalidad(id)
  if (found) return found.meses

  const firstActive = CONFIG.modalidades.find(m => m.activa)
  return firstActive?.meses ?? 3
}

/**
 * Obtiene la mensualidad por ID de modalidad. Mismo fallback que getMesesByModalidad.
 */
export function getMensualidadByModalidad(id: string | null | undefined): number {
  const found = getModalidad(id)
  if (found) return found.mensualidad

  const firstActive = CONFIG.modalidades.find(m => m.activa)
  return firstActive?.mensualidad ?? 0
}

/**
 * Devuelve solo las modalidades activas, en el orden que están definidas en CONFIG.
 * Para usar en <select>, <option> y mapeos de UI.
 */
export function getModalidadesActivas(): readonly Modalidad[] {
  return CONFIG.modalidades.filter(m => m.activa)
}

/**
 * Verifica si un ID de modalidad está activo.
 */
export function isModalidadActiva(id: string | null | undefined): boolean {
  if (!id) return false
  return CONFIG.modalidades.some(m => m.id === id && m.activa)
}

/**
 * Devuelve el label legible de una modalidad por ID.
 * Si no existe, devuelve el ID tal cual (para no romper UI).
 */
export function getLabelByModalidad(id: string | null | undefined): string {
  if (!id) return ''
  const found = CONFIG.modalidades.find(m => m.id === id)
  return found?.label ?? id
}

/**
 * Obtiene materias por mes de una modalidad. Crítico para calcular
 * la densidad académica del alumno (cuántas materias ve cada mes).
 */
export function getMateriasPorMesByModalidad(id: string | null | undefined): number {
  const found = getModalidad(id)
  if (found) return found.materiasPorMes

  const firstActive = CONFIG.modalidades.find(m => m.activa)
  return firstActive?.materiasPorMes ?? 2
}

/**
 * Devuelve el ID de la modalidad por defecto (primera activa).
 * Para usar como fallback cuando BD devuelve null en columnas modalidad.
 */
export function getDefaultModalidadId(): string {
  const firstActive = CONFIG.modalidades.find(m => m.activa)
  return firstActive?.id ?? '6_meses'
}
