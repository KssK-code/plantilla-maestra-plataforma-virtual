'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff, Phone, User, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CONFIG } from '@/lib/config'

const WA_URL = `https://wa.me/${CONFIG.whatsapp}`

const BENEFITS = [
  'Certificado oficial con validez SEP',
  'Estudia desde casa, a tu ritmo',
  'Incorporado a Sistema Educativo Nacional',
  'Secundaria y Preparatoria',
]

// ─── Input helpers ─────────────────────────────────────────────────────────────
function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#1B2F6E'
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(27,47,110,0.12)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#E2E8F0'
  e.currentTarget.style.boxShadow   = 'none'
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
  padding: '11px 14px 11px 38px', fontSize: 14, color: '#1B3A57',
  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
  background: '#FAFCFF',
}
const inputNoIcon: React.CSSProperties = { ...inputStyle, paddingLeft: 14 }
const selectStyle: React.CSSProperties = {
  ...inputNoIcon,
  appearance: 'none', cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23B0C4D4' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function Label({ text, required: req }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1B3A57' }}>
      {text}{req && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
  )
}

function SectionHeader({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ background: '#1B2F6E', color: '#fff', flexShrink: 0 }}>
        {step}
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#1B3A57', letterSpacing: '0.07em' }}>
        {label}
      </h3>
      <div className="flex-1 h-px" style={{ background: '#EEF2F7' }} />
    </div>
  )
}

function WaSvg({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
    </svg>
  )
}

// ─── Progress steps ─────────────────────────────────────────────────────────────
function ProgressBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Datos personales' },
    { n: 2, label: 'Acceso' },
    { n: 3, label: 'Plan de estudios' },
  ]
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((s, i) => {
        const done    = s.n < current
        const active  = s.n === current
        return (
          <div key={s.n} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : undefined }}>
            <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all"
                style={{
                  background: done ? '#1B2F6E' : active ? '#1B2F6E' : '#EEF2F7',
                  color:      done || active ? '#fff' : '#B0C4D4',
                  boxShadow:  active ? '0 0 0 4px rgba(27,47,110,0.18)' : 'none',
                }}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span
                className="mt-1.5 text-xs font-medium text-center leading-tight hidden sm:block"
                style={{ color: active ? '#1B2F6E' : done ? '#1B2F6E' : '#B0C4D4', maxWidth: 72 }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4"
                style={{ background: s.n < current ? '#1B2F6E' : '#EEF2F7', transition: 'background .3s' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Left decorative panel ─────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between px-10 py-12"
      style={{
        width: '38%',
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0d1b4b 0%, #1B2F6E 55%, #2E4BA3 100%)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

      <div className="relative z-10">
        <div style={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
          borderRadius: 16, padding: 4, display: 'inline-block',
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={68} height={68}
            style={{ borderRadius: 12, objectFit: 'contain', display: 'block' }} />
        </div>
        <p className="mt-4 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
          {CONFIG.nombreCompleto.toUpperCase()}
        </p>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#fff', fontFamily: 'Syne, sans-serif' }}>
          Comienza hoy<br />
          <span style={{ color: '#C9A84C' }}>tu certificado oficial</span>
        </h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
          Únete a miles de alumnos que ya obtuvieron su certificado con validez SEP.
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

      <div className="relative z-10">
        <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 16px' }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>INCORPORADO A</p>
          <p className="text-sm font-bold" style={{ color: '#fff' }}>Sistema Educativo Nacional</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()

  const [nombre,          setNombre]          = useState('')
  const [apellidoPat,     setApellidoPat]     = useState('')
  const [apellidoMat,     setApellidoMat]     = useState('')
  const [email,           setEmail]           = useState('')
  const [telefono,        setTelefono]        = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass,        setShowPass]        = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [nivel,           setNivel]           = useState('')
  const [modalidad,       setModalidad]       = useState('')
  const [error,           setError]           = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)

  // Derive current progress step
  const filledStep1 = !!(nombre && apellidoPat && apellidoMat && telefono)
  const filledStep2 = !!(email && password && confirmPassword)
  const currentStep: 1 | 2 | 3 = filledStep1 && filledStep2 ? 3 : filledStep1 ? 2 : 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    if (!nivel) { setError('Selecciona tu nivel educativo.'); return }
    if (!modalidad) { setError('Selecciona la modalidad.'); return }

    setLoading(true)
    try {
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre:    nombre.trim(),
            apellidos: `${apellidoPat.trim()} ${apellidoMat.trim()}`.trim(),
            rol:       'alumno',
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already')) {
          setError('Ya existe una cuenta con ese correo. Inicia sesión.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      const res = await fetch('/api/auth/register-complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nombre:           nombre.trim(),
          apellidos:        `${apellidoPat.trim()} ${apellidoMat.trim()}`.trim(),
          telefono:         telefono.trim(),
          nivel,
          modalidad,
          es_sindicalizado: false,
          sindicato:        null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta. Intenta de nuevo.')
        return
      }

      router.push('/alumno')
    } catch {
      setError('Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right: form */}
      <div
        className="flex flex-col items-center flex-1 px-5 py-10 overflow-y-auto"
        style={{ background: '#fff' }}
      >
        {/* Mobile-only logo */}
        <div className="flex flex-col items-center mb-6 md:hidden">
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={60} height={60}
            style={{ borderRadius: 12, objectFit: 'contain', border: '1px solid #E2E8F0' }} />
          <p className="mt-2 text-xs font-semibold" style={{ color: '#6B8FA8', letterSpacing: '0.05em' }}>
            {CONFIG.nombreCompleto.toUpperCase()}
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full"
          style={{
            maxWidth: 560,
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #EEF2F7',
            boxShadow: '0 4px 32px rgba(27,58,87,0.08)',
            padding: '36px 32px 32px',
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ color: '#1B3A57', fontFamily: 'Syne, sans-serif' }}>
              Crear mi cuenta gratis
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#7A92A9' }}>
              Completa el formulario y comienza hoy
            </p>
          </div>

          {/* Progress */}
          <ProgressBar current={currentStep} />

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ─── Sección 1: Datos personales ─────────────────────────── */}
            <div>
              <SectionHeader step={1} label="Datos personales" />

              {/* Nombre completo: 3 cols en desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <Label text="Nombre(s)" required />
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                    <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="María" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                <div>
                  <Label text="Apellido Paterno" required />
                  <input type="text" required value={apellidoPat} onChange={e => setApellidoPat(e.target.value)}
                    placeholder="García" style={inputNoIcon} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <Label text="Apellido Materno" />
                  <input type="text" value={apellidoMat} onChange={e => setApellidoMat(e.target.value)}
                    placeholder="López" style={inputNoIcon} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <Label text="Teléfono / WhatsApp" required />
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                  <input type="tel" required value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 dígitos" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
            </div>

            {/* ─── Sección 2: Acceso ────────────────────────────────────── */}
            <div>
              <SectionHeader step={2} label="Acceso" />

              {/* Email */}
              <div className="mb-3">
                <Label text="Correo electrónico" required />
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                  <input type="email" required autoComplete="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label text="Contraseña" required />
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                    <input type={showPass ? 'text' : 'password'} required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Mín. 8 caracteres"
                      style={{ ...inputStyle, paddingRight: 38 }} onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0C4D4', padding: 2 }}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label text="Confirmar contraseña" required />
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#B0C4D4' }} />
                    <input type={showConfirm ? 'text' : 'password'} required autoComplete="new-password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      style={{ ...inputStyle, paddingRight: 38 }} onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0C4D4', padding: 2 }}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Sección 3: Plan de estudios ─────────────────────────── */}
            <div>
              <SectionHeader step={3} label="Plan de estudios" />

              {/* Nivel + Modalidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label text="Nivel educativo" required />
                  <select value={nivel} onChange={e => setNivel(e.target.value)} required
                    style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Selecciona…</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="preparatoria">Preparatoria</option>
                  </select>
                </div>
                <div>
                  <Label text="Modalidad" required />
                  <select value={modalidad} onChange={e => setModalidad(e.target.value)} required
                    style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Selecciona…</option>
                    <option value="6_meses">6 meses — Estándar</option>
                    <option value="3_meses">3 meses — Express</option>
                  </select>
                </div>
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

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: '#1B2F6E', borderRadius: 12, height: 52, fontSize: 15,
                boxShadow: '0 4px 18px rgba(27,47,110,0.38)',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2E4BA3' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1B2F6E' }}
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Creando cuenta...</>
                : 'Crear mi cuenta gratis →'}
            </button>

            {/* Legal */}
            <p className="text-xs text-center leading-relaxed" style={{ color: '#B0C4D4' }}>
              Al registrarte aceptas que {CONFIG.nombreCompleto} tratará tus datos
              conforme a su política de privacidad.
            </p>

            {/* Login link */}
            <p className="text-center text-sm" style={{ color: '#7A92A9' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-semibold transition-colors" style={{ color: '#C9A84C' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#1B2F6E' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C9A84C' }}>
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#7A92A9', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#16A34A' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#7A92A9' }}
          >
            <span style={{ color: '#22C55E' }}><WaSvg size={16} /></span>
            ¿Necesitas ayuda? WhatsApp
          </a>
          <p className="text-xs" style={{ color: '#C8D8E4' }}>
            © {new Date().getFullYear()} {CONFIG.nombreCompleto}
          </p>
        </div>
      </div>
    </div>
  )
}
