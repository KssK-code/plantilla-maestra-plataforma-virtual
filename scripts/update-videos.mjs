/**
 * update-videos.mjs — IVS Virtual
 * Busca el mejor video de YouTube (en español/MX) para cada semana
 * y actualiza video_url directamente en Supabase via REST API.
 *
 * Diferencias vs EDVEX original:
 *   - IVS usa video_url (string) en vez de videos[] (JSONB)
 *   - Join: semanas → meses_contenido → materias (no FK directa)
 *   - Aplica cambios directo via REST PATCH (no genera SQL)
 *   - Agrega regionCode=MX para resultados en español
 *
 * Uso:
 *   node scripts/update-videos.mjs                    # todas
 *   node scripts/update-videos.mjs --nivel demo       # solo demo (8)
 *   node scripts/update-videos.mjs --nivel preparatoria
 *   node scripts/update-videos.mjs --nivel secundaria
 *
 * Skip automático: semanas que ya tienen video_url con watch?v= se omiten
 * para no gastar cuota de YouTube en videos que ya están bien.
 */

import https from 'https'

// ── Credenciales ──────────────────────────────────────────────────────────────
const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyC7-byoIitePLaQVTj1yCmKoJ_zgUEqW0Q'
const SUPABASE_HOST    = 'xxfwcnroshgirbdquffh.supabase.co'
const SUPABASE_SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZndjbnJvc2hnaXJiZHF1ZmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3MTgyMCwiZXhwIjoyMDkwNjQ3ODIwfQ.Fo4YhCH6a5rin7fdc5SlFrPn8Xx_KSoX94o14Kfw3Vw'
const DELAY_MS         = 300  // 300 ms entre búsquedas → ~200/min máx

// ── CLI args ──────────────────────────────────────────────────────────────────
const nivelArg = (() => {
  const idx = process.argv.indexOf('--nivel')
  return idx !== -1 ? process.argv[idx + 1] : null
})()

const YOUTUBE_API_KEY = (() => {
  const idx = process.argv.indexOf('--key')
  return idx !== -1 ? process.argv[idx + 1] : DEFAULT_YOUTUBE_API_KEY
})()

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve(JSON.parse(d)) }
        catch { reject(new Error('JSON parse error: ' + d.slice(0, 200))) }
      })
    }).on('error', reject)
  })
}

function patch(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = https.request({
      hostname: SUPABASE_HOST,
      path: `/rest/v1/${path}`,
      method: 'PATCH',
      headers: {
        'apikey':         SUPABASE_SVC_KEY,
        'Authorization':  `Bearer ${SUPABASE_SVC_KEY}`,
        'Content-Type':   'application/json',
        'Prefer':         'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

const supa = path => get(
  `https://${SUPABASE_HOST}/rest/v1/${path}`,
  { 'apikey': SUPABASE_SVC_KEY, 'Authorization': `Bearer ${SUPABASE_SVC_KEY}` }
)

// ── YouTube Search ────────────────────────────────────────────────────────────
async function youtubeSearch(query) {
  const params = new URLSearchParams({
    part:              'snippet',
    q:                 query,
    type:              'video',
    maxResults:        3,
    relevanceLanguage: 'es',
    regionCode:        'MX',
    videoDuration:     'medium',
    key:               YOUTUBE_API_KEY
  })
  const result = await get(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (result.error) {
    const msg = result.error.message || JSON.stringify(result.error)
    throw new Error(`YouTube ${result.error.code}: ${msg}`)
  }
  return result
}

// ── Detect multi-video columns ────────────────────────────────────────────────
async function hasMultiVideoColumns() {
  try {
    const result = await supa('semanas?select=video_url_2&limit=1')
    return Array.isArray(result)
  } catch {
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Obtener materias (filtradas por nivel si se indicó)
  const nivelFilter = nivelArg ? `&nivel=eq.${nivelArg}` : ''
  const materias = await supa(`materias?select=id,nombre,nivel&activa=eq.true${nivelFilter}&order=nivel,nombre`)

  if (!Array.isArray(materias) || materias.length === 0) {
    console.error('No se encontraron materias:', materias)
    process.exit(1)
  }
  console.log(`\nMaterias: ${materias.length}${nivelArg ? ` (nivel=${nivelArg})` : ''}`)
  materias.forEach(m => console.log(`  [${m.nivel}] ${m.nombre}`))

  // 2. Detectar si existen columnas multi-video en la BD
  const multiVideo = await hasMultiVideoColumns()
  if (multiVideo) {
    console.log('🎬 Modo multi-video: actualizando video_url, video_url_2, video_url_3')
  }

  // 3. Reunir todas las semanas con su nombre de materia
  // Join: materias → meses_contenido → semanas
  const todasSemanas = []
  const videoSelect = multiVideo
    ? 'id,numero_semana,titulo,video_url,video_url_2,video_url_3'
    : 'id,numero_semana,titulo,video_url'

  for (const materia of materias) {
    const meses = await supa(`meses_contenido?materia_id=eq.${materia.id}&select=id`)
    for (const mes of (meses || [])) {
      const rows = await supa(
        `semanas?mes_id=eq.${mes.id}&select=${videoSelect}&order=numero_semana`
      )
      for (const s of (rows || [])) {
        todasSemanas.push({ ...s, materiaNombre: materia.nombre, nivel: materia.nivel })
      }
    }
  }

  // Filtrar: saltar semanas que ya tienen todos los videos necesarios
  //   - Sin columnas multi-video: saltar si video_url tiene watch?v=
  //   - Con columnas multi-video: saltar solo si los 3 tienen watch?v=
  const goodUrl = url => (url || '').includes('watch?v=')
  const semanas = todasSemanas.filter(s => {
    if (multiVideo) {
      return !(goodUrl(s.video_url) && goodUrl(s.video_url_2) && goodUrl(s.video_url_3))
    }
    return !goodUrl(s.video_url)
  })
  const omitidas = todasSemanas.length - semanas.length

  console.log(`\nSemanas totales    : ${todasSemanas.length}`)
  console.log(`⏭  Ya completas    : ${omitidas} (se saltan)`)
  console.log(`Semanas a procesar : ${semanas.length}`)
  const unidades = semanas.length * 100
  console.log(`Cuota YouTube      : ~${unidades} unidades (límite diario: 10,000)`)
  if (unidades > 10000) {
    console.warn(`⚠  ATENCIÓN: supera el límite diario. Se detendrá si la cuota se agota.\n`)
  } else {
    console.log()
  }

  // 4. Buscar video y actualizar video_url (+ video_url_2/3 si existen columnas)
  let updated = 0, sinResultados = 0, errores = 0

  for (let i = 0; i < semanas.length; i++) {
    const s   = semanas[i]
    const num = String(i + 1).padStart(3)
    const tot = semanas.length
    // Query en español: materia + título de la semana
    const query = `${s.materiaNombre} ${s.titulo} español`
    process.stdout.write(`[${num}/${tot}] ${s.titulo.substring(0, 50).padEnd(50)} `)

    try {
      const result = await youtubeSearch(query)

      if (!result.items?.length) {
        console.log('— sin resultados')
        sinResultados++
        await sleep(DELAY_MS)
        continue
      }

      const mkUrl = item => `https://www.youtube.com/watch?v=${item.id.videoId}`
      const patchBody = { video_url: mkUrl(result.items[0]) }
      if (multiVideo) {
        if (result.items[1]) patchBody.video_url_2 = mkUrl(result.items[1])
        if (result.items[2]) patchBody.video_url_3 = mkUrl(result.items[2])
      }
      const titulo = result.items[0].snippet.title.substring(0, 55)

      const r = await patch(`semanas?id=eq.${s.id}`, patchBody)

      if (r.status >= 200 && r.status < 300) {
        const extra = multiVideo
          ? ` (+${[result.items[1], result.items[2]].filter(Boolean).length} más)`
          : ''
        console.log(`✓ ${result.items[0].id.videoId}${extra}  ${titulo}`)
        updated++
      } else {
        console.log(`✗ Supabase ${r.status}: ${r.body.substring(0, 60)}`)
        errores++
      }

    } catch (err) {
      console.log(`✗ ${err.message.substring(0, 70)}`)
      errores++
      // Detener si se agotó la cuota
      if (err.message.includes('403') || err.message.includes('quota')) {
        console.error('\n🚫 Cuota de YouTube agotada. Deteniendo.')
        break
      }
    }

    await sleep(DELAY_MS)
  }

  // 4. Resumen final
  console.log('\n' + '═'.repeat(62))
  console.log(`✅ Actualizados    : ${updated}`)
  console.log(`⏭  Sin resultados  : ${sinResultados}`)
  console.log(`❌ Errores         : ${errores}`)
  console.log(`📊 Total procesado : ${updated + sinResultados + errores} / ${semanas.length}`)
  console.log('═'.repeat(62))
}

main().catch(err => { console.error('\nError fatal:', err.message); process.exit(1) })
