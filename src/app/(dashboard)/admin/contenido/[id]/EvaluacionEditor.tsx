'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown, ChevronRight, Plus, Loader2, AlertCircle, Check, Trash2,
  RotateCcw, ClipboardCheck,
} from 'lucide-react'
import PreguntaEditor, { type Pregunta } from './PreguntaEditor'
import {
  TITULO_EVAL_MAX, TIEMPO_EVAL_MIN, TIEMPO_EVAL_MAX, INTENTOS_MIN, INTENTOS_MAX,
} from '@/lib/preguntas'

/**
 * El examen mensual, que cuelga del MES y no de la semana: `evaluaciones` tiene
 * `mes_id`, y `cerrar-mes` busca los exámenes del mes, no de cada semana.
 *
 * Dos niveles de carga perezosa, por el mismo motivo que el quiz: las
 * evaluaciones se piden al desplegar el bloque (`cargado`), y las preguntas de
 * cada una cuando su tarjeta se monta — o sea, nunca con la materia.
 */

export interface Evaluacion {
  id: string
  titulo: string
  descripcion: string | null
  /** NOT NULL DEFAULT 60 en el esquema. */
  tiempo_limite_minutos: number
  /** NOT NULL DEFAULT 3 en el esquema. */
  intentos_permitidos: number
  activa: boolean
}

/** `validarPregunta({crear:true, tipo:'examen'})` EXIGE opcion_d: en la tabla
 *  `preguntas` esa columna es NOT NULL (en quiz_semana es nullable). */
const ESQUELETO_PREGUNTA = {
  pregunta: 'Nueva pregunta',
  opcion_a: 'Opción A',
  opcion_b: 'Opción B',
  opcion_c: 'Opción C',
  opcion_d: 'Opción D',
  respuesta_correcta: 'a',
}

const CAJA = { background: '#0D1017', border: '1px solid #2A2F3E' }

function campoNum(cambiado: boolean): React.CSSProperties {
  return {
    background: '#12161F',
    border: `1px solid ${cambiado ? 'var(--color-acento)' : '#2A2F3E'}`,
    color: '#F1F5F9',
    borderRadius: '0.375rem',
    padding: '0.3rem 0.5rem',
    fontSize: '0.75rem',
    width: '100%',
    outline: 'none',
  }
}

function acotar(valor: string, min: number, max: number, porDefecto: number): number {
  // El <input type="number"> devuelve '' cuando el admin borra el campo para
  // reescribirlo, y Number('') es 0 — que el servidor rechaza con un 400.
  return Math.min(max, Math.max(min, Math.round(Number(valor) || porDefecto)))
}

// ─── Las preguntas de UN examen ──────────────────────────────────────────────

function PreguntasDeExamen({ evaluacionId }: { evaluacionId: string }) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [creando,   setCreando]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const endpoint = `/api/admin/evaluaciones/${evaluacionId}/preguntas`

  useEffect(() => {
    // Guarda contra respuestas obsoletas, igual que en page.tsx: en desarrollo
    // el StrictMode monta dos veces.
    let vivo = true
    async function cargar() {
      try {
        const res = await fetch(`/api/admin/evaluaciones/${evaluacionId}/preguntas`)
        const data = await res.json().catch(() => ({}))
        if (!vivo) return
        if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudieron cargar las preguntas')
        setPreguntas((data as { preguntas?: Pregunta[] }).preguntas ?? [])
      } catch (err) {
        if (vivo) setError((err as Error).message)
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => { vivo = false }
  }, [evaluacionId])

  async function anadir() {
    setCreando(true); setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ESQUELETO_PREGUNTA),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo crear la pregunta')
      const nueva = (data as { pregunta?: Pregunta }).pregunta
      if (nueva) setPreguntas(prev => [...prev, nueva])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreando(false)
    }
  }

  const archivadas = preguntas.filter(p => !p.activa).length

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: '#64748B' }}>
        {cargando
          ? 'Cargando preguntas…'
          : `${preguntas.length} pregunta${preguntas.length === 1 ? '' : 's'}${
              archivadas > 0 ? ` · ${archivadas} archivada${archivadas === 1 ? '' : 's'}` : ''}`}
      </p>

      {preguntas.map(p => (
        <PreguntaEditor
          key={p.id}
          p={p}
          tipo="examen"
          ruta={`/api/admin/preguntas/${p.id}`}
          onCambio={cambiada =>
            setPreguntas(prev => prev.map(x => (x.id === cambiada.id ? cambiada : x)))}
          onQuitada={id => setPreguntas(prev => prev.filter(x => x.id !== id))}
        />
      ))}

      {!cargando && (
        <button
          type="button"
          onClick={anadir}
          disabled={creando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
          style={{
            background: 'rgba(21,101,192,0.2)',
            color: 'var(--color-acento)',
            border: '1px solid rgba(21,101,192,0.4)',
          }}
        >
          {creando
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Añadiendo…</>
            : <><Plus className="w-3 h-3" /> Añadir pregunta</>}
        </button>
      )}

      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Un examen: cabecera editable + sus preguntas ────────────────────────────

interface CardProps {
  e: Evaluacion
  onCambio: (e: Evaluacion) => void
  onQuitada: (id: string) => void
}

function ExamenCard({ e, onCambio, onQuitada }: CardProps) {
  const [titulo,    setTitulo]    = useState(e.titulo)
  const [tiempo,    setTiempo]    = useState(String(e.tiempo_limite_minutos))
  const [intentos,  setIntentos]  = useState(String(e.intentos_permitidos))
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [aviso,     setAviso]     = useState<string | null>(null)

  const ruta = `/api/admin/evaluaciones/${e.id}`
  const cambioTitulo   = titulo !== e.titulo
  const cambioTiempo   = tiempo !== String(e.tiempo_limite_minutos)
  const cambioIntentos = intentos !== String(e.intentos_permitidos)
  const sucio = cambioTitulo || cambioTiempo || cambioIntentos

  async function guardar() {
    if (!titulo.trim()) { setError('El título del examen no puede quedar vacío'); return }

    // SOLO lo que cambió, igual que el PATCH de la semana: mandar la fila
    // entera pisa lo que otro admin haya tocado mientras esta pestaña seguía
    // abierta.
    const minutos  = acotar(tiempo,   TIEMPO_EVAL_MIN, TIEMPO_EVAL_MAX, 60)
    const permitidos = acotar(intentos, INTENTOS_MIN,  INTENTOS_MAX,     3)
    const cuerpo: Record<string, unknown> = {}
    if (cambioTitulo)   cuerpo.titulo = titulo
    if (cambioTiempo)   cuerpo.tiempo_limite_minutos = minutos
    if (cambioIntentos) cuerpo.intentos_permitidos   = permitidos
    if (Object.keys(cuerpo).length === 0) return

    setGuardando(true); setError(null)
    try {
      const res = await fetch(ruta, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo guardar')
      // Los números se reescriben con lo que de verdad se guardó, ya acotado:
      // si no, el campo seguiría enseñando el 0 que el admin tecleó.
      setTiempo(String(minutos)); setIntentos(String(permitidos))
      onCambio({ ...e, titulo: titulo.trim(), tiempo_limite_minutos: minutos, intentos_permitidos: permitidos })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function restaurar() {
    setError(null)
    try {
      const res = await fetch(ruta, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo restaurar')
      setAviso(null)
      onCambio({ ...e, activa: true })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar el examen "${e.titulo}"? Se irían también sus preguntas.`)) return
    setError(null)
    try {
      const res = await fetch(ruta, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo eliminar')
      const r = data as { accion?: string; mensaje?: string }
      if (r.accion === 'archivada') {
        // El servidor archivó porque hay intentos o calificaciones colgando.
        // Su mensaje dice cuántos: es donde el admin se entera.
        onCambio({ ...e, activa: false })
        setAviso(r.mensaje ?? 'Se archivó en vez de borrarse.')
      } else {
        onQuitada(e.id)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="rounded-lg p-3 space-y-3" style={{ ...CAJA, opacity: e.activa ? 1 : 0.6 }}>
      <div className="flex items-center gap-2 flex-wrap">
        {!e.activa && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(148,163,184,0.15)', color: '#94A3B8' }}>
            Archivado
          </span>
        )}
        <input
          type="text"
          value={titulo}
          maxLength={TITULO_EVAL_MAX}
          onChange={ev => { setTitulo(ev.target.value); setError(null) }}
          placeholder="Título del examen"
          className="flex-1 min-w-0"
          style={{ ...campoNum(cambioTitulo), fontWeight: 600 }}
        />
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>
            Minutos de límite ({TIEMPO_EVAL_MIN}–{TIEMPO_EVAL_MAX})
          </label>
          <input
            type="number"
            min={TIEMPO_EVAL_MIN}
            max={TIEMPO_EVAL_MAX}
            value={tiempo}
            onChange={ev => { setTiempo(ev.target.value); setError(null) }}
            style={campoNum(cambioTiempo)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>
            Intentos permitidos ({INTENTOS_MIN}–{INTENTOS_MAX})
          </label>
          <input
            type="number"
            min={INTENTOS_MIN}
            max={INTENTOS_MAX}
            value={intentos}
            onChange={ev => { setIntentos(ev.target.value); setError(null) }}
            style={campoNum(cambioIntentos)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs flex-1 min-w-0">
          {error && (
            <span className="flex items-center gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
            </span>
          )}
          {aviso && (
            <span className="flex items-start gap-1" style={{ color: '#F59E0B' }}>
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {aviso}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!e.activa && (
            <button type="button" onClick={restaurar}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ color: '#94A3B8', border: '1px solid #2A2F3E' }}>
              <RotateCcw className="w-3 h-3" /> Restaurar
            </button>
          )}
          <button type="button" onClick={eliminar} title="Eliminar examen"
            className="p-1 rounded" style={{ color: '#EF4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={guardar} disabled={guardando || !sucio}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.4)' }}>
            {guardando
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>
              : <><Check className="w-3 h-3" /> Guardar</>}
          </button>
        </div>
      </div>

      <PreguntasDeExamen evaluacionId={e.id} />
    </div>
  )
}

// ─── El bloque del mes ───────────────────────────────────────────────────────

interface Props {
  mesId: string
}

export default function EvaluacionEditor({ mesId }: Props) {
  const [abierto,      setAbierto]      = useState(false)
  const [cargado,      setCargado]      = useState(false)
  const [cargando,     setCargando]     = useState(false)
  const [creando,      setCreando]      = useState(false)
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [error,        setError]        = useState<string | null>(null)

  const endpoint = `/api/admin/meses/${mesId}/evaluaciones`
  const archivados = evaluaciones.filter(e => !e.activa).length

  async function cargar() {
    setCargando(true); setError(null)
    try {
      const res = await fetch(endpoint)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudieron cargar los exámenes')
      setEvaluaciones((data as { evaluaciones?: Evaluacion[] }).evaluaciones ?? [])
      // `cargado` SOLO si fue bien: un fallo tiene que poder reintentarse
      // cerrando y volviendo a abrir.
      setCargado(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCargando(false)
    }
  }

  function alternar() {
    const abriendo = !abierto
    setAbierto(abriendo)
    if (abriendo && !cargado && !cargando) cargar()
  }

  async function anadir() {
    setCreando(true); setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Examen del mes' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo crear el examen')
      const nueva = (data as { evaluacion?: Evaluacion }).evaluacion
      if (nueva) setEvaluaciones(prev => [...prev, nueva])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="rounded-xl" style={{ background: '#12161F', border: '1px solid #2A2F3E' }}>
      <button
        type="button"
        onClick={alternar}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ClipboardCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-acento)' }} />
          <span className="text-xs font-semibold" style={{ color: '#F1F5F9' }}>Examen del mes</span>
          {cargado && (
            <span className="text-xs" style={{ color: '#64748B' }}>
              {evaluaciones.length} examen{evaluaciones.length === 1 ? '' : 'es'}
              {archivados > 0 && ` · ${archivados} archivado${archivados === 1 ? '' : 's'}`}
            </span>
          )}
        </span>
        {abierto
          ? <ChevronDown  className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />}
      </button>

      {abierto && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #2A2F3E' }}>
          {cargando && (
            <p className="text-xs flex items-center gap-1 pt-3" style={{ color: '#64748B' }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando exámenes…
            </p>
          )}

          {!cargando && cargado && evaluaciones.length === 0 && (
            <p className="text-xs pt-3" style={{ color: '#64748B' }}>
              Este mes no tiene examen todavía.
            </p>
          )}

          {evaluaciones.length > 0 && (
            <div className="space-y-3 pt-3">
              {evaluaciones.map(ev => (
                <ExamenCard
                  key={ev.id}
                  e={ev}
                  onCambio={cambiada =>
                    setEvaluaciones(prev => prev.map(x => (x.id === cambiada.id ? cambiada : x)))}
                  onQuitada={id => setEvaluaciones(prev => prev.filter(x => x.id !== id))}
                />
              ))}
            </div>
          )}

          {!cargando && (
            <button
              type="button"
              onClick={anadir}
              disabled={creando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
              style={{
                background: 'rgba(21,101,192,0.2)',
                color: 'var(--color-acento)',
                border: '1px solid rgba(21,101,192,0.4)',
              }}
            >
              {creando
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Añadiendo…</>
                : <><Plus className="w-3 h-3" /> Añadir examen</>}
            </button>
          )}

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
