/**
 * Examen Final de Curso — lógica compartida entre las rutas de API.
 *
 * SEGURIDAD (lo no negociable de esta feature):
 *   * curso_examen_preguntas tiene RLS SOLO-ADMIN. El alumno jamás la lee por
 *     PostgREST. Estas funciones la leen con el cliente admin desde el servidor
 *     y devuelven las preguntas SANITIZADAS.
 *   * La calificación ocurre aquí, en el servidor, comparando contra
 *     respuesta_correcta. El navegador nunca ve la clave antes de enviar.
 *   * Es lo contrario del patrón del quiz semanal (Bug 59), que hace select('*')
 *     y manda la respuesta correcta al cliente.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DesgloseTema,
  Letra,
  PreguntaExamen,
  PreguntaSanitizada,
  RespuestaEnviada,
  RespuestaGuardada,
  RevisionPregunta,
} from '@/types/cursos-examen'

const LETRAS: Letra[] = ['a', 'b', 'c', 'd']

export const esLetra = (v: unknown): v is Letra =>
  typeof v === 'string' && (LETRAS as string[]).includes(v)

/**
 * Valida el cuerpo de alta de una pregunta. Devuelve el mensaje de error, o
 * null si está bien.
 *
 * Vive aquí y no en el route.ts porque Next solo admite exportar handlers
 * desde un archivo de ruta: cualquier otro export rompe el tipado generado.
 */
export function validarPregunta(b: Record<string, unknown>): string | null {
  if (typeof b.enunciado !== 'string' || !b.enunciado.trim()) return 'El enunciado es obligatorio'
  for (const L of LETRAS) {
    const v = b[`opcion_${L}`]
    if (typeof v !== 'string' || !v.trim()) return `La opción ${L}) es obligatoria`
  }
  if (!esLetra(b.respuesta_correcta)) return 'La respuesta correcta debe ser a, b, c o d'
  return null
}

/**
 * ¿Este usuario puede abrir este curso?
 *
 * Se resuelve con el MISMO canon que ya usa el visor de lecciones: se consulta
 * `cursos` con la SESIÓN del usuario y se deja que la RLS decida. Esa política
 * exige curso publicado + inscripción, o bien is_admin() para la vista previa.
 * Si la fila no vuelve, no hay acceso — sin duplicar aquí la regla de negocio.
 */
export async function puedeVerCurso(
  supabase: SupabaseClient,
  cursoId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('cursos')
    .select('id')
    .eq('id', cursoId)
    .maybeSingle()
  return Boolean(data)
}

/** Quita clave y explicación. Es la única forma en que una pregunta sale al cliente. */
export const sanitizar = (p: PreguntaExamen): PreguntaSanitizada => ({
  id: p.id,
  orden: p.orden,
  tema: p.tema,
  enunciado: p.enunciado,
  opcion_a: p.opcion_a,
  opcion_b: p.opcion_b,
  opcion_c: p.opcion_c,
  opcion_d: p.opcion_d,
})

/** Lee el examen completo de un curso con el cliente admin, ordenado. */
export async function leerPreguntas(
  admin: SupabaseClient,
  cursoId: string
): Promise<PreguntaExamen[]> {
  const { data } = await admin
    .from('curso_examen_preguntas')
    .select('id, curso_id, orden, tema, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion')
    .eq('curso_id', cursoId)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  return (data ?? []) as PreguntaExamen[]
}

/**
 * Califica un envío contra el banco real.
 *
 * Reglas:
 *   * Una pregunta sin contestar (o con una letra inválida) cuenta como
 *     INCORRECTA. No se omite del total: el denominador es siempre el número
 *     de preguntas del examen.
 *   * Se ignoran las respuestas que apunten a preguntas de otro curso o
 *     inexistentes: el alumno no puede inflar su total mandando basura.
 *   * El desglose agrupa por tema; las preguntas sin tema caen en "General".
 */
export function calificar(
  preguntas: PreguntaExamen[],
  enviadas: RespuestaEnviada[]
): {
  aciertos: number
  total: number
  porcentaje: number
  desglose: DesgloseTema[]
  respuestas: RespuestaGuardada[]
  revision: RevisionPregunta[]
} {
  const porId = new Map<string, Letra | null>()
  for (const r of enviadas) {
    if (r && typeof r.pregunta_id === 'string') {
      porId.set(r.pregunta_id, esLetra(r.respuesta) ? r.respuesta : null)
    }
  }

  const respuestas: RespuestaGuardada[] = []
  const revision: RevisionPregunta[] = []
  const acum = new Map<string, { aciertos: number; total: number }>()
  let aciertos = 0

  for (const p of preguntas) {
    const dada = porId.get(p.id) ?? null
    const correcta = dada !== null && dada === p.respuesta_correcta
    if (correcta) aciertos++

    respuestas.push({ pregunta_id: p.id, respuesta: dada, es_correcta: correcta })

    revision.push({
      pregunta_id: p.id,
      orden: p.orden,
      tema: p.tema,
      enunciado: p.enunciado,
      opciones: { a: p.opcion_a, b: p.opcion_b, c: p.opcion_c, d: p.opcion_d },
      tu_respuesta: dada,
      respuesta_correcta: p.respuesta_correcta,
      es_correcta: correcta,
      explicacion: p.explicacion,
    })

    const tema = p.tema?.trim() || 'General'
    const t = acum.get(tema) ?? { aciertos: 0, total: 0 }
    t.total++
    if (correcta) t.aciertos++
    acum.set(tema, t)
  }

  const total = preguntas.length
  // Se redondea a 2 decimales para que cuadre con NUMERIC(5,2) de la tabla.
  const porcentaje = total === 0 ? 0 : Math.round((aciertos / total) * 10000) / 100

  const desglose: DesgloseTema[] = [...acum.entries()].map(([tema, v]) => ({
    tema,
    aciertos: v.aciertos,
    total: v.total,
  }))

  return { aciertos, total, porcentaje, desglose, respuestas, revision }
}
