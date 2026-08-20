'use client'

import { useState } from 'react'
import { Trash2, Loader2, AlertCircle, Check, RotateCcw } from 'lucide-react'
import { OPCIONES, PREGUNTA_MAX, OPCION_MAX, type TipoPregunta } from '@/lib/preguntas'

/**
 * Una pregunta de opción múltiple, del quiz semanal o del examen mensual.
 *
 * La diferencia entre los dos tipos no es cosmética, es de esquema:
 *  · quiz:   `opcion_d` es NULLABLE y hay campo `explicacion`.
 *  · examen: `opcion_d` es NOT NULL y NO existe `explicacion`.
 * Por eso el tipo decide qué campos se pintan y cuáles se mandan.
 */

export interface Pregunta {
  id: string
  pregunta: string
  opcion_a: string
  opcion_b: string
  opcion_c: string
  opcion_d: string | null
  respuesta_correcta: string
  orden: number | null
  explicacion?: string | null
  activa: boolean
}

interface Props {
  p: Pregunta
  tipo: TipoPregunta
  /** `/api/admin/quiz/{id}` o `/api/admin/preguntas/{id}` */
  ruta: string
  onCambio: (p: Pregunta) => void
  onQuitada: (id: string) => void
}

const CAJA = { background: '#0D1017', border: '1px solid #2A2F3E' }

function input(cambiado: boolean): React.CSSProperties {
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

export default function PreguntaEditor({ p, tipo, ruta, onCambio, onQuitada }: Props) {
  const [borrador, setBorrador] = useState<Pregunta>(p)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const esQuiz = tipo === 'quiz'
  const sucio =
    borrador.pregunta !== p.pregunta ||
    borrador.opcion_a !== p.opcion_a ||
    borrador.opcion_b !== p.opcion_b ||
    borrador.opcion_c !== p.opcion_c ||
    (borrador.opcion_d ?? '') !== (p.opcion_d ?? '') ||
    borrador.respuesta_correcta !== p.respuesta_correcta ||
    (borrador.explicacion ?? '') !== (p.explicacion ?? '')

  function set<K extends keyof Pregunta>(campo: K, valor: Pregunta[K]) {
    setBorrador(prev => ({ ...prev, [campo]: valor }))
    setError(null)
  }

  async function guardar() {
    setGuardando(true); setError(null)
    const cuerpo: Record<string, unknown> = {
      pregunta: borrador.pregunta,
      opcion_a: borrador.opcion_a,
      opcion_b: borrador.opcion_b,
      opcion_c: borrador.opcion_c,
      opcion_d: borrador.opcion_d ?? (esQuiz ? null : ''),
      respuesta_correcta: borrador.respuesta_correcta,
    }
    // `explicacion` SOLO en quiz: la tabla `preguntas` no tiene esa columna y
    // el servidor rechaza el body entero si se la mandas.
    if (esQuiz) cuerpo.explicacion = borrador.explicacion ?? null

    try {
      const res = await fetch(ruta, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo guardar')
      onCambio(borrador)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function alternarArchivo(activa: boolean) {
    setError(null)
    try {
      const res = await fetch(ruta, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo cambiar')
      const actualizada = { ...borrador, activa }
      setBorrador(actualizada); onCambio(actualizada)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    setError(null)
    try {
      const res = await fetch(ruta, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo eliminar')
      const r = data as { accion?: string; mensaje?: string }
      if (r.accion === 'archivada') {
        // El servidor decidió archivar porque hay alumnos que ya respondieron.
        // Su mensaje explica cuántos: es donde el admin se entera.
        const actualizada = { ...borrador, activa: false }
        setBorrador(actualizada); onCambio(actualizada)
        setAviso(r.mensaje ?? 'Se archivó en vez de borrarse.')
      } else {
        onQuitada(borrador.id)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ ...CAJA, opacity: borrador.activa ? 1 : 0.55 }}>
      <div className="flex items-center gap-2">
        {!borrador.activa && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(148,163,184,0.15)', color: '#94A3B8' }}>
            Archivada
          </span>
        )}
        <textarea
          value={borrador.pregunta}
          maxLength={PREGUNTA_MAX}
          onChange={e => set('pregunta', e.target.value)}
          rows={2}
          placeholder="Enunciado de la pregunta"
          style={{ ...input(borrador.pregunta !== p.pregunta), resize: 'vertical' }}
        />
      </div>

      <div className="space-y-1.5">
        {OPCIONES.map(letra => {
          const campo = `opcion_${letra}` as 'opcion_a' | 'opcion_b' | 'opcion_c' | 'opcion_d'
          const valor = (borrador[campo] ?? '') as string
          const opcionalVacia = esQuiz && letra === 'd'
          return (
            <div key={letra} className="flex items-center gap-2">
              <label className="flex items-center gap-1 flex-shrink-0" title="Marcar como correcta">
                <input
                  type="radio"
                  name={`correcta-${borrador.id}`}
                  checked={borrador.respuesta_correcta === letra}
                  onChange={() => set('respuesta_correcta', letra)}
                />
                <span className="text-xs uppercase" style={{ color: '#64748B', width: '1rem' }}>{letra}</span>
              </label>
              <input
                type="text"
                value={valor}
                maxLength={OPCION_MAX}
                onChange={e => set(campo, e.target.value)}
                placeholder={opcionalVacia ? 'Opción D (opcional)' : `Opción ${letra.toUpperCase()}`}
                style={input(valor !== ((p[campo] ?? '') as string))}
              />
            </div>
          )
        })}
      </div>

      {esQuiz && (
        <textarea
          value={borrador.explicacion ?? ''}
          onChange={e => set('explicacion', e.target.value)}
          rows={2}
          placeholder="Explicación que verá el alumno al fallar (opcional)"
          style={{ ...input((borrador.explicacion ?? '') !== (p.explicacion ?? '')), resize: 'vertical' }}
        />
      )}

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
          {!borrador.activa && (
            <button type="button" onClick={() => alternarArchivo(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ color: '#94A3B8', border: '1px solid #2A2F3E' }}>
              <RotateCcw className="w-3 h-3" /> Restaurar
            </button>
          )}
          <button type="button" onClick={eliminar} title="Eliminar pregunta"
            className="p-1 rounded" style={{ color: '#EF4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={guardar} disabled={guardando || !sucio}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.4)' }}>
            {guardando ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</> : <><Check className="w-3 h-3" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
