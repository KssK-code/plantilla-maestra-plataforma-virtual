'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CONFIG } from '@/lib/config'
import { EdvexLogo } from '@/components/ui/edvex-logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F1F5F9',
  }

  return (
    <div className="w-full max-w-md px-4 flex flex-col items-center gap-6">
      <div
        className="w-full rounded-2xl p-8 shadow-2xl"
        style={{ background: '#181C26', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <EdvexLogo size={56} innerFill="#181C26" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-center" style={{ color: '#F1F5F9' }}>
            Nueva contraseña
          </h1>
          <p className="text-sm font-medium mt-1 text-center" style={{ color: '#1ad9ff' }}>
            {CONFIG.nombre}
          </p>
          <p className="text-xs mt-3 text-center" style={{ color: '#64748B' }}>
            Escribe tu nueva contraseña. Mínimo 6 caracteres.
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div
              className="flex flex-col items-center gap-3 rounded-xl px-4 py-6 text-center"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: '#10B981' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#10B981' }}>Contraseña actualizada</p>
                <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>
                  Tu contraseña se cambió correctamente. Ya puedes iniciar sesión.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#0055ff', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1ad9ff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0055ff' }}
            >
              Ir al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => {
                    e.currentTarget.style.border = '1px solid rgba(0,85,255,0.6)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,85,255,0.1)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#64748B' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => {
                    e.currentTarget.style.border = '1px solid rgba(0,85,255,0.6)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,85,255,0.1)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#64748B' }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Indicador de coincidencia */}
              {confirm.length > 0 && (
                <p className="text-xs mt-1" style={{ color: password === confirm ? '#10B981' : '#EF4444' }}>
                  {password === confirm ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => {
                    const strength = password.length >= 6 ? (password.length >= 8 ? (password.length >= 12 ? 4 : 3) : 2) : 1
                    return (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all"
                        style={{
                          background: i < strength
                            ? strength <= 1 ? '#EF4444' : strength <= 2 ? '#F59E0B' : '#10B981'
                            : '#2A2F3E'
                        }}
                      />
                    )
                  })}
                </div>
                <p className="text-xs" style={{ color: '#64748B' }}>
                  {password.length < 6 ? 'Muy corta' : password.length < 8 ? 'Aceptable' : password.length < 12 ? 'Buena' : 'Muy segura'}
                </p>
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
              >
                <span className="mt-px">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#0055ff', color: '#fff' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1ad9ff' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0055ff' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Actualizando...</> : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>

      <p className="text-xs" style={{ color: '#374151' }}>
        © {new Date().getFullYear()} {CONFIG.nombreCompleto}. Todos los derechos reservados.
      </p>
    </div>
  )
}
