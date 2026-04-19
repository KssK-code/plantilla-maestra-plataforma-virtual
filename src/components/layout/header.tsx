'use client'

import { Menu } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  pageTitle:    string
  userName:     string
  avatarUrl?:   string | null
  theme?:       'dark' | 'light'
  onMenuToggle: () => void
}

const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre']

function getFechaES() {
  const d = new Date()
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  return `${dias[d.getDay()]} ${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

export function Header({ pageTitle, userName, avatarUrl, theme = 'dark', onMenuToggle }: HeaderProps) {
  const isLight = theme === 'light'

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const headerBg     = isLight ? '#ffffff'               : 'rgba(11,13,17,0.8)'
  const headerBorder = isLight ? '#EEF2F7'                : '#2A2F3E'
  const titleColor   = isLight ? '#1B3A57'                : '#F1F5F9'
  const dateColor    = isLight ? '#7A92A9'                : '#475569'
  const menuColor    = isLight ? '#1B3A57'                : '#94A3B8'
  const menuHoverBg  = isLight ? 'rgba(27,58,87,0.06)'   : 'rgba(255,255,255,0.06)'

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 h-14"
      style={{
        background:           headerBg,
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom:         `1px solid ${headerBorder}`,
      }}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg transition-colors flex-shrink-0"
          style={{ color: menuColor }}
          onMouseEnter={e => {
            e.currentTarget.style.background = menuHoverBg
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate" style={{ color: titleColor }}>
            {pageTitle}
          </h1>
          {isLight && (
            <p className="hidden sm:block text-xs capitalize" style={{ color: dateColor }}>
              {getFechaES()}
            </p>
          )}
        </div>
      </div>

      {/* Right: name + avatar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden sm:block text-sm" style={{ color: dateColor }}>
          {userName}
        </span>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${isLight ? '#D1E9E8' : '#2A2F3E'}` }}
          />
        ) : (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0"
            style={{ background: '#3AAFA9', color: '#fff' }}
          >
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}
