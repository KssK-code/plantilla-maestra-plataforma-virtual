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
 *   * La revisión posterior al envío solo trae la clave de las preguntas que el
 *     alumno CONTESTÓ. Ver `calificar()`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { limiteVentana } from './acceso'
import type { CursoVentana, InscripcionVentana } from './acceso'
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

/**
 * Intentos permitidos por alumno en el examen final de un curso.
 *
 * El valor REAL vive en cursos.intentos_permitidos (B1), configurable por curso
 * — mismo nombre y mismo default que evaluaciones.intentos_permitidos en la
 * vertical de materias, para que el repo tenga una sola convención.
 *
 * Esta constante queda solo como FALLBACK para el caso en que la columna venga
 * nula o la lectura falle: preferimos aplicar el límite por defecto a dejar el
 * examen sin candado. Ver `leerIntentosPermitidos()`.
 */
export const INTENTOS_PERMITIDOS_DEFAULT = 3

/**
 * Intentos permitidos de un curso concreto.
 *
 * Si la columna es nula o la consulta falla, cae al default en vez de devolver
 * "sin límite": un error de lectura NO puede abrir el candado. Es la misma
 * regla que aplica el resto del módulo — fallar cerrado, nunca abierto.
 */
export async function leerIntentosPermitidos(
  admin: SupabaseClient,
  cursoId: string
): Promise<number> {
  const { data } = await admin
    .from('cursos')
    .select('intentos_permitidos')
    .eq('id', cursoId)
    .single()

  const n = (data as { intentos_permitidos: number | null } | null)?.intentos_permitidos
  return typeof n === 'number' && n > 0 ? n : INTENTOS_PERMITIDOS_DEFAULT
}

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

/**
 * ¿El alumno puede presentar el EXAMEN FINAL del curso?
 *
 * ⚠️ ESTE GATE ES OBLIGATORIO EN CÓDIGO, no lo cubre la RLS. Las tres rutas del
 * examen leen con `createAdminClient()` (service_role) porque
 * curso_examen_preguntas es solo-admin, y el service_role **bypasea RLS**. La
 * ventana de pago de la migración B2 no las protege: aquí el candado es esto.
 *
 * REGLA: el examen final exige el curso COMPLETO liberado — techo de la ventana
 * ≥ número de módulos. No se puede presentar el examen final de un diplomado
 * del que se pagó 1 de 6 meses. Con 0 módulos (un curso que es solo examen)
 * la condición se reduce a "al menos un mes pagado", que es lo razonable.
 *
 * Falla cerrado: sin inscripción, suspendida, vencida o curso no publicado →
 * `limiteVentana` devuelve 0 y esto es false.
 */
export async function puedeExamenFinal(
  admin: SupabaseClient,
  cursoId: string,
  alumnoId: string
): Promise<boolean> {
  const { data: insc } = await admin
    .from('curso_inscripciones')
    .select('meses_desbloqueados, estado, fecha_vencimiento')
    .eq('curso_id', cursoId)
    .eq('alumno_id', alumnoId)
    .maybeSingle()
  if (!insc) return false

  const { data: curso } = await admin
    .from('cursos')
    .select('modulos_por_mes, estado')
    .eq('id', cursoId)
    .maybeSingle()

  const { count } = await admin
    .from('curso_modulos')
    .select('id', { count: 'exact', head: true })
    .eq('curso_id', cursoId)

  const limite = limiteVentana(insc as InscripcionVentana, (curso ?? null) as CursoVentana | null)
  return limite > 0 && limite >= (count ?? 0)
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
  /**
   * Cuántas preguntas DEL BANCO recibieron una letra válida en este envío.
   * La ruta lo usa para rechazar el envío-oráculo: cero contestadas no se
   * califica ni se guarda. Cuenta contra el banco, así que mandar basura o
   * ids de otro curso no lo infla.
   */
  contestadas: number
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
  let contestadas = 0

  for (const p of preguntas) {
    const dada = porId.get(p.id) ?? null
    const correcta = dada !== null && dada === p.respuesta_correcta
    if (correcta) aciertos++
    if (dada !== null) contestadas++

    respuestas.push({ pregunta_id: p.id, respuesta: dada, es_correcta: correcta })

    // ⚠️ SEGURIDAD — la clave y la explicación SOLO se adjuntan si el alumno
    // contestó ESTA pregunta en ESTE envío. Antes se adjuntaban siempre, así
    // que un POST con todas las respuestas en null devolvía el banco completo:
    // enviar en blanco, leer las claves de la respuesta HTTP y reenviar
    // contestando bien daba 100% sin estudiar. Las claves se OMITEN (no van
    // como null) para no revelar ni siquiera su existencia posicional.
    const base: RevisionPregunta = {
      pregunta_id: p.id,
      orden: p.orden,
      tema: p.tema,
      enunciado: p.enunciado,
      opciones: { a: p.opcion_a, b: p.opcion_b, c: p.opcion_c, d: p.opcion_d },
      tu_respuesta: dada,
      es_correcta: correcta,
    }
    revision.push(
      dada === null
        ? base
        : { ...base, respuesta_correcta: p.respuesta_correcta, explicacion: p.explicacion }
    )

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

  return { aciertos, total, porcentaje, desglose, respuestas, revision, contestadas }
}
