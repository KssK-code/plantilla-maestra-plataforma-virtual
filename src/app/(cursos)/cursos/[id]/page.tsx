'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Circle, Download, Eye, FileText, GraduationCap, List, Loader2, PartyPopper, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VideoPlayer } from '@/components/cursos/VideoPlayer'
import { ProgressBar } from '@/components/cursos/ProgressBar'
import { porcentajeProgreso, cursoCompletado } from '@/lib/cursos/progreso'
import type { CursoDetalleAlumno, LeccionAlumno } from '@/types/cursos-alumno'

export default function VisorCursoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const cursoId = params.id

  const [detalle, setDetalle] = useState<CursoDetalleAlumno | null>(null)
  const [cargando, setCargando] = useState(true)
  const [activaId, setActivaId] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [marcando, setMarcando] = useState(false)
  // Examen final: null mientras carga, false si el curso no tiene examen.
  const [examen, setExamen] = useState<{ total: number; mejor: number | null } | false | null>(null)

  // ── Carga inicial ──
  useEffect(() => {
    let cancelled = false
    // Origen de la navegación: el admin llega con ?from=admin (para enrutar el
    // 404 de vuelta a su panel en vez de al catálogo del alumno).
    const desdeAdmin = new URLSearchParams(window.location.search).get('from') === 'admin'
    fetch(`/api/alumno/cursos/${cursoId}`)
      .then(async r => {
        if (r.status === 404) {
          if (!cancelled) {
            router.replace(desdeAdmin ? '/admin/cursos' : '/alumno/cursos?aviso=sin-acceso')
          }
          return null
        }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((json: CursoDetalleAlumno | null) => {
        if (!json || cancelled) return
        setDetalle(json)
        setActivaId(json.primeraLeccionPendienteId)
        // Expandir el módulo que contiene la lección activa
        const mod = json.modulos.find(m => m.lecciones.some(l => l.id === json.primeraLeccionPendienteId))
        setExpandidos(new Set(mod ? [mod.id] : json.modulos.slice(0, 1).map(m => m.id)))
      })
      .catch(() => { /* deja el estado de error abajo */ })
      .finally(() => { if (!cancelled) setCargando(false) })
    return () => { cancelled = true }
  }, [cursoId, router])

  // ── ¿Este curso tiene examen final? ──
  // Va aparte de la carga del curso: un 404 aquí solo significa "sin examen",
  // no debe tumbar el visor de lecciones.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/alumno/cursos/${cursoId}/examen`)
      .then(async r => (r.ok ? r.json() : null))
      .then((json: { total: number; mejor_porcentaje: number | null } | null) => {
        if (cancelled) return
        setExamen(json ? { total: json.total, mejor: json.mejor_porcentaje } : false)
      })
      .catch(() => { if (!cancelled) setExamen(false) })
    return () => { cancelled = true }
  }, [cursoId])

  // Lista plana de lecciones en orden (para prev/next y lookup)
  const enOrden = useMemo<LeccionAlumno[]>(
    () => detalle?.modulos.flatMap(m => m.lecciones) ?? [],
    [detalle]
  )
  const activa = useMemo(() => enOrden.find(l => l.id === activaId) ?? null, [enOrden, activaId])
  const idxActiva = useMemo(() => enOrden.findIndex(l => l.id === activaId), [enOrden, activaId])
  const anterior = idxActiva > 0 ? enOrden[idxActiva - 1] : null
  const siguiente = idxActiva >= 0 && idxActiva < enOrden.length - 1 ? enOrden[idxActiva + 1] : null

  const irALeccion = useCallback((id: string) => {
    setActivaId(id)
    setDrawerOpen(false)
    const cont = document.getElementById('leccion-scroll')
    if (cont) cont.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // ── Marcar / desmarcar completada ──
  async function toggleCompletada() {
    if (!detalle || !activa || marcando || detalle.modoPreview) return
    const nuevoEstado = !activa.completada
    setMarcando(true)
    try {
      const res = await fetch(`/api/alumno/cursos/${cursoId}/progreso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leccion_id: activa.id, completada: nuevoEstado }),
      })
      if (!res.ok) return
      // Actualización local (no refetch → no perder la lección activa)
      setDetalle(prev => {
        if (!prev) return prev
        const modulos = prev.modulos.map(m => ({
          ...m,
          lecciones: m.lecciones.map(l => l.id === activa.id ? { ...l, completada: nuevoEstado } : l),
        }))
        const completadas = modulos.flatMap(m => m.lecciones).filter(l => l.completada).length
        return {
          ...prev,
          modulos,
          completadas,
          porcentaje: porcentajeProgreso(completadas, prev.totalLecciones),
          completado: cursoCompletado(completadas, prev.totalLecciones),
        }
      })
    } finally {
      setMarcando(false)
    }
  }

  function toggleModulo(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const volver = useCallback(() => {
    router.push(detalle?.modoPreview ? `/admin/cursos/${cursoId}` : '/alumno/cursos')
  }, [router, detalle, cursoId])

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
      </div>
    )
  }
  if (!detalle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-primario)' }}>No se pudo cargar el curso.</p>
        <button onClick={() => router.push('/alumno/cursos')} className="text-sm font-medium underline" style={{ color: 'var(--color-acento)' }}>
          Volver a mis cursos
        </button>
      </div>
    )
  }

  const { curso, modoPreview } = detalle

  // ── Índice de módulos/lecciones (reutilizado en drawer móvil y panel desktop) ──
  const Indice = (
    <div className="space-y-2">
      {detalle.modulos.map((modulo, mi) => {
        const abierto = expandidos.has(modulo.id)
        const compl = modulo.lecciones.filter(l => l.completada).length
        return (
          <div key={modulo.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8F0F7', background: 'var(--color-superficie)' }}>
            <button
              onClick={() => toggleModulo(modulo.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              style={{ background: 'rgba(27,48,104,0.04)' }}
              aria-expanded={abierto}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold flex-shrink-0"
                style={{ background: 'var(--color-primario)', color: 'var(--color-texto-sobre-acento)' }}>
                {mi + 1}
              </span>
              <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--color-primario)' }}>
                {modulo.nombre}
              </span>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#94A3B8' }}>
                {compl}/{modulo.lecciones.length}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#94A3B8', transform: abierto ? 'rotate(180deg)' : 'none' }} />
            </button>

            {abierto && (
              <div className="py-1">
                {modulo.lecciones.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: '#CBD5E1' }}>Sin lecciones</p>
                )}
                {modulo.lecciones.map(leccion => {
                  const esActiva = leccion.id === activaId
                  return (
                    <button
                      key={leccion.id}
                      onClick={() => irALeccion(leccion.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                      style={{ background: esActiva ? 'rgba(27,48,104,0.08)' : 'transparent' }}
                    >
                      {leccion.completada
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                        : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: '#CBD5E1' }} />}
                      <span className="flex-1 text-xs truncate"
                        style={{ color: esActiva ? 'var(--color-primario)' : '#475569', fontWeight: esActiva ? 600 : 400 }}>
                        {leccion.titulo}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {/* Examen final — al final del temario, solo si el curso tiene uno */}
      {examen && (
        <button
          onClick={() => { setDrawerOpen(false); router.push(`/cursos/${cursoId}/examen`) }}
          className="w-full rounded-xl p-3 text-left"
          style={{ border: '1px solid rgba(27,48,104,0.2)', background: 'rgba(27,48,104,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primario)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-primario)' }}>Examen final</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#64748B' }}>
            {examen.total} preguntas
            {examen.mejor !== null && ` · mejor puntaje ${Math.round(examen.mejor)}%`}
          </p>
          <span
            className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--color-acento)', color: '#fff' }}
          >
            {examen.mejor !== null ? 'Volver a intentar' : 'Presentar examen'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-3 sm:px-5 py-3"
        style={{ background: 'var(--color-primario)', color: 'var(--color-texto-sobre-acento)' }}
      >
        <button onClick={volver} className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} aria-label="Volver">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold truncate leading-tight">{curso.nombre}</h1>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {detalle.completadas}/{detalle.totalLecciones} lecciones · {detalle.porcentaje}%
          </p>
        </div>
        {/* Botón índice (solo móvil) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <List className="w-4 h-4" />
          Índice
        </button>
      </header>

      {/* Banner vista previa admin */}
      {modoPreview && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium"
          style={{ background: 'rgba(180,83,9,0.12)', color: '#F59E0B' }}>
          <Eye className="w-4 h-4 flex-shrink-0" />
          Vista previa de administrador — así ve el curso el alumno. No se registra progreso.
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Panel de índice (desktop) */}
        <aside className="hidden md:block w-[320px] flex-shrink-0 border-r overflow-y-auto p-4"
          style={{ borderColor: '#E8F0F7', maxHeight: 'calc(100vh - 61px)' }}>
          <div className="mb-3">
            <ProgressBar porcentaje={detalle.porcentaje} />
          </div>
          {Indice}
        </aside>

        {/* Contenido de la lección */}
        <main id="leccion-scroll" className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 61px)' }}>
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
            {/* Banner de felicitación */}
            {detalle.completado && (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-4"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }}>
                <PartyPopper className="w-6 h-6 flex-shrink-0" style={{ color: '#10B981' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                    ¡Completaste este {curso.tipo === 'diplomado' ? 'diplomado' : 'curso'}!
                  </p>
                  <p className="text-xs" style={{ color: '#10B981' }}>Terminaste todas las lecciones. ¡Felicidades!</p>
                </div>
              </div>
            )}

            {!activa ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Este curso todavía no tiene lecciones.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--color-primario)' }}>
                    {activa.titulo}
                  </h2>
                </div>

                {activa.video_url && <VideoPlayer url={activa.video_url} titulo={activa.titulo} />}

                {/* Contenido — Markdown renderizado.
                    Mismo componente y misma config que el visor de materias
                    (ReactMarkdown + remarkGfm + override de encabezados). Las
                    clases de color SÍ cambian: allá la tarjeta es oscura y usa
                    prose-invert; esta es clara, así que invertir dejaría el
                    texto blanco sobre fondo blanco.
                    El banco de Cursos de Ingreso entrega las lecciones en
                    markdown; antes de esto se veían los ## y los ** en crudo. */}
                {activa.contenido_texto && (
                  <div
                    className="text-sm leading-relaxed rounded-2xl p-4 sm:p-5 prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-headings:mt-4 prose-headings:mb-2 prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-table:text-xs prose-table:my-3 prose-th:font-semibold prose-blockquote:not-italic"
                    style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7', color: '#334155' }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2" style={{ color: 'var(--color-primario)' }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--color-primario)' }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1" style={{ color: 'var(--color-primario)' }}>{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold" style={{ color: '#1E293B' }}>{children}</strong>,
                        // Las tablas del banco (distribución de reactivos) se
                        // desbordan en 390px si no pueden desplazarse solas.
                        table: ({ children }) => (
                          <div className="overflow-x-auto -mx-1">
                            <table className="min-w-full text-xs">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => <th className="px-2 py-1 text-left font-semibold" style={{ background: 'rgba(27,48,104,0.06)', border: '1px solid #E8F0F7' }}>{children}</th>,
                        td: ({ children }) => <td className="px-2 py-1 align-top" style={{ border: '1px solid #E8F0F7' }}>{children}</td>,
                        blockquote: ({ children }) => (
                          <blockquote className="pl-3 my-3" style={{ borderLeft: '3px solid var(--color-acento)', color: '#475569' }}>{children}</blockquote>
                        ),
                      }}
                    >
                      {activa.contenido_texto}
                    </ReactMarkdown>
                  </div>
                )}

                {activa.tieneMaterial && activa.materialUrl && (
                  <a
                    href={activa.materialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold w-full sm:w-auto justify-center"
                    style={{ background: 'rgba(27,48,104,0.06)', border: '1px solid rgba(27,48,104,0.2)', color: 'var(--color-primario)' }}
                  >
                    <FileText className="w-4 h-4" />
                    Descargar material (PDF)
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {!activa.video_url && !activa.contenido_texto && !activa.tieneMaterial && (
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Esta lección aún no tiene contenido.</p>
                )}

                {/* Marcar como completada (oculto en vista previa admin) */}
                {!modoPreview && (
                  <button
                    onClick={toggleCompletada}
                    disabled={marcando}
                    className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold w-full sm:w-auto disabled:opacity-60"
                    style={activa.completada
                      ? { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)' }
                      : { background: 'var(--color-acento)', color: '#fff' }}
                  >
                    {activa.completada ? <><Check className="w-4 h-4" /> Completada</> : <>Marcar como completada</>}
                  </button>
                )}

                {/* Navegación anterior / siguiente */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => anterior && irALeccion(anterior.id)}
                    disabled={!anterior}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-30"
                    style={{ border: '1px solid #E2E8F0', color: '#475569', background: 'var(--color-superficie)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => siguiente && irALeccion(siguiente.id)}
                    disabled={!siguiente}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-30"
                    style={{ border: '1px solid #E2E8F0', color: '#475569', background: 'var(--color-superficie)' }}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Drawer de índice (móvil) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[85%] max-w-sm overflow-y-auto p-4" style={{ background: 'var(--color-fondo)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-primario)' }}>Contenido del curso</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg" style={{ color: '#64748B' }} aria-label="Cerrar índice">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3"><ProgressBar porcentaje={detalle.porcentaje} /></div>
            {Indice}
          </div>
        </div>
      )}
    </div>
  )
}
