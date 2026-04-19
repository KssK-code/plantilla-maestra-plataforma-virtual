import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Caracteres típicos de encoding corrupto (latin1 leído como UTF-8)
const CORRUPT_CHARS = ['├', '│', 'Ô', 'â', 'ò', '┼', '┤', '║', '╗', '╔', 'Ã', 'Â', 'ã', 'õ']

function isCorrupt(str) {
  if (!str) return false
  return CORRUPT_CHARS.some(c => str.includes(c))
}

function rowIsCorrupt(row) {
  const texts = [
    row.pregunta,
    row.pregunta_en,
    row.explicacion,
    row.explicacion_en,
    JSON.stringify(row.opciones),
    JSON.stringify(row.opciones_en),
  ]
  return texts.some(isCorrupt)
}

async function generarPreguntas(materia, semana) {
  const prompt = `Eres un profesor de preparatoria.
Basándote en este contenido de la semana "${semana.titulo}"
de la materia "${materia.nombre}":

${semana.contenido?.substring(0, 2000) || 'Contenido de ' + semana.titulo}

Genera exactamente 3 preguntas de opción múltiple de refuerzo.
Son para que el alumno compruebe que entendió — NO son examen final.
Deben ser claras, directas y basadas en el contenido.
IMPORTANTE: No uses comillas simples dentro del texto. Usa solo comillas dobles en el JSON.
Usa caracteres Unicode correctos: á é í ó ú ñ ü para español.
Para símbolos matemáticos usa: ℕ ℤ ℝ ℚ ≤ ≥ ≠ ∈ en lugar de representaciones ASCII.

Responde SOLO con JSON válido, sin markdown, sin explicación:
{
  "preguntas": [
    {
      "pregunta": "Pregunta aquí",
      "pregunta_en": "Question in English",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "opciones_en": ["Option A", "Option B", "Option C", "Option D"],
      "respuesta_correcta": 0,
      "explicacion": "Explicación en español de por qué es correcta.",
      "explicacion_en": "Explanation in English of why it is correct."
    }
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }]
  })

  let text = response.content[0].text.trim()
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(text)
}

async function main() {
  console.log('📥 Leyendo todas las preguntas de quiz_semana...')

  const { data: preguntas, error } = await supabase
    .from('quiz_semana')
    .select('id, semana_id, pregunta, pregunta_en, opciones, opciones_en, explicacion, explicacion_en, orden')
    .order('semana_id')
    .order('orden')

  if (error) {
    console.error('Error leyendo quiz_semana:', error.message)
    process.exit(1)
  }

  console.log(`Total preguntas: ${preguntas.length}`)

  // Agrupar corruptas por semana_id
  const corruptasPorSemana = {}
  for (const p of preguntas) {
    if (rowIsCorrupt(p)) {
      if (!corruptasPorSemana[p.semana_id]) corruptasPorSemana[p.semana_id] = []
      corruptasPorSemana[p.semana_id].push(p)
    }
  }

  const semanaIds = Object.keys(corruptasPorSemana)
  console.log(`\n🔍 Semanas con encoding corrupto: ${semanaIds.length}`)

  if (semanaIds.length === 0) {
    console.log('✅ No se encontraron preguntas corruptas. Todo OK.')
    return
  }

  // Mostrar cuáles están corruptas
  for (const sid of semanaIds) {
    const rows = corruptasPorSemana[sid]
    console.log(`  • semana ${sid.substring(0, 8)}... — ${rows.length} pregunta(s) corrupta(s)`)
    console.log(`    Ejemplo: "${rows[0].pregunta.substring(0, 60)}..."`)
  }

  // Obtener info de semanas
  const { data: semanas } = await supabase
    .from('semanas')
    .select('id, titulo, contenido, materia:materias(id, nombre)')
    .in('id', semanaIds)

  const semanaMap = {}
  for (const s of semanas) semanaMap[s.id] = s

  // Regenerar y actualizar
  console.log('\n🔄 Regenerando preguntas...')
  let exitosas = 0
  let fallidas = 0

  for (const semanaId of semanaIds) {
    const semana = semanaMap[semanaId]
    if (!semana) {
      console.log(`  ✗ Semana ${semanaId.substring(0, 8)}... no encontrada`)
      fallidas++
      continue
    }

    console.log(`\n[${exitosas + fallidas + 1}/${semanaIds.length}] ${semana.materia.nombre} — ${semana.titulo}`)

    try {
      const resultado = await generarPreguntas(semana.materia, semana)

      for (let idx = 0; idx < resultado.preguntas.length; idx++) {
        const p = resultado.preguntas[idx]

        // Verificar que la respuesta regenerada no esté corrupta
        if (isCorrupt(p.pregunta) || isCorrupt(p.explicacion)) {
          console.log(`  ⚠️  Pregunta ${idx + 1} aún corrupta — saltando`)
          continue
        }

        const { error: upsertError } = await supabase
          .from('quiz_semana')
          .update({
            pregunta: p.pregunta,
            pregunta_en: p.pregunta_en,
            opciones: p.opciones,
            opciones_en: p.opciones_en,
            respuesta_correcta: p.respuesta_correcta,
            explicacion: p.explicacion,
            explicacion_en: p.explicacion_en,
          })
          .eq('semana_id', semanaId)
          .eq('orden', idx + 1)

        if (upsertError) {
          console.error(`  ✗ Error actualizando pregunta ${idx + 1}: ${upsertError.message}`)
        } else {
          console.log(`  ✓ Pregunta ${idx + 1} actualizada`)
        }
      }

      exitosas++
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
      fallidas++
    }

    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\n✅ Terminado — Semanas corregidas: ${exitosas} / Fallidas: ${fallidas}`)
}

main()
