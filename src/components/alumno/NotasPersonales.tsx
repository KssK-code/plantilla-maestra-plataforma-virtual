'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface NotasPersonalesProps {
  semanaId: string
  alumnoId: string
  lang: string
}

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }

export default function NotasPersonales({ semanaId, lang }: NotasPersonalesProps) {
  const [contenido, setContenido] = useState('')
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'guardado'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loc = (es: string, en: string) => lang === 'en' ? en : es

  // Cargar nota al montar o cambiar de semana
  useEffect(() => {
    setContenido('')
    setEstado('idle')
    fetch(`/api/alumno/notas/${semanaId}`)
      .then(r => r.json())
      .then(data => {
        if (data.contenido) setContenido(data.contenido)
      })
      .catch(() => {})
  }, [semanaId])

  // Guardar nota
  const guardar = useCallback(async (texto: string) => {
    setEstado('guardando')
    try {
      await fetch(`/api/alumno/notas/${semanaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: texto }),
      })
      setEstado('guardado')
      setTimeout(() => setEstado('idle'), 2500)
    } catch {
      setEstado('idle')
    }
  }, [semanaId])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContenido(val)
    setEstado('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => guardar(val), 1500)
  }

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const palabras = contenido.trim() ? contenido.trim().split(/\s+/).length : 0

  return (
    <div className="rounded-xl p-5 space-y-3 mt-2" style={CARD}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ color: '#6366F1', fontSize: '1rem' }}>📝</span>
        <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>
          {loc('Mis apuntes', 'My notes')}
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={contenido}
        onChange={handleChange}
        placeholder={loc('Escribe tus apuntes aquí...', 'Write your notes here...')}
        rows={5}
        className="w-full text-sm leading-relaxed resize-none rounded-lg px-4 py-3 outline-none transition-colors"
        style={{
          background: '#0B0D11',
          border: '1px solid #2A2F3E',
          color: '#CBD5E1',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#6366F1' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#2A2F3E' }}
      />

      {/* Footer: estado + contador de palabras */}
      <div className="flex items-center justify-between text-xs">
        <span>
          {estado === 'guardando' && (
            <span style={{ color: '#94A3B8' }}>{loc('Guardando...', 'Saving...')}</span>
          )}
          {estado === 'guardado' && (
            <span style={{ color: '#10B981' }}>✓ {loc('Guardado', 'Saved')}</span>
          )}
        </span>
        <span style={{ color: '#475569' }}>
          {palabras} {loc('palabras', 'words')}
        </span>
      </div>
    </div>
  )
}
