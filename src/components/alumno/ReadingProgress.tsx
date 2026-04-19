'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

const MSGS_ES = [
  '¡Sigue así, vas excelente!',
  'Un paso más cerca de tu certificado.',
  '¡Eso es dedicación!',
  'Tu esfuerzo vale la pena.',
  '¡Semana dominada!',
]
const MSGS_EN = [
  'Keep it up, you\'re doing great!',
  'One step closer to your certificate.',
  'That\'s dedication!',
  'Your effort is worth it.',
  'Week mastered!',
]

interface ReadingProgressProps {
  semanaId: string
  alumnoId: string
  lang: string
  onCompletada?: () => void
  yaCompletada?: boolean
}

export default function ReadingProgress({
  semanaId,
  lang,
  onCompletada,
  yaCompletada = false,
}: ReadingProgressProps) {
  const [scrollPct, setScrollPct] = useState(0)
  const [completada, setCompletada] = useState(yaCompletada)
  const [cargando, setCargando] = useState(false)
  const [mostrarResumen, setMostrarResumen] = useState(false)
  const [minLectura, setMinLectura] = useState(1)
  const [mensaje, setMensaje] = useState('')

  const btnRef    = useRef<HTMLButtonElement>(null)
  const badgeRef  = useRef<HTMLDivElement>(null)
  const resumenRef = useRef<HTMLDivElement>(null)
  const mountedAt = useRef(Date.now())

  // Badge verde entra con back.out cuando completada cambia a true
  useGSAP(() => {
    if (completada && badgeRef.current) {
      gsap.fromTo(
        badgeRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      )
    }
  }, { dependencies: [completada] })

  // Card de resumen: entra desde y:20 opacity:0, sale después de 3s
  useGSAP(() => {
    if (mostrarResumen && resumenRef.current) {
      gsap.fromTo(
        resumenRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
          onComplete: () => {
            gsap.to(resumenRef.current, {
              opacity: 0, y: -10, duration: 0.35, ease: 'power2.in',
              delay: 3,
              onComplete: () => {
                setMostrarResumen(false)
                setCompletada(true)
                onCompletada?.()
              },
            })
          },
        }
      )
    }
  }, { dependencies: [mostrarResumen] })

  const calcularScroll = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
    setScrollPct(Math.round(pct))
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', calcularScroll, { passive: true })
    calcularScroll()
    return () => window.removeEventListener('scroll', calcularScroll)
  }, [calcularScroll])

  // Sincronizar prop externa
  useEffect(() => {
    if (yaCompletada) setCompletada(true)
  }, [yaCompletada])

  const marcarLeido = async () => {
    if (cargando || completada) return
    setCargando(true)
    try {
      const res = await fetch('/api/alumno/progreso/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana_id: semanaId }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('[ReadingProgress] POST /api/alumno/progreso/semana', {
          status: res.status,
          semanaId,
          body: errBody,
        })
        return
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('logros-update'))
      }

      // Calcular tiempo transcurrido desde que se montó el componente
      const segundos = Math.round((Date.now() - mountedAt.current) / 1000)
      const mins = Math.max(1, Math.ceil(segundos / 60))
      setMinLectura(mins)

      // Mensaje motivacional aleatorio
      const msgs = lang === 'en' ? MSGS_EN : MSGS_ES
      setMensaje(msgs[Math.floor(Math.random() * msgs.length)])

      // Animación del botón
      if (btnRef.current) {
        gsap.timeline()
          .to(btnRef.current, { scale: 1.15, duration: 0.15, ease: 'power2.out' })
          .to(btnRef.current, { scale: 1, duration: 0.15, ease: 'power2.in' })
      }

      // Mostrar card de resumen (el badge verde aparece después, via useGSAP)
      setMostrarResumen(true)

    } catch (e) {
      console.error('[ReadingProgress] marcarLeido', e)
    } finally {
      setCargando(false)
    }
  }

  const mostrarUI = scrollPct > 20

  return (
    <>
      {/* Barra de progreso fija en la parte superior */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 9999,
          background: '#1E2330',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollPct}%`,
            background: '#6366F1',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Card de resumen — aparece antes del badge verde */}
      {mostrarResumen && (
        <div
          ref={resumenRef}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: '260px',
            maxWidth: '90vw',
          }}
        >
          <div
            className="rounded-2xl px-5 py-4 shadow-2xl flex flex-col gap-1"
            style={{
              background: '#0F1629',
              border: '1px solid rgba(99,102,241,0.4)',
              boxShadow: '0 8px 40px rgba(99,102,241,0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#86EFAC' }} />
              <span className="text-sm font-bold" style={{ color: '#F1F5F9' }}>
                {lang === 'en' ? 'Week completed!' : '¡Semana completada!'}
              </span>
            </div>
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              {lang === 'en'
                ? `📖 ${minLectura} min reading today`
                : `📖 ${minLectura} min de lectura hoy`}
            </p>
            <p className="text-xs font-medium" style={{ color: '#818CF8' }}>
              {mensaje}
            </p>
          </div>
        </div>
      )}

      {/* Botón / badge sticky al fondo */}
      {mostrarUI && !mostrarResumen && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
          }}
        >
          {completada ? (
            <div
              ref={badgeRef}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg"
              style={{ background: '#166534', color: '#86EFAC', border: '1px solid #15803D' }}
            >
              <CheckCircle className="w-4 h-4" />
              {lang === 'en' ? 'Week completed' : 'Semana completada'}
            </div>
          ) : scrollPct >= 85 ? (
            <button
              ref={btnRef}
              onClick={marcarLeido}
              disabled={cargando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-opacity disabled:opacity-70"
              style={{ background: '#6366F1', color: '#fff', border: 'none', cursor: cargando ? 'not-allowed' : 'pointer' }}
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>✓</span>
              )}
              {lang === 'en' ? 'Mark as read — watch videos' : 'Marcar como leído — ver videos'}
            </button>
          ) : null}
        </div>
      )}
    </>
  )
}
