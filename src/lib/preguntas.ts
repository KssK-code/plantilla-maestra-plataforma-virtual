// ─── Preguntas: quiz semanal y examen mensual ────────────────────────────────
// Las dos tablas (quiz_semana y preguntas) tienen casi la misma forma, así que
// la validación vive aquí una sola vez, como función pura.
//
// Mismo patrón que lib/corregir-plan.ts y lib/contenido-semana.ts: whitelist
// estricta, porque estas rutas escriben con service role y sin RLS.

// ⚠️ Asimetría REAL entre las dos tablas: `explicacion` solo existe en
// quiz_semana. `preguntas` (el examen mensual) NO la tiene, así que mandarla
// ahí revienta con "column explicacion does not exist".
export const CAMPOS_PREGUNTA = [
  'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
  'respuesta_correcta', 'orden',
] as const

/** El quiz semanal acepta además una explicación que el alumno ve al fallar. */
export const CAMPOS_QUIZ = [...CAMPOS_PREGUNTA, 'explicacion'] as const

export type CampoPregunta = (typeof CAMPOS_QUIZ)[number]
export type TipoPregunta = 'quiz' | 'examen'

/** Techo de `orden`: la columna es INTEGER (int4). Sin esto, un valor mayor
 *  pasa la validación y Postgres responde "integer out of range" — un 500
 *  opaco por un campo que el formulario controla. */
export const ORDEN_MAX = 2_147_483_647

export const PREGUNTA_MAX    = 2_000
export const OPCION_MAX      = 500
export const EXPLICACION_MAX = 2_000

export const OPCIONES = ['a', 'b', 'c', 'd'] as const
export type Opcion = (typeof OPCIONES)[number]

export interface DatosPregunta {
  pregunta?: string
  opcion_a?: string
  opcion_b?: string
  opcion_c?: string
  /** Cuarta opción OPCIONAL: en quiz_semana la columna es nullable. */
  opcion_d?: string | null
  respuesta_correcta?: Opcion
  orden?: number
  explicacion?: string | null
}

export type ResultadoPregunta =
  | { ok: true; datos: DatosPregunta }
  | { ok: false; error: string }

function texto(v: unknown, max: number, campo: string):
  { ok: true; valor: string } | { ok: false; error: string } {
  if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
  if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
  const limpio = v.trim()
  if (!limpio) return { ok: false, error: `${campo} no puede quedar vacío` }
  return { ok: true, valor: limpio }
}

/**
 * Valida el cuerpo de una pregunta.
 *
 * `crear: true` exige el mínimo con el que una pregunta tiene sentido
 * (enunciado, tres opciones y cuál es la correcta). `crear: false` es un parche:
 * acepta un solo campo, para que editar la explicación no obligue a reenviar
 * toda la pregunta.
 */
export function validarPregunta(
  body: unknown,
  opciones: { crear: boolean; tipo: TipoPregunta },
): ResultadoPregunta {
  const permitidos: readonly string[] =
    opciones.tipo === 'quiz' ? CAMPOS_QUIZ : CAMPOS_PREGUNTA

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }

  const claves = Object.keys(body)
  const extras = claves.filter(k => !permitidos.includes(k))
  if (extras.length > 0) {
    return {
      ok: false,
      error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${permitidos.join(', ')}.`,
    }
  }
  if (!opciones.crear && claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const b = body as Record<string, unknown>
  const datos: DatosPregunta = {}

  // Enunciado y las tres opciones obligatorias.
  for (const campo of ['pregunta', 'opcion_a', 'opcion_b', 'opcion_c'] as const) {
    const max = campo === 'pregunta' ? PREGUNTA_MAX : OPCION_MAX
    if (claves.includes(campo)) {
      const r = texto(b[campo], max, campo)
      if (!r.ok) return r
      datos[campo] = r.valor
    } else if (opciones.crear) {
      return { ok: false, error: `${campo} es requerido` }
    }
  }

  // opcion_d NO se comporta igual en las dos tablas, y esta es la otra mitad de
  // la asimetría que motiva el parámetro `tipo`:
  //   · quiz_semana.opcion_d es NULLABLE  → opcional, '' se guarda como null.
  //   · preguntas.opcion_d  es NOT NULL   → obligatoria; un null revienta el
  //     INSERT con "violates not-null constraint", o sea un 500 opaco por algo
  //     que aquí se puede rechazar con un 400 legible.
  const dObligatoria = opciones.tipo === 'examen'
  if (claves.includes('opcion_d')) {
    const v = b.opcion_d
    if (v === null || v === undefined) {
      if (dObligatoria) return { ok: false, error: 'opcion_d es requerida en un examen' }
      datos.opcion_d = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'opcion_d debe ser texto' }
    } else if (v.length > OPCION_MAX) {
      return { ok: false, error: `opcion_d no puede pasar de ${OPCION_MAX} caracteres` }
    } else {
      const limpio = v.trim()
      if (!limpio && dObligatoria) {
        return { ok: false, error: 'opcion_d no puede quedar vacía en un examen' }
      }
      datos.opcion_d = limpio || null
    }
  } else if (opciones.crear && dObligatoria) {
    return { ok: false, error: 'opcion_d es requerida' }
  }

  if (claves.includes('respuesta_correcta')) {
    const v = b.respuesta_correcta
    if (typeof v !== 'string' || !(OPCIONES as readonly string[]).includes(v)) {
      return { ok: false, error: `respuesta_correcta debe ser una de: ${OPCIONES.join(', ')}` }
    }
    datos.respuesta_correcta = v as Opcion
  } else if (opciones.crear) {
    return { ok: false, error: 'respuesta_correcta es requerida' }
  }

  if (claves.includes('orden')) {
    const n = b.orden
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > ORDEN_MAX) {
      return { ok: false, error: `orden debe ser un entero entre 0 y ${ORDEN_MAX}` }
    }
    datos.orden = n
  }

  if (claves.includes('explicacion')) {
    const v = b.explicacion
    if (v === null || v === undefined) {
      datos.explicacion = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'explicacion debe ser texto' }
    } else if (v.length > EXPLICACION_MAX) {
      return { ok: false, error: `explicacion no puede pasar de ${EXPLICACION_MAX} caracteres` }
    } else {
      datos.explicacion = v.trim() || null
    }
  }

  // El CHECK del esquema admite respuesta_correcta='d', pero quiz_semana.opcion_d
  // es NULLABLE: sin esta regla se puede dejar como correcta una opción que el
  // alumno no ve por ninguna parte.
  //
  // Solo se puede decidir aquí cuando el parche trae AMBAS cosas (o al crear,
  // que trae la pregunta entera). Si el PATCH cambia solo una de las dos, la
  // otra está en la fila y esta función no la ve: ese caso lo cierra la ruta.
  const decideAqui = opciones.crear || claves.includes('opcion_d')
  if (decideAqui && datos.respuesta_correcta === 'd' && !datos.opcion_d) {
    return { ok: false, error: 'No puedes marcar la opción D como correcta si está vacía' }
  }

  return { ok: true, datos }
}

// ─── La evaluación en sí (no sus preguntas) ──────────────────────────────────

export const CAMPOS_EVALUACION = [
  'titulo', 'descripcion', 'tiempo_limite_minutos', 'intentos_permitidos',
] as const

export const TITULO_EVAL_MAX      = 300
export const DESCRIPCION_EVAL_MAX = 2_000
export const TIEMPO_EVAL_MIN      = 1
export const TIEMPO_EVAL_MAX      = 600
export const INTENTOS_MIN         = 1
export const INTENTOS_MAX         = 20

export interface DatosEvaluacion {
  titulo?: string
  descripcion?: string | null
  tiempo_limite_minutos?: number
  intentos_permitidos?: number
}

export type ResultadoEvaluacion =
  | { ok: true; datos: DatosEvaluacion }
  | { ok: false; error: string }

/**
 * Valida el cuerpo de una evaluación.
 *
 * `materia_id` y `mes_id` NO están en la whitelist a propósito: se derivan del
 * mes por el que entra la petición. Aceptarlos del cliente permitiría colgar un
 * examen de una materia ajena.
 */
export function validarEvaluacion(
  body: unknown,
  opciones: { crear: boolean },
): ResultadoEvaluacion {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }

  const claves = Object.keys(body)
  const extras = claves.filter(k => !(CAMPOS_EVALUACION as readonly string[]).includes(k))
  if (extras.length > 0) {
    return {
      ok: false,
      error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${CAMPOS_EVALUACION.join(', ')}.`,
    }
  }
  if (!opciones.crear && claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const b = body as Record<string, unknown>
  const datos: DatosEvaluacion = {}

  if (claves.includes('titulo')) {
    const r = texto(b.titulo, TITULO_EVAL_MAX, 'titulo')
    if (!r.ok) return r
    datos.titulo = r.valor
  } else if (opciones.crear) {
    return { ok: false, error: 'titulo es requerido' }
  }

  if (claves.includes('descripcion')) {
    const v = b.descripcion
    if (v === null || v === undefined) {
      datos.descripcion = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'descripcion debe ser texto' }
    } else if (v.length > DESCRIPCION_EVAL_MAX) {
      return { ok: false, error: `descripcion no puede pasar de ${DESCRIPCION_EVAL_MAX} caracteres` }
    } else {
      datos.descripcion = v.trim() || null
    }
  }

  if (claves.includes('tiempo_limite_minutos')) {
    const n = b.tiempo_limite_minutos
    if (typeof n !== 'number' || !Number.isInteger(n) || n < TIEMPO_EVAL_MIN || n > TIEMPO_EVAL_MAX) {
      return { ok: false, error: `tiempo_limite_minutos debe ser un entero entre ${TIEMPO_EVAL_MIN} y ${TIEMPO_EVAL_MAX}` }
    }
    datos.tiempo_limite_minutos = n
  }

  if (claves.includes('intentos_permitidos')) {
    const n = b.intentos_permitidos
    if (typeof n !== 'number' || !Number.isInteger(n) || n < INTENTOS_MIN || n > INTENTOS_MAX) {
      return { ok: false, error: `intentos_permitidos debe ser un entero entre ${INTENTOS_MIN} y ${INTENTOS_MAX}` }
    }
    datos.intentos_permitidos = n
  }

  return { ok: true, datos }
}
