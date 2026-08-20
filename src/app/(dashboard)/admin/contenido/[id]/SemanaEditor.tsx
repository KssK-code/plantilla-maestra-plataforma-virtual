'use client'

import { Loader2, Save, Check, AlertCircle, Video } from 'lucide-react'
import ApuntesEditor from './ApuntesEditor'
import MaterialesPanel, { type Material } from './MaterialesPanel'
import {
  TIEMPO_MIN, TIEMPO_MAX, TITULO_MAX, DESCRIPCION_MAX, URL_MAX,
  camposCambiados, type ValoresSemana, type CampoValor,
} from '@/lib/contenido-semana'

/** Estado editable de una semana. Lo dueña `page.tsx`; aquí solo se pinta.
 *  `inicial` son los valores tal como llegaron del servidor: contra ellos se
 *  decide qué está sin guardar y qué viaja en el PATCH. */
export interface SemanaState extends ValoresSemana {
  inicial: ValoresSemana
  saving: boolean
  saved: boolean
  error: string | null
}

/** Los campos de texto: todos los editables menos los minutos, que tienen su
 *  propio handler por ser number. */
export type CampoTexto = Exclude<CampoValor, 'tiempo_estimado_minutos'>

interface Props {
  numero: number
  semanaId: string
  estado: SemanaState
  materiales: Material[]
  onCampo: (campo: CampoTexto, valor: string) => void
  onTiempo: (minutos: number) => void
  onGuardar: () => void
}

const INNER = { background: '#0D1017', border: '1px solid #2A2F3E' }

/** El borde de acento marca EXACTAMENTE el campo con cambios sin guardar.
 *  Existía antes de F1 con 3 campos; con 7 por semana y un acordeón que puede
 *  tener decenas abiertas, quitarlo dejaba al admin sin saber qué tiene
 *  pendiente. */
function inputStyle(cambiado: boolean): React.CSSProperties {
  return {
    background: '#0D1017',
    border: `1px solid ${cambiado ? 'var(--color-acento)' : '#2A2F3E'}`,
    color: '#F1F5F9',
    borderRadius: '0.5rem',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    width: '100%',
    outline: 'none',
  }
}

/** Extrae el video ID de una URL youtube.com/watch?v=ID */
function getYoutubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

const VIDEOS = [
  { field: 'video_url'   as const, label: 'Video 1 (principal)' },
  { field: 'video_url_2' as const, label: 'Video 2'             },
  { field: 'video_url_3' as const, label: 'Video 3'             },
]

export default function SemanaEditor({ numero, semanaId, estado: v, materiales, onCampo, onTiempo, onGuardar }: Props) {
  const cambiados = camposCambiados(v, v.inicial)
  const cambio = (c: CampoValor) => cambiados.includes(c)
  const dirty = cambiados.length > 0

  return (
    <div className="rounded-xl p-4 space-y-4" style={INNER}>

      {/* Encabezado: numero + titulo editable */}
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)' }}
        >
          {numero}
        </span>
        <input
          type="text"
          value={v.titulo}
          maxLength={TITULO_MAX}
          onChange={e => onCampo('titulo', e.target.value)}
          placeholder="Título de la semana"
          className="flex-1 min-w-0"
          style={{ ...inputStyle(cambio('titulo')), fontSize: '0.875rem', fontWeight: 600 }}
        />
      </div>

      {/* Descripcion + tiempo estimado */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 8rem' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Descripción corta</label>
          <input
            type="text"
            value={v.descripcion}
            maxLength={DESCRIPCION_MAX}
            onChange={e => onCampo('descripcion', e.target.value)}
            placeholder="Una línea sobre de qué va la semana"
            style={inputStyle(cambio('descripcion'))}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Minutos estimados</label>
          <input
            type="number"
            min={TIEMPO_MIN}
            max={TIEMPO_MAX}
            value={v.tiempo_estimado_minutos}
            onChange={e => onTiempo(Number(e.target.value))}
            style={inputStyle(cambio('tiempo_estimado_minutos'))}
          />
        </div>
      </div>

      {/* Apuntes */}
      <ApuntesEditor valor={v.contenido} onChange={valor => onCampo('contenido', valor)} />

      {/* Materiales (PDF) de la semana */}
      <MaterialesPanel semanaId={semanaId} iniciales={materiales} />

      {/* Miniaturas de los tres videos */}
      <div className="flex gap-2">
        {VIDEOS.map(({ field }, i) => {
          const url = v[field]
          const vid = getYoutubeId(url)
          return (
            <div key={field} className="flex-1">
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
                  style={{ background: '#1A1F2E', border: '1px solid #2A2F3E', color: '#94A3B8' }}
                >
                  Sin video
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* URLs de los tres videos */}
      <div className="space-y-2">
        {VIDEOS.map(({ field, label }) => (
          <div key={field}>
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>
              <Video className="inline w-3 h-3 mr-1" style={{ verticalAlign: 'middle' }} />
              {label}
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={v[field]}
              maxLength={URL_MAX}
              onChange={e => onCampo(field, e.target.value)}
              style={{ ...inputStyle(cambio(field)), fontFamily: 'monospace' }}
            />
          </div>
        ))}
      </div>

      {/* Feedback + guardar */}
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
          onClick={onGuardar}
          disabled={v.saving || (!dirty && !v.saved)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
          style={v.saved
            ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
            : { background: dirty ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.04)', color: dirty ? 'var(--color-acento)' : '#64748B', border: `1px solid ${dirty ? 'rgba(21,101,192,0.4)' : '#2A2F3E'}` }
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
  )
}

/** Reexport para que page.tsx use LA MISMA definición de "sin guardar". */
export { camposCambiados } from '@/lib/contenido-semana'
