'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Award, ChevronDown, ChevronRight, Loader2, Eye, Plus, X, AlertCircle } from 'lucide-react'
import { NIVELES } from '@/lib/estructura-contenido'
import { getCarreras } from '@/lib/licenciatura-utils'

interface MateriaItem {
  id: string
  codigo: string
  nombre: string
  color_hex: string
  descripcion: string
  num_semanas: number
  num_evaluaciones: number
  /** 'curso' para los Cursos de Ingreso; ausente en materias de sec/prepa. */
  tipoContenido?: 'materia' | 'curso'
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

const INPUT: React.CSSProperties = {
  background: '#12161F', border: '1px solid #2A2F3E', color: '#F1F5F9',
  borderRadius: '0.375rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem',
  width: '100%', outline: 'none',
}

const ETIQUETA_NIVEL: Record<string, string> = {
  secundaria: 'Secundaria', preparatoria: 'Preparatoria',
  demo: 'Demo', licenciatura: 'Licenciatura',
}

export default function ContenidoPage() {
  const router = useRouter()
  const [meses, setMeses] = useState<MesItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  // Alta de materia. `getCarreras()` sale del CONFIG del cliente, así que en la
  // plantilla base viene VACÍO: sin carreras no hay licenciatura que crear, y
  // el nivel se deshabilita diciendo por qué en vez de ofrecer un select mudo.
  const carreras = getCarreras()
  const sinCarreras = carreras.length === 0
  const [nueva, setNueva] = useState(false)
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState<string>('secundaria')
  const [carrera, setCarrera] = useState<string>('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  async function crearMateria() {
    const limpio = nombre.trim()
    if (!limpio || creando) return
    if (nivel === 'licenciatura' && !carrera) {
      setErrorCrear('Elige la carrera a la que pertenece la materia.')
      return
    }
    setCreando(true); setErrorCrear(null)
    try {
      const cuerpo: Record<string, string> = { nombre: limpio, nivel }
      // `carrera` SOLO en licenciatura: fuera de ese nivel el servidor la fuerza
      // a NULL, porque una materia de secundaria con carrera se filtraría por
      // carrera y desaparecería del catálogo de todos.
      if (nivel === 'licenciatura') cuerpo.carrera = carrera
      const res = await fetch('/api/admin/materias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo crear la materia')
      // Directo al detalle: una materia recién creada nace sin meses ni
      // semanas, y el detalle es la única pantalla desde la que añadírselos.
      router.push(`/admin/contenido/${(data as { materia?: { id?: string } }).materia?.id ?? ''}`)
    } catch (err) {
      setErrorCrear((err as Error).message)
      setCreando(false)
    }
  }

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
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contenido Académico</h2>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Materias y contenido cargado en la plataforma
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNueva(v => !v); setErrorCrear(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: 'rgba(21,101,192,0.15)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.3)' }}
        >
          {nueva ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Plus className="w-3.5 h-3.5" /> Nueva materia</>}
        </button>
      </div>

      {nueva && (
        <div className="rounded-xl p-5 space-y-3" style={CARD}>
          <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Nueva materia</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: '#64748B' }}>Nombre</label>
              <input
                type="text"
                value={nombre}
                maxLength={300}
                onChange={e => { setNombre(e.target.value); setErrorCrear(null) }}
                placeholder="Ej. Matemáticas I"
                style={INPUT}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs" style={{ color: '#64748B' }}>Nivel</label>
              <select
                value={nivel}
                onChange={e => { setNivel(e.target.value); setCarrera(''); setErrorCrear(null) }}
                style={INPUT}
              >
                {/* Sin carreras en el CONFIG, licenciatura no se puede elegir: el
                    servidor rechazaría el alta por falta de carrera y el admin
                    no sabría por qué. */}
                {NIVELES.map(n => (
                  <option
                    key={n}
                    value={n}
                    disabled={n === 'licenciatura' && sinCarreras}
                  >
                    {ETIQUETA_NIVEL[n] ?? n}
                    {n === 'licenciatura' && sinCarreras ? ' — sin carreras configuradas' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* La carrera SOLO existe en licenciatura, y decide qué catálogo ve el
              alumno: nunca texto libre, siempre el catálogo del CONFIG. */}
          {nivel === 'licenciatura' && (
            <div className="space-y-1">
              <label className="text-xs" style={{ color: '#64748B' }}>Carrera</label>
              {sinCarreras ? (
                <p className="text-xs flex items-start gap-1" style={{ color: '#F59E0B' }}>
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  Este cliente no tiene carreras configuradas. Añádelas en
                  <span className="font-mono"> CONFIG.licenciaturas.carreras </span>
                  antes de crear materias de licenciatura.
                </p>
              ) : (
                <select
                  value={carrera}
                  onChange={e => { setCarrera(e.target.value); setErrorCrear(null) }}
                  style={INPUT}
                >
                  <option value="">Elige una carrera…</option>
                  {carreras.map(c => (
                    <option key={c.slug} value={c.slug}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {errorCrear && (
            <p className="text-xs flex items-start gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {errorCrear}
            </p>
          )}

          <button
            type="button"
            onClick={crearMateria}
            disabled={creando || !nombre.trim() || (nivel === 'licenciatura' && (sinCarreras || !carrera))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
            style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.4)' }}
          >
            {creando
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando…</>
              : <><Plus className="w-3.5 h-3.5" /> Crear materia</>}
          </button>
        </div>
      )}

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
                { label: 'Total Materias', value: stats.totalMaterias, icon: BookOpen, color: 'var(--color-acento)', bg: 'rgba(21,101,192,0.15)' },
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
                        style={{ background: abierto ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.06)' }}
                      >
                        {mes.id === 'cursos-ingreso' ? '🎯'
                          : mes.id.startsWith('carrera-') ? '🎓'
                          : mes.titulo === 'Demo' ? '🎓'
                          : mes.titulo === 'Preparatoria' ? '📚' : '🏫'}
                      </span>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {mes.titulo}
                        </p>
                      </div>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(21,101,192,0.1)', color: 'var(--color-acento)' }}>
                        {mes.materias?.length ?? 0} {mes.id === 'cursos-ingreso' ? 'cursos' : 'materias'}
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
                                  style={{ background: mat.color_hex || 'var(--color-acento)' }}
                                />
                                {mat.codigo && (
                                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-acento)' }}>
                                    {mat.codigo}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => router.push(
                                  mat.tipoContenido === 'curso'
                                    ? `/admin/cursos/${mat.id}`
                                    : `/admin/contenido/${mat.id}`
                                )}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                                style={{ background: 'rgba(21,101,192,0.1)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.2)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(21,101,192,0.2)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(21,101,192,0.1)' }}
                              >
                                <Eye className="w-3 h-3" />
                                {mat.tipoContenido === 'curso' ? 'Gestionar curso' : 'Ver contenido'}
                              </button>
                            </div>

                            <p className="text-white font-semibold">{mat.nombre}</p>

                            {mat.descripcion && (
                              <p className="text-gray-300 text-sm line-clamp-2">{mat.descripcion}</p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                                <BookOpen className="w-3 h-3" />
                                {mat.num_semanas} {mat.tipoContenido === 'curso' ? 'lecciones' : 'semanas'}
                              </span>
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                                <Award className="w-3 h-3" />
                                {mat.tipoContenido === 'curso'
                                  ? `${mat.num_evaluaciones} pregunta${mat.num_evaluaciones !== 1 ? 's' : ''}`
                                  : `${mat.num_evaluaciones} examen${mat.num_evaluaciones !== 1 ? 'es' : ''}`}
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
