/**
 * export-mev-content.mjs
 * Exporta todo el contenido académico de MEV y lo guarda en scripts/mev-content.json
 *
 * Uso: node --env-file=.env.local scripts/export-mev-content.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Conexión a MEV ─────────────────────────────────────────────────────────────
// Prioridad: service_role (bypass RLS) → anon key (solo si tablas permiten lectura anon)
const MEV_URL         = process.env.MEV_SUPABASE_URL
const MEV_SERVICE_KEY = process.env.MEV_SERVICE_ROLE_KEY   // preferida
const MEV_ANON_KEY    = process.env.MEV_SUPABASE_ANON_KEY

const MEV_KEY = MEV_SERVICE_KEY || MEV_ANON_KEY

if (!MEV_URL || !MEV_KEY) {
  console.error('❌ Faltan variables MEV_SUPABASE_URL y (MEV_SERVICE_ROLE_KEY o MEV_SUPABASE_ANON_KEY) en .env.local')
  process.exit(1)
}

if (MEV_SERVICE_KEY) {
  console.log('🔑 Usando service_role key de MEV (bypass RLS)')
} else {
  console.log('🔑 Usando anon key de MEV (requiere que las tablas permitan lectura anon)')
}

const mev = createClient(MEV_URL, MEV_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Utilidad: fetch con manejo de errores ──────────────────────────────────────
async function fetchAll(table, query = {}) {
  const { orderBy, filters = [] } = query
  let req = mev.from(table).select('*')
  if (orderBy) req = req.order(orderBy)
  for (const [col, val] of filters) req = req.eq(col, val)

  // Paginación para tablas grandes (Supabase devuelve máx 1000 filas por defecto)
  let allRows = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await req.range(from, from + PAGE - 1)
    if (error) {
      console.error(`  ⚠  Error en tabla "${table}": ${error.message}`)
      if (error.message.includes('permission') || error.message.includes('policy')) {
        console.error('     → La tabla podría requerir autenticación. Agrega MEV_SERVICE_ROLE_KEY al .env.local')
      }
      return []
    }
    allRows = allRows.concat(data ?? [])
    if ((data ?? []).length < PAGE) break
    from += PAGE
  }

  return allRows
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   EXPORTANDO CONTENIDO DE MEV → mev-content.json  ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`\nOrigen: ${MEV_URL}\n`)

  const planes       = await fetchAll('planes_estudio')
  const meses        = await fetchAll('meses_contenido', { orderBy: 'numero' })
  const materias     = await fetchAll('materias')
  const semanas      = await fetchAll('semanas', { orderBy: 'numero' })
  const evaluaciones = await fetchAll('evaluaciones')
  const preguntas    = await fetchAll('preguntas', { orderBy: 'numero' })

  // ── Resumen ──────────────────────────────────────────────────────────────────
  const counts = {
    planes_estudio:  planes.length,
    meses_contenido: meses.length,
    materias:        materias.length,
    semanas:         semanas.length,
    evaluaciones:    evaluaciones.length,
    preguntas:       preguntas.length,
  }

  console.log('┌─────────────────────────────────────┬────────┐')
  console.log('│ Tabla                               │ Filas  │')
  console.log('├─────────────────────────────────────┼────────┤')
  for (const [tabla, n] of Object.entries(counts)) {
    const status = n === 0 ? '⚠  0  ← sin datos / sin acceso' : String(n).padStart(6)
    console.log(`│ ${tabla.padEnd(35)} │ ${status.padStart(6)} │`)
  }
  console.log('└─────────────────────────────────────┴────────┘')

  const totalRegistros = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`\n  Total: ${totalRegistros} registros\n`)

  if (totalRegistros === 0) {
    console.error('❌ No se encontraron registros. Posibles causas:')
    console.error('   1. MEV tiene RLS activado y el anon key no tiene permisos.')
    console.error('      Solución: agrega MEV_SERVICE_ROLE_KEY=<key> al .env.local')
    console.error('      y cambia MEV_KEY = process.env.MEV_SERVICE_ROLE_KEY en este script.')
    console.error('   2. Las tablas no existen en MEV con esos nombres.')
    process.exit(1)
  }

  // ── Guardar JSON ─────────────────────────────────────────────────────────────
  const output = {
    exported_at:     new Date().toISOString(),
    source_url:      MEV_URL,
    counts,
    planes_estudio:  planes,
    meses_contenido: meses,
    materias,
    semanas,
    evaluaciones,
    preguntas,
  }

  const outPath = join(__dirname, 'mev-content.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`✅ Exportado exitosamente → scripts/mev-content.json`)
  console.log(`   Tamaño: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB\n`)
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err.message)
  process.exit(1)
})
