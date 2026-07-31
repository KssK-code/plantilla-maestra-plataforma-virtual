/**
 * Parámetros comerciales y de ritmo de un curso (B7/T3).
 *
 * B1 creó estas seis columnas, B3 las usa como defaults de cobro, B2 lee
 * `modulos_por_mes` para decidir la ventana y B5 las pinta en el catálogo
 * público — pero ninguna era editable desde el panel. En la práctica eso
 * significaba que cada diplomado nuevo tenía que pasar por nosotros para que
 * alguien le pusiera precio con un UPDATE a mano, y todos los cursos quedaban
 * clavados en `modulos_por_mes = 2`. Esto lo arregla.
 *
 * ⚠️ LA VALIDACIÓN VIVE AQUÍ Y NO EN CADA ENDPOINT. Crear y editar son dos
 * rutas distintas (POST /api/admin/cursos y PATCH /api/admin/cursos/[id]) y
 * duplicar los rangos en las dos es garantía de que dentro de seis meses
 * acepten cosas distintas. El navegador no valida nada que importe: los
 * `min`/`step` del formulario son ayuda visual, y un `curl` los ignora.
 */

/** Las seis columnas que el admin puede editar. */
export interface ParametrosCurso {
  precio_inscripcion: number
  precio_mensualidad: number
  horas: number | null
  duracion_meses: number | null
  modulos_por_mes: number
  intentos_permitidos: number
}

/**
 * Techo de los precios. `NUMERIC(10,2)` admite hasta 99,999,999.99; pasarse
 * revienta en Postgres con un 22003 («numeric field overflow»), un error que
 * el admin vería como un 500 sin explicación. Se corta antes, con un mensaje
 * que dice qué pasó.
 */
const PRECIO_MAX = 9_999_999

/** Techos de cordura. No son límites técnicos: atajan el dedo resbalado. */
const HORAS_MAX = 10_000
const MESES_MAX = 120
const MODULOS_POR_MES_MAX = 50
const INTENTOS_MAX = 20

export type ResultadoValidacion =
  | { ok: true; valor: number | null }
  | { ok: false; error: string }

/**
 * Entero >= min, o null si el campo viene vacío y `permiteNulo`.
 *
 * Trata '' , null y undefined como «sin valor». El formulario manda cadena
 * vacía cuando el admin borra el campo, y eso NO es un cero: `duracion_meses`
 * vacío significa «sin tope fijo», mientras que 0 sería un curso de cero meses.
 */
function enteroOpcional(
  bruto: unknown,
  etiqueta: string,
  { min, max, permiteNulo }: { min: number; max: number; permiteNulo: boolean }
): ResultadoValidacion {
  // ⚠️ SE NORMALIZA ANTES DE PREGUNTAR SI ESTÁ VACÍO, y el orden importa.
  //
  // La versión ingenua comprobaba `bruto === ''` y dejaba pasar `'  '`, `'\t'`,
  // `[]` y `{}`. Todos ellos llegan abajo y `Number(...)` los convierte en 0
  // —`Number('  ')` es 0 por la propia coerción de JS, sin necesidad de trim, y
  // `String([])` es ''—, que es finito, entero y >= 0. En `horas` (el único
  // campo con min 0 y nulo permitido) eso escribía 0 donde debía ir NULL.
  //
  // Y ese 0 no es cosmético: B4 congela `cursos.horas` dentro de la constancia
  // al emitirla, y la constancia distingue con `!== null`. Un `{"horas":"  "}`
  // por curl acababa en un diploma que dice «con una duración de 0 horas», con
  // folio ya emitido e irrepetible porque la emisión es idempotente.
  if (bruto !== null && bruto !== undefined && typeof bruto !== 'number' && typeof bruto !== 'string') {
    return { ok: false, error: `${etiqueta} debe ser un número.` }
  }
  const limpio = typeof bruto === 'string' ? bruto.trim() : bruto

  if (limpio === '' || limpio === null || limpio === undefined) {
    if (permiteNulo) return { ok: true, valor: null }
    return { ok: false, error: `${etiqueta} es obligatorio.` }
  }

  const n = typeof limpio === 'number' ? limpio : Number(limpio)

  // `Number.isFinite` y no `isNaN`: descarta también Infinity, que un JSON con
  // `1e999` produce y que pasaría cualquier comparación de rango por arriba.
  if (!Number.isFinite(n)) return { ok: false, error: `${etiqueta} debe ser un número.` }
  if (!Number.isInteger(n)) return { ok: false, error: `${etiqueta} debe ser un número entero.` }
  if (n < min) return { ok: false, error: `${etiqueta} no puede ser menor que ${min}.` }
  if (n > max) return { ok: false, error: `${etiqueta} no puede pasar de ${max}.` }
  return { ok: true, valor: n }
}

/** Monto en pesos. Admite decimales (NUMERIC(10,2)) pero no negativos. */
function precio(bruto: unknown, etiqueta: string): ResultadoValidacion {
  // Misma guarda de tipo que arriba, por simetría: aquí no cambia ningún
  // resultado válido (vacío ya era 0 por diseño), pero evita que `{}` o `[5]`
  // entren por coerción de String() y se guarden como un monto.
  if (bruto !== null && bruto !== undefined && typeof bruto !== 'number' && typeof bruto !== 'string') {
    return { ok: false, error: `${etiqueta} debe ser un número.` }
  }
  const limpio = typeof bruto === 'string' ? bruto.trim() : bruto
  if (limpio === '' || limpio === null || limpio === undefined) return { ok: true, valor: 0 }

  const n = typeof limpio === 'number' ? limpio : Number(limpio)
  if (!Number.isFinite(n)) return { ok: false, error: `${etiqueta} debe ser un número.` }
  if (n < 0) return { ok: false, error: `${etiqueta} no puede ser negativo.` }
  if (n > PRECIO_MAX) return { ok: false, error: `${etiqueta} no puede pasar de ${PRECIO_MAX}.` }

  // Se redondea a dos decimales: la columna es NUMERIC(10,2) y Postgres
  // redondearía igual, pero silenciosamente. Mejor que el valor guardado sea
  // exactamente el que el endpoint decidió.
  return { ok: true, valor: Math.round(n * 100) / 100 }
}

export type ValidacionParametros =
  | { ok: true; updates: Partial<ParametrosCurso> }
  | { ok: false; error: string }

/**
 * Valida y normaliza las seis columnas de un body.
 *
 * Solo devuelve las claves PRESENTES en el body: así sirve igual para el POST
 * (que las manda todas) y para el PATCH (que manda las que cambiaron). Una
 * clave ausente no se toca; una clave presente y vacía se interpreta según su
 * regla — null para las opcionales, 0 para los precios.
 */
export function validarParametrosCurso(body: Record<string, unknown>): ValidacionParametros {
  const updates: Partial<ParametrosCurso> = {}

  const campos: Array<[keyof ParametrosCurso, () => ResultadoValidacion]> = [
    ['precio_inscripcion',  () => precio(body.precio_inscripcion,  'El precio de inscripción')],
    ['precio_mensualidad',  () => precio(body.precio_mensualidad,  'La mensualidad')],
    // horas y duracion_meses: NULL legítimo. `duracion_meses` vacío significa
    // «sin tope fijo» y B3 cae entonces a contar módulos entre modulos_por_mes.
    ['horas',               () => enteroOpcional(body.horas, 'Las horas', { min: 0, max: HORAS_MAX, permiteNulo: true })],
    ['duracion_meses',      () => enteroOpcional(body.duracion_meses, 'La duración en meses', { min: 1, max: MESES_MAX, permiteNulo: true })],
    // Estos dos son NOT NULL con CHECK > 0 en la base: vacío no es opción.
    ['modulos_por_mes',     () => enteroOpcional(body.modulos_por_mes, 'Los módulos por mes', { min: 1, max: MODULOS_POR_MES_MAX, permiteNulo: false })],
    ['intentos_permitidos', () => enteroOpcional(body.intentos_permitidos, 'Los intentos del examen', { min: 1, max: INTENTOS_MAX, permiteNulo: false })],
  ]

  for (const [clave, validar] of campos) {
    if (body[clave] === undefined) continue   // ausente = no se toca
    const r = validar()
    if (!r.ok) return { ok: false, error: r.error }
    ;(updates as Record<string, unknown>)[clave] = r.valor
  }

  return { ok: true, updates }
}

/**
 * ¿Cambiar estos parámetros mueve la ventana de alumnos ya inscritos?
 *
 * `modulos_por_mes` y `duracion_meses` alimentan el gate de B2, que se calcula
 * EN CADA LECTURA a partir de los meses pagados — no hay nada congelado por
 * inscripción. Bajar `modulos_por_mes` de 3 a 2 le quita módulos ya visibles a
 * un alumno que los estaba estudiando; subirlo se los regala.
 *
 * Es legítimo hacerlo (un curso puede corregir su ritmo), así que NO se
 * bloquea. Pero el admin tiene que enterarse ANTES de guardar, no por la
 * llamada del alumno preguntando dónde quedó su módulo.
 */
export function afectaVentanaRetroactiva(updates: Partial<ParametrosCurso>): boolean {
  return updates.modulos_por_mes !== undefined || updates.duracion_meses !== undefined
}
