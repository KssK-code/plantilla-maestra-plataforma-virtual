'use client'

import { useState, useRef } from 'react'
import { FileText, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react'
import { validarMaterial } from '@/lib/archivos-comunes'
import { subirArchivo } from '@/lib/upload-comun'
import { BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA } from '@/lib/materiales-semana'

/**
 * PDFs de una semana.
 *
 * El estado vive AQUÍ y no en page.tsx a propósito: los materiales se guardan
 * al instante (subir es guardar), así que no entran en `camposCambiados` ni
 * dependen del botón Guardar de la semana. Mezclarlos haría que el botón
 * dijera "sin cambios" con un archivo recién subido, o al revés.
 */

export interface Material {
  id: string
  nombre: string
  tamano_bytes: number | null
}

interface Props {
  semanaId: string
  iniciales: Material[]
}

function pesoLegible(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function MaterialesPanel({ semanaId, iniciales }: Props) {
  const [materiales, setMateriales] = useState<Material[]>(iniciales)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const endpoint = `/api/admin/semanas/${semanaId}/materiales`
  const lleno = materiales.length >= MATERIALES_MAX_POR_SEMANA

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // El input se limpia siempre: si no, elegir el MISMO archivo dos veces
    // seguidas no dispara change y parece que el boton se quedo muerto.
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setError(null)

    // Validar antes de gastar el viaje al servidor. Es la MISMA funcion que
    // valida el servidor, asi que cliente y servidor no pueden discrepar.
    const valid = validarMaterial({ name: file.name, size: file.size, type: file.type })
    if (!valid.ok) { setError(valid.error); return }

    setSubiendo(true)
    const r = await subirArchivo(endpoint, BUCKET_MATERIAS, file, { filename: file.name })
    setSubiendo(false)

    if (!r.ok) { setError(r.error); return }
    const material = (r.json as { material?: Material }).material
    if (material) setMateriales(prev => [...prev, material])
  }

  async function quitar(m: Material) {
    if (!window.confirm(`¿Quitar "${m.nombre}"? El alumno dejará de verlo.`)) return
    setError(null)
    try {
      const res = await fetch(`${endpoint}/${m.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo quitar')
      setMateriales(prev => prev.filter(x => x.id !== m.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs" style={{ color: '#64748B' }}>
          Material de la clase (PDF)
        </label>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {materiales.length} / {MATERIALES_MAX_POR_SEMANA}
        </span>
      </div>

      {materiales.length > 0 && (
        <div className="space-y-1.5">
          {materiales.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: '#0D1017', border: '1px solid #2A2F3E' }}
            >
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-acento)' }} />
              <a
                href={`/api/material/${m.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate text-xs hover:underline"
                style={{ color: '#F1F5F9' }}
                title={m.nombre}
              >
                {m.nombre}
              </a>
              <span className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>
                {pesoLegible(m.tamano_bytes)}
              </span>
              <button
                type="button"
                onClick={() => quitar(m)}
                title="Quitar material"
                className="p-1 rounded flex-shrink-0 transition-all"
                style={{ color: '#EF4444' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={alElegir}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo || lleno}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
        style={{
          background: 'rgba(21,101,192,0.2)',
          color: 'var(--color-acento)',
          border: '1px solid rgba(21,101,192,0.4)',
        }}
      >
        {subiendo
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo…</>
          : <><Upload className="w-3 h-3" /> Subir PDF</>}
      </button>

      {lleno && !subiendo && (
        <p className="text-xs" style={{ color: '#64748B' }}>
          Llegaste al máximo de {MATERIALES_MAX_POR_SEMANA} materiales. Quita alguno para subir otro.
        </p>
      )}

      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
