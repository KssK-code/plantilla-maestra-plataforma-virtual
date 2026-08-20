'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Loader2, AlertCircle, ListChecks } from 'lucide-react'
import PreguntaEditor, { type Pregunta } from './PreguntaEditor'

/**
 * El quiz de una semana.
 *
 * Las preguntas se piden al DESPLEGAR, no con la materia: `/api/admin/contenido/[id]`
 * trae los meses enteros, y un cliente con 360 semanas se traería miles de
 * preguntas que el admin no va a mirar. `cargado` hace que ese viaje ocurra una
 * sola vez por semana, aunque el bloque se abra y se cierre.
 *
 * El estado vive AQUÍ, igual que en MaterialesPanel: cada pregunta se guarda
 * sola, así que no entra en `camposCambiados` ni en el botón Guardar de la
 * semana.
 */

interface Props {
  semanaId: string
}

/** Mínimo que `validarPregunta({crear:true, tipo:'quiz'})` acepta. `opcion_d`
 *  se omite a propósito: en quiz_semana la columna es NULLABLE. */
const ESQUELETO = {
  pregunta: 'Nueva pregunta',
  opcion_a: 'Opción A',
  opcion_b: 'Opción B',
  opcion_c: 'Opción C',
  respuesta_correcta: 'a',
}

export default function QuizEditor({ semanaId }: Props) {
  const [abierto,   setAbierto]   = useState(false)
  const [cargado,   setCargado]   = useState(false)
  const [cargando,  setCargando]  = useState(false)
  const [creando,   setCreando]   = useState(false)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [error,     setError]     = useState<string | null>(null)

  const endpoint = `/api/admin/semanas/${semanaId}/quiz`
  const archivadas = preguntas.filter(p => !p.activa).length

  async function cargar() {
    setCargando(true); setError(null)
    try {
      const res = await fetch(endpoint)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo cargar el quiz')
      setPreguntas(((data as { preguntas?: Pregunta[] }).preguntas ?? []))
      // `cargado` SOLO cuando fue bien: si el viaje falló, cerrar y volver a
      // abrir tiene que reintentar, no quedarse con la lista vacía para siempre.
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
        body: JSON.stringify(ESQUELETO),
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

  return (
    <div className="rounded-lg" style={{ background: '#12161F', border: '1px solid #2A2F3E' }}>
      <button
        type="button"
        onClick={alternar}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ListChecks className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-acento)' }} />
          <span className="text-xs font-semibold" style={{ color: '#F1F5F9' }}>Quiz de la semana</span>
          {cargado && (
            <span className="text-xs" style={{ color: '#64748B' }}>
              {preguntas.length} pregunta{preguntas.length === 1 ? '' : 's'}
              {archivadas > 0 && ` · ${archivadas} archivada${archivadas === 1 ? '' : 's'}`}
            </span>
          )}
        </span>
        {abierto
          ? <ChevronDown  className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94A3B8' }} />
          : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94A3B8' }} />}
      </button>

      {abierto && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid #2A2F3E' }}>
          {cargando && (
            <p className="text-xs flex items-center gap-1 pt-3" style={{ color: '#64748B' }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando preguntas…
            </p>
          )}

          {!cargando && cargado && preguntas.length === 0 && (
            <p className="text-xs pt-3" style={{ color: '#64748B' }}>
              Esta semana no tiene quiz todavía.
            </p>
          )}

          {preguntas.length > 0 && (
            <div className="space-y-2 pt-3">
              {preguntas.map(p => (
                <PreguntaEditor
                  key={p.id}
                  p={p}
                  tipo="quiz"
                  ruta={`/api/admin/quiz/${p.id}`}
                  onCambio={cambiada =>
                    setPreguntas(prev => prev.map(x => (x.id === cambiada.id ? cambiada : x)))}
                  onQuitada={id => setPreguntas(prev => prev.filter(x => x.id !== id))}
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
                : <><Plus className="w-3 h-3" /> Añadir pregunta</>}
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
