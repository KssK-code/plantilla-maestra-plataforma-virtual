'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CONFIG } from '@/lib/config'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (err) { setError('Ocurrió un error. Intenta de nuevo.'); return }
      setSent(true)
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <div className="w-full rounded-2xl p-8"
        style={{ background: '#fff', boxShadow: '0 8px 40px rgba(27,58,87,0.12)', border: '1px solid #E8F0F6' }}>

        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={60} height={60}
            style={{ borderRadius: 10, objectFit: 'contain', marginBottom: 14 }} />
          <h1 className="text-xl font-bold text-center" style={{ color: '#1B3A57', fontFamily: 'Syne, sans-serif' }}>
            Recuperar contraseña
          </h1>
          <p className="text-sm mt-2 text-center leading-relaxed" style={{ color: '#6B8FA8' }}>
            Te enviaremos un correo para restablecer tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-xl px-4 py-6 text-center"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#10B981' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#10B981' }}>¡Correo enviado!</p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#4A6785' }}>
                  Si el correo <strong style={{ color: '#1B3A57' }}>{email}</strong> está registrado,
                  recibirás instrucciones para restablecer tu contraseña.
                </p>
                <p className="text-xs mt-2" style={{ color: '#9DB0C0' }}>
                  Revisa también tu carpeta de spam.
                </p>
              </div>
            </div>
            <button onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#3AAFA9', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2B7A77' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#3AAFA9' }}>
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#4A6785', fontWeight: 600 }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
                <input type="email" required autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                  style={{
                    background: '#fff', border: '1.5px solid #E2EAF0', color: '#1B3A57',
                    borderRadius: 10, fontSize: 14, width: '100%',
                    padding: '11px 12px 11px 40px', outline: 'none', transition: 'border .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1.5px solid #3AAFA9'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(58,175,169,0.12)' }}
                  onBlur={e => { e.currentTarget.style.border = '1.5px solid #E2EAF0'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#3AAFA9', color: '#fff', boxShadow: '0 4px 14px rgba(58,175,169,0.3)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2B7A77' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#3AAFA9' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : 'Enviar instrucciones'}
            </button>

            <div className="text-center">
              <Link href="/login"
                className="inline-flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: '#6B8FA8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#3AAFA9' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B8FA8' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>

      <p className="text-xs" style={{ color: '#9DB0C0' }}>
        © {new Date().getFullYear()} {CONFIG.nombreCompleto}
      </p>
    </div>
  )
}
