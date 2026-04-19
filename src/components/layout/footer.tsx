'use client'

import { CONFIG, ESCUELA_CONFIG } from '@/lib/config'

export function Footer() {
  return (
    <footer
      className="mt-auto px-4 py-6 text-center space-y-1.5"
      style={{
        background: '#0D0F14',
        borderTop: '1px solid #2A2F3E',
      }}
    >
      <p className="text-xs font-semibold" style={{ color: '#475569' }}>
        {ESCUELA_CONFIG.nombre}
      </p>
      <p className="text-xs" style={{ color: '#374151' }}>
        Preparatoria · Secundaria · 100% en línea
      </p>
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1">
        <a
          href={`https://${CONFIG.dominio}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs transition-colors"
          style={{ color: '#374151' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#3AAFA9' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#374151' }}
        >
          {CONFIG.dominio}
        </a>
        <span style={{ color: '#2A2F3E' }}>·</span>
        <a
          href={`mailto:${ESCUELA_CONFIG.contactoEmail}`}
          className="text-xs transition-colors"
          style={{ color: '#374151' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#3AAFA9' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#374151' }}
        >
          {ESCUELA_CONFIG.contactoEmail}
        </a>
        {ESCUELA_CONFIG.contactoTelefono && (
          <>
            <span style={{ color: '#2A2F3E' }}>·</span>
            <a
              href={`https://wa.me/${ESCUELA_CONFIG.contactoTelefono}`}
              className="text-xs transition-colors"
              style={{ color: '#374151' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3AAFA9' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#374151' }}
            >
              {ESCUELA_CONFIG.whatsappDisplay ?? ESCUELA_CONFIG.contactoTelefono}
            </a>
          </>
        )}
      </div>
      <p className="text-xs" style={{ color: '#374151' }}>
        © {new Date().getFullYear()} {ESCUELA_CONFIG.nombre}. Todos los derechos reservados.
      </p>
    </footer>
  )
}
