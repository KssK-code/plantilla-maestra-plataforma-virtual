'use client'

import { useState } from 'react'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Loader2, AlertCircle, RotateCcw,
} from 'lucide-react'

/**
 * La estructura del programa: añadir, reordenar y retirar meses de una materia
 * o semanas de un mes.
 *
 * Va aparte del editor de contenido a propósito. `SemanaEditor` edita lo que
 * hay DENTRO de una semana y se guarda con su botón; esto cambia el ESQUELETO
 * y cada acción se aplica al instante contra el servidor, igual que los
 * materiales de `MaterialesPanel`. Mezclarlos haría que "Guardar" significara
 * dos cosas distintas en la misma tarjeta.
 *
 * Lo que NUNCA decide esta pantalla es si algo se borra o se archiva: eso lo
 * resuelve el servidor contando lo que cuelga (progreso, notas personales,
 * respuestas de quiz, exámenes). Cuando archiva, manda un `mensaje` — y ese
 * mensaje es donde el admin se entera de que había historial de alumnos. Se
 * pinta tal cual: resumirlo aquí sería adivinar.
 */

export interface ItemEstructura {
  id: string
  numero: number
  titulo: string
  activa: boolean
}

type Tipo = 'mes' | 'semana'

const CFG: Record<Tipo, {
  ruta: string
  campoPadre: string
  etiqueta: string
  añadir: string
  placeholder: string
}> = {
  mes: {
    ruta: '/api/admin/meses', campoPadre: 'materia_id', etiqueta: 'mes',
    añadir: 'Añadir mes', placeholder: 'Título del mes (ej. Mes 5)',
  },
  semana: {
    ruta: '/api/admin/semanas', campoPadre: 'mes_id', etiqueta: 'semana',
    añadir: 'Añadir semana', placeholder: 'Título de la semana',
  },
}

interface Props {
  tipo: Tipo
  /** `materia_id` para los meses, `mes_id` para las semanas. */
  padreId: string
  /** TODOS los hijos de ese padre, archivados incluidos: el lote de
   *  reordenamiento tiene que ir completo (ver la ruta de orden). */
  items: ItemEstructura[]
  /** La lista ya aplicada. La pantalla es la dueña del estado. */
  onItems: (items: ItemEstructura[]) => void
}

const CAJA = { background: '#0D1017', border: '1px solid #2A2F3E' }

const BOTON_ICONO: React.CSSProperties = {
  padding: '0.25rem',
  borderRadius: '0.25rem',
  color: '#94A3B8',
  border: '1px solid #2A2F3E',
  lineHeight: 0,
}

export default function EstructuraBar({ tipo, padreId, items, onItems }: Props) {
  const cfg = CFG[tipo]
  const [titulo, setTitulo] = useState('')
  const [creando, setCreando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const trabajando = creando || ocupado !== null

  async function pedir(url: string, init: RequestInit): Promise<Record<string, unknown>> {
    const res = await fetch(url, init)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo completar la acción')
    return data as Record<string, unknown>
  }

  async function crear() {
    const limpio = titulo.trim()
    if (!limpio || creando) return
    setError(null); setAviso(null); setCreando(true)
    try {
      // Sin `numero_*`: el servidor lo pone al final del padre. Calcularlo aquí
      // se equivocaría en cuanto otro admin haya añadido algo entre medias, y
      // `meses_contenido` / `semanas` tienen UNIQUE (padre, número).
      const data = await pedir(cfg.ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [cfg.campoPadre]: padreId, titulo: limpio }),
      })
      const fila = (data[tipo] ?? {}) as Record<string, unknown>
      const numero = Number(fila[tipo === 'mes' ? 'numero_mes' : 'numero_semana'])
      onItems([...items, {
        id: String(fila.id),
        numero: Number.isFinite(numero) ? numero : items.length + 1,
        titulo: String(fila.titulo ?? limpio),
        activa: fila.activa !== false,
      }])
      setTitulo('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreando(false)
    }
  }

  async function mover(indice: number, delta: number) {
    const destino = indice + delta
    if (destino < 0 || destino >= items.length || trabajando) return

    const nuevos = [...items]
    const tmp = nuevos[indice]
    nuevos[indice] = nuevos[destino]
    nuevos[destino] = tmp

    // Se renumera el bloque ENTERO, 1..n, y se manda completo. Mandar solo los
    // dos que se cruzan deja un lote parcial, y el servidor lo rechaza si un
    // hermano que no viene en él ocupa una de las posiciones destino — es lo
    // que evita que el UNIQUE (padre, número) reviente a mitad de escritura.
    const renumerados = nuevos.map((it, i) => ({ ...it, numero: i + 1 }))

    setError(null); setAviso(null); setOcupado(tmp.id)
    try {
      await pedir('/api/admin/contenido/orden', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          orden: renumerados.map(it => ({ id: it.id, posicion: it.numero })),
        }),
      })
      onItems(renumerados)
    } catch (err) {
      // No se toca la lista: si el servidor rechazó el lote, el orden que ve el
      // admin sigue siendo el que hay en la base.
      setError((err as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  async function eliminar(it: ItemEstructura) {
    const contenido = tipo === 'mes'
      ? 'Se llevaría también sus semanas.'
      : 'Se llevaría también sus apuntes, videos y quiz.'
    if (!window.confirm(`¿Eliminar "${it.titulo}"? ${contenido}`)) return

    setError(null); setAviso(null); setOcupado(it.id)
    try {
      const data = await pedir(`${cfg.ruta}/${it.id}`, { method: 'DELETE' })
      const accion = (data as { accion?: string }).accion
      if (accion === 'archivada') {
        // El servidor NO borró porque hay historial de alumnos colgando. Su
        // `mensaje` dice exactamente qué se conserva: progreso, notas
        // personales, respuestas de quiz, exámenes. Se muestra tal cual — es
        // donde el admin se entera de que ahí había trabajo de alguien.
        setAviso(String((data as { mensaje?: string }).mensaje
          ?? `Este ${cfg.etiqueta} se archivó en vez de borrarse: hay historial de alumnos colgando.`))
        onItems(items.map(x => (x.id === it.id ? { ...x, activa: false } : x)))
      } else {
        onItems(items.filter(x => x.id !== it.id))
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  async function restaurar(it: ItemEstructura) {
    setError(null); setAviso(null); setOcupado(it.id)
    try {
      await pedir(`${cfg.ruta}/${it.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: true }),
      })
      onItems(items.map(x => (x.id === it.id ? { ...x, activa: true } : x)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="rounded-lg p-3 space-y-2" style={CAJA}>
      <p className="text-xs font-medium" style={{ color: '#64748B' }}>
        Estructura · {tipo === 'mes' ? 'meses de la materia' : 'semanas del mes'}
      </p>

      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((it, i) => (
            <div
              key={it.id}
              className="flex items-center gap-2 rounded px-2 py-1.5"
              style={{
                background: '#12161F',
                border: '1px solid #2A2F3E',
                opacity: it.activa ? 1 : 0.55,
              }}
            >
              <span className="text-xs font-mono flex-shrink-0" style={{ color: '#64748B', width: '1.5rem' }}>
                {it.numero}
              </span>
              <span className="flex-1 min-w-0 truncate text-xs" style={{ color: '#F1F5F9' }} title={it.titulo}>
                {it.titulo || `${cfg.etiqueta} ${it.numero}`}
              </span>

              {!it.activa && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(148,163,184,0.15)', color: '#94A3B8' }}
                >
                  Archivado
                </span>
              )}

              {!it.activa && (
                <button
                  type="button"
                  onClick={() => restaurar(it)}
                  disabled={trabajando}
                  title={`Restaurar ${cfg.etiqueta}`}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs flex-shrink-0 disabled:opacity-40"
                  style={{ color: '#94A3B8', border: '1px solid #2A2F3E' }}
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar
                </button>
              )}

              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0 || trabajando}
                title="Subir"
                className="flex-shrink-0 disabled:opacity-30"
                style={BOTON_ICONO}
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === items.length - 1 || trabajando}
                title="Bajar"
                className="flex-shrink-0 disabled:opacity-30"
                style={BOTON_ICONO}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => eliminar(it)}
                disabled={trabajando}
                title={`Eliminar ${cfg.etiqueta}`}
                className="flex-shrink-0 disabled:opacity-30"
                style={{ ...BOTON_ICONO, color: '#EF4444' }}
              >
                {ocupado === it.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={titulo}
          onChange={e => { setTitulo(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crear() } }}
          placeholder={cfg.placeholder}
          maxLength={300}
          style={{
            background: '#12161F', border: '1px solid #2A2F3E', color: '#F1F5F9',
            borderRadius: '0.375rem', padding: '0.3rem 0.5rem', fontSize: '0.75rem',
            flex: 1, minWidth: 0, outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={crear}
          disabled={creando || !titulo.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold flex-shrink-0 disabled:opacity-40"
          style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)', border: '1px solid rgba(21,101,192,0.4)' }}
        >
          {creando
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Creando…</>
            : <><Plus className="w-3 h-3" /> {cfg.añadir}</>}
        </button>
      </div>

      {error && (
        <p className="text-xs flex items-start gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {error}
        </p>
      )}
      {aviso && (
        <p className="text-xs flex items-start gap-1" style={{ color: '#F59E0B' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {aviso}
        </p>
      )}
    </div>
  )
}
