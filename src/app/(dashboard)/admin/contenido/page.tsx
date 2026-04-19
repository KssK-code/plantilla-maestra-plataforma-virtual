'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Award, ChevronDown, ChevronRight, Loader2, Eye } from 'lucide-react'

interface MateriaItem {
  id: string
  codigo: string
  nombre: string
  color_hex: string
  descripcion: string
  num_semanas: number
  num_evaluaciones: number
}

interface MesItem {
  id: string
  numero: number
  titulo: string
  materias: MateriaItem[]
}

interface Stats {
  totalMaterias: number
  totalSemanas: number
  totalEvaluaciones: number
}

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }

export default function ContenidoPage() {
  const router = useRouter()
  const [meses, setMeses] = useState<MesItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/contenido')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setMeses(data.meses ?? [])
        setStats(data.stats)
        // Abrir primer mes por defecto
        if (data.meses?.length > 0) {
          setAbiertos(new Set([data.meses[0].id]))
        }
      })
      .catch(() => setError('Error al cargar el contenido'))
      .finally(() => setLoading(false))
  }, [])

  function toggleMes(id: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#5B6CFF' }} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Contenido Académico</h2>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
          Materias y contenido cargado en la plataforma
        </p>
      </div>

      {error ? (
        <div className="rounded-xl p-6 text-center" style={CARD}>
          <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Materias', value: stats.totalMaterias, icon: BookOpen, color: '#5B6CFF', bg: 'rgba(91,108,255,0.15)' },
                { label: 'Total Semanas', value: stats.totalSemanas, icon: ChevronRight, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
                { label: 'Total Evaluaciones', value: stats.totalEvaluaciones, icon: Award, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl p-5 flex items-center gap-4" style={CARD}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lista de meses */}
          <div className="space-y-2">
            {meses.map(mes => {
              const abierto = abiertos.has(mes.id)
              return (
                <div key={mes.id} className="rounded-xl overflow-hidden" style={CARD}>
                  <button
                    onClick={() => toggleMes(mes.id)}
                    className="w-full flex items-center justify-between px-5 py-4 transition-all text-left"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-lg flex-shrink-0"
                        style={{ background: abierto ? 'rgba(91,108,255,0.2)' : 'rgba(255,255,255,0.06)' }}
                      >
                        {mes.titulo === 'Demo' ? '🎓' : mes.titulo === 'Preparatoria' ? '📚' : '🏫'}
                      </span>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {mes.titulo}
                        </p>
                      </div>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(91,108,255,0.1)', color: '#7B8AFF' }}>
                        {mes.materias?.length ?? 0} materias
                      </span>
                    </div>
                    {abierto
                      ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
                      : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
                    }
                  </button>

                  {abierto && (
                    <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid #2A2F3E' }}>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(mes.materias ?? []).map(mat => (
                          <div
                            key={mat.id}
                            className="rounded-xl p-4 space-y-3"
                            style={{ background: '#0D1017', border: '1px solid #2A2F3E' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: mat.color_hex || '#5B6CFF' }}
                                />
                                {mat.codigo && (
                                  <span className="font-mono text-xs font-semibold" style={{ color: '#7B8AFF' }}>
                                    {mat.codigo}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => router.push(`/admin/contenido/${mat.id}`)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                                style={{ background: 'rgba(91,108,255,0.1)', color: '#7B8AFF', border: '1px solid rgba(91,108,255,0.2)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,108,255,0.2)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(91,108,255,0.1)' }}
                              >
                                <Eye className="w-3 h-3" />
                                Ver contenido
                              </button>
                            </div>

                            <p className="text-white font-semibold">{mat.nombre}</p>

                            {mat.descripcion && (
                              <p className="text-gray-300 text-sm line-clamp-2">{mat.descripcion}</p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                                <BookOpen className="w-3 h-3" />
                                {mat.num_semanas} semanas
                              </span>
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                                <Award className="w-3 h-3" />
                                {mat.num_evaluaciones} examen{mat.num_evaluaciones !== 1 ? 'es' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
