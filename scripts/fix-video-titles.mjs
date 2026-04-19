import https from 'https'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CORRUPT_CHARS = ['├', '│', 'Ô', 'â', 'ò', '┼', '┤', '║', '╗', '╔', '┬', '┐', '└', '─']

function isCorrupt(text) {
  if (!text) return false
  return CORRUPT_CHARS.some(ch => text.includes(ch))
}

function extractVideoId(url) {
  if (!url) return null
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  // youtube.com/embed/ID
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]
  return null
}

function fetchYouTubeTitle(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const title = json.items?.[0]?.snippet?.title ?? null
          resolve(title)
        } catch {
          reject(new Error('JSON parse error'))
        }
      })
    }).on('error', reject)
  })
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY no encontrada en .env.local')
    process.exit(1)
  }

  console.log('📥 Cargando semanas desde Supabase...')
  const { data: semanas, error } = await supabase
    .from('semanas')
    .select('id, titulo, numero, videos')
    .order('numero')

  if (error) { console.error('Error:', error.message); process.exit(1) }

  console.log(`Total semanas: ${semanas.length}`)

  let videosCorregidos = 0
  let semanasActualizadas = 0

  for (const semana of semanas) {
    const videos = semana.videos
    if (!Array.isArray(videos) || videos.length === 0) continue

    let semanaModificada = false
    const videosActualizados = []

    for (const video of videos) {
      const tituloCorrupto = isCorrupt(video.titulo)
      const tituloEnCorrupto = isCorrupt(video.titulo_en)

      if (!tituloCorrupto && !tituloEnCorrupto) {
        videosActualizados.push(video)
        continue
      }

      // Intentar obtener título real de YouTube
      const urlParaId = video.url || video.url_en
      const videoId = extractVideoId(urlParaId)

      if (!videoId) {
        console.log(`  ⚠️  Sin videoId para "${video.titulo}" — URL: ${urlParaId}`)
        videosActualizados.push(video)
        continue
      }

      console.log(`  🔧 Semana ${semana.numero} "${semana.titulo.slice(0, 40)}" — videoId: ${videoId}`)

      let youtubeTitle = null
      try {
        youtubeTitle = await fetchYouTubeTitle(videoId)
        await delay(200)
      } catch (e) {
        console.error(`     ✗ Error YouTube API: ${e.message}`)
        videosActualizados.push(video)
        continue
      }

      if (!youtubeTitle) {
        console.log(`     ⚠️  Video no encontrado en YouTube (privado/eliminado)`)
        videosActualizados.push(video)
        continue
      }

      const videoCorregido = { ...video }
      if (tituloCorrupto) {
        console.log(`     ES: "${video.titulo}" → "${youtubeTitle}"`)
        videoCorregido.titulo = youtubeTitle
        videosCorregidos++
      }
      if (tituloEnCorrupto) {
        console.log(`     EN: "${video.titulo_en}" → "${youtubeTitle}"`)
        videoCorregido.titulo_en = youtubeTitle
        videosCorregidos++
      }

      videosActualizados.push(videoCorregido)
      semanaModificada = true
    }

    if (semanaModificada) {
      const { error: updateError } = await supabase
        .from('semanas')
        .update({ videos: videosActualizados })
        .eq('id', semana.id)

      if (updateError) {
        console.error(`  ✗ Error al actualizar semana ${semana.id}: ${updateError.message}`)
      } else {
        console.log(`  ✓ Semana ${semana.numero} actualizada`)
        semanasActualizadas++
      }
    }
  }

  console.log(`\n✅ Terminado — Videos corregidos: ${videosCorregidos} en ${semanasActualizadas} semanas`)
}

main()
