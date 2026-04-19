'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_REDIRECTS } from '@/lib/constants'

import { CONFIG } from '@/lib/config'

const WA_URL = `https://wa.me/${CONFIG.whatsapp}`

const BENEFITS = [
  'Certificado oficial con validez SEP',
  'Estudia desde casa, a tu ritmo',
  'Incorporado a Sistema Educativo Nacional',
  'Secundaria y Preparatoria',
]

// ─── Input helpers ─────────────────────────────────────────────────────────────
function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#1B2F6E'
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(27,47,110,0.12)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#E2E8F0'
  e.currentTarget.style.boxShadow   = 'none'
}

// ─── WA SVG ────────────────────────────────────────────────────────────────────
function WaSvg({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
    </svg>
  )
}

// ─── Left decorative panel ─────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between px-10 py-12"
      style={{
        width: '40%',
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0d1b4b 0%, #1B2F6E 55%, #2E4BA3 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 240, height: 240, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />

      {/* Logo */}
      <div className="relative z-10">
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: 4,
          display: 'inline-block',
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <Image
            src={CONFIG.logo}
            alt={CONFIG.nombre}
            width={72}
            height={72}
            style={{ borderRadius: 12, objectFit: 'contain', display: 'block' }}
          />
        </div>
        <p className="mt-4 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
          {CONFIG.nombreCompleto.toUpperCase()}
        </p>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <h2 className="text-4xl font-bold leading-tight mb-3" style={{ color: '#fff', fontFamily: 'Syne, sans-serif' }}>
          Tu educación,<br />
          <span style={{ color: '#C9A84C' }}>a tu ritmo</span>
        </h2>
        <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          Obtén tu certificado con validez oficial SEP desde la comodidad de tu hogar.
        </p>

        <div className="flex flex-col gap-3">
          {BENEFITS.map(b => (
            <div key={b} className="flex items-center gap-3">
              <CheckCircle2 className="shrink-0 w-5 h-5" style={{ color: '#C9A84C' }} />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom badge */}
      <div className="relative z-10">
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12,
          padding: '12px 16px',
        }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
            INCORPORADO A
          </p>
          <p className="text-sm font-bold" style={{ color: '#fff' }}>
            Sistema Educativo Nacional
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        console.error('[login] signInWithPassword error:', authError.message)
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('[login] getUser error:', userError?.message)
        setError('No se pudo obtener la sesión.')
        return
      }

      const { data: usuario, error: rolError } = await supabase
        .from('usuarios').select('rol').eq('id', user.id).single()

      if (rolError) console.warn('[login] rol query error (non-fatal):', rolError.message)

      // Normalizar a mayúsculas: soporta 'admin', 'ADMIN', 'alumno', 'ALUMNO'
      const rol  = (usuario?.rol as string | undefined)?.toUpperCase() ?? 'ALUMNO'
      const dest = ROLE_REDIRECTS[rol] ?? '/alumno'

      // router.refresh() asegura que los Server Components relean la cookie de sesión
      router.refresh()
      router.push(dest)
    } catch (err) {
      console.error('[login] unexpected error:', err)
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right: form */}
      <div
        className="flex flex-col items-center justify-center flex-1 px-6 py-10"
        style={{ background: '#fff' }}
      >
        {/* Mobile-only logo */}
        <div className="flex flex-col items-center mb-8 md:hidden">
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={64} height={64}
            style={{ borderRadius: 12, objectFit: 'contain', border: '1px solid #E2E8F0' }} />
          <p className="mt-2 text-xs font-semibold" style={{ color: '#6B8FA8', letterSpacing: '0.05em' }}>
            {CONFIG.nombreCompleto.toUpperCase()}
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full"
          style={{
            maxWidth: 420,
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #EEF2F7',
            boxShadow: '0 4px 32px rgba(27,58,87,0.08)',
            padding: '36px 32px',
          }}
        >
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold" style={{ color: '#1B3A57', fontFamily: 'Syne, sans-serif' }}>
              Bienvenido de vuelta
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#7A92A9' }}>
              Ingresa a tu plataforma {CONFIG.nombre}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1B3A57' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  onFocus={onFocus} onBlur={onBlur}
                  style={{
                    width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                    padding: '12px 14px 12px 38px', fontSize: 15, color: '#1B3A57',
                    outline: 'none', transition: 'border-color .2s, box-shadow .2s', background: '#FAFCFF',
                  }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold" style={{ color: '#1B3A57' }}>
                  Contraseña
                </label>
                <Link href="/forgot-password"
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#C9A84C' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#1B2F6E' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#C9A84C' }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onFocus={onFocus} onBlur={onBlur}
                  style={{
                    width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                    padding: '12px 40px 12px 38px', fontSize: 15, color: '#1B3A57',
                    outline: 'none', transition: 'border-color .2s, box-shadow .2s', background: '#FAFCFF',
                  }}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#B0C4D4' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}>
                <span className="mt-px">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Divider */}
            <div className="pt-1">
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#1B2F6E' : '#1B2F6E',
                  borderRadius: 12, height: 48, fontSize: 15,
                  boxShadow: '0 4px 16px rgba(27,47,110,0.35)',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2E4BA3' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1B2F6E' }}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Iniciando sesión...</>
                  : 'Iniciar sesión'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#EEF2F7' }} />
            <span className="text-xs px-1" style={{ color: '#B0C4D4' }}>o</span>
            <div className="flex-1 h-px" style={{ background: '#EEF2F7' }} />
          </div>

          {/* WhatsApp button */}
          <a
            href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 font-semibold text-sm transition-all"
            style={{
              display: 'flex',
              background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12,
              color: '#1B3A57', padding: '12px 16px', textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#22C55E'
              e.currentTarget.style.color = '#16A34A'
              e.currentTarget.style.background = '#F0FDF4'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E2E8F0'
              e.currentTarget.style.color = '#1B3A57'
              e.currentTarget.style.background = '#fff'
            }}
          >
            <span style={{ color: '#22C55E' }}><WaSvg size={18} /></span>
            ¿Necesitas ayuda? Escríbenos por WhatsApp
          </a>

          {/* Register link */}
          <p className="mt-5 text-center text-sm" style={{ color: '#7A92A9' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/register"
              className="font-semibold transition-colors"
              style={{ color: '#C9A84C' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1B2F6E' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#C9A84C' }}
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs" style={{ color: '#B0C4D4' }}>
          © {new Date().getFullYear()} {CONFIG.nombreCompleto}
        </p>
      </div>
    </div>
  )
}
