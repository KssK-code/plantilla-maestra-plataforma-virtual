'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home, BookOpen, BarChart3, Trophy, FolderOpen,
  ClipboardList, LogOut, X, Users, Settings, LayoutDashboard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'
import { CONFIG } from '@/lib/config'

interface NavItem {
  label: string
  href:  string
  icon:  React.ElementType
  emoji?: string
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',     href: '/admin',               emoji: '🏠', icon: LayoutDashboard },
    { label: 'Alumnos',       href: '/admin/alumnos',       emoji: '👥', icon: Users           },
    { label: 'Contenido',     href: '/admin/contenido',     emoji: '📚', icon: BookOpen        },
    { label: 'Documentos',    href: '/admin/documentos',    emoji: '📄', icon: FolderOpen      },
    { label: 'Configuración', href: '/admin/configuracion', emoji: '⚙️', icon: Settings        },
  ],
  ALUMNO: [
    { label: 'Inicio',         href: '/alumno',                emoji: '🏠', icon: Home          },
    { label: 'Mis Materias',   href: '/alumno/materias',       emoji: '📚', icon: BookOpen      },
    { label: 'Calificaciones', href: '/alumno/calificaciones', emoji: '📊', icon: BarChart3     },
    { label: 'Logros',         href: '/alumno',                emoji: '🏆', icon: Trophy        },
    { label: 'Constancia',     href: '/alumno/constancia',     emoji: '📜', icon: ClipboardList },
    { label: 'Mis Documentos', href: '/alumno/documentos',     emoji: '📄', icon: FolderOpen    },
  ],
}

interface SidebarProps {
  role:      UserRole
  userName:  string
  avatarUrl?: string | null
  nivel?:    string
  isOpen:    boolean
  onClose:   () => void
}

export function Sidebar({ role, userName, avatarUrl, nivel, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const navItems = NAV_ITEMS[role]
  const [pendientesCount, setPendientesCount] = useState(0)

  useEffect(() => {
    if (role !== 'ADMIN') return
    let cancelled = false
    async function fetchCount() {
      try {
        const res = await fetch('/api/admin/alumnos/pendientes-count')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setPendientesCount(json.count ?? 0)
      } catch { /* silencioso */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [role])

  const initials = userName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/alumno') return pathname === href
    return pathname.startsWith(href)
  }

  const nivelLabel = nivel === 'preparatoria' ? 'Preparatoria' : nivel === 'secundaria' ? 'Secundaria' : null

  const isAlumno = role === 'ALUMNO'

  // ─── sidebar styles: mismo tema IVS para ambos roles ────────────────────────
  const sidebarBg     = '#1B3A57'
  const sidebarBorder = 'rgba(58,175,169,0.2)'
  const activeBg      = '#3AAFA9'
  const activeColor   = '#fff'
  const inactiveColor = 'rgba(255,255,255,0.65)'
  const hoverBg       = 'rgba(58,175,169,0.2)'
  const hoverColor    = '#fff'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 260, background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
          <div className="flex items-center gap-3">
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 10,
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Image
                src={CONFIG.logo}
                alt={CONFIG.nombre}
                width={56}
                height={40}
                style={{ height: 40, width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight"
                style={{ color: '#fff', fontFamily: 'Syne, sans-serif' }}>
                {CONFIG.nombre}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
                INSTITUTO
              </p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-1 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon   = item.icon
            const active = isActive(item.href)
            const showBadge = item.href === '/admin/alumnos' && pendientesCount > 0
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  color:      active ? activeColor : inactiveColor,
                  background: active ? activeBg    : 'transparent',
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = hoverBg
                    e.currentTarget.style.color      = hoverColor
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color      = inactiveColor
                  }
                }}
              >
                {item.emoji
                  ? <span className="text-base w-4 flex-shrink-0 leading-none">{item.emoji}</span>
                  : <Icon className="w-4 h-4 flex-shrink-0" />
                }
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                    style={{ background: '#EF4444', color: '#fff' }}>
                    {pendientesCount > 99 ? '99+' : pendientesCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer: perfil + cerrar sesión */}
        <div className="px-4 py-4" style={{ borderTop: `1px solid ${sidebarBorder}` }}>
          {/* Avatar + info */}
          <div className="flex items-center gap-3 mb-3 px-1">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={userName} width={38} height={38}
                className="rounded-full object-cover flex-shrink-0"
                style={{ border: '2px solid rgba(58,175,169,0.5)' }} />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 text-xs font-bold"
                style={{ background: 'rgba(58,175,169,0.3)', color: '#fff', border: '2px solid rgba(58,175,169,0.5)' }}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#fff' }}>
                {userName}
              </p>
              {nivelLabel && (
                <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(58,175,169,0.25)', color: '#A8EDEA', fontSize: 10 }}>
                  {nivelLabel}
                </span>
              )}
              {!nivelLabel && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {role === 'ADMIN' ? 'Administrador' : 'Alumno'}
                </span>
              )}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
              e.currentTarget.style.color      = '#FCA5A5'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = 'rgba(255,255,255,0.5)'
            }}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation (ALUMNO only) */}
      {isAlumno && (
        <MobileBottomNav items={navItems} isActive={isActive} />
      )}
    </>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
function MobileBottomNav({ items, isActive }: { items: NavItem[]; isActive: (h: string) => boolean }) {
  // Show first 5 items max
  const visible = items.slice(0, 5)
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex items-center justify-around px-2 pb-safe"
      style={{
        background: '#1B3A57',
        borderTop:  '1px solid rgba(58,175,169,0.25)',
        height:     60,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {visible.map((item) => {
        const Icon   = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={`mobile-${item.href}-${item.label}`}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all"
            style={{ color: active ? '#3AAFA9' : 'rgba(255,255,255,0.45)' }}
          >
            {item.emoji
              ? <span className="text-lg leading-none">{item.emoji}</span>
              : <Icon className="w-5 h-5" />
            }
            <span className="text-[9px] font-medium truncate max-w-[48px] text-center leading-tight">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
