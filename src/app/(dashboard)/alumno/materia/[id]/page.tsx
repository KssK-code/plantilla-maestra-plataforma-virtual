/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VideoEmbed from '@/components/alumno/VideoEmbed'
import ReadingProgress from '@/components/alumno/ReadingProgress'
import WeekRoadmap from '@/components/alumno/WeekRoadmap'
import CelebrationBanner from '@/components/alumno/CelebrationBanner'
import FadeIn from '@/components/ui/FadeIn'
import SemanaQuiz from '@/components/alumno/SemanaQuiz'
import NotasPersonales from '@/components/alumno/NotasPersonales'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import ReactMarkdown from 'react-markdown'

gsap.registerPlugin(useGSAP)

interface Video { titulo: string; titulo_en: string; url: string; url_en: string; duracion: string }
interface Semana {
  id: string; numero: number; titulo: string; titulo_en: string
  contenido: string; contenido_en: string
  url_en: string; videos: Video[]
}
interface Evaluacion {
  id: string; titulo: string; titulo_en: string; tipo: string; intentos_max: number
  intentos_usados: number; aprobada: boolean; calificacion_aprobatoria: number | null
}
interface BibItem { titulo: string; url?: string; tipo?: string }
interface Materia {
  id: string; nivel: string; codigo: string; nombre: string; nombre_en: string; color_hex: string
  descripcion: string; descripcion_en: string; objetivo: string; objetivo_en: string; temario: string[]
  temario_en?: string[]
  bibliografia: BibItem[]
  bibliografia_en?: BibItem[]
  semanas: Semana[]
  evaluaciones: Evaluacion[]
}

type Tab = 'contenido' | 'examen' | 'informacion'

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#F1F5F9', fontWeight: 600 }}>{part}</strong>
      : part
  )
}


export default function MateriaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [materia, setMateria] = useState<Materia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('contenido')
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string | null>(null)
  const [alumnoId, setAlumnoId] = useState<string>('')
  const [semanasCompletadas, setSemanasCompletadas] = useState<Set<string>>(new Set())
  const [materiaAcreditada, setMateriaAcreditada] = useState(false)
  const [glosario, setGlosario] = useState<{ id: string; termino: string; definicion: string }[]>([])

  const [mostrarGuia, setMostrarGuia] = useState(true)
  const guiaRef = useRef<HTMLDivElement>(null)
  const [guardandoProgreso, setGuardandoProgreso] = useState(false)

  useEffect(() => {
    if (tab === 'examen') setMostrarGuia(true)
  }, [tab])

  const marcarSemana = async (semanaId: string) => {
    if (guardandoProgreso || semanasCompletadas.has(semanaId)) return
    setGuardandoProgreso(true)
    try {
      await fetch('/api/alumno/progreso/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana_id: semanaId }),
      })
      const nuevas = new Set([...semanasCompletadas, semanaId])
      setSemanasCompletadas(nuevas)
      if (materia && materia.semanas.every(s => nuevas.has(s.id))) {
        setMateriaAcreditada(true)
      }
    } catch {
      // silencioso — no bloquear al alumno
    } finally {
      setGuardandoProgreso(false)
    }
  }

  const ocultarGuia = () => {
    if (guiaRef.current) {
      gsap.to(guiaRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => setMostrarGuia(false),
      })
    } else {
      setMostrarGuia(false)
    }
  }

  const cardSigueRef = useRef<HTMLDivElement>(null)
  const todasCompletas = materia
    ? semanasCompletadas.size === materia.semanas.length && materia.semanas.length > 0
    : false

  useGSAP(() => {
    if (todasCompletas && cardSigueRef.current) {
      gsap.fromTo(
        cardSigueRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
      )
    }
  }, { dependencies: [todasCompletas] })

  useEffect(() => {
    fetch(`/api/alumno/materia/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('No tienes acceso a esta materia')
        return r.json()
      })
      .then(data => {
        setMateria(data)
        if (data.semanas?.length > 0) setSemanaSeleccionada(data.semanas[0].id)
        fetch(`/api/alumno/glosario/${data.id}`)
          .then(r => r.json())
          .then(g => { if (g.terminos) setGlosario(g.terminos) })
          .catch(() => {})
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!materia) return
    const semanaIds = materia.semanas.map(s => s.id)
    if (semanaIds.length === 0) return

    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // En IVS: alumnos.id = user.id (no usuario_id)
      setAlumnoId(user.id)
      const aId = user.id

      const { data: progreso } = await supabase
        .from('progreso_semanas')
        .select('semana_id')
        .eq('alumno_id', aId)
        .in('semana_id', semanaIds)

      if (progreso) {
        const completadasSet = new Set(progreso.map((r: { semana_id: string }) => r.semana_id))
        setSemanasCompletadas(completadasSet)

        const primeraActiva = materia.semanas.find(s => !completadasSet.has(s.id))
        const defaultSemana = primeraActiva ?? materia.semanas[materia.semanas.length - 1]
        if (defaultSemana) setSemanaSeleccionada(defaultSemana.id)
      }
    })()
  }, [materia])

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'contenido', label: 'Contenido' },
    { key: 'examen', label: 'Examen' },
    { key: 'informacion', label: 'Información' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <FadeIn delay={0}>
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 p-2 rounded-lg transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid #2A2F3E' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(91,108,255,0.15)', color: '#7B8AFF' }}>
              {materia.codigo}
            </span>
            <div className="w-2 h-2 rounded-full" style={{ background: materia.color_hex || '#5B6CFF' }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{materia.nombre}</h1>
        </div>
      </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={100}>
      <div className="overflow-x-auto" style={{ borderBottom: '1px solid #2A2F3E' }}>
        <div className="flex min-w-max">
          {tabs.map(tab_ => (
            <button
              key={tab_.key}
              onClick={() => setTab(tab_.key)}
              className="px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap"
              style={{ color: tab === tab_.key ? '#F1F5F9' : '#94A3B8' }}
            >
              {tab_.label}
              {tab === tab_.key && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#5B6CFF' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      </FadeIn>

      {/* Tab: Contenido */}
      <FadeIn delay={200}>
      {tab === 'contenido' && (
        <>
          {materia.semanas.length === 0 ? (
            <div className="flex items-center justify-center py-12 rounded-xl" style={CARD}>
              <p className="text-sm" style={{ color: '#94A3B8' }}>No hay semanas disponibles</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Columna izquierda: roadmap */}
              <div className="w-full md:w-1/3 rounded-xl p-5 flex-shrink-0" style={CARD}>
                <div className="overflow-y-auto max-h-[40vh] md:max-h-[calc(100vh-120px)] md:sticky md:top-4">
                  <WeekRoadmap
                    semanas={materia.semanas}
                    semanasCompletadas={semanasCompletadas}
                    semanaActivaId={semanaSeleccionada ?? undefined}
                    onSemanaClick={setSemanaSeleccionada}
                    lang="es"
                    esDemo={materia.nivel === 'demo'}
                  />
                </div>
              </div>

              {/* Columna derecha: contenido de la semana seleccionada */}
              <div className="flex-1 min-w-0 space-y-4">
                {(() => {
                  const semana = materia.semanas.find(s => s.id === semanaSeleccionada)
                  if (!semana) return (
                    <div className="flex items-center justify-center py-16 rounded-xl" style={CARD}>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>
                        Selecciona una semana para comenzar
                      </p>
                    </div>
                  )
                  const contenidoSemana = (semana.contenido ?? '')
                    .replace(/\\r\\n/g, '\n')
                    .replace(/\\n/g, '\n')

                  return (
                    <div className="rounded-xl p-5 space-y-4" style={CARD}>
                      {/* Header de la semana */}
                      <div className="pb-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
                        <span className="text-xs font-mono" style={{ color: '#6366F1' }}>
                          {materia.nivel === 'demo' ? `Paso ${semana.numero}` : `Semana ${semana.numero}`}
                        </span>
                        <h3 className="text-base font-bold mt-0.5 text-gray-900">
                          {semana.titulo}
                        </h3>
                        {(() => {
                          const palabras = contenidoSemana.trim() ? contenidoSemana.trim().split(/\s+/).length : 0
                          const minLectura = palabras > 0 ? Math.ceil(palabras / 200) : 0
                          const minVideos = (semana.videos ?? []).reduce((acc, v) => {
                            const match = v.duracion?.match(/(\d+)/)
                            return acc + (match ? parseInt(match[1]) : 0)
                          }, 0)
                          const partes = []
                          if (minLectura > 0) partes.push(`📖 ${minLectura} min lectura`)
                          if (minVideos > 0) partes.push(`🎬 ${minVideos} min de videos`)
                          if (partes.length === 0) return null
                          return (
                            <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>
                              {partes.join(' · ')}
                            </p>
                          )
                        })()}
                      </div>

                      {/* Contenido — markdown (sin sección "Videos recomendados") */}
                      {contenidoSemana && (
                        <div className="prose prose-sm max-w-none" style={{
                          color: '#94A3B8',
                          lineHeight: '1.75',
                        }}>
                          <ReactMarkdown
                            components={{
                              p:      ({ children }) => <p className="mb-3 text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{children}</p>,
                              strong: ({ children }) => <strong style={{ color: '#F1F5F9', fontWeight: 600 }}>{children}</strong>,
                              em:     ({ children }) => <em style={{ color: '#CBD5E1' }}>{children}</em>,
                              h1:     ({ children }) => <h1 className="text-base font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
                              h2:     ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1.5 text-gray-900">{children}</h2>,
                              h3:     ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-900">{children}</h3>,
                              ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm" style={{ color: '#94A3B8' }}>{children}</ul>,
                              ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm" style={{ color: '#94A3B8' }}>{children}</ol>,
                              li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className="pl-4 my-3 text-sm italic"
                                  style={{ borderLeft: '3px solid rgba(91,108,255,0.4)', color: '#64748B' }}>
                                  {children}
                                </blockquote>
                              ),
                              code: ({ children }) => (
                                <code className="px-1.5 py-0.5 rounded text-xs font-mono"
                                  style={{ background: 'rgba(91,108,255,0.12)', color: '#7B8AFF' }}>
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {contenidoSemana.replace(/(\n|^)(#{1,3} )?(\*\*)?Videos recomendados(\*\*)?:?[\s\S]*$/i, '')}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Videos — embebidos (YouTube iframe) */}
                      {semana.videos?.length > 0 && (
                        <div className="space-y-3 pt-1" style={{ borderTop: '1px solid #2A2F3E', paddingTop: '1rem' }}>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>
                            🎬 Videos de la semana
                          </p>
                          {semana.videos.map((v, i) => (
                            <VideoEmbed
                              key={i}
                              url={v.url}
                              titulo={v.titulo}
                              duracion={v.duracion}
                              lang="es"
                            />
                          ))}
                        </div>
                      )}

                      {/* Mini quiz de refuerzo */}
                      {alumnoId && (
                        <SemanaQuiz
                          key={semana.id}
                          semanaId={semana.id}
                          alumnoId={alumnoId}
                          lang="es"
                        />
                      )}

                      {/* Botón completar semana — siempre visible al final del contenido */}
                      <div className="pt-2">
                        {semanasCompletadas.has(semana.id) ? (
                          <div
                            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold"
                            style={{
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10B981',
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}
                          >
                            ✅ Semana completada
                          </div>
                        ) : (
                          <button
                            onClick={() => marcarSemana(semana.id)}
                            disabled={guardandoProgreso}
                            className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                            style={{
                              background: '#3AAFA9',
                              color: '#fff',
                              border: 'none',
                              cursor: guardandoProgreso ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={e => { if (!guardandoProgreso) (e.currentTarget as HTMLElement).style.background = '#2B7A77' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#3AAFA9' }}
                          >
                            {guardandoProgreso ? '⏳ Guardando...' : '✅ Marcar semana como completada'}
                          </button>
                        )}
                      </div>

                      {/* Barra de progreso de lectura (flotante, como complemento) */}
                      <ReadingProgress
                        semanaId={semana.id}
                        alumnoId={alumnoId}
                        lang="es"
                        yaCompletada={semanasCompletadas.has(semana.id)}
                        onCompletada={() => {
                          const nuevas = new Set([...semanasCompletadas, semana.id])
                          setSemanasCompletadas(nuevas)
                          if (materia && materia.semanas.every(s => nuevas.has(s.id))) {
                            setMateriaAcreditada(true)
                          }
                        }}
                      />

                      {/* Notas personales */}
                      {alumnoId && (
                        <NotasPersonales
                          semanaId={semana.id}
                          alumnoId={alumnoId}
                          lang="es"
                        />
                      )}
                    </div>
                  )
                })()}

                {/* Card ¿Qué sigue? */}
                {todasCompletas && (
                  <div
                    ref={cardSigueRef}
                    className="rounded-xl p-6 flex flex-col items-center text-center gap-4"
                    style={{
                      background: '#1E2535',
                      border: '1px solid rgba(99,102,241,0.35)',
                      boxShadow: '0 0 24px rgba(99,102,241,0.08)',
                    }}
                  >
                    <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>🎯</span>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-gray-900">
                        ¡Materia completada!
                      </h3>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>
                        Ya puedes presentar tu examen final
                      </p>
                    </div>
                    <button
                      onClick={() => setTab('examen')}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: '#5B6CFF', color: '#fff', border: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#7B8AFF' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#5B6CFF' }}
                    >
                      Ir al examen →
                    </button>
                    <p className="text-xs" style={{ color: '#475569' }}>— o —</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                      Continúa con el siguiente mes cuando estés listo
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Examen */}
      {tab === 'examen' && (
        <div className="space-y-4">

          {/* Guía de estudio */}
          {mostrarGuia && (() => {
            const pendientes = materia.semanas.filter(s => !semanasCompletadas.has(s.id)).length
            const termsPills = glosario.slice(0, 4)
            return (
              <div
                ref={guiaRef}
                className="rounded-xl p-5 space-y-5"
                style={{ background: '#1A1F2E', border: '1px solid #2A2F3E' }}
              >
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-gray-900">
                    Prepárate para el examen
                  </h3>
                  <p className="text-sm" style={{ color: '#64748B' }}>
                    Repasa estos puntos clave antes de comenzar
                  </p>
                </div>

                {pendientes > 0 && (
                  <div
                    className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm"
                    style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1.4 }}>⚠️</span>
                    <p style={{ color: '#FDE68A' }}>
                      Tienes {pendientes} semana{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''}. Te recomendamos completarlas antes del examen.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>
                    Semanas
                  </p>
                  <ul className="space-y-1.5">
                    {materia.semanas.map(s => {
                      const completa = semanasCompletadas.has(s.id)
                      return (
                        <li key={s.id} className="flex items-center gap-2.5 text-sm">
                          <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>
                            {completa ? '✅' : '⚪'}
                          </span>
                          <span style={{ color: completa ? '#CBD5E1' : '#475569' }}>
                            {s.titulo}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {termsPills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>
                      Términos importantes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {termsPills.map(term => (
                        <span
                          key={term.id}
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: 'rgba(91,108,255,0.12)', color: '#7B8AFF', border: '1px solid rgba(91,108,255,0.25)' }}
                        >
                          {term.termino}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={ocultarGuia}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: '#5B6CFF', color: '#fff', border: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#7B8AFF' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#5B6CFF' }}
                >
                  Ya estoy listo — comenzar examen →
                </button>
              </div>
            )
          })()}

          {!mostrarGuia && (materia.evaluaciones.length === 0 ? (
            <div className="flex items-center justify-center py-12 rounded-xl" style={CARD}>
              <p className="text-sm" style={{ color: '#94A3B8' }}>No hay exámenes disponibles</p>
            </div>
          ) : (
            materia.evaluaciones.map(ev => {
              const intentosRestantes = ev.intentos_max - ev.intentos_usados
              return (
                <div key={ev.id} className="rounded-xl p-5 space-y-4" style={CARD}>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{ev.titulo}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: '#94A3B8' }}>
                      <span>Intentos: {ev.intentos_usados}/{ev.intentos_max}</span>
                    </div>
                  </div>

                  {ev.aprobada ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span className="text-lg">✓</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#10B981' }}>¡Materia aprobada!</p>
                        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                          Calificación: <strong style={{ color: '#10B981' }}>{ev.calificacion_aprobatoria}</strong>
                        </p>
                      </div>
                    </div>
                  ) : intentosRestantes <= 0 ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="text-lg">✗</span>
                      <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Sin intentos disponibles</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/alumno/evaluacion/${ev.id}`)}
                      className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: '#5B6CFF', color: '#fff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#7B8AFF' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#5B6CFF' }}
                    >
                      Presentar examen ({intentosRestantes} {intentosRestantes !== 1 ? 'intentos' : 'intento'} {intentosRestantes !== 1 ? 'disponibles' : 'disponible'})
                    </button>
                  )}
                </div>
              )
            })
          ))}
        </div>
      )}

      {/* Tab: Información */}
      {tab === 'informacion' && (
        <div className="space-y-4">
          {(materia.descripcion || materia.objetivo) && (
            <div className="rounded-xl p-5 space-y-2" style={CARD}>
              <h3 className="text-sm font-semibold text-gray-900">Descripción</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
                {materia.descripcion || materia.objetivo}
              </p>
            </div>
          )}
          {materia.objetivo && materia.objetivo !== materia.descripcion && (
            <div className="rounded-xl p-5 space-y-2" style={CARD}>
              <h3 className="text-sm font-semibold text-gray-900">Objetivo</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{materia.objetivo}</p>
            </div>
          )}

          {(() => {
            const temas = materia.temario ?? []
            const haySemanas = materia.semanas?.length > 0
            const hayTemas = temas.length > 0
            if (!haySemanas && !hayTemas) return null
            return (
              <div className="rounded-xl p-5 space-y-3" style={CARD}>
                <h3 className="text-sm font-semibold text-gray-900">Plan de estudios</h3>
                {haySemanas && (
                  <ol className="space-y-2">
                    {materia.semanas!.map(semana => (
                      <li key={semana.id} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgba(91,108,255,0.15)', color: '#5B6CFF' }}>
                          {semana.numero}
                        </span>
                        <span style={{ color: '#94A3B8' }}>{semana.titulo}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {hayTemas && (
                  <ol className="space-y-2">
                    {temas.map((tema, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgba(91,108,255,0.15)', color: '#5B6CFF' }}>
                          {i + 1}
                        </span>
                        <span style={{ color: '#94A3B8' }}>{tema}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )
          })()}

          {materia.bibliografia?.length > 0 && (
            <div className="rounded-xl p-5 space-y-3" style={CARD}>
              <h3 className="text-sm font-semibold text-gray-900">Bibliografía</h3>
              <ul className="space-y-2">
                {materia.bibliografia.map((bib, i) => {
                  const etiqueta = bib.tipo ? `${bib.titulo} (${bib.tipo})` : bib.titulo
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#5B6CFF' }} />
                      {bib.url ? (
                        <a
                          href={bib.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm transition-colors"
                          style={{ color: '#5B6CFF' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#7B8AFF' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#5B6CFF' }}
                        >
                          {etiqueta}
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: '#94A3B8' }}>{etiqueta}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {glosario.length > 0 && (
            <div className="rounded-xl p-5 space-y-4" style={CARD}>
              <h3 className="text-sm font-semibold text-gray-900">
                Glosario
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {glosario.map(term => (
                  <div
                    key={term.id}
                    className="px-4 py-3 rounded-lg space-y-1"
                    style={{
                      background: 'rgba(91,108,255,0.04)',
                      borderLeft: '3px solid rgba(91,108,255,0.4)',
                      border: '1px solid #2A2F3E',
                      borderLeftWidth: '3px',
                      borderLeftColor: 'rgba(91,108,255,0.5)',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#7B8AFF' }}>
                      {term.termino}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                      {term.definicion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      </FadeIn>

      {materiaAcreditada && (
        <CelebrationBanner
          materiaNombre={materia.nombre}
          materiaNombre_en={materia.nombre_en}
          lang="es"
          onClose={() => setMateriaAcreditada(false)}
        />
      )}
    </div>
  )
}
