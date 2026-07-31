'use client'

/**
 * Examen final de curso — vista del alumno.
 *
 * Diseño deliberadamente simple: TODAS las preguntas en una sola vista
 * scrolleable, sin cronómetro y sin autosave. Cada envío es un resultado nuevo,
 * así que el historial sale gratis.
 *
 * Las preguntas llegan SANITIZADAS de la API (sin respuesta correcta ni
 * explicación). La calificación y la revisión solo aparecen después de enviar,
 * calculadas en el servidor.
 *
 * Los intentos SÍ están limitados, y el candado real vive en la ruta: lo de aquí
 * es solo cortesía visual para no dejar al alumno mandar un envío que el
 * servidor va a rechazar. La revisión, además, solo trae la respuesta correcta
 * de las preguntas que el alumno contestó.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { INTENTOS_PERMITIDOS_DEFAULT } from '@/lib/cursos/examen'
import type {
  DesgloseTema, Letra, PreguntaSanitizada, ResultadoHistorial, RevisionPregunta,
} from '@/types/cursos-examen'

const LETRAS: Letra[] = ['a', 'b', 'c', 'd']

interface Calificado {
  aciertos: number
  total: number
  porcentaje: number
  desglose_temas: DesgloseTema[]
  revision: RevisionPregunta[]
}

export default function ExamenCursoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const cursoId = params.id

  const [preguntas, setPreguntas] = useState<PreguntaSanitizada[] | null>(null)
  const [cargando, setCargando] = useState(true)
  const [respuestas, setRespuestas] = useState<Record<string, Letra>>({})
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<Calificado | null>(null)
  const [historial, setHistorial] = useState<ResultadoHistorial[]>([])
  // Arranca en el fallback y se sustituye por el valor del curso al cargar.
  const [intentosPermitidos, setIntentosPermitidos] = useState(INTENTOS_PERMITIDOS_DEFAULT)
  const [verHistorial, setVerHistorial] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarHistorial = useCallback(() => {
    fetch(`/api/alumno/cursos/${cursoId}/examen/resultados`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: { historial: ResultadoHistorial[] } | null) => setHistorial(j?.historial ?? []))
      .catch(() => { /* el historial es accesorio: si falla, no rompe el examen */ })
  }, [cursoId])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/alumno/cursos/${cursoId}/examen`)
      .then(async r => {
        if (r.status === 404) { if (!cancelled) router.replace(`/cursos/${cursoId}`); return null }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((j: { preguntas: PreguntaSanitizada[]; intentos_permitidos?: number } | null) => {
        if (!j || cancelled) return
        setPreguntas(j.preguntas)
        // Límite POR CURSO (cursos.intentos_permitidos). Si la API no lo manda
        // se conserva el fallback, nunca "sin límite".
        if (typeof j.intentos_permitidos === 'number' && j.intentos_permitidos > 0) {
          setIntentosPermitidos(j.intentos_permitidos)
        }
      })
      .catch(() => { if (!cancelled) setError('No se pudo cargar el examen.') })
      .finally(() => { if (!cancelled) setCargando(false) })
    cargarHistorial()
    return () => { cancelled = true }
  }, [cursoId, router, cargarHistorial])

  const contestadas = useMemo(() => Object.keys(respuestas).length, [respuestas])
  const total = preguntas?.length ?? 0
  const faltantes = total - contestadas

  // El historial trae un renglón por envío, así que los intentos usados salen
  // gratis del fetch que ya se hacía. El límite de verdad lo aplica la ruta.
  const intentosRestantes = Math.max(0, intentosPermitidos - historial.length)
  const sinIntentos = intentosRestantes === 0

  const elegir = (preguntaId: string, letra: Letra) =>
    setRespuestas(prev => ({ ...prev, [preguntaId]: letra }))

  const enviar = useCallback(async () => {
    if (!preguntas) return
    setEnviando(true)
    setError(null)
    setConfirmar(false)
    try {
      const res = await fetch(`/api/alumno/cursos/${cursoId}/examen/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Se mandan TODAS: las no contestadas van en null y cuentan como error.
          respuestas: preguntas.map(p => ({ pregunta_id: p.id, respuesta: respuestas[p.id] ?? null })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudo enviar el examen')
      setResultado(json as Calificado)
      cargarHistorial()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el examen')
    } finally {
      setEnviando(false)
    }
  }, [cursoId, preguntas, respuestas, cargarHistorial])

  const reintentar = () => {
    setResultado(null)
    setRespuestas({})
    setVerHistorial(false)
    window.scrollTo({ top: 0 })
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primario)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-3 sm:px-5 py-3"
        style={{ background: 'var(--color-primario)', color: 'var(--color-texto-sobre-acento)' }}
      >
        <button
          onClick={() => router.push(`/cursos/${cursoId}`)}
          className="p-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Volver al curso"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold truncate leading-tight">Examen final</h1>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {resultado ? `${resultado.aciertos} de ${resultado.total} aciertos` : `${contestadas} de ${total} contestadas`}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#B91C1C', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {/* ── RESULTADOS ── */}
          {resultado && (
            <>
              <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--color-primario)' }}>
                  {resultado.aciertos}<span className="text-2xl" style={{ color: '#94A3B8' }}>/{resultado.total}</span>
                </p>
                <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-acento)' }}>
                  {Math.round(resultado.porcentaje)}%
                </p>
              </div>

              {resultado.desglose_temas.length > 0 && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-primario)' }}>Por tema</h2>
                  {resultado.desglose_temas.map(t => {
                    const pct = t.total === 0 ? 0 : Math.round((t.aciertos / t.total) * 100)
                    return (
                      <div key={t.tema}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#334155' }}>{t.tema}</span>
                          <span className="font-semibold" style={{ color: '#64748B' }}>{t.aciertos}/{t.total}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E8F0F7' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-acento)' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={reintentar}
                  disabled={sinIntentos}
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold flex-1"
                  style={
                    sinIntentos
                      ? { background: 'rgba(27,48,104,0.08)', color: '#94A3B8', cursor: 'not-allowed' }
                      : { background: 'var(--color-acento)', color: '#fff' }
                  }
                >
                  <RotateCcw className="w-4 h-4" />
                  {sinIntentos
                    ? 'Sin intentos disponibles'
                    : `Volver a intentar (${intentosRestantes} ${intentosRestantes === 1 ? 'restante' : 'restantes'})`}
                </button>
                <button
                  onClick={() => setVerHistorial(v => !v)}
                  className="rounded-xl px-5 py-3 text-sm font-semibold flex-1"
                  style={{ background: 'rgba(27,48,104,0.06)', color: 'var(--color-primario)', border: '1px solid rgba(27,48,104,0.2)' }}
                >
                  {verHistorial ? 'Ocultar historial' : `Ver historial (${historial.length})`}
                </button>
              </div>

              {verHistorial && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                  {historial.map(h => (
                    <div key={h.id} className="flex justify-between text-xs py-1">
                      <span style={{ color: '#64748B' }}>
                        {new Date(h.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-semibold" style={{ color: '#334155' }}>
                        {h.aciertos}/{h.total} · {Math.round(Number(h.porcentaje))}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-sm font-bold pt-2" style={{ color: 'var(--color-primario)' }}>Revisión</h2>
              {resultado.revision.map((r, i) => (
                <div key={r.pregunta_id} className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                  <div className="flex items-start gap-2">
                    {r.es_correcta
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                      : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />}
                    <p className="text-sm font-medium whitespace-pre-wrap" style={{ color: '#1E293B' }}>
                      <span style={{ color: '#94A3B8' }}>{i + 1}. </span>{r.enunciado}
                    </p>
                  </div>
                  <div className="space-y-1 pl-6">
                    {LETRAS.map(L => {
                      // r.respuesta_correcta llega undefined cuando no contestaste
                      // esta pregunta: entonces ninguna opción se marca correcta.
                      const esCorrecta = r.respuesta_correcta !== undefined && L === r.respuesta_correcta
                      const esTuya = L === r.tu_respuesta
                      return (
                        <p
                          key={L}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={
                            esCorrecta ? { background: 'rgba(16,185,129,0.12)', color: '#047857', fontWeight: 600 }
                              : esTuya ? { background: 'rgba(239,68,68,0.1)', color: '#B91C1C' }
                                : { color: '#64748B' }
                          }
                        >
                          {L}) {r.opciones[L]}
                          {esTuya && !esCorrecta && ' — tu respuesta'}
                          {esCorrecta && ' ✓'}
                        </p>
                      )
                    })}
                    {r.tu_respuesta === null && (
                      <p className="text-xs" style={{ color: '#B45309' }}>
                        No la contestaste, cuenta como incorrecta. La respuesta correcta se
                        muestra solo en las preguntas que sí contestaste.
                      </p>
                    )}
                  </div>
                  {r.explicacion && (
                    <p className="text-xs pl-6 pt-1 whitespace-pre-wrap" style={{ color: '#475569' }}>{r.explicacion}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── EXAMEN ── */}
          {!resultado && preguntas && (
            <>
              <p className="text-xs" style={{ color: '#64748B' }}>
                Contesta las {total} preguntas y envía. No hay límite de tiempo.{' '}
                {sinIntentos
                  ? 'Ya usaste todos tus intentos.'
                  : `Te ${intentosRestantes === 1 ? 'queda' : 'quedan'} ${intentosRestantes} de ${intentosPermitidos} ${intentosRestantes === 1 ? 'intento' : 'intentos'}.`}{' '}
                Al terminar verás la respuesta correcta de las preguntas que hayas contestado.
              </p>

              {preguntas.map((p, i) => (
                <div key={p.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium whitespace-pre-wrap" style={{ color: '#1E293B' }}>
                      <span style={{ color: '#94A3B8' }}>{i + 1}. </span>{p.enunciado}
                    </p>
                    {respuestas[p.id] && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />}
                  </div>
                  {p.tema && <p className="text-[11px]" style={{ color: '#94A3B8' }}>{p.tema}</p>}
                  <div className="space-y-1.5">
                    {LETRAS.map(L => {
                      const sel = respuestas[p.id] === L
                      return (
                        <button
                          key={L}
                          onClick={() => elegir(p.id, L)}
                          className="w-full flex items-start gap-2 text-left px-3 py-2 rounded-xl text-sm"
                          style={sel
                            ? { background: 'rgba(27,48,104,0.08)', border: '1px solid var(--color-primario)', color: '#1E293B' }
                            : { background: '#fff', border: '1px solid #E8F0F7', color: '#334155' }}
                        >
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                            style={sel
                              ? { background: 'var(--color-primario)', color: '#fff' }
                              : { background: '#F1F5F9', color: '#64748B' }}
                          >
                            {L.toUpperCase()}
                          </span>
                          <span className="whitespace-pre-wrap">{p[`opcion_${L}` as const]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => (faltantes > 0 ? setConfirmar(true) : enviar())}
                disabled={enviando}
                className="w-full rounded-xl px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--color-acento)', color: '#fff' }}
              >
                {enviando ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</span> : 'Enviar examen'}
              </button>
            </>
          )}
        </div>
      </main>

      {/* Confirmación cuando quedan preguntas sin contestar */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: '#fff' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-primario)' }}>
              Te {faltantes === 1 ? 'falta' : 'faltan'} {faltantes} {faltantes === 1 ? 'pregunta' : 'preguntas'}
            </h2>
            <p className="text-sm" style={{ color: '#475569' }}>
              Las que dejes sin contestar cuentan como incorrectas. ¿Enviar de todos modos?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setConfirmar(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold flex-1"
                style={{ background: 'rgba(27,48,104,0.06)', color: 'var(--color-primario)' }}
              >
                Seguir contestando
              </button>
              <button
                onClick={enviar}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold flex-1"
                style={{ background: 'var(--color-acento)', color: '#fff' }}
              >
                Enviar así
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
