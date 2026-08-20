// ─── Retirar contenido sin destruir historial (regla D2 del spec) ────────────
// El admin pulsa un solo botón, "Eliminar". Quién decide qué pasa es el
// servidor, no él: no tiene forma de saber si esa pregunta la respondieron
// alumnos, y hacerle elegir entre "archivar" y "borrar" le traslada una
// decisión que el sistema puede tomar con certeza.

export type Retirada =
  | { accion: 'borrar' }
  | { accion: 'archivar'; dependencias: number }

/**
 * @param dependencias filas de alumnos que apuntan a esto (respuestas,
 *   intentos, calificaciones). Cero → nadie lo ha tocado y se puede borrar.
 */
export function decidirRetirada(dependencias: number): Retirada {
  return dependencias > 0 ? { accion: 'archivar', dependencias } : { accion: 'borrar' }
}
