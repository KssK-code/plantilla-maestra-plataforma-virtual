// ─── Estructura del programa: materias, meses y semanas ──────────────────────
// Dos responsabilidades: validar lo que se crea, y contar lo que se perdería al
// borrarlo.
//
// El conteo es la parte seria. Cada nivel arrastra una cascada distinta y hay
// cosas colgando que NO son contenido, son del alumno: su progreso, sus notas
// personales, sus respuestas y sus calificaciones. Si esto cuenta de menos, la
// API cree que puede borrar y destruye historial en silencio.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCarreras } from '@/lib/licenciatura-utils'

// ── Validación ───────────────────────────────────────────────────────────────

/** Los del CHECK de materias_nivel_check. Cambiar aquí sin cambiar el CHECK
 *  produce un 500 opaco de Postgres en vez de un 400 legible. */
export const NIVELES = ['secundaria', 'preparatoria', 'demo', 'licenciatura'] as const
export type Nivel = (typeof NIVELES)[number]

export const CAMPOS_MATERIA = ['nombre', 'descripcion', 'nivel', 'carrera', 'color', 'icono', 'orden'] as const
export const CAMPOS_MES     = ['numero_mes', 'titulo', 'descripcion'] as const
export const CAMPOS_SEMANA  = ['numero_semana', 'titulo'] as const

export const NOMBRE_MAX         = 300
export const DESCRIPCION_MAX    = 2_000
export const COLOR_MAX          = 40
export const ORDEN_MAX          = 2_147_483_647
export const NUMERO_MES_MAX     = 120
export const NUMERO_SEMANA_MAX  = 520

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string }

function texto(v: unknown, max: number, campo: string): Resultado<string> {
  if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
  if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
  const limpio = v.trim()
  if (!limpio) return { ok: false, error: `${campo} no puede quedar vacío` }
  return { ok: true, datos: limpio }
}

function entero(v: unknown, min: number, max: number, campo: string): Resultado<number> {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    return { ok: false, error: `${campo} debe ser un entero entre ${min} y ${max}` }
  }
  return { ok: true, datos: v }
}

function whitelist(body: unknown, permitidos: readonly string[]): Resultado<Record<string, unknown>> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }
  const extras = Object.keys(body).filter(k => !permitidos.includes(k))
  if (extras.length > 0) {
    return { ok: false, error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${permitidos.join(', ')}.` }
  }
  return { ok: true, datos: body as Record<string, unknown> }
}

export interface DatosMateria {
  nombre?: string
  descripcion?: string | null
  nivel?: Nivel
  carrera?: string | null
  color?: string | null
  icono?: string | null
  orden?: number
}

export function validarMateria(body: unknown, opciones: { crear: boolean }): Resultado<DatosMateria> {
  const w = whitelist(body, CAMPOS_MATERIA)
  if (!w.ok) return w
  const b = w.datos
  const claves = Object.keys(b)
  if (!opciones.crear && claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const datos: DatosMateria = {}

  if (claves.includes('nombre')) {
    const r = texto(b.nombre, NOMBRE_MAX, 'nombre')
    if (!r.ok) return r
    datos.nombre = r.datos
  } else if (opciones.crear) {
    return { ok: false, error: 'nombre es requerido' }
  }

  for (const campo of ['descripcion', 'color', 'icono'] as const) {
    if (!claves.includes(campo)) continue
    const v = b[campo]
    const max = campo === 'descripcion' ? DESCRIPCION_MAX : COLOR_MAX
    if (v === null || v === undefined) { datos[campo] = null; continue }
    if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
    if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
    datos[campo] = v.trim() || null
  }

  if (claves.includes('nivel')) {
    const v = b.nivel
    if (typeof v !== 'string' || !(NIVELES as readonly string[]).includes(v)) {
      return { ok: false, error: `nivel debe ser uno de: ${NIVELES.join(', ')}` }
    }
    datos.nivel = v as Nivel
  } else if (opciones.crear) {
    return { ok: false, error: 'nivel es requerido' }
  }

  // La carrera decide qué catálogo ve el alumno, así que se valida contra el
  // CONFIG real, nunca texto libre — misma regla que el alta de alumnos. Fuera
  // de licenciatura se fuerza a NULL: una materia de secundaria con carrera
  // desaparecería del catálogo de todos.
  if (datos.nivel === 'licenciatura') {
    const validas = getCarreras().map(c => c.slug)
    const pedida = String(b.carrera ?? '').trim()
    if (!pedida || !validas.includes(pedida)) {
      return { ok: false, error: `carrera es requerida para licenciatura (${validas.join(', ') || 'ninguna configurada'})` }
    }
    datos.carrera = pedida
  } else if (datos.nivel !== undefined) {
    datos.carrera = null
  } else if (claves.includes('carrera')) {
    // PATCH que toca `carrera` sin tocar `nivel`: no se puede decidir aquí,
    // porque el nivel está en la fila. Lo cierra la ruta.
    const pedida = String(b.carrera ?? '').trim()
    datos.carrera = pedida || null
  }

  if (claves.includes('orden')) {
    const r = entero(b.orden, 0, ORDEN_MAX, 'orden')
    if (!r.ok) return r
    datos.orden = r.datos
  }

  return { ok: true, datos }
}

export interface DatosMes { numero_mes?: number; titulo?: string; descripcion?: string | null }

export function validarMes(body: unknown, opciones: { crear: boolean }): Resultado<DatosMes> {
  const w = whitelist(body, CAMPOS_MES)
  if (!w.ok) return w
  const b = w.datos
  const claves = Object.keys(b)
  if (!opciones.crear && claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const datos: DatosMes = {}

  if (claves.includes('titulo')) {
    const r = texto(b.titulo, NOMBRE_MAX, 'titulo')
    if (!r.ok) return r
    datos.titulo = r.datos
  } else if (opciones.crear) {
    return { ok: false, error: 'titulo es requerido' }
  }

  if (claves.includes('numero_mes')) {
    const r = entero(b.numero_mes, 1, NUMERO_MES_MAX, 'numero_mes')
    if (!r.ok) return r
    datos.numero_mes = r.datos
  }

  if (claves.includes('descripcion')) {
    const v = b.descripcion
    if (v === null || v === undefined) datos.descripcion = null
    else if (typeof v !== 'string') return { ok: false, error: 'descripcion debe ser texto' }
    else if (v.length > DESCRIPCION_MAX) return { ok: false, error: `descripcion no puede pasar de ${DESCRIPCION_MAX} caracteres` }
    else datos.descripcion = v.trim() || null
  }

  return { ok: true, datos }
}

export interface DatosSemanaNueva { numero_semana?: number; titulo?: string }

/** Solo para el POST de creación. El resto de campos de una semana (apuntes,
 *  videos, minutos) los valida lib/contenido-semana.ts, de F1. */
export function validarSemana(body: unknown, opciones: { crear: boolean }): Resultado<DatosSemanaNueva> {
  const w = whitelist(body, CAMPOS_SEMANA)
  if (!w.ok) return w
  const b = w.datos
  const claves = Object.keys(b)
  const datos: DatosSemanaNueva = {}

  if (claves.includes('titulo')) {
    const r = texto(b.titulo, NOMBRE_MAX, 'titulo')
    if (!r.ok) return r
    datos.titulo = r.datos
  } else if (opciones.crear) {
    return { ok: false, error: 'titulo es requerido' }
  }

  if (claves.includes('numero_semana')) {
    const r = entero(b.numero_semana, 1, NUMERO_SEMANA_MAX, 'numero_semana')
    if (!r.ok) return r
    datos.numero_semana = r.datos
  }

  return { ok: true, datos }
}

// ── Conteo de dependencias ───────────────────────────────────────────────────

export interface Dependencias {
  total: number
  /** Desglose por tipo. El mensaje al admin lo usa para decir QUÉ se conserva. */
  detalle: Record<string, number>
}

type Db = SupabaseClient

async function contar(db: Db, tabla: string, columna: string, valores: string[]): Promise<number> {
  if (valores.length === 0) return 0
  const { count } = await db.from(tabla).select('*', { count: 'exact', head: true }).in(columna, valores)
  return count ?? 0
}

async function idsDe(db: Db, tabla: string, columna: string, valores: string[]): Promise<string[]> {
  if (valores.length === 0) return []
  const { data } = await db.from(tabla).select('id').in(columna, valores)
  return ((data ?? []) as { id: string }[]).map(r => r.id)
}

function sumar(detalle: Record<string, number>): Dependencias {
  return { total: Object.values(detalle).reduce((a, b) => a + b, 0), detalle }
}

/**
 * Lo que cuelga de un conjunto de semanas.
 *
 * Recibe un ARRAY a propósito: los tres niveles lo comparten, y hacerlo semana
 * por semana convertiría el borrado de una materia con 48 semanas en cientos de
 * viajes a la base.
 */
async function deSemanas(db: Db, semanaIds: string[]): Promise<Record<string, number>> {
  const quizIds = await idsDe(db, 'quiz_semana', 'semana_id', semanaIds)
  return {
    progreso:   await contar(db, 'progreso_semanas',  'semana_id', semanaIds),
    notas:      await contar(db, 'notas_alumno',      'semana_id', semanaIds),
    respuestas: await contar(db, 'quiz_respuestas',   'quiz_id',   quizIds),
    materiales: await contar(db, 'semana_materiales', 'semana_id', semanaIds),
    // El quiz cuenta AUNQUE nadie lo haya respondido. No es historial de
    // alumno, pero son preguntas que alguien redactó a mano y que `quiz_semana`
    // pierde por CASCADE al borrar la semana. Sin esta línea, una semana con
    // diez preguntas escritas y cero respuestas daba total 0 y se borraba
    // entera de un clic. Si el admin quiere el borrado duro, retira antes las
    // preguntas —que tienen su propio archivado desde F3— y entonces sí.
    preguntas_quiz: quizIds.length,
  }
}

export async function dependenciasSemana(db: Db, semanaId: string): Promise<Dependencias> {
  return sumar(await deSemanas(db, [semanaId]))
}

export async function dependenciasMes(db: Db, mesId: string): Promise<Dependencias> {
  const semanaIds = await idsDe(db, 'semanas', 'mes_id', [mesId])
  const evaluacionIds = await idsDe(db, 'evaluaciones', 'mes_id', [mesId])
  return sumar({
    ...(await deSemanas(db, semanaIds)),
    // Los exámenes cuentan AUNQUE nadie los haya respondido: evaluaciones.mes_id
    // es SET NULL, así que borrar el mes no los destruye — los deja huérfanos e
    // inalcanzables por la API, que lista por mes. Peor que borrarlos: parecen
    // existir y nadie puede llegar a ellos.
    examenes: evaluacionIds.length,
    intentos: await contar(db, 'intentos_evaluacion', 'evaluacion_id', evaluacionIds),
  })
}

export async function dependenciasMateria(db: Db, materiaId: string): Promise<Dependencias> {
  const mesIds = await idsDe(db, 'meses_contenido', 'materia_id', [materiaId])
  const semanaIds = await idsDe(db, 'semanas', 'mes_id', mesIds)
  const evaluacionIds = await idsDe(db, 'evaluaciones', 'materia_id', [materiaId])
  return sumar({
    ...(await deSemanas(db, semanaIds)),
    examenes: evaluacionIds.length,
    intentos: await contar(db, 'intentos_evaluacion', 'evaluacion_id', evaluacionIds),
    // Las dos que de verdad duelen: `calificaciones` es CASCADE (se borran las
    // notas del alumno) y `constancias` es SET NULL (su constancia emitida
    // pierde la referencia a la materia).
    calificaciones: await contar(db, 'calificaciones', 'materia_id', [materiaId]),
    constancias:    await contar(db, 'constancias',    'materia_id', [materiaId]),
    glosario:       await contar(db, 'glosario_materia', 'materia_id', [materiaId]),
  })
}

/** Frase para el admin: qué se conserva al archivar. */
export function describirDependencias(d: Dependencias): string {
  const nombres: Record<string, string> = {
    progreso: 'registros de progreso', notas: 'notas personales de alumnos',
    respuestas: 'respuestas de quiz', materiales: 'archivos subidos',
    preguntas_quiz: 'preguntas de quiz redactadas',
    examenes: 'exámenes', intentos: 'intentos de examen',
    calificaciones: 'calificaciones', constancias: 'constancias emitidas',
    glosario: 'términos de glosario',
  }
  const partes = Object.entries(d.detalle)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${nombres[k] ?? k}`)
  return partes.join(', ')
}
