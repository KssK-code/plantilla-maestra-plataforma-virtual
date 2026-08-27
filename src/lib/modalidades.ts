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
 * Forma mínima que comparten las modalidades del programa (Sec/Prepa) y las de
 * licenciatura. Las de licenciatura viven aparte en CONFIG.licenciaturas porque
 * tienen su propia tabla de precios y duraciones ('9_meses' no existe en el
 * plan de Prepa), pero los helpers de abajo deben resolver AMBAS: un alumno de
 * licenciatura en '9_meses' que no se encuentre aquí cae al fallback y estudia
 * con el ritmo de otro plan.
 */
type ModalidadBase = {
  id: string
  label: string
  meses: number
  mensualidad: number
  materiasPorMes: number
  activa?: boolean
}

function modalidadesLic(): readonly ModalidadBase[] {
  const lic = (CONFIG as { licenciaturas?: { activas?: boolean; modalidades?: readonly ModalidadBase[] } }).licenciaturas
  if (!lic?.activas) return []
  return lic.modalidades ?? []
}

/** Modalidades de licenciatura activas, para los selectores de carrera. */
export function getModalidadesLicenciatura(): readonly ModalidadBase[] {
  return modalidadesLic().filter(m => m.activa !== false)
}

/**
 * materiasPorMes de una modalidad DE LICENCIATURA, sin pasar por buscarModalidad().
 *
 * ⚠️ Existe porque los ids de las dos tablas COLISIONAN. `buscarModalidad()`
 * consulta primero `CONFIG.modalidades` (el programa de Sec/Prepa) y solo cae a
 * licenciaturas si no encuentra nada. Como los programas del banco declaran
 * '3_meses' y '6_meses' en AMBAS tablas, la de licenciatura nunca gana: un
 * alumno de un programa de 24 materias en '6_meses' hereda el materiasPorMes
 * del plan de prepa (2) y su ventana queda en 6 × 2 = 12 materias. Se detiene a
 * la mitad del temario, con 403 al abrir cualquier materia posterior, y subirle
 * los meses desbloqueados no ayuda: el tope es un producto. Ver Bug 103.
 *
 * Devuelve undefined si la modalidad no está declarada en licenciaturas, para
 * que quien llama conserve su fallback de siempre.
 */
export function getMateriasPorMesLicenciatura(id: string | null | undefined): number | undefined {
  if (!id) return undefined
  const m = modalidadesLic().find(x => x.id === id && x.activa !== false)
  return m && Number.isFinite(m.materiasPorMes) && m.materiasPorMes > 0
    ? m.materiasPorMes
    : undefined
}

/**
 * Busca una modalidad en el plan del programa y, si no está, en el de
 * licenciatura. Este es el único punto que conoce las dos tablas.
 */
function buscarModalidad(id: string | null | undefined): ModalidadBase | undefined {
  if (!id) return undefined
  const base = CONFIG.modalidades.find(m => m.id === id && m.activa)
  if (base) return base as unknown as ModalidadBase
  return modalidadesLic().find(m => m.id === id && m.activa !== false)
}

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
  const found = buscarModalidad(id)
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
  // Resuelve también las modalidades de licenciatura: sin esto, un alumno en
  // '9_meses' caía al fallback y desbloqueaba materias al ritmo de otro plan.
  const found = buscarModalidad(id)
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

/**
 * Construye una frase legible con los meses de las modalidades activas.
 * Auto-adapta singular/plural y conjunción "o" para 2+ modalidades.
 *
 * @example
 *   modalidades activas [3 meses] → "3 meses"
 *   modalidades activas [3, 6 meses] → "3 o 6 meses"
 *   modalidades activas [3, 6, 12 meses] → "3, 6 o 12 meses"
 *   modalidades vacías → ""
 */
export function getDuracionLabel(): string {
  const activas = CONFIG.modalidades.filter(m => m.activa)
  if (activas.length === 0) return ''
  if (activas.length === 1) return `${activas[0].meses} meses`

  const numeros = activas.map(m => m.meses).sort((a, b) => a - b)
  if (numeros.length === 2) return `${numeros[0]} o ${numeros[1]} meses`

  const ultimo = numeros.pop()
  return `${numeros.join(', ')} o ${ultimo} meses`
}

/**
 * Construye una frase legible con los niveles académicos del cliente.
 * Capitaliza la primera letra y maneja singular/plural.
 *
 * @example
 *   niveles ['preparatoria'] → "Preparatoria"
 *   niveles ['secundaria'] → "Secundaria"
 *   niveles ['secundaria', 'preparatoria'] → "Prepa o Secundaria"
 *   niveles vacíos → ""
 */
export function getNivelLabel(): string {
  const niveles = CONFIG.niveles as readonly string[]
  if (niveles.length === 0) return ''

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  if (niveles.length === 1) {
    return capitalize(niveles[0])
  }

  const tienePrepa = niveles.includes('preparatoria')
  const tieneSecu  = niveles.includes('secundaria')
  if (tienePrepa && tieneSecu && niveles.length === 2) {
    return 'Prepa o Secundaria'
  }

  const capitalizadas = niveles.map(capitalize)
  if (capitalizadas.length === 2) return `${capitalizadas[0]} o ${capitalizadas[1]}`

  const ultimo = capitalizadas[capitalizadas.length - 1]
  const resto = capitalizadas.slice(0, -1).join(', ')
  return `${resto} o ${ultimo}`
}

/**
 * Devuelve el label de plan adaptado al contexto de modalidades activas.
 * Si solo hay 1 modalidad activa, omite el sufijo descriptivo (ej: "— Express").
 * Si hay múltiples, conserva el label completo de CONFIG.
 *
 * @example
 *   1 modalidad activa: { id: '3_meses', label: '3 meses — Express' }
 *     → "3 meses"   (sin sufijo, no hay competencia)
 *   2 modalidades activas:
 *     → "3 meses — Express" / "6 meses — Estándar"  (label completo)
 */
export function getPlanLabel(modalidad: Modalidad): string {
  const activas = CONFIG.modalidades.filter(m => m.activa)
  if (activas.length <= 1) {
    return modalidad.label.split(' — ')[0].trim()
  }
  return modalidad.label
}
