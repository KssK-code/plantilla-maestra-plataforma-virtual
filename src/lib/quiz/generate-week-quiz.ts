import Anthropic from '@anthropic-ai/sdk'

export type GeneratedQuizRow = {
  pregunta: string
  opcion_a: string
  opcion_b: string
  opcion_c: string
  respuesta_correcta: 'a' | 'b' | 'c'
  explicacion?: string
}

function parseQuizJson(text: string): GeneratedQuizRow[] {
  const raw = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(raw)
  const jsonStr = (fenced ? fenced[1] : raw).trim()
  const parsed = JSON.parse(jsonStr) as { preguntas?: unknown }
  const arr = parsed.preguntas
  if (!Array.isArray(arr) || arr.length < 1) throw new Error('JSON sin preguntas')

  return arr.slice(0, 3).map((item, i) => {
    const o = item as Record<string, unknown>
    const pregunta = String(o.pregunta ?? '').trim()
    const opts = Array.isArray(o.opciones) ? o.opciones : []
    const opcion_a = String(o.opcion_a ?? opts[0] ?? '').trim()
    const opcion_b = String(o.opcion_b ?? opts[1] ?? '').trim()
    const opcion_c = String(o.opcion_c ?? opts[2] ?? '').trim()
    let letra = String(o.respuesta_correcta ?? 'a').trim().toLowerCase().charAt(0)
    if (letra !== 'a' && letra !== 'b' && letra !== 'c') letra = 'a'
    const explicacion = o.explicacion != null ? String(o.explicacion).trim() : undefined
    if (!pregunta || !opcion_a || !opcion_b || !opcion_c) {
      throw new Error(`Pregunta ${i + 1} incompleta`)
    }
    return {
      pregunta,
      opcion_a,
      opcion_b,
      opcion_c,
      respuesta_correcta: letra as 'a' | 'b' | 'c',
      explicacion,
    }
  })
}

/**
 * Genera 3 preguntas de refuerzo en español alineadas al tema de la semana.
 */
export async function generateWeekQuizWithAnthropic(ctx: {
  materiaNombre: string
  semanaNumero: number
  semanaTitulo: string
  semanaDescripcion: string
  contenidoSnippet: string
}): Promise<GeneratedQuizRow[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514'
  const anthropic = new Anthropic({ apiKey })

  const bloque = [
    `Materia: «${ctx.materiaNombre}».`,
    `Semana ${ctx.semanaNumero}: ${ctx.semanaTitulo}.`,
    ctx.semanaDescripcion ? `Descripción: ${ctx.semanaDescripcion}` : '',
    'Fragmento del contenido de estudio (puede ser markdown resumido):',
    ctx.contenidoSnippet.slice(0, 4000) || '(sin texto largo: infiere solo del título y descripción).',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Eres docente de bachillerato en México. Con base en el siguiente contexto, crea exactamente 3 preguntas de opción múltiple (3 opciones cada una: A, B, C) para que el alumno compruebe que entendió los conceptos de ESA semana y ESA materia.

${bloque}

Requisitos:
- Las preguntas deben evaluar ideas del tema descrito, NO consejos genéricos de "hábitos de estudio" ni organización del tiempo.
- Redacta en español claro. Una sola respuesta correcta por pregunta.
- Las tres opciones deben ser creíbles; mezcla distractores plausibles.

Responde SOLO con JSON válido (sin markdown, sin texto antes ni después):
{"preguntas":[{"pregunta":"...","opcion_a":"...","opcion_b":"...","opcion_c":"...","respuesta_correcta":"a","explicacion":"una frase breve"},{"pregunta":"..."},{"pregunta":"..."}]}

respuesta_correcta debe ser exactamente "a", "b" o "c" (minúscula).`

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2200,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Respuesta Anthropic inesperada')
  return parseQuizJson(block.text)
}

export function shouldRegenerateTemplateQuiz(rows: { pregunta: string }[]): boolean {
  if (!rows.length) return true
  const blob = rows.map(r => r.pregunta).join('\n').toLowerCase()
  if (/tras ver el contenido,\s*¿cuál opción refleja mejor un aprendizaje útil/.test(blob)) return true
  if (/hábito|hábitos de estudio|organiza tu tiempo|rutina de estudio|plan de estudio semanal/.test(blob)) return true
  if (/semana \d+ de «/.test(blob) && /aprendizaje útil/.test(blob)) return true
  return false
}
