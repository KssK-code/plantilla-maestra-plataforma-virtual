import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function generarPreguntas(materia, semana) {
  const prompt = `Eres un profesor de preparatoria.
Basándote en este contenido de la semana "${semana.titulo}"
de la materia "${materia.nombre}":

${semana.contenido?.substring(0, 2000) || 'Contenido de ' + semana.titulo}

Genera exactamente 3 preguntas de opción múltiple de refuerzo.
Son para que el alumno compruebe que entendió — NO son examen final.
Deben ser claras, directas y basadas en el contenido.
IMPORTANTE: No uses comillas simples dentro del texto. Usa solo comillas dobles en el JSON.

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
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(text)
}

const TITULOS = [
  'Ecuaciones lineales con fracciones',
  'Relaciones saludables',
  'Inteligencia artificial',
]

async function main() {
  for (const titulo of TITULOS) {
    console.log(`\n🔍 Buscando: "${titulo}"...`)

    const { data: semanas } = await supabase
      .from('semanas')
      .select('id, titulo, contenido, materia:materias(id, nombre)')
      .ilike('titulo', `%${titulo}%`)

    if (!semanas || semanas.length === 0) {
      console.log(`  ✗ No encontrada`)
      continue
    }

    const semana = semanas[0]
    console.log(`  ✓ Encontrada: ${semana.materia.nombre} — ${semana.titulo}`)
    console.log(`    ID: ${semana.id}`)

    try {
      const resultado = await generarPreguntas(semana.materia, semana)

      for (let idx = 0; idx < resultado.preguntas.length; idx++) {
        const p = resultado.preguntas[idx]
        const { error } = await supabase
          .from('quiz_semana')
          .upsert(
            {
              semana_id: semana.id,
              pregunta: p.pregunta,
              pregunta_en: p.pregunta_en,
              opciones: p.opciones,
              opciones_en: p.opciones_en,
              respuesta_correcta: p.respuesta_correcta,
              explicacion: p.explicacion,
              explicacion_en: p.explicacion_en,
              orden: idx + 1,
            },
            { onConflict: 'semana_id,orden', ignoreDuplicates: false }
          )

        if (error) {
          console.error(`  ✗ Error insertando pregunta ${idx + 1}:`, error.message)
        } else {
          console.log(`  ✓ Pregunta ${idx + 1} insertada`)
        }
      }

      console.log(`  🎯 3 preguntas insertadas en Supabase`)
    } catch (err) {
      console.error(`  ✗ Error generando preguntas: ${err.message}`)
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 600))
  }

  console.log('\n✅ Listo')
}

main()
