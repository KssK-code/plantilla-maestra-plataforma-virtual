// ─── Materiales (PDF) de una semana ──────────────────────────────────────────
// Funciones puras: rutas y nombres. La validación de tipo y tamaño se reusa de
// archivos-comunes (la misma que Cursos), no se duplica.

import { sanitizeFilename } from '@/lib/archivos-comunes'

export const BUCKET_MATERIAS = 'materias'

/** Tope por semana. No es una restricción técnica: es que una semana con 30
 *  PDFs es un error de captura, y sin tope el panel del admin se vuelve
 *  ilegible y el borrado en cascada, caro. */
export const MATERIALES_MAX_POR_SEMANA = 10

/** Tope del nombre VISIBLE. La columna es TEXT; esto evita que un nombre de
 *  archivo absurdo rompa el layout de la lista del alumno. */
export const NOMBRE_MAX = 200

/**
 * Ruta dentro del bucket: {materiaId}/{semanaId}/{timestamp}-{archivo-saneado}
 *
 * Dos niveles, como en Cursos. El primero es la materia para poder limpiar todo
 * su material con un solo prefijo si algún día se borra. El timestamp evita que
 * subir dos veces el mismo nombre pise el archivo anterior.
 *
 * `ahora` es parámetro para que la función sea pura y probable.
 */
export function materialPathSemana(
  materiaId: string,
  semanaId: string,
  filename: string,
  ahora: number,
): string {
  return `${materiaId}/${semanaId}/${ahora}-${sanitizeFilename(filename)}`
}

/**
 * Nombre que ve el alumno. Conserva acentos y espacios —es el nombre que el
 * profesor le puso— al contrario que el de storage, que va saneado.
 */
export function nombreVisible(filename: string): string {
  const limpio = (filename ?? '').trim()
  if (!limpio) return 'material.pdf'
  return limpio.slice(0, NOMBRE_MAX)
}

export type ValidacionRuta = { ok: true } | { ok: false; error: string }

/**
 * La ruta que el cliente dice haber subido tiene que caer EXACTAMENTE en la
 * carpeta de esa semana. El cliente propone la ruta en el paso 'confirm', así
 * que sin esto podría confirmar un objeto de otra semana —o de otra materia— y
 * colgarlo de la suya.
 */
export function validarRutaMaterial(
  path: string,
  materiaId: string,
  semanaId: string,
): ValidacionRuta {
  const prefijo = `${materiaId}/${semanaId}/`
  if (!path || !path.startsWith(prefijo)) {
    return { ok: false, error: 'La ruta del material no corresponde a esta semana' }
  }
  const nombre = path.slice(prefijo.length)
  if (!nombre || nombre.includes('/') || nombre.includes('..')) {
    return { ok: false, error: 'Ruta de material inválida' }
  }
  return { ok: true }
}
