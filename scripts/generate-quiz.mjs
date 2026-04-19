import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generarPreguntas(materia, semana) {
  const prompt = `Eres un profesor de preparatoria.
Basándote en este contenido de la semana "${semana.titulo}"
de la materia "${materia.nombre}":

${semana.contenido?.substring(0, 2000) || 'Contenido de ' + semana.titulo}

Genera exactamente 3 preguntas de opción múltiple de refuerzo.
Son para que el alumno compruebe que entendió — NO son examen final.
Deben ser claras, directas y basadas en el contenido.

Responde SOLO con JSON válido, sin markdown, sin explicación:
{
  "preguntas": [
    {
      "pregunta": "¿Pregunta aquí?",
      "pregunta_en": "Question in English?",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "opciones_en": ["Option A", "Option B", "Option C", "Option D"],
      "respuesta_correcta": 0,
      "explicacion": "Explicación en español de por qué es correcta.",
      "explicacion_en": "Explanation in English of why it's correct."
    }
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].text.trim()
  return JSON.parse(text)
}

async function main() {
  console.log('Obteniendo semanas...')

  const { data: semanas } = await supabase
    .from('semanas')
    .select('id, numero, titulo, contenido, materia:materias(id, nombre)')
    .order('numero')

  console.log(`Total semanas: ${semanas.length}`)

  const sqlLines = ['-- Quiz generado con Claude API', '']
  let exitosas = 0

  for (let i = 0; i < semanas.length; i++) {
    const semana = semanas[i]
    console.log(`[${i+1}/${semanas.length}] ${semana.materia.nombre} — ${semana.titulo}`)

    try {
      const resultado = await generarPreguntas(semana.materia, semana)

      resultado.preguntas.forEach((p, idx) => {
        const opciones = JSON.stringify(p.opciones).replace(/'/g, "''")
        const opciones_en = JSON.stringify(p.opciones_en).replace(/'/g, "''")
        const pregunta = p.pregunta.replace(/'/g, "''")
        const pregunta_en = p.pregunta_en.replace(/'/g, "''")
        const explicacion = p.explicacion.replace(/'/g, "''")
        const explicacion_en = p.explicacion_en.replace(/'/g, "''")

        sqlLines.push(`INSERT INTO quiz_semana (semana_id, pregunta, pregunta_en, opciones, opciones_en, respuesta_correcta, explicacion, explicacion_en, orden)`)
        sqlLines.push(`VALUES ('${semana.id}', '${pregunta}', '${pregunta_en}', '${opciones}'::jsonb, '${opciones_en}'::jsonb, ${p.respuesta_correcta}, '${explicacion}', '${explicacion_en}', ${idx + 1})`)
        sqlLines.push(`ON CONFLICT (semana_id, orden) DO NOTHING;`)
        sqlLines.push('')
      })

      exitosas++
      console.log(`  ✓ 3 preguntas generadas`)

    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
    }

    await sleep(500)
  }

  fs.writeFileSync('scripts/quiz-data.sql', sqlLines.join('\n'))
  console.log(`\n✅ SQL generado en scripts/quiz-data.sql`)
  console.log(`Semanas exitosas: ${exitosas}/${semanas.length}`)
}

main()
