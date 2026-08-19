// ─── Edición de una semana desde Contenido (admin) ───────────────────────────
// La validación del body vive aquí, fuera de la ruta, para poder probarla como
// función pura — mismo patrón que lib/corregir-plan.ts.
//
// Whitelist ESTRICTA: una clave desconocida rechaza la petición entera. Este
// PATCH escribe con service role, saltándose RLS; un llamador que manda un
// campo que la ruta no conoce espera escribir algo que jamás vamos a escribir,
// y fallar ruidosamente es mejor que ignorarlo en silencio.
//
// Todos los campos son OPCIONALES pero al menos uno debe venir: la pantalla
// guarda semana por semana y no siempre manda el formulario completo.

export const CAMPOS_SEMANA = [
  'titulo', 'descripcion', 'contenido', 'tiempo_estimado_minutos',
  'video_url', 'video_url_2', 'video_url_3',
] as const

export type CampoSemana = (typeof CAMPOS_SEMANA)[number]

// Topes. `contenido` es TEXT sin límite en Postgres: sin tope, un pegado
// accidental mete megabytes en una sola fila.
//
// El techo real NO es este número. /api/alumno/materia/[id] devuelve TODAS las
// semanas de la materia con su contenido en UNA respuesta, así que lo que viaja
// es N x CONTENIDO_MAX: una materia de 48 semanas (un año) con 200k por semana
// serían ~9.6 MB, por encima del límite de respuesta de Vercel. 50k ≈ 25
// páginas por semana — de sobra para unos apuntes — y deja el peor caso en
// ~2.4 MB. Si algún día hace falta más, lo que hay que cambiar primero es que
// el alumno se traiga la materia entera de golpe, no este número.
export const CONTENIDO_MAX   = 50_000
export const TITULO_MAX      = 300
export const DESCRIPCION_MAX = 2_000
export const URL_MAX         = 2_000
export const TIEMPO_MIN      = 1
export const TIEMPO_MAX      = 600

export interface ParcheSemana {
  titulo?: string
  descripcion?: string | null
  contenido?: string | null
  tiempo_estimado_minutos?: number
  video_url?: string | null
  video_url_2?: string | null
  video_url_3?: string | null
}

export type ResultadoSemana =
  | { ok: true; update: ParcheSemana }
  | { ok: false; error: string }

type Texto =
  | { ok: true; valor: string | null }
  | { ok: false; error: string }

/**
 * Texto opcional. '' y '   ' se guardan como NULL, nunca como cadena vacía:
 * el alumno hace `contenido ?? descripcion` y una cadena vacía NO dispara el
 * fallback, así que guardar '' dejaría la semana en blanco en vez de caer a la
 * descripción, que es lo que pasa cuando el seed no escribió nada.
 */
function textoOpcional(v: unknown, max: number, campo: string): Texto {
  if (v === null || v === undefined) return { ok: true, valor: null }
  if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
  if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
  const limpio = v.trim()
  return { ok: true, valor: limpio === '' ? null : limpio }
}

export function validarSemanaPatch(body: unknown): ResultadoSemana {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }

  const claves = Object.keys(body)
  const extras = claves.filter(k => !(CAMPOS_SEMANA as readonly string[]).includes(k))
  if (extras.length > 0) {
    return {
      ok: false,
      error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${CAMPOS_SEMANA.join(', ')}.`,
    }
  }
  if (claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  // De aquí en adelante se consulta SIEMPRE `claves` (propiedades propias, las
  // mismas que pasaron la whitelist) y nunca el operador `in`, que además mira
  // la cadena de prototipos: con los dos criterios mezclados, un campo heredado
  // llegaba al UPDATE sin que la whitelist lo hubiera visto jamás.
  const b = body as Record<string, unknown>
  const update: ParcheSemana = {}

  // titulo — el único NOT NULL entre los editables: se cambia, no se vacía.
  if (claves.includes('titulo')) {
    if (typeof b.titulo !== 'string' || b.titulo.trim() === '') {
      return { ok: false, error: 'titulo es requerido y no puede quedar vacío' }
    }
    if (b.titulo.length > TITULO_MAX) {
      return { ok: false, error: `titulo no puede pasar de ${TITULO_MAX} caracteres` }
    }
    update.titulo = b.titulo.trim()
  }

  if (claves.includes('descripcion')) {
    const r = textoOpcional(b.descripcion, DESCRIPCION_MAX, 'descripcion')
    if (!r.ok) return r
    update.descripcion = r.valor
  }

  if (claves.includes('contenido')) {
    const r = textoOpcional(b.contenido, CONTENIDO_MAX, 'contenido')
    if (!r.ok) return r
    update.contenido = r.valor
  }

  if (claves.includes('tiempo_estimado_minutos')) {
    const n = b.tiempo_estimado_minutos
    if (typeof n !== 'number' || !Number.isInteger(n) || n < TIEMPO_MIN || n > TIEMPO_MAX) {
      return {
        ok: false,
        error: `tiempo_estimado_minutos debe ser un entero entre ${TIEMPO_MIN} y ${TIEMPO_MAX}`,
      }
    }
    update.tiempo_estimado_minutos = n
  }

  // Los tres videos, explícitos y no en bucle: el bucle obliga a un índice
  // dinámico sobre ParcheSemana que TypeScript no puede estrechar.
  if (claves.includes('video_url')) {
    const r = textoOpcional(b.video_url, URL_MAX, 'video_url')
    if (!r.ok) return r
    update.video_url = r.valor
  }
  if (claves.includes('video_url_2')) {
    const r = textoOpcional(b.video_url_2, URL_MAX, 'video_url_2')
    if (!r.ok) return r
    update.video_url_2 = r.valor
  }
  if (claves.includes('video_url_3')) {
    const r = textoOpcional(b.video_url_3, URL_MAX, 'video_url_3')
    if (!r.ok) return r
    update.video_url_3 = r.valor
  }

  return { ok: true, update }
}
