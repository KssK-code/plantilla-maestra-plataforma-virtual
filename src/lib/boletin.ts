import {
  calcularDisponibilidad,
  ordenarCanonico,
  toMateriaVentana,
  type AlumnoAcceso,
  type MateriaVentana,
} from './acceso-materias'

/**
 * Boletín del alumno — lo comparten /api/alumno/calificaciones y
 * /api/alumno/constancia. Una entrada por MATERIA.
 *
 * Hasta ahora cada ruta armaba su propio universo desde `meses_contenido`
 * (una fila por mes) y decidía qué mostrar con `inscripcion_pagada` y con
 * `numero_mes` crudo. Ningún gate real (lib/acceso-materias: contenido,
 * evaluación, quiz, glosario, listado de materias) lee `inscripcion_pagada`:
 * el acceso sale de nivel (+ carrera en licenciatura) + ventana posicional
 * (meses_desbloqueados × materiasPorMes). Con la bandera en false una alumna
 * cursó y aprobó 10 materias y el boletín le enseñaba solo la demo como
 * "Pendiente" (ticket renacimiento 2026-09-01, IVS-2026-0004; Bug 138). Es la
 * lección del Bug 59: dos criterios distintos para la misma pregunta "¿a qué
 * tiene acceso?".
 *
 * Reglas:
 *   - fila en `calificaciones` → 'Acreditada' / 'No acreditada', SIEMPRE
 *     visible (canon Bug 54): sin importar ventana, bandera de pago,
 *     `numero_mes`, ni que la materia o su mes se hayan archivado después.
 *     Es HISTORIAL: la materia llega embebida en la propia calificación, sin
 *     filtro de `activa` (ni en la materia ni en sus meses — ver abajo).
 *   - sin fila → 'Pendiente' solo si `calcularDisponibilidad` la marca
 *     disponible, es decir, exactamente la misma ventana posicional que
 *     `/api/alumno/materias`. Invariante: materia `disponible` en Mis Materias
 *     ⇔ aparece en el boletín. Pendientes solo salen del catálogo ACTIVO
 *     (`cargarContextoAcceso`, que en licenciatura ya viene acotado por
 *     carrera: no hay que volver a filtrar aquí).
 *   - EXCEPCIÓN explícita a esa invariante: la materia demo (`nivel = 'demo'`)
 *     no es parte del plan. Mis Materias la marca disponible siempre (cortesía
 *     de ingreso), pero en el boletín y la constancia solo cuenta si el alumno
 *     la presentó (fila en `calificaciones`); nunca sale como 'Pendiente' y no
 *     infla `total_materias_plan`. Se filtra por NIVEL y no por `esTutorial()`:
 *     la "Tutoría de ingreso I" de preparatoria sí es del plan (orden 1) y debe
 *     listarse. Decisión del ticket renacimiento 2026-09-01 (AUTORIZO Kevin).
 *   - `mes_numero`:
 *       · Pendiente → MIN de los meses ACTIVOS de la materia (lo que ya calcula
 *         `toMateriaVentana` para el catálogo); 0 si no tiene meses.
 *       · Calificada → MIN de TODOS sus meses, archivados incluidos. El mes es
 *         parte del historial: si el admin retira después el único mes de una
 *         materia ya acreditada, la calificación sigue (canon Bug 54) y debe
 *         seguir bajo el mes en que se cursó, no caerse a "Mes 0". Por eso el
 *         embed de las calificaciones NO pide `activa` y aquí no se filtra.
 *     Una materia con más de un mes sale UNA vez bajo su primer mes (antes
 *     salía una vez por mes y la acreditada se repetía con la misma key en la
 *     página).
 */

export type EstadoBoletin = 'Acreditada' | 'No acreditada' | 'Pendiente'

/**
 * `carrera` solo la trae la ficha embebida en la calificación (licenciatura):
 * la constancia la usa para el prefijo del código. El catálogo de
 * `cargarContextoAcceso` no la carga; para una Pendiente de licenciatura la
 * carrera es la del alumno (el catálogo ya viene acotado a ella).
 */
export type MateriaBoletin = MateriaVentana & { carrera?: string | null }

export type FilaBoletin = {
  materia: MateriaBoletin
  mes_numero: number
  estado: EstadoBoletin
}

/** Fila de `calificaciones` con la materia embebida (SIN filtro de `activa`). */
export type CalificacionConMateria = {
  materia_id: string
  acreditado: boolean
  materia: MateriaBoletin | null
}

/**
 * Select canon para las dos rutas. `materias` cuelga de la FK
 * calificaciones.materia_id (many-to-one) y trae su `meses_contenido` para que
 * el mes del historial se calcule igual que en el catálogo — pero sobre TODOS
 * los meses: a propósito no se pide `activa` (ver docblock, `mes_numero`).
 * `carrera` existe desde la migración 20260812120000_licenciaturas.sql; un
 * cliente anterior a ella la quita del embed al portar (como ya hacían las
 * rutas viejas, que también la pedían).
 */
export const SELECT_CALIFICACIONES_BOLETIN =
  'materia_id, acreditado, materias(id, nombre, nivel, orden, carrera, meses_contenido(numero_mes))'

type MesEmbebido = { numero_mes: number; activa?: boolean }

type FilaMateriaEmbed = {
  id: string
  nombre: string
  nivel: string | null
  orden: number | null
  carrera?: string | null
  meses_contenido?: MesEmbebido[] | MesEmbebido | null
}

type FilaCalificacionDb = {
  materia_id: string
  acreditado: boolean | null
  materias?: FilaMateriaEmbed | FilaMateriaEmbed[] | null
}

/**
 * Ficha de historial: el mismo mapper que el catálogo, pero con los meses
 * despojados de `activa` para que cuenten TODOS (toMateriaVentana descarta los
 * archivados porque en la ventana un mes retirado no debe correr posiciones;
 * en el historial no hay posición que correr, solo el mes en que se cursó).
 */
function toMateriaHistorial(row: FilaMateriaEmbed): MateriaBoletin {
  const rel = row.meses_contenido
  const meses = (Array.isArray(rel) ? rel : rel ? [rel] : [])
    .map(m => ({ numero_mes: m.numero_mes }))
  return {
    ...toMateriaVentana({ ...row, meses_contenido: meses }),
    carrera: row.carrera ?? null,
  }
}

/** Normaliza el resultado crudo de SELECT_CALIFICACIONES_BOLETIN. */
export function normalizarCalificaciones(rows: unknown): CalificacionConMateria[] {
  return ((rows ?? []) as FilaCalificacionDb[]).map(r => {
    const rel = Array.isArray(r.materias) ? r.materias[0] : r.materias
    return {
      materia_id: r.materia_id,
      // NOT NULL DEFAULT false en el esquema; si llegara null cuenta como no
      // acreditada (falla cerrado, nunca certifica por un dato roto).
      acreditado: r.acreditado === true,
      materia:    rel ? toMateriaHistorial(rel) : null,
    }
  })
}

/**
 * Arma el boletín. Puro: sin IO, para poder fijarlo en tests/unit.
 *
 * @param alumno         el mismo objeto que consumen los gates (cargarAlumnoAcceso)
 * @param catalogo       catálogo ACTIVO del alumno (cargarContextoAcceso().materias)
 * @param calificaciones todas las filas del alumno, con materia embebida
 * @param acreditadas    cargarContextoAcceso().acreditadas — el MISMO set con el
 *                       que los gates calculan la ventana (Bug 61: las
 *                       acreditadas consumen su posición)
 */
export function armarBoletin(
  alumno: AlumnoAcceso,
  catalogo: MateriaVentana[],
  calificaciones: CalificacionConMateria[],
  acreditadas: Set<string>
): FilaBoletin[] {
  const disponibilidad = calcularDisponibilidad(alumno, catalogo, acreditadas)

  const universo = new Map<string, MateriaBoletin>(catalogo.map(m => [m.id, m]))
  const califPorMateria = new Map<string, CalificacionConMateria>()

  for (const c of calificaciones) {
    // UNIQUE (alumno_id, materia_id): una fila por materia.
    califPorMateria.set(c.materia_id, c)
    // Historial: una materia calificada que ya no está en el catálogo activo
    // (archivada, o de otro nivel/carrera tras corregir el plan) entra al
    // universo con la ficha embebida. Si tampoco viene embebida (materias es
    // lectura para autenticados y la FK es CASCADE, así que solo pasaría con
    // RLS distinta) no hay nada que pintar y se omite.
    if (!universo.has(c.materia_id) && c.materia) universo.set(c.materia_id, c.materia)
  }

  // ordenarCanonico devuelve MateriaVentana[]; `carrera` viaja en las mismas
  // instancias, así que se recupera del universo por id.
  return ordenarCanonico(Array.from(universo.values())).flatMap((ordenada): FilaBoletin[] => {
    const materia: MateriaBoletin = universo.get(ordenada.id) ?? ordenada
    const calif = califPorMateria.get(materia.id)
    if (calif) {
      // La ficha embebida manda en el historial: su mes cuenta los meses
      // archivados y trae `carrera`. El catálogo solo aporta la posición.
      const ficha = calif.materia
      return [{
        materia:    { ...materia, carrera: ficha?.carrera ?? materia.carrera ?? null },
        mes_numero: ficha?.numero_mes ?? materia.numero_mes ?? 0,
        estado:     calif.acreditado ? 'Acreditada' : 'No acreditada',
      }]
    }
    if (materia.nivel === 'demo') {
      // La demo no es parte del plan: sin calificación no se lista (ver docblock).
      return []
    }
    if (disponibilidad.get(materia.id) !== true) {
      // Fuera de ventana y sin calificación: tampoco se ve en Mis Materias.
      return []
    }
    return [{ materia, mes_numero: materia.numero_mes ?? 0, estado: 'Pendiente' }]
  })
}

export function resumirBoletin(filas: FilaBoletin[]): {
  total_materias_plan:     number
  materias_acreditadas:    number
  materias_no_acreditadas: number
  materias_pendientes:     number
} {
  const cuenta = (estado: EstadoBoletin) => filas.filter(f => f.estado === estado).length
  return {
    total_materias_plan:     filas.length,
    materias_acreditadas:    cuenta('Acreditada'),
    materias_no_acreditadas: cuenta('No acreditada'),
    materias_pendientes:     cuenta('Pendiente'),
  }
}
