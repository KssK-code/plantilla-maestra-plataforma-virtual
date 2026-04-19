'use client'

import { useRef } from 'react'
import { Check, Lock } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

interface WeekRoadmapProps {
  semanas: Array<{
    id: string
    numero: number
    titulo: string
    titulo_en?: string
  }>
  semanasCompletadas: Set<string>
  semanaActivaId?: string
  onSemanaClick: (semanaId: string) => void
  lang: string
  esDemo?: boolean
}

type EstadoSemana = 'completado' | 'activo' | 'bloqueado'

function getEstado(
  semanaId: string,
  index: number,
  semanas: WeekRoadmapProps['semanas'],
  semanasCompletadas: Set<string>
): EstadoSemana {
  if (semanasCompletadas.has(semanaId)) return 'completado'

  // Primera semana no completada → activo
  for (let i = 0; i < semanas.length; i++) {
    if (!semanasCompletadas.has(semanas[i].id)) {
      return i === index ? 'activo' : 'bloqueado'
    }
  }

  return 'bloqueado'
}

export default function WeekRoadmap({
  semanas,
  semanasCompletadas,
  onSemanaClick,
  lang,
  esDemo = false,
}: WeekRoadmapProps) {
  const loc = (es: string, en?: string) => lang === 'en' && en ? en : es
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!containerRef.current) return

    // Nodos: entran desde la izquierda con stagger
    const nodes = containerRef.current.querySelectorAll('.roadmap-node')
    gsap.from(nodes, {
      opacity: 0,
      x: -20,
      duration: 0.4,
      stagger: 0.08,
      ease: 'power2.out',
    })

    // Líneas: se dibujan de arriba hacia abajo
    const lines = containerRef.current.querySelectorAll('.roadmap-line')
    gsap.from(lines, {
      scaleY: 0,
      transformOrigin: 'top center',
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.inOut',
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="flex flex-col">
      {semanas.map((semana, index) => {
        // En demo: todas las semanas están desbloqueadas
        const estado = esDemo
          ? (semanasCompletadas.has(semana.id) ? 'completado' : 'activo')
          : getEstado(semana.id, index, semanas, semanasCompletadas)
        const esUltima = index === semanas.length - 1
        const clickable = estado !== 'bloqueado'
        // En demo: "Paso N" en vez de "Semana N"
        const labelPrefijo = esDemo ? 'Paso' : (lang === 'en' ? 'Week' : 'Semana')

        return (
          <div key={semana.id} className="roadmap-node flex gap-4">
            {/* Columna izquierda: nodo + línea conectora */}
            <div className="flex flex-col items-center">
              {/* Nodo */}
              <button
                onClick={() => clickable && onSemanaClick(semana.id)}
                disabled={!clickable}
                aria-label={`${labelPrefijo} ${semana.numero}: ${loc(semana.titulo, semana.titulo_en)}`}
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 relative z-10',
                  estado === 'completado'
                    ? 'bg-indigo-500 border-2 border-indigo-500'
                    : estado === 'activo'
                    ? 'bg-indigo-500/10 border-2 border-indigo-500 animate-pulse'
                    : 'bg-transparent border-2 border-slate-600',
                  clickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed',
                ].join(' ')}
              >
                {estado === 'completado' && (
                  <Check className="w-5 h-5" style={{ color: '#fff' }} strokeWidth={2.5} />
                )}
                {estado === 'activo' && (
                  <span className="text-sm font-bold" style={{ color: '#6366F1' }}>
                    {semana.numero}
                  </span>
                )}
                {estado === 'bloqueado' && (
                  <Lock className="w-4 h-4" style={{ color: '#475569' }} />
                )}
              </button>

              {/* Línea conectora */}
              {!esUltima && (
                <div
                  className={[
                    'roadmap-line w-0.5 flex-1 min-h-[2rem] my-0.5 transition-all duration-500',
                    estado === 'completado'
                      ? 'bg-indigo-500'
                      : 'border-l-2 border-dashed border-slate-600 bg-transparent w-0',
                  ].join(' ')}
                />
              )}
            </div>

            {/* Columna derecha: info de la semana */}
            <button
              onClick={() => clickable && onSemanaClick(semana.id)}
              disabled={!clickable}
              className={[
                'flex-1 flex flex-col justify-start pb-8 text-left transition-all duration-500',
                !esUltima ? '' : 'pb-0',
                clickable ? 'cursor-pointer' : 'cursor-not-allowed',
              ].join(' ')}
            >
              {/* Número + Badge */}
              <div className="flex items-center gap-2 mb-0.5 mt-1.5">
                <span
                  className="text-xs font-mono transition-all duration-500"
                  style={{ color: estado === 'bloqueado' ? '#475569' : '#6366F1' }}
                >
                  {labelPrefijo} {semana.numero}
                </span>

                {estado === 'activo' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                  >
                    {lang === 'en' ? 'In progress' : 'En curso'}
                  </span>
                )}
                {estado === 'completado' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}
                  >
                    {lang === 'en' ? 'Completed' : 'Completada'}
                  </span>
                )}
              </div>

              {/* Título */}
              <p
                className={[
                  'text-sm transition-all duration-500 leading-snug',
                  estado === 'completado' ? 'font-medium' : '',
                  estado === 'activo' ? 'font-bold' : '',
                  estado === 'bloqueado' ? 'opacity-40' : '',
                ].join(' ')}
                style={{
                  color: estado === 'bloqueado' ? '#94A3B8' : '#F1F5F9',
                }}
              >
                {loc(semana.titulo, semana.titulo_en)}
              </p>
            </button>
          </div>
        )
      })}
    </div>
  )
}
