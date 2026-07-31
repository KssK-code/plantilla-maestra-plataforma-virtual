/**
 * Ventana de pago de Solo-Cursos — FUENTE ÚNICA DE VERDAD del lado de la app.
 *
 *   módulos visibles = curso_inscripciones.meses_desbloqueados
 *                    × cursos.modulos_por_mes
 *   como TECHO ABSOLUTO sobre curso_modulos.orden.
 *
 * ⚠️ Esto NO es el candado. El candado es la RLS
 * (supabase/migrations/20260730130000_b2_gate_ventana_cursos.sql), porque el
 * navegador tiene la anon key y puede consultar PostgREST directo. Este módulo
 * es defensa en profundidad + la UX de "disponible al abrir el mes N", y es el
 * gate REAL únicamente en las rutas que usan service_role (los 3 endpoints de
 * examen), que son invisibles a la RLS.
 *
 * Las dos funciones exportadas de cálculo son las ÚNICAS permitidas. Cualquier
 * `orden ?? algo` suelto en otro archivo es el Bug 61 volviendo a entrar.
 */

/**
 * `orden` sin definir va al FINAL, o sea BLOQUEADO — nunca 0, que lo pondría
 * primero y lo abriría.
 *
 * Este valor y su semántica son deliberadamente idénticos a
 * `ORDEN_SIN_DEFINIR` de src/lib/acceso-materias.ts. Allá la divergencia entre
 * el `?? 0` del listado y el `?? 9999` de los gates hizo que una materia sin
 * orden se listara y se bloqueara a la vez, regalando una unidad en 142
 * clientes. El análogo SQL en la RLS es 2147483647 (max int4).
 */
export const ORDEN_SIN_DEFINIR = Number.MAX_SAFE_INTEGER

/** Estados de inscripción que conceden acceso a la ventana ya liberada. */
const ESTADOS_CON_ACCESO = ['activa', 'completada'] as const

export interface InscripcionVentana {
  meses_desbloqueados?: number | null
  estado?: string | null
  fecha_vencimiento?: string | null
}

export interface CursoVentana {
  modulos_por_mes?: number | null
  estado?: string | null
}

export interface ModuloVentana {
  orden?: number | null
}

/**
 * Orden efectivo de un módulo o lección. **Único lugar** donde se resuelve el
 * fallback: listado, ordenamiento y gates tienen que llamar aquí.
 */
export function resolverOrden(item: ModuloVentana | null | undefined): number {
  const n = item?.orden
  return typeof n === 'number' && Number.isFinite(n) ? n : ORDEN_SIN_DEFINIR
}

/**
 * Techo de la ventana: cuántos módulos, contados desde `orden` 0, puede ver.
 * Devuelve 0 cuando no hay acceso a nada.
 *
 * FALLA CERRADO en todos los casos: sin inscripción, sin curso, sin
 * `meses_desbloqueados`, sin `modulos_por_mes`, curso no publicado, inscripción
 * suspendida/cancelada o vencida → 0. Nunca "sin dato = pase libre".
 *
 * `meses_desbloqueados = 0` → 0 módulos. No hay módulo de muestra gratis: eso
 * sería una decisión de producto, no un default técnico.
 */
export function limiteVentana(
  inscripcion: InscripcionVentana | null | undefined,
  curso: CursoVentana | null | undefined
): number {
  if (!inscripcion || !curso) return 0

  if (curso.estado !== 'publicado') return 0

  const estado = inscripcion.estado ?? ''
  if (!(ESTADOS_CON_ACCESO as readonly string[]).includes(estado)) return 0

  // NULL = sin vencimiento. Fecha pasada = sin acceso.
  // Se compara por día (no por instante) para que el último día siga valiendo.
  if (inscripcion.fecha_vencimiento) {
    const hoy = new Date().toISOString().slice(0, 10)
    if (inscripcion.fecha_vencimiento < hoy) return 0
  }

  const meses = inscripcion.meses_desbloqueados
  const porMes = curso.modulos_por_mes
  if (typeof meses !== 'number' || !Number.isFinite(meses) || meses <= 0) return 0
  if (typeof porMes !== 'number' || !Number.isFinite(porMes) || porMes <= 0) return 0

  return Math.max(0, Math.floor(meses) * Math.floor(porMes))
}

/**
 * ¿El alumno puede ver este módulo?
 *
 * `orden` es **0-BASED** (lo asigna `(max ?? -1) + 1` en la ruta de alta y lo
 * renumera `orden = i` el reordenador), así que la comparación es ESTRICTA:
 * 1 mes × 2 módulos/mes = límite 2 → se ven los órdenes 0 y 1, no el 2.
 *
 * ⚠️ NO recibe ni mira el progreso, y es a propósito. El techo va sobre `orden`;
 * un módulo completado SIGUE OCUPANDO su posición. Contar pendientes en vez de
 * usar el orden es exactamente el ratchet del Bug 61: cada módulo aprobado
 * revelaba el siguiente y con un mes pagado se abría el curso entero.
 */
export function tieneAccesoModulo(args: {
  inscripcion: InscripcionVentana | null | undefined
  curso: CursoVentana | null | undefined
  modulo: ModuloVentana | null | undefined
}): boolean {
  if (!args.modulo) return false
  return resolverOrden(args.modulo) < limiteVentana(args.inscripcion, args.curso)
}

/**
 * Filtra una lista de módulos a los visibles. Conserva el orden de entrada.
 * Azúcar sobre `tieneAccesoModulo` para que ninguna ruta reimplemente el filtro.
 */
export function modulosVisibles<T extends ModuloVentana>(
  modulos: readonly T[],
  inscripcion: InscripcionVentana | null | undefined,
  curso: CursoVentana | null | undefined
): T[] {
  const limite = limiteVentana(inscripcion, curso)
  return modulos.filter(m => resolverOrden(m) < limite)
}

/**
 * Mes en el que se libera un módulo, 1-based, para el mensaje
 * "disponible al abrir el mes N". Solo presentación: no autoriza nada.
 */
export function mesDeLiberacion(
  modulo: ModuloVentana | null | undefined,
  curso: CursoVentana | null | undefined
): number | null {
  const porMes = curso?.modulos_por_mes
  if (typeof porMes !== 'number' || !Number.isFinite(porMes) || porMes <= 0) return null
  const orden = resolverOrden(modulo)
  if (orden === ORDEN_SIN_DEFINIR) return null
  return Math.floor(orden / Math.floor(porMes)) + 1
}
