'use client'

import { ExternalLink } from 'lucide-react'
import { parseVideoUrl } from '@/lib/cursos/parse-video-url'
import { safeExternalUrl } from '@/lib/cursos/url-safe'

/**
 * Player embebido para el visor del alumno. Reutiliza parseVideoUrl (mismo
 * núcleo que la vista previa del admin en F2). Iframe responsive 16:9 con
 * title accesible. Si la URL no se reconoce, cae a un enlace externo (nunca
 * bloquea la lección).
 */
export function VideoPlayer({ url, titulo }: { url: string; titulo: string }) {
  const parsed = parseVideoUrl(url)

  if (!parsed) {
    // No es un proveedor reconocido. Solo ofrecer enlace si es http(s) seguro;
    // nunca poner un video_url crudo en el href (evita XSS javascript:/data:).
    const href = safeExternalUrl(url)
    if (!href) {
      return (
        <p className="text-xs rounded-xl px-4 py-3" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#64748B' }}>
          El enlace de video de esta lección no es válido.
        </p>
      )
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
        style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: 'var(--color-primario)' }}
      >
        <ExternalLink className="w-4 h-4 flex-shrink-0" />
        Abrir video en una pestaña nueva
      </a>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-primario)' }}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={parsed.embedUrl}
          title={`Video: ${titulo}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  )
}
