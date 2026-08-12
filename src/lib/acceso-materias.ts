import { getMesesByModalidad, getMateriasPorMesByModalidad } from './modalidades'

/**
 * Fuente única de verdad del acceso del alumno a materias.
 *
 * Portado de ivs-virtual-plataforma (commits e1c8855 centralización + 1cfdc5b
 * fix Bug 61), adaptado al esquema y a la configuración de la plantilla.
 *
 * Ventana modality-aware:
 *   materiasPorMes = CONFIG.modalidades[modalidad].materiasPorMes
 *   límite         = meses_desbloqueados × materiasPorMes
 *
 * La ventana se indexa por POSICIÓN ABSOLUTA entre las materias regulares: las
 * acreditadas siguen accesibles pero SÍ consumen su lugar (Bug 61 — si no lo
 * consumen, cada acreditación libera un lugar y revela la siguiente pendiente:
 * con 1 mes pagado se acredita el programa completo). Solo los tutoriales no
 * consumen lugar.
 *
 * Criterio canon para todos los gates:
 *   acreditada → siempre accesible (legible, constancia, re-consulta);
 *   tutorial/demo → siempre accesible;
 *   materia de otro nivel → nunca;
 *   pendiente → solo dentro de la ventana.
 *
 * Invariante (lección Bug 59): materia marcada `disponible` en /api/alumno/materias
 * ⇔ acceso concedido por los gates de contenido, evaluación, quiz y glosario.
 * Por eso TODOS consumen este módulo y ninguno recalcula la ventana inline.
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AlumnoAcceso = {
  nivel: string | null
  modalidad?: string | null
  duracion_meses?: number | null
  meses_desbloqueados: number
  /** Solo licenciatura: filtra el catálogo por carrera (drift de cliente). */
  carrera?: string | null
  inscripcion_pagada?: boolean | null
}

export type MateriaVentana = {
  id: string
  nombre: string
  nivel: string | null
  orden: number | null
  /** MIN(meses_contenido.numero_mes) de la materia; null si no tiene meses. */
  numero_mes: number | null
}

export type MotivoAcceso =
  | 'ok'
  | 'acreditada'
  | 'tutorial'
  | 'nivel_distinto'
  | 'sin_meses'
  | 'fuera_de_ventana'

export type ResultadoAcceso = { acceso: boolean; motivo: MotivoAcceso }

/**
 * `orden` NULL va al final, tanto en el listado como en los gates.
 * Antes divergían (`?? 0` en /materias — primero; `?? 9999` en los gates —
 * último), así que una materia sin `orden` se listaba y se bloqueaba a la vez.
 */
export const ORDEN_SIN_DEFINIR = Number.MAX_SAFE_INTEGER

// ── Reglas puras ──────────────────────────────────────────────────────────────

/** Duración del plan en meses: columna generada, si no la modalidad de CONFIG. */
export function duracionPlan(
  alumno: Pick<AlumnoAcceso, 'modalidad' | 'duracion_meses'>
): number {
  return alumno.duracion_meses ?? getMesesByModalidad(alumno.modalidad)
}

/**
 * Materias que abre cada mes pagado. Sale de CONFIG (el cliente lo configura por
 * modalidad). Si la config quedó rota (0, negativo o no numérico) se cae al
 * reparto uniforme `ceil(regulares / duración)` para no dejar al alumno con la
 * ventana en cero.
 */
export function materiasPorMesDePlan(
  alumno: Pick<AlumnoAcceso, 'modalidad' | 'duracion_meses'>,
  totalRegulares: number
): number {
  const configurado = getMateriasPorMesByModalidad(alumno.modalidad)
  if (Number.isFinite(configurado) && configurado > 0) return configurado

  const meses = duracionPlan(alumno)
  return meses > 0 ? Math.ceil(totalRegulares / meses) : totalRegulares
}

/** Tutoriales y materias demo: siempre visibles y sin lugar en la ventana. */
export function esTutorial(mat: Pick<MateriaVentana, 'nivel' | 'nombre'>): boolean {
  return mat.nivel === 'demo' || mat.nombre.toLowerCase().includes('tutor')
}

/**
 * Orden canónico de la ventana: `orden` (NULL al final), desempatando por el
 * primer mes de contenido y luego por nombre para que el índice sea estable.
 */
export function ordenarCanonico(materias: MateriaVentana[]): MateriaVentana[] {
  return [...materias].sort(
    (a, b) =>
      (a.orden ?? ORDEN_SIN_DEFINIR) - (b.orden ?? ORDEN_SIN_DEFINIR) ||
      (a.numero_mes ?? ORDEN_SIN_DEFINIR) - (b.numero_mes ?? ORDEN_SIN_DEFINIR) ||
      a.nombre.localeCompare(b.nombre)
  )
}

/**
 * Calcula `disponible` para cada materia del catálogo del alumno.
 *
 * El límite (meses_desbloqueados × materiasPorMes) es un techo REAL sobre la
 * posición absoluta de cada materia regular en el orden canónico:
 *   - acreditada → siempre disponible, pero CONSUME su posición: acreditar no
 *     abre nada nuevo (Bug 61).
 *   - pendiente  → disponible solo si su posición cae bajo el límite.
 *   - tutorial   → siempre disponible y sin posición.
 *
 * Pagar el siguiente mes sube el límite y abre las siguientes posiciones, estén
 * como estén (pendientes o ya acreditadas en la era del candado muerto).
 */
export function calcularDisponibilidad(
  alumno: AlumnoAcceso,
  materias: MateriaVentana[],
  acreditadas: Set<string>
): Map<string, boolean> {
  const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0

  const totalRegulares = materias.filter(m => !esTutorial(m)).length
  const materiasPorMes = materiasPorMesDePlan(alumno, totalRegulares)
  const limiteMaterias = Math.max(0, mesesDesbloqueados * materiasPorMes)

  const disponibilidad = new Map<string, boolean>()
  let idxRegular = 0

  for (const mat of ordenarCanonico(materias)) {
    if (esTutorial(mat)) {
      disponibilidad.set(mat.id, true)
      continue
    }
    // Bug 61: la acreditada sigue accesible (canon: legible + constancia) pero
    // ocupa su posición. Antes hacía `continue` sin incrementar el índice, así
    // que cada acreditación "liberaba" un lugar y revelaba la siguiente
    // pendiente — un ratchet que abría el programa completo con 1 mes pagado.
    const dentroDelLimite = mesesDesbloqueados > 0 && idxRegular < limiteMaterias
    disponibilidad.set(mat.id, acreditadas.has(mat.id) || dentroDelLimite)
    idxRegular++
  }

  return disponibilidad
}

/** true si la materia cae dentro de la ventana (o es tutorial/acreditada). */
export function dentroDeVentana(
  alumno: AlumnoAcceso,
  materias: MateriaVentana[],
  acreditadas: Set<string>,
  materiaId: string
): boolean {
  // Materia fuera del catálogo (inactiva / de otro nivel / otra carrera) →
  // fail-closed: `get` devuelve undefined y no concede acceso.
  return calcularDisponibilidad(alumno, materias, acreditadas).get(materiaId) === true
}

/**
 * Criterio canon completo para los gates por materia (contenido, evaluación,
 * quiz, glosario, progreso).
 *
 * Nota de adaptación vs IVS: en la plantilla las materias demo/tutoriales son
 * accesibles SIEMPRE, también para alumnos con inscripción pagada — el listado
 * las marca `disponible: true` sin excepción y el gate debe coincidir. IVS las
 * cierra al pagar (`demo_pagada`), regla propia de ese cliente que aquí
 * rompería la invariante lista ⇔ gate.
 */
export function tieneAccesoMateria(
  alumno: AlumnoAcceso,
  materia: { id: string; nivel: string | null; nombre: string },
  materiasCatalogo: MateriaVentana[],
  acreditadas: Set<string>
): ResultadoAcceso {
  if (acreditadas.has(materia.id)) return { acceso: true, motivo: 'acreditada' }

  if (esTutorial(materia)) return { acceso: true, motivo: 'tutorial' }

  if (alumno.nivel && materia.nivel && materia.nivel !== alumno.nivel) {
    return { acceso: false, motivo: 'nivel_distinto' }
  }

  if ((alumno.meses_desbloqueados ?? 0) <= 0) {
    return { acceso: false, motivo: 'sin_meses' }
  }

  return dentroDeVentana(alumno, materiasCatalogo, acreditadas, materia.id)
    ? { acceso: true, motivo: 'ok' }
    : { acceso: false, motivo: 'fuera_de_ventana' }
}

// ── Carga de contexto (IO) ────────────────────────────────────────────────────

type FilaMateriaDb = {
  id: string
  nombre: string
  nivel: string | null
  orden: number | null
  meses_contenido?: { numero_mes: number }[] | { numero_mes: number } | null
}

/** Normaliza una fila de materias con embed meses_contenido(numero_mes). */
export function toMateriaVentana(row: FilaMateriaDb): MateriaVentana {
  const rel = row.meses_contenido
  const numeros = Array.isArray(rel)
    ? rel.map(r => r.numero_mes)
    : rel
      ? [rel.numero_mes]
      : []
  return {
    id: row.id,
    nombre: row.nombre,
    nivel: row.nivel,
    orden: row.orden,
    numero_mes: numeros.length > 0 ? Math.min(...numeros) : null,
  }
}

// Tipo estructural mínimo para no acoplar el helper a @supabase/supabase-js
// (los gates lo llaman con el cliente de sesión y con el admin indistintamente).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteDb = { from(table: string): any }

const COLUMNAS_ALUMNO = 'id, nivel, meses_desbloqueados, modalidad, duracion_meses, inscripcion_pagada'

/** Un cliente sin la columna `carrera` responde 42703/PGRST204 al pedirla. */
function faltaColumna(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return error.code === '42703' || error.code === 'PGRST204' || msg.includes('carrera')
}

/**
 * Carga el alumno con las columnas que necesita la ventana.
 *
 * `carrera` solo existe en clientes de licenciatura (drift): se pide primero y,
 * si la columna no está, se reintenta sin ella. Antes /api/alumno/materias la
 * pedía siempre y en un esquema sin `carrera` el select fallaba entero → 404
 * "Alumno no encontrado" en todo el listado.
 */
export async function cargarAlumnoAcceso(
  db: ClienteDb,
  alumnoId: string
): Promise<(AlumnoAcceso & { id: string }) | null> {
  const conCarrera = await db
    .from('alumnos')
    .select(`${COLUMNAS_ALUMNO}, carrera`)
    .eq('id', alumnoId)
    .maybeSingle()

  if (conCarrera.data) return conCarrera.data as AlumnoAcceso & { id: string }

  if (!faltaColumna(conCarrera.error)) return null

  const sinCarrera = await db
    .from('alumnos')
    .select(COLUMNAS_ALUMNO)
    .eq('id', alumnoId)
    .maybeSingle()

  return (sinCarrera.data as (AlumnoAcceso & { id: string }) | null) ?? null
}

/**
 * Gate canon de una evaluación, compartido por el GET y el POST de
 * /api/alumno/evaluacion/[id] (bloquear la vista pero no el submit dejaría el
 * hueco vivo: POST directo a evaluaciones no desbloqueadas).
 *
 * Reglas, en orden:
 *   1. materia acreditada → acceso (canon: re-consulta y constancia intactas).
 *   2. materia tutorial/demo → acceso.
 *   3. evaluación sin materia → acceso solo con al menos un mes desbloqueado.
 *   4. resto → nivel + ventana (lib/acceso-materias) y, además, el mes al que
 *      cuelga la evaluación no puede exceder los meses pagados.
 */
export async function tieneAccesoEvaluacion(
  db: ClienteDb,
  alumno: AlumnoAcceso & { id: string },
  ev: { materia_id: string | null; mes_id: string | null }
): Promise<boolean> {
  const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0

  if (!ev.materia_id) return mesesDesbloqueados > 0

  const { data: matData } = await db
    .from('materias')
    .select('id, nombre, nivel')
    .eq('id', ev.materia_id)
    .maybeSingle()

  const materia = matData as { id: string; nombre: string; nivel: string | null } | null
  // Evaluación con materia_id colgando de una materia inexistente → fail-closed.
  if (!materia) return false

  const { materias: catalogo, acreditadas } = await cargarContextoAcceso(db, alumno.id, alumno)

  if (acreditadas.has(materia.id)) return true
  if (esTutorial(materia)) return true

  // Gate de mes: ortogonal a la ventana de materias (una materia disponible
  // puede tener meses aún no pagados).
  if (ev.mes_id) {
    const { data: mesRow } = await db
      .from('meses_contenido')
      .select('numero_mes')
      .eq('id', ev.mes_id)
      .maybeSingle()
    const numeroMes = (mesRow as { numero_mes?: number } | null)?.numero_mes ?? 0
    if (numeroMes > mesesDesbloqueados) return false
  }

  return tieneAccesoMateria(alumno, materia, catalogo, acreditadas).acceso
}

/**
 * Gate canon de una semana: la semana debe colgar de una materia accesible.
 * Cadena real del esquema: semanas.mes_id → meses_contenido.materia_id → materias
 * (`semanas` NO tiene materia_id).
 *
 * Devuelve también la materia resuelta para que quien llama no tenga que
 * repetir el join.
 */
export async function tieneAccesoSemana(
  db: ClienteDb,
  alumno: AlumnoAcceso & { id: string },
  semanaId: string
): Promise<{ acceso: boolean; materiaId: string | null; encontrada: boolean }> {
  const { data: semanaRow } = await db
    .from('semanas')
    .select('id, mes_id')
    .eq('id', semanaId)
    .maybeSingle()

  const semana = semanaRow as { id: string; mes_id: string | null } | null
  if (!semana?.mes_id) return { acceso: false, materiaId: null, encontrada: false }

  const { data: mesRow } = await db
    .from('meses_contenido')
    .select('materia_id, materias(id, nombre, nivel)')
    .eq('id', semana.mes_id)
    .maybeSingle()

  const rel = (mesRow as { materias?: unknown } | null)?.materias
  const materia = (Array.isArray(rel) ? rel[0] : rel) as
    | { id: string; nombre: string; nivel: string | null }
    | undefined

  if (!materia) return { acceso: false, materiaId: null, encontrada: false }

  const { materias: catalogo, acreditadas } = await cargarContextoAcceso(db, alumno.id, alumno)
  const resultado = tieneAccesoMateria(alumno, materia, catalogo, acreditadas)

  return { acceso: resultado.acceso, materiaId: materia.id, encontrada: true }
}

/**
 * Trae el catálogo de materias visible para el alumno + el set de acreditadas.
 *
 * El catálogo es EL MISMO universo que lista /api/alumno/materias (nivel del
 * alumno + demo, y en licenciatura además la carrera —nunca la modalidad—); si
 * divergiera, el índice de la ventana se correría y lista y gate dejarían de
 * coincidir.
 *
 * Funciona igual con el cliente de sesión (RLS: materias/meses_contenido son
 * lectura-autenticados y calificaciones filtra a las propias) o con el admin.
 */
export async function cargarContextoAcceso(
  db: ClienteDb,
  alumnoId: string,
  alumno: Pick<AlumnoAcceso, 'nivel' | 'carrera' | 'modalidad'>
): Promise<{ materias: MateriaVentana[]; acreditadas: Set<string> }> {
  let materiasQuery = db
    .from('materias')
    .select('id, nombre, nivel, orden, meses_contenido(numero_mes)')
    .eq('activa', true)

  materiasQuery = alumno.nivel
    ? materiasQuery.or(`nivel.eq.${alumno.nivel},nivel.eq.demo`)
    : materiasQuery.eq('nivel', 'demo')

  // Scope SOLO por carrera, NUNCA por modalidad. El catálogo de licenciatura se
  // siembra una sola vez etiquetado con la modalidad de REFERENCIA (la más
  // larga), y la modalidad del alumno solo define el RITMO de desbloqueo, no
  // qué materias existen: filtrar por ella dejaba al alumno de 6 meses con
  // cero materias. El `.or` conserva la materia demo, que no tiene carrera.
  if (alumno.nivel === 'licenciatura' && alumno.carrera) {
    materiasQuery = materiasQuery.or(`carrera.eq.${alumno.carrera},nivel.eq.demo`)
  }

  const [matsRes, califsRes] = await Promise.all([
    materiasQuery,
    db
      .from('calificaciones')
      .select('materia_id')
      .eq('alumno_id', alumnoId)
      .eq('acreditado', true),
  ])

  const materias = (((matsRes as { data: unknown }).data ?? []) as FilaMateriaDb[])
    .map(toMateriaVentana)
  const acreditadas = new Set<string>(
    (((califsRes as { data: unknown }).data ?? []) as { materia_id: string }[])
      .map(c => c.materia_id)
  )

  return { materias, acreditadas }
}
