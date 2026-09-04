'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BarChart3, BookOpen, ClipboardList, CreditCard, FolderOpen, GraduationCap, Home, LayoutDashboard, LogOut, Settings, TrendingUp, Trophy, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'
import { CONFIG } from '@/lib/config'
import { esSoloCursos } from '@/lib/modo'

interface NavItem {
  label: string
  href:  string
  icon:  React.ElementType
  emoji?: string
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',        href: '/admin',               emoji: '🏠', icon: LayoutDashboard },
    { label: 'Alumnos',          href: '/admin/alumnos',       emoji: '👥', icon: Users           },
    { label: 'Estado de Cuenta', href: '/admin/estado-cuenta', emoji: '🧾', icon: BarChart3       },
    // Pagos e Informes viven en /admin desde hace tiempo pero no estaban
    // enlazados en el modo tradicional: solo se llegaba escribiendo la URL.
    // Informes es admin-only (el desglose de ingresos no es del secretario).
    { label: 'Pagos',            href: '/admin/pagos',         emoji: '💳', icon: CreditCard      },
    { label: 'Informes',         href: '/admin/reportes',      emoji: '📈', icon: TrendingUp      },
    { label: 'Contenido',        href: '/admin/contenido',     emoji: '📚', icon: BookOpen        },
    { label: 'Gestionar Cursos', href: '/admin/cursos',        emoji: '🎓', icon: GraduationCap   },
    { label: 'Documentos',       href: '/admin/documentos',    emoji: '📄', icon: FolderOpen      },
    { label: 'Usuarios',         href: '/admin/usuarios',      emoji: '🛡️', icon: Users           },
    { label: 'Configuración',    href: '/admin/configuracion', emoji: '⚙️', icon: Settings        },
  ],
  // Rol acotado: ve Alumnos (lectura + registrar pagos) y Estado de Cuenta.
  // Usuarios/Contenido/Documentos/Configuración/Reportes/Cursos quedan ocultos.
  SECRETARIO: [
    { label: 'Alumnos',          href: '/admin/alumnos',       emoji: '👥', icon: Users      },
    { label: 'Estado de Cuenta', href: '/admin/estado-cuenta', emoji: '🧾', icon: BarChart3  },
    // El secretario cobra, así que ve el historial de pagos. Informes NO:
    // /api/admin/reportes/export exige rol ADMIN.
    { label: 'Pagos',            href: '/admin/pagos',         emoji: '💳', icon: CreditCard },
  ],
  ALUMNO: [
    { label: 'Inicio',         href: '/alumno',                emoji: '🏠', icon: Home          },
    { label: 'Mis Materias',   href: '/alumno/materias',       emoji: '📚', icon: BookOpen      },
    { label: 'Calificaciones', href: '/alumno/calificaciones', emoji: '📊', icon: BarChart3     },
    { label: 'Logros',         href: '/alumno#logros',         emoji: '🏆', icon: Trophy        },
    { label: 'Constancia',     href: '/alumno/constancia',     emoji: '📜', icon: ClipboardList },
    { label: 'Mis Documentos', href: '/alumno/documentos',     emoji: '📄', icon: FolderOpen    },
  ],
}

/**
 * Menús del modo SOLO-CURSOS (B7).
 *
 * Se declaran como listas APARTE en vez de filtrar las de arriba. Filtrar
 * obligaría a tocar `NAV_ITEMS`, y `NAV_ITEMS` es exactamente lo que no puede
 * moverse para los 144 clientes tradicionales: mientras estas listas vivan en su
 * propia constante, el modo tradicional no puede romperse por accidente al
 * editar el de diplomados.
 *
 * ALUMNO: sin materias, sin calificaciones del programa, sin la constancia
 * tradicional (que asume materias acreditadas — la del diplomado se descarga
 * desde el propio curso). Quedan sus diplomados y sus documentos, que son
 * transversales: CURP, acta e identificación se piden igual.
 *
 * ADMIN: fuera Contenido (materias/meses del programa) y Estado de Cuenta (que
 * en este modo sale siempre vacío — ver T4). Entra Reportes, que es donde vive
 * el desglose de diplomados de B6.
 */
const NAV_ITEMS_SOLO_CURSOS: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',      href: '/admin',               emoji: '🏠', icon: LayoutDashboard },
    { label: 'Alumnos',        href: '/admin/alumnos',       emoji: '👥', icon: Users           },
    { label: 'Diplomados',     href: '/admin/cursos',        emoji: '🎓', icon: GraduationCap   },
    { label: 'Reportes',       href: '/admin/reportes',      emoji: '📊', icon: BarChart3       },
    { label: 'Documentos',     href: '/admin/documentos',    emoji: '📄', icon: FolderOpen      },
    { label: 'Usuarios',       href: '/admin/usuarios',      emoji: '🛡️', icon: Users           },
    { label: 'Configuración',  href: '/admin/configuracion', emoji: '⚙️', icon: Settings        },
  ],
  // El secretario cobra. Estado de Cuenta es del programa y aquí no aplica, así
  // que se queda con Alumnos, desde donde registra los pagos del diplomado.
  SECRETARIO: [
    { label: 'Alumnos',        href: '/admin/alumnos',       emoji: '👥', icon: Users     },
  ],
  ALUMNO: [
    { label: 'Mis Diplomados', href: '/alumno/cursos',       emoji: '🎓', icon: GraduationCap },
    { label: 'Mis Documentos', href: '/alumno/documentos',   emoji: '📄', icon: FolderOpen    },
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
  const [pendientesCount, setPendientesCount] = useState(0)
  // El alumno solo ve "Cursos y Diplomados" si tiene ≥1 curso publicado asignado
  const [tieneCursos, setTieneCursos] = useState(false)

  // B7 — En modo solo_cursos el menú es otro y NO depende de `tieneCursos`: los
  // diplomados son la única superficie, así que la entrada tiene que estar
  // siempre. Si dependiera del fetch, un alumno recién inscrito (o con el
  // endpoint caído) se quedaría con un menú de UNA entrada y sin forma de
  // llegar a sus cursos.
  //
  // En modo tradicional esta expresión es EXACTAMENTE la de antes de B7.
  const soloCursos = esSoloCursos()
  const navItems = soloCursos
    ? NAV_ITEMS_SOLO_CURSOS[role]
    // Se agrega al FINAL (no en medio) para no desplazar 'Constancia' fuera de
    // los 5 ítems que muestra la barra inferior en móvil.
    : role === 'ALUMNO' && tieneCursos
      ? [
          ...NAV_ITEMS.ALUMNO,
          { label: 'Cursos y Diplomados', href: '/alumno/cursos', emoji: '🎓', icon: GraduationCap },
        ]
      : NAV_ITEMS[role]

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

  useEffect(() => {
    if (role !== 'ALUMNO') return
    // B7 — en solo_cursos el menú no consulta este endpoint: la entrada de
    // diplomados está siempre. Pedirlo igual sería una petición por carga de
    // página cuya respuesta nadie lee.
    if (esSoloCursos()) return
    let cancelled = false
    fetch('/api/alumno/cursos/tiene')
      .then(r => r.ok ? r.json() : { tiene: false })
      .then(json => { if (!cancelled) setTieneCursos(Boolean(json.tiene)) })
      .catch(() => { /* silencioso */ })
    return () => { cancelled = true }
  }, [role])

  const initials = userName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Un item con ancla (`/alumno#logros`) NO es un destino propio: lleva a una
  // sección de una página que ya tiene su propio item en el menú. Si se deja
  // pasar, `pathname` ignora el hash y el ancla se marca activa a la vez que su
  // página — que es lo que hacían 'Inicio' y 'Logros', los dos resaltados en
  // /alumno al mismo tiempo.
  const isActive = (href: string) => {
    if (href.includes('#')) return false
    if (href === '/admin' || href === '/alumno') return pathname === href
    return pathname.startsWith(href)
  }

  // B7 — 'diplomado' entra en la etiqueta. Sin esto caía al ramal genérico y el
  // alumno de un instituto de diplomados veía «Alumno» a secas. Es estrictamente
  // aditivo: antes de B7 ningún camino podía crear un alumno con ese nivel, así
  // que no cambia lo que ve nadie en un cliente tradicional de hoy.
  const nivelLabel = nivel === 'preparatoria' ? 'Preparatoria'
    : nivel === 'secundaria'  ? 'Secundaria'
    : nivel === 'diplomado'   ? 'Diplomado'
    : null

  const isAlumno = role === 'ALUMNO'

  // Los realces del sidebar se pintan ENCIMA de `--color-primario`, así que no
  // pueden salir de `--color-acento` sin más: si los dos colores del cliente son
  // vecinos en el círculo cromático (p. ej. morado #6B21A8 e índigo #1E3A8A), el
  // item activo queda como un bloque plano sobre el fondo y deja de leerse como
  // seleccionado. Cada uno sale ahora de su propia variable, con FALLBACK al
  // valor de siempre: un cliente que no las declare ve el mismo sidebar de hoy.
  const sidebarBg     = 'var(--color-primario)'
  const sidebarBorder = 'var(--color-sidebar-borde, rgba(30,136,229,0.22))'
  const activeBg      = 'var(--color-sidebar-activo, var(--color-acento))'
  const activeColor   = '#fff'
  const inactiveColor = 'rgba(255,255,255,0.65)'
  const hoverBg       = 'var(--color-sidebar-hover, rgba(21,101,192,0.28))'
  const hoverColor    = '#fff'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 260, background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
          <Image
            src={CONFIG.logoOscuro || CONFIG.logo}
            alt={CONFIG.nombre}
            width={180}
            height={56}
            style={{ height: 44, width: 'auto', objectFit: 'contain' }}
          priority
          />
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
                style={{ border: '2px solid var(--color-sidebar-borde-fuerte, rgba(30,136,229,0.45))' }} />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--color-sidebar-realce, rgba(21,101,192,0.35))', color: '#fff', border: '2px solid var(--color-sidebar-borde-fuerte, rgba(30,136,229,0.45))' }}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#fff' }}>
                {userName}
              </p>
              {nivelLabel && (
                <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-sidebar-realce, rgba(21,101,192,0.35))', color: '#fff', fontSize: 10 }}>
                  {nivelLabel}
                </span>
              )}
              {!nivelLabel && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {role === 'ADMIN' ? 'Administrador' : role === 'SECRETARIO' ? 'Secretario' : 'Alumno'}
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
        background: 'var(--color-primario)',
        borderTop:  '1px solid rgba(30,136,229,0.25)',
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
            /* Aquí NO hay pastilla: el texto va directo sobre `--color-primario`,
               así que el color correcto es el del REALCE, no el que se pinta
               encima del realce. Con `--color-sidebar-activo-texto` un cliente
               cuyo realce y fondo de menú sean del mismo tono deja el item
               seleccionado en 1:1 contra el fondo: invisible justo el que hay
               que ver. Fallback a `--color-acento`, el valor efectivo previo. */
            style={{ color: active ? 'var(--color-sidebar-activo, var(--color-acento))' : 'rgba(255,255,255,0.45)' }}
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
