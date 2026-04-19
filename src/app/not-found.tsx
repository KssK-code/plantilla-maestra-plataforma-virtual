'use client'

import { useRouter } from 'next/navigation'
import { Home, LogIn } from 'lucide-react'
import { EdvexLogo } from '@/components/ui/edvex-logo'

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: '#0B0D11' }}
    >
      {/* Decoración de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, rgba(0,85,255,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative space-y-6 max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <EdvexLogo size={48} innerFill="#0B0D11" />
        </div>

        {/* Número 404 */}
        <div>
          <p
            className="text-8xl sm:text-9xl font-black leading-none select-none"
            style={{ color: '#0055ff', textShadow: '0 0 60px rgba(0,85,255,0.35)' }}
          >
            404
          </p>
        </div>

        {/* Textos */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>
            Página no encontrada
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
            La página que buscas no existe o fue movida.
            <br />
            Verifica la URL o regresa al inicio.
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all w-full sm:w-auto justify-center"
            style={{ background: '#0055ff', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1ad9ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0055ff' }}
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </button>
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all w-full sm:w-auto justify-center"
            style={{ color: '#94A3B8', border: '1px solid #2A2F3E' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,85,255,0.4)'
              e.currentTarget.style.color = '#1ad9ff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2A2F3E'
              e.currentTarget.style.color = '#94A3B8'
            }}
          >
            <LogIn className="w-4 h-4" />
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
