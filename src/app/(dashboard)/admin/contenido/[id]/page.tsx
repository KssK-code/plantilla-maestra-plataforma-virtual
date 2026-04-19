'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, AlertCircle, Video, ChevronDown, ChevronRight } from 'lucide-react'

interface VideoState {
  video_url:   string
  video_url_2: string
  video_url_3: string
  saving:  boolean
  saved:   boolean
  error:   string | null
  dirty:   boolean
}

interface Semana {
  id: string
  numero_semana: number
  titulo: string
  descripcion: string | null
  video_url:   string | null
  video_url_2: string | null
  video_url_3: string | null
}

interface Mes {
  id: string
  numero_mes: number
  titulo: string
  semanas: Semana[]
}

interface Materia {
  id: string
  codigo: string
  nombre: string
  color: string | null
  nivel: string
  descripcion: string | null
}

const CARD  = { background: '#181C26', border: '1px solid #2A2F3E' }
const INNER = { background: '#0D1017', border: '1px solid #2A2F3E' }

function inputStyle(dirty: boolean) {
  return {
    background: '#0D1017',
    border: `1px solid ${dirty ? '#5B6CFF' : '#2A2F3E'}`,
    color: '#F1F5F9',
    borderRadius: '0.5rem',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'monospace',
  }
}

/** Extrae el video ID de una URL youtube.com/watch?v=ID */
function getYoutubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}


export default function ContenidoDetallePage() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params.id as string

  const [materia, setMateria] = useState<Materia | null>(null)
  const [meses,   setMeses]   = useState<Mes[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Estado de edición: semanaId → VideoState
  const [videos, setVideos] = useState<Record<string, VideoState>>({})
  // Meses expandidos
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`/api/admin/contenido/${id}`)
        const data = await res.json()
        if (!res.ok || data.error) { setError(data.error ?? 'Materia no encontrada'); return }

        const mat = data.materia
        setMateria({
          id:          mat.id,
          codigo:      '',
          nombre:      mat.nombre,
          color:       mat.color ?? null,
          nivel:       mat.nivel,
          descripcion: mat.descripcion ?? null,
        })

        type MesRow = {
          id: string; numero_mes: number; titulo: string
          semanas: Semana[]
        }
        const mesesOrdenados = ((mat.meses_contenido ?? []) as MesRow[])
          .sort((a, b) => a.numero_mes - b.numero_mes)
          .map(mes => ({
            ...mes,
            semanas: (mes.semanas ?? []).sort((a, b) => a.numero_semana - b.numero_semana),
          }))
        setMeses(mesesOrdenados)

        // Expandir primer mes por defecto
        if (mesesOrdenados.length > 0) {
          setAbiertos(new Set([mesesOrdenados[0].id]))
        }

        // Inicializar estado de videos
        const initVideos: Record<string, VideoState> = {}
        for (const mes of mesesOrdenados) {
          for (const sem of mes.semanas) {
            initVideos[sem.id] = {
              video_url:   sem.video_url   ?? '',
              video_url_2: sem.video_url_2 ?? '',
              video_url_3: sem.video_url_3 ?? '',
              saving: false, saved: false, error: null, dirty: false,
            }
          }
        }
        setVideos(initVideos)
      } catch {
        setError('Error inesperado al cargar la materia')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [id])

  function toggleMes(mesId: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(mesId)) next.delete(mesId); else next.add(mesId)
      return next
    })
  }

  function handleChange(semanaId: string, field: 'video_url' | 'video_url_2' | 'video_url_3', value: string) {
    setVideos(prev => ({
      ...prev,
      [semanaId]: { ...prev[semanaId], [field]: value, dirty: true, saved: false, error: null },
    }))
  }

  const guardar = useCallback(async (semanaId: string) => {
    const v = videos[semanaId]
    if (!v || v.saving) return

    setVideos(prev => ({ ...prev, [semanaId]: { ...prev[semanaId], saving: true, error: null } }))

    try {
      const res = await fetch(`/api/admin/semanas/${semanaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url:   v.video_url   || null,
          video_url_2: v.video_url_2 || null,
          video_url_3: v.video_url_3 || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      setVideos(prev => ({
        ...prev,
        [semanaId]: { ...prev[semanaId], saving: false, saved: true, dirty: false },
      }))
      // Quitar checkmark después de 3s
      setTimeout(() => {
        setVideos(prev => ({ ...prev, [semanaId]: { ...prev[semanaId], saved: false } }))
      }, 3000)
    } catch (err) {
      setVideos(prev => ({
        ...prev,
        [semanaId]: { ...prev[semanaId], saving: false, error: (err as Error).message },
      }))
    }
  }, [videos])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#5B6CFF' }} />
    </div>
  )

  if (error || !materia) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error ?? 'Materia no encontrada'}</p>
      <button onClick={() => router.back()} className="text-sm" style={{ color: '#5B6CFF' }}>Regresar</button>
    </div>
  )

  const totalSemanas = meses.reduce((acc, m) => acc + m.semanas.length, 0)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/admin/contenido')}
          className="mt-1 p-2 rounded-lg transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid #2A2F3E' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: materia.color || '#5B6CFF' }} />
            <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              {materia.nivel}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{materia.nombre}</h1>
          <p className="text-xs mt-0.5 text-gray-600">{totalSemanas} semanas · Edita las URLs de video por semana</p>
        </div>
      </div>

      {/* Info materia */}
      {materia.descripcion && (
        <div className="rounded-xl px-5 py-4" style={CARD}>
          <p className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>Descripción</p>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{materia.descripcion}</p>
        </div>
      )}

      {/* Lista de meses → semanas con edición */}
      {meses.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={CARD}>
          <p className="text-sm" style={{ color: '#94A3B8' }}>No hay semanas cargadas para esta materia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meses.map(mes => {
            const abierto = abiertos.has(mes.id)
            return (
              <div key={mes.id} className="rounded-xl overflow-hidden" style={CARD}>
                {/* Header mes */}
                <button
                  onClick={() => toggleMes(mes.id)}
                  className="w-full flex items-center justify-between px-5 py-4 transition-all text-left"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold flex-shrink-0"
                      style={{ background: abierto ? 'rgba(91,108,255,0.2)' : 'rgba(255,255,255,0.06)', color: abierto ? '#5B6CFF' : '#94A3B8' }}
                    >
                      {mes.numero_mes}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-left text-gray-900">
                        {mes.titulo || `Mes ${mes.numero_mes}`}
                      </p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{mes.semanas.length} semanas</p>
                    </div>
                  </div>
                  {abierto
                    ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
                    : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />}
                </button>

                {/* Semanas */}
                {abierto && (
                  <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid #2A2F3E' }}>
                    <div className="pt-4 space-y-3">
                      {mes.semanas.map(sem => {
                        const v = videos[sem.id]
                        if (!v) return null
                        return (
                          <div key={sem.id} className="rounded-xl p-4 space-y-3" style={INNER}>
                            {/* Semana header */}
                            <div className="flex items-center gap-3">
                              <span
                                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0"
                                style={{ background: 'rgba(91,108,255,0.2)', color: '#5B6CFF' }}
                              >
                                {sem.numero_semana}
                              </span>
                              <p className="text-sm font-semibold flex-1 min-w-0 text-gray-900">
                                {sem.titulo}
                              </p>
                            </div>

                            {/* 3 thumbnails en fila */}
                            <div className="flex gap-2 mb-1">
                              {([v.video_url, v.video_url_2, v.video_url_3] as string[]).map((url, i) => {
                                const vid = getYoutubeId(url)
                                return (
                                  <div key={i} className="flex-1">
                                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Video {i + 1}</p>
                                    {vid ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                                        alt={`Preview video ${i + 1}`}
                                        className="w-full h-20 object-cover rounded cursor-pointer"
                                        style={{ border: '1px solid #2A2F3E' }}
                                        onClick={() => window.open(url, '_blank')}
                                        title="Abrir en YouTube"
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-20 rounded flex items-center justify-center text-xs"
                                        style={{ background: '#1A1F2E', border: '1px solid #2A2F3E', color: '#4B5563' }}
                                      >
                                        Sin video
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Inputs + botón */}
                            <div className="space-y-2">
                              {(
                                [
                                  { field: 'video_url'   as const, label: 'Video 1 (principal)' },
                                  { field: 'video_url_2' as const, label: 'Video 2'             },
                                  { field: 'video_url_3' as const, label: 'Video 3'             },
                                ]
                              ).map(({ field, label }) => (
                                <div key={field}>
                                  <label className="block text-xs mb-1" style={{ color: '#64748B' }}>
                                    <Video className="inline w-3 h-3 mr-1" style={{ verticalAlign: 'middle' }} />
                                    {label}
                                  </label>
                                  <input
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={v[field]}
                                    onChange={e => handleChange(sem.id, field, e.target.value)}
                                    style={inputStyle(v.dirty && v[field] !== (sem[field] ?? ''))}
                                  />
                                </div>
                              ))}

                                {/* Footer con feedback y botón */}
                                <div className="flex items-center justify-between pt-1">
                                  <div className="text-xs">
                                    {v.error && (
                                      <span className="flex items-center gap-1" style={{ color: '#EF4444' }}>
                                        <AlertCircle className="w-3 h-3" /> {v.error}
                                      </span>
                                    )}
                                    {v.saved && (
                                      <span className="flex items-center gap-1" style={{ color: '#10B981' }}>
                                        <Check className="w-3 h-3" /> Guardado
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => guardar(sem.id)}
                                    disabled={v.saving || (!v.dirty && !v.saved)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                                    style={v.saved
                                      ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                                      : { background: v.dirty ? 'rgba(91,108,255,0.2)' : 'rgba(255,255,255,0.04)', color: v.dirty ? '#7B8AFF' : '#64748B', border: `1px solid ${v.dirty ? 'rgba(91,108,255,0.4)' : '#2A2F3E'}` }
                                    }
                                  >
                                    {v.saving
                                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>
                                      : v.saved
                                        ? <><Check className="w-3 h-3" /> Guardado</>
                                        : <><Save className="w-3 h-3" /> Guardar</>
                                    }
                                  </button>
                                </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
