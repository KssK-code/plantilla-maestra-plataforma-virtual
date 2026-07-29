'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Letra, PreguntaExamen } from '@/types/cursos-examen'

const LETRAS: Letra[] = ['a', 'b', 'c', 'd']

interface PreguntaExamenModalProps {
  open: boolean
  cursoId: string
  /** null → crear; con valor → editar */
  pregunta: PreguntaExamen | null
  onClose: () => void
  /** Se llama tras guardar con éxito para refrescar el listado. */
  onSaved: (mensaje: string) => void
  onError: (mensaje: string) => void
}

export function PreguntaExamenModal({ open, cursoId, pregunta, onClose, onSaved, onError }: PreguntaExamenModalProps) {
  const [tema, setTema] = useState('')
  const [enunciado, setEnunciado] = useState('')
  const [opciones, setOpciones] = useState<Record<Letra, string>>({ a: '', b: '', c: '', d: '' })
  const [correcta, setCorrecta] = useState<Letra | null>(null)
  const [explicacion, setExplicacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (open) {
      setTema(pregunta?.tema ?? '')
      setEnunciado(pregunta?.enunciado ?? '')
      setOpciones({
        a: pregunta?.opcion_a ?? '',
        b: pregunta?.opcion_b ?? '',
        c: pregunta?.opcion_c ?? '',
        d: pregunta?.opcion_d ?? '',
      })
      setCorrecta(pregunta?.respuesta_correcta ?? null)
      setExplicacion(pregunta?.explicacion ?? '')
      setGuardando(false)
    }
  }, [open, pregunta])

  if (!open) return null

  function setOpcion(letra: Letra, valor: string) {
    setOpciones(prev => ({ ...prev, [letra]: valor }))
  }

  async function handleGuardar() {
    const e = enunciado.trim()
    if (!e) {
      onError('El enunciado es obligatorio')
      return
    }
    const vacia = LETRAS.find(L => !opciones[L].trim())
    if (vacia) {
      onError(`La opción ${vacia}) es obligatoria`)
      return
    }
    if (!correcta) {
      onError('Marca cuál de las cuatro opciones es la respuesta correcta')
      return
    }

    setGuardando(true)
    try {
      // El PATCH manda los mismos campos que el POST: la API acepta parciales,
      // pero enviar todo deja tema/explicación vacíos como NULL sin caso aparte.
      const res = await fetch(
        pregunta
          ? `/api/admin/cursos/${cursoId}/examen/preguntas/${pregunta.id}`
          : `/api/admin/cursos/${cursoId}/examen/preguntas`,
        {
          method: pregunta ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tema: tema.trim() || null,
            enunciado: e,
            opcion_a: opciones.a.trim(),
            opcion_b: opciones.b.trim(),
            opcion_c: opciones.c.trim(),
            opcion_d: opciones.d.trim(),
            respuesta_correcta: correcta,
            explicacion: explicacion.trim() || null,
          }),
        }
      )
      const json = await res.json().catch(() => ({} as { error?: string }))
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar la pregunta')

      onSaved(pregunta ? 'Pregunta actualizada' : 'Pregunta agregada')
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const inputStyle = { border: '1px solid var(--color-borde)', color: 'var(--color-primario)', background: 'var(--color-superficie)' }
  const completo = Boolean(enunciado.trim()) && LETRAS.every(L => opciones[L].trim()) && correcta !== null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={pregunta ? 'Editar pregunta' : 'Nueva pregunta'}
    >
      <div className="absolute inset-0 bg-black/50" onClick={guardando ? undefined : onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-primario)' }}>
            {pregunta ? 'Editar pregunta' : 'Nueva pregunta'}
          </h3>
          <button onClick={onClose} disabled={guardando} className="p-1 rounded-lg" style={{ color: '#9CA3AF' }} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="pregunta-tema" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Tema <span className="font-normal text-xs" style={{ color: 'var(--color-texto-secundario)' }}>(opcional · agrupa el desglose de resultados)</span>
            </label>
            <input
              id="pregunta-tema"
              type="text"
              value={tema}
              onChange={e => setTema(e.target.value)}
              maxLength={120}
              placeholder="Ej. Pensamiento matemático"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="pregunta-enunciado" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Enunciado <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              id="pregunta-enunciado"
              value={enunciado}
              onChange={e => setEnunciado(e.target.value)}
              rows={3}
              placeholder="Escribe aquí la pregunta completa."
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-y"
              style={inputStyle}
            />
          </div>

          <div>
            <span className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-primario)' }}>
              Opciones <span style={{ color: '#EF4444' }}>*</span>
            </span>
            <p className="text-xs mb-2" style={{ color: 'var(--color-texto-secundario)' }}>
              Toca la letra para marcar cuál es la respuesta correcta.
            </p>

            <div className="space-y-2" role="radiogroup" aria-label="Respuesta correcta">
              {LETRAS.map(L => {
                const esCorrecta = correcta === L
                return (
                  <div key={L} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={esCorrecta}
                      aria-label={`Marcar la opción ${L.toUpperCase()} como respuesta correcta`}
                      title="Marcar como correcta"
                      onClick={() => setCorrecta(L)}
                      className="w-9 h-9 rounded-xl text-sm font-bold flex-shrink-0 transition-colors"
                      style={esCorrecta
                        ? { background: '#10B981', color: '#fff', border: '1px solid #10B981' }
                        : { background: 'var(--color-fondo)', color: 'var(--color-texto-secundario)', border: '1px solid var(--color-borde)' }}
                    >
                      {L.toUpperCase()}
                    </button>
                    <input
                      type="text"
                      value={opciones[L]}
                      onChange={e => setOpcion(L, e.target.value)}
                      maxLength={500}
                      placeholder={`Opción ${L.toUpperCase()}`}
                      aria-label={`Texto de la opción ${L.toUpperCase()}`}
                      className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                      style={esCorrecta
                        ? { ...inputStyle, border: '1px solid rgba(16,185,129,0.5)' }
                        : inputStyle}
                    />
                  </div>
                )
              })}
            </div>

            <p className="text-xs mt-2" style={{ color: correcta ? '#10B981' : '#F59E0B' }}>
              {correcta
                ? `Respuesta correcta: ${correcta.toUpperCase()}`
                : 'Falta marcar la respuesta correcta.'}
            </p>
          </div>

          <div>
            <label htmlFor="pregunta-explicacion" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Explicación <span className="font-normal text-xs" style={{ color: 'var(--color-texto-secundario)' }}>(opcional · el alumno la ve al revisar su examen)</span>
            </label>
            <textarea
              id="pregunta-explicacion"
              value={explicacion}
              onChange={e => setExplicacion(e.target.value)}
              rows={3}
              placeholder="Por qué esa opción es la correcta."
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-y"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto-secundario)', background: 'var(--color-superficie)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !completo}
            className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-acento)', color: '#fff' }}
          >
            {guardando ? 'Guardando…' : 'Guardar pregunta'}
          </button>
        </div>
      </div>
    </div>
  )
}
