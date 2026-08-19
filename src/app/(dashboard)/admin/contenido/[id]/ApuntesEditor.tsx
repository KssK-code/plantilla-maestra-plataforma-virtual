'use client'

import { useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import ContenidoMarkdown, { normalizarContenido } from '@/components/ContenidoMarkdown'
import { CONTENIDO_MAX } from '@/lib/contenido-semana'

/**
 * Apuntes de una semana. El alumno los recibe como Markdown, así que el editor
 * es Markdown — no texto plano y no un WYSIWYG que emita HTML, que obligaría a
 * cambiar el render del alumno.
 *
 * El preview usa el MISMO componente que la vista del alumno (ContenidoMarkdown),
 * de modo que lo que el admin ve en la pestaña "Vista previa" es exactamente lo
 * que se va a pintar en la materia, no una aproximación.
 */

interface Props {
  valor: string
  onChange: (valor: string) => void
}

const TAB_BASE: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '0.375rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  transition: 'all .15s',
}

export default function ApuntesEditor({ valor, onChange }: Props) {
  const [modo, setModo] = useState<'editar' | 'preview'>('editar')

  const excedido = valor.length > CONTENIDO_MAX
  const palabras = valor.trim() ? valor.trim().split(/\s+/).length : 0
  const minLectura = palabras > 0 ? Math.ceil(palabras / 200) : 0

  function tabStyle(activo: boolean): React.CSSProperties {
    return {
      ...TAB_BASE,
      background: activo ? 'rgba(21,101,192,0.2)' : 'transparent',
      color: activo ? 'var(--color-acento)' : '#64748B',
      border: `1px solid ${activo ? 'rgba(21,101,192,0.4)' : 'transparent'}`,
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs" style={{ color: '#64748B' }}>
          Apuntes de la clase (Markdown)
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setModo('editar')} style={tabStyle(modo === 'editar')}>
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button type="button" onClick={() => setModo('preview')} style={tabStyle(modo === 'preview')}>
            <Eye className="w-3 h-3" /> Vista previa
          </button>
        </div>
      </div>

      {modo === 'editar' ? (
        <textarea
          value={valor}
          onChange={e => onChange(e.target.value)}
          rows={12}
          spellCheck
          placeholder={'## Tema de la clase\n\nExplicación...\n\n- Punto uno\n- Punto dos'}
          style={{
            background: '#0D1017',
            border: `1px solid ${excedido ? '#EF4444' : '#2A2F3E'}`,
            color: '#F1F5F9',
            borderRadius: '0.5rem',
            padding: '0.625rem',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            width: '100%',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        />
      ) : (
        <div
          className="rounded-lg p-4 overflow-x-auto"
          style={{ background: '#0D1017', border: '1px solid #2A2F3E', minHeight: '12rem' }}
        >
          {valor.trim()
            ? <ContenidoMarkdown texto={normalizarContenido(valor)} />
            : <p className="text-xs" style={{ color: '#64748B' }}>Sin apuntes todavía.</p>}
        </div>
      )}

      <p className="text-xs" style={{ color: excedido ? '#EF4444' : '#64748B' }}>
        {excedido
          ? `Te pasaste por ${(valor.length - CONTENIDO_MAX).toLocaleString('es-MX')} caracteres — no se va a guardar.`
          : `${palabras.toLocaleString('es-MX')} palabras · el alumno verá "${minLectura} min lectura"`}
      </p>
    </div>
  )
}
