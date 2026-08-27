'use client'

import { ExternalLink } from 'lucide-react'

interface VideoEmbedProps {
  url: string
  titulo: string
  duracion?: string
  lang: string
}

/**
 * ¿Esta URL produce algo que el alumno pueda ver?
 *
 * Se exporta para que la pantalla de la materia filtre ANTES de pintar el
 * encabezado "Videos de la semana": si no se filtrara, una semana cuyo único
 * video no sirve mostraría el encabezado con su borde y nada debajo.
 *
 * Las URL de búsqueda de YouTube NO son reproducibles. La plantilla las
 * montaba en `youtube.com/embed/videosearch`, endpoint que YouTube retiró para
 * sitios de terceros: hoy pinta la tarjeta "Este video no está disponible".
 * Tampoco sirve degradarlas a link externo — mandarían al alumno a una lista de
 * resultados de YouTube, fuera de la plataforma y sin curaduría.
 */
export function esVideoReproducible(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false
  if (url.includes('results?search_query')) return false
  return true
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/)
  if (shortMatch) return shortMatch[1]
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^?&#]+)/)
  if (watchMatch) return watchMatch[1]
  // youtube.com/embed/ID
  const embedMatch = url.match(/embed\/([^?&#]+)/)
  if (embedMatch) return embedMatch[1]
  return null
}

export default function VideoEmbed({ url, titulo, duracion }: VideoEmbedProps) {
  // Una URL no reproducible no pinta nada, igual que `video_url` en NULL. La
  // pantalla ya filtra con `esVideoReproducible`, pero esto cierra el caso por
  // si alguien monta el componente directo.
  //
  // Aquí vivía el "Caso 1", que con una URL `results?search_query` montaba un
  // iframe de `youtube.com/embed/videosearch`. YouTube retiró ese endpoint para
  // terceros y hoy devuelve "Este video no está disponible": era un reproductor
  // muerto dentro de una materia pagada. Se quitó en vez de arreglarse porque
  // no hay a qué arreglarlo — el endpoint ya no existe.
  if (!esVideoReproducible(url)) return null

  // ── Caso 2: Video directo de YouTube (watch?v= o youtu.be/) ─────────────────
  // Ej: https://www.youtube.com/watch?v=YWLP8YKqGvE
  const videoId = extractYouTubeId(url)
  if (videoId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: '#1E2330' }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={embedUrl}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
        {(titulo || duracion) && (
          <div className="px-4 py-3">
            {titulo && <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{titulo}</p>}
            {duracion && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{duracion}</p>}
          </div>
        )}
      </div>
    )
  }

  // ── Caso 3: Link externo genérico ───────────────────────────────────────────
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
      style={{ background: '#1E2330', border: '1px solid #2A2F3E', color: '#94A3B8' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3A4050' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A2F3E' }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>{titulo}</p>
        <p className="text-xs mt-0.5">Video externo</p>
      </div>
      {duracion && <span className="text-xs shrink-0">{duracion}</span>}
      <ExternalLink className="w-4 h-4 shrink-0" />
    </a>
  )
}
