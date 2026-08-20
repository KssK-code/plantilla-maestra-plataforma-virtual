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

  // opcion_d es OPCIONAL: la columna es nullable en quiz_semana. '' → null.
  if (claves.includes('opcion_d')) {
    const v = b.opcion_d
    if (v === null || v === undefined) {
      datos.opcion_d = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'opcion_d debe ser texto' }
    } else if (v.length > OPCION_MAX) {
      return { ok: false, error: `opcion_d no puede pasar de ${OPCION_MAX} caracteres` }
    } else {
      datos.opcion_d = v.trim() || null
    }
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
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
      return { ok: false, error: 'orden debe ser un entero mayor o igual que 0' }
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
