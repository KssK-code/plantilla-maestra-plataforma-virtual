/**
 * import-edvex-content.mjs
 * Importa el contenido de scripts/mev-content.json al Supabase de EDVEX.
 * Agrega campos bilingüe vacíos: materias.nombre_en / descripcion_en
 *                                 semanas.url_en / contenido_en
 *
 * ANTES DE CORRER: ejecuta scripts/add-bilingual-columns.sql en el SQL Editor de Supabase.
 *
 * Uso: node --env-file=.env.local scripts/import-edvex-content.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Conexión a EDVEX (service role para bypass de RLS) ────────────────────────
const EDVEX_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const EDVEX_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!EDVEX_URL || !EDVEX_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const edvex = createClient(EDVEX_URL, EDVEX_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Utilidad: upsert en lotes con reporte ────────────────────────────────────
async function upsertBatch(tabla, rows, conflictCol = 'id') {
  if (rows.length === 0) {
    console.log(`  ⏭  ${tabla}: sin registros, omitido`)
    return
  }

  const BATCH = 100
  let inserted = 0
  let errors   = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await edvex
      .from(tabla)
      .upsert(chunk, { onConflict: conflictCol, ignoreDuplicates: false })

    if (error) {
      errors++
      if (errors === 1) {
        console.error(`  ❌ Error en ${tabla} (lote ${i / BATCH + 1}): ${error.message}`)
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.error('     → Columna faltante. ¿Ejecutaste scripts/add-bilingual-columns.sql?')
        }
      }
    } else {
      inserted += chunk.length
    }
  }

  if (errors === 0) {
    console.log(`  ✅ ${tabla.padEnd(22)} ${String(inserted).padStart(5)} registros`)
  } else {
    console.log(`  ⚠  ${tabla.padEnd(22)} ${String(inserted).padStart(5)} ok / ${errors} lotes con error`)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   IMPORTANDO CONTENIDO MEV → EDVEX               ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`\nDestino: ${EDVEX_URL}\n`)

  // ── Verificar archivo fuente ──────────────────────────────────────────────
  const srcPath = join(__dirname, 'mev-content.json')
  if (!existsSync(srcPath)) {
    console.error('❌ No existe scripts/mev-content.json')
    console.error('   Corre primero: node --env-file=.env.local scripts/export-mev-content.mjs')
    process.exit(1)
  }

  const src = JSON.parse(readFileSync(srcPath, 'utf-8'))
  console.log(`📦 Fuente: exportado el ${src.exported_at}`)
  console.log(`   Registros totales: ${Object.values(src.counts).reduce((a,b)=>a+b,0)}\n`)

  // ── Limpiar contenido previo (en orden inverso de FK) ─────────────────────
  console.log('🧹 Limpiando contenido anterior en EDVEX...')
  for (const tabla of ['preguntas','intentos_evaluacion','evaluaciones','semanas','calificaciones','materias','meses_contenido']) {
    const { error } = await edvex.from(tabla).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      console.error(`  ⚠  No se pudo limpiar ${tabla}: ${error.message}`)
    } else {
      console.log(`  🗑  ${tabla} limpiada`)
    }
  }
  // planes_estudio: borrar solo los de prueba (sin alumnos asignados)
  const { error: plErr } = await edvex.from('planes_estudio').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (!plErr) console.log(`  🗑  planes_estudio limpiada`)
  console.log('')

  // ── 1. planes_estudio ─────────────────────────────────────────────────────
  const planes = src.planes_estudio.map(p => ({
    id:             p.id,
    nombre:         p.nombre,
    duracion_meses: p.duracion_meses,
    precio_mensual: p.precio_mensual ?? 0,
    activo:         p.activo ?? true,
  }))
  await upsertBatch('planes_estudio', planes)

  // ── 2. meses_contenido ────────────────────────────────────────────────────
  // MEV usa "nombre", EDVEX usa "titulo"
  const meses = src.meses_contenido.map(m => ({
    id:     m.id,
    numero: m.numero,
    titulo: m.titulo ?? m.nombre ?? `Mes ${m.numero}`,  // compatibilidad MEV→EDVEX
  }))
  await upsertBatch('meses_contenido', meses)

  // ── Detectar si las columnas bilingüe ya existen ─────────────────────────
  const { error: chkMat } = await edvex.from('materias').select('nombre_en').limit(1)
  const { error: chkSem } = await edvex.from('semanas').select('url_en').limit(1)
  const bilingualMaterias = !chkMat || !chkMat.message?.includes('nombre_en')
  const bilingualSemanas  = !chkSem || !chkSem.message?.includes('url_en')

  if (!bilingualMaterias || !bilingualSemanas) {
    console.log('\n⚠  COLUMNAS BILINGÜE PENDIENTES')
    console.log('   Para activarlas, ejecuta en Supabase SQL Editor:')
    console.log('   → scripts/add-bilingual-columns.sql')
    console.log('   Luego vuelve a correr este script para completar los campos EN.\n')
  } else {
    console.log('  ✅ Columnas bilingüe detectadas\n')
  }

  // ── 3. materias  (+campos bilingüe si existen) ────────────────────────────
  const materias = src.materias.map(m => {
    const row = {
      id:               m.id,
      mes_contenido_id: m.mes_contenido_id,
      codigo:           m.codigo,
      nombre:           m.nombre,
      color_hex:        m.color_hex    ?? '#0055ff',
      descripcion:      m.descripcion  ?? '',
      objetivo:         m.objetivo     ?? '',
      temario:          m.temario      ?? [],
      bibliografia:     m.bibliografia ?? [],
    }
    if (bilingualMaterias) {
      row.nombre_en      = m.nombre_en      ?? ''
      row.descripcion_en = m.descripcion_en ?? ''
    }
    return row
  })
  await upsertBatch('materias', materias)

  // ── 4. semanas  (+campos bilingüe si existen) ─────────────────────────────
  const semanas = src.semanas.map(s => {
    const row = {
      id:         s.id,
      materia_id: s.materia_id,
      numero:     s.numero,
      titulo:     s.titulo,
      contenido:  s.contenido ?? '',
      videos:     s.videos    ?? [],
    }
    if (bilingualSemanas) {
      row.contenido_en = s.contenido_en ?? ''
      row.url_en       = s.url_en       ?? ''
    }
    return row
  })
  await upsertBatch('semanas', semanas)

  // ── 5. evaluaciones ───────────────────────────────────────────────────────
  // Omitir campos que MEV tiene pero EDVEX no: tiempo_limite_minutos, created_at
  const evaluaciones = src.evaluaciones.map(e => ({
    id:           e.id,
    materia_id:   e.materia_id,
    titulo:       e.titulo,
    tipo:         e.tipo          ?? 'FINAL',
    porcentaje:   e.porcentaje    ?? 100,
    intentos_max: e.intentos_max  ?? 3,
    activa:       e.activa        ?? true,
  }))
  await upsertBatch('evaluaciones', evaluaciones)

  // ── 6. preguntas ──────────────────────────────────────────────────────────
  const preguntas = src.preguntas.map(p => ({
    id:                 p.id,
    evaluacion_id:      p.evaluacion_id,
    numero:             p.numero,
    texto:              p.texto,
    tipo:               p.tipo,
    opciones:           p.opciones            ?? [],
    respuesta_correcta: p.respuesta_correcta,
    retroalimentacion:  p.retroalimentacion   ?? '',
    puntos:             p.puntos              ?? 1,
  }))
  await upsertBatch('preguntas', preguntas)

  // ── Resumen final ─────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────')
  console.log('✅ Importación completada.')
  console.log('\nPróximos pasos:')
  console.log('  1. Verifica en el panel admin que el contenido aparece correctamente.')
  console.log('  2. Rellena los campos _en (inglés) desde el panel de contenido.')
  console.log('  3. Puedes eliminar las variables MEV_* del .env.local cuando termines.\n')
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err.message)
  process.exit(1)
})
