'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { PreguntaExamenModal } from './PreguntaExamenModal'
import type { DesgloseTema, PreguntaExamen } from '@/types/cursos-examen'

/**
 * Fila de GET …/examen/resultados. No vive en types/cursos-examen.ts porque es
 * la vista de admin: el resultado del alumno más su nombre y correo resueltos
 * en el servidor.
 */
interface ResultadoAdminRow {
  id: string
  alumno_id: string
  alumno_nombre: string | null
  alumno_email: string | null
  aciertos: number
  total: number
  porcentaje: number
  desglose_temas: DesgloseTema[]
  created_at: string
}

type Vista = 'preguntas' | 'resultados'

interface ExamenTabProps {
  cursoId: string
  /** Toast de éxito. No refresca el detalle del curso: el examen se recarga solo. */
  onExito: (mensaje: string) => void
  onError: (mensaje: string) => void
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--color-superficie)',
  border: '1px solid #E8F0F7',
  boxShadow: '0 2px 8px rgba(27,58,87,0.06)',
}

export function ExamenTab({ cursoId, onExito, onError }: ExamenTabProps) {
  const [vista, setVista] = useState<Vista>('preguntas')
  const [preguntas, setPreguntas] = useState<PreguntaExamen[] | null>(null)
  const [resultados, setResultados] = useState<ResultadoAdminRow[] | null>(null)
  const [modal, setModal] = useState<{ pregunta: PreguntaExamen | null } | null>(null)
  const [aEliminar, setAEliminar] = useState<PreguntaExamen | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargarPreguntas = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/examen/preguntas`)
      if (!res.ok) throw new Error()
      const json = await res.json() as { preguntas?: PreguntaExamen[] }
      setPreguntas(json.preguntas ?? [])
    } catch {
      setPreguntas([])
      onError('No se pudieron cargar las preguntas del examen')
    }
  }, [cursoId, onError])

  const cargarResultados = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/examen/resultados`)
      if (!res.ok) throw new Error()
      const json = await res.json() as { resultados?: ResultadoAdminRow[] }
      setResultados(json.resultados ?? [])
    } catch {
      setResultados([])
      onError('No se pudieron cargar los resultados del examen')
    }
  }, [cursoId, onError])

  useEffect(() => {
    cargarPreguntas()
    cargarResultados()
  }, [cargarPreguntas, cargarResultados])

  async function eliminarPregunta() {
    if (!aEliminar) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/examen/preguntas/${aEliminar.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? 'Error al eliminar la pregunta')
      }
      setAEliminar(null)
      await cargarPreguntas()
      onExito('Pregunta eliminada')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al eliminar la pregunta')
    } finally {
      setEliminando(false)
    }
  }

  const btnIcon = 'p-1.5 rounded-lg disabled:opacity-30 transition-colors'
  const th = 'text-left px-3 py-2.5 text-xs font-semibold whitespace-nowrap'

  const SUBTABS: { id: Vista; label: string; icon: React.ElementType; total: number | null }[] = [
    { id: 'preguntas', label: 'Preguntas', icon: ListChecks, total: preguntas?.length ?? null },
    { id: 'resultados', label: 'Resultados', icon: BarChart3, total: resultados?.length ?? null },
  ]

  return (
    <div className="space-y-4">
      {/* Sub-pestañas: mismo lenguaje que las pestañas del curso, un paso más chicas */}
      <div className="overflow-x-auto">
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{ background: 'rgba(27,48,104,0.06)', width: 'fit-content' }}
          role="tablist"
          aria-label="Secciones del examen final"
        >
          {SUBTABS.map(s => {
            const Icon = s.icon
            const active = vista === s.id
            return (
              <button
                key={s.id}
                onClick={() => setVista(s.id)}
                role="tab"
                aria-selected={active}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                style={active
                  ? { background: 'var(--color-superficie)', color: 'var(--color-primario)', boxShadow: '0 1px 4px rgba(27,58,87,0.12)' }
                  : { background: 'transparent', color: '#64748B' }}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                {s.total !== null && (
                  <span
                    className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(27,48,104,0.1)', color: 'var(--color-primario)' }}
                  >
                    {s.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Preguntas ─────────────────────────────────────────────────────── */}
      {vista === 'preguntas' && (
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-primario)' }}>
                Preguntas del examen final
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-texto-secundario)' }}>
                Se le presentan al alumno en este orden. La respuesta correcta nunca viaja a su navegador.
              </p>
            </div>
            <button
              onClick={() => setModal({ pregunta: null })}
              disabled={preguntas === null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-acento)', color: 'var(--color-texto-sobre-acento)' }}
            >
              <Plus className="w-4 h-4" />
              Agregar pregunta
            </button>
          </div>

          {preguntas === null ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-texto-secundario)' }}>
              Cargando preguntas…
            </p>
          ) : preguntas.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-fondo)', border: '1px dashed #D1D5DB' }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
                Este curso todavía no tiene examen final.
              </p>
              <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-texto-secundario)' }}>
                El grueso de las preguntas entra por los <strong>seeds del banco</strong>, no a mano. Este editor
                es para ajustes puntuales: corregir una pregunta, agregar la que falte o quitar una repetida.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E8F0F7' }}>
                    <th className={th} style={{ color: '#64748B', width: 48 }}>#</th>
                    <th className={th} style={{ color: '#64748B' }}>Tema</th>
                    <th className={th} style={{ color: '#64748B' }}>Enunciado</th>
                    <th className={th} style={{ color: '#64748B' }}>Correcta</th>
                    <th className={th} style={{ color: '#64748B', width: 90 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {preguntas.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(232,240,247,0.7)' }}>
                      <td className="px-3 py-2.5 font-bold" style={{ color: '#9CA3AF' }}>{p.orden}</td>
                      <td className="px-3 py-2.5">
                        {p.tema ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                            style={{ background: 'rgba(27,48,104,0.1)', color: 'var(--color-primario)' }}
                          >
                            {p.tema}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>Sin tema</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-primario)', maxWidth: 360 }}>
                        <span className="line-clamp-2" title={p.enunciado}>{p.enunciado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
                        >
                          {p.respuesta_correcta.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ pregunta: p })}
                            className={btnIcon}
                            style={{ color: 'var(--color-acento)' }}
                            aria-label={`Editar la pregunta ${p.orden}`}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAEliminar(p)}
                            className={btnIcon}
                            style={{ color: '#EF4444' }}
                            aria-label={`Eliminar la pregunta ${p.orden}`}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Resultados ────────────────────────────────────────────────────── */}
      {vista === 'resultados' && (
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--color-primario)' }}>
            Resultados de los alumnos
          </h2>

          {resultados === null ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-texto-secundario)' }}>
              Cargando resultados…
            </p>
          ) : resultados.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-fondo)', border: '1px dashed #D1D5DB' }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
                Nadie ha presentado el examen todavía.
              </p>
              <p className="text-sm" style={{ color: 'var(--color-texto-secundario)' }}>
                Aquí van a aparecer los envíos de tus alumnos en cuanto contesten.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 560 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E8F0F7' }}>
                    <th className={th} style={{ color: '#64748B' }}>Alumno</th>
                    <th className={th} style={{ color: '#64748B' }}>Fecha</th>
                    <th className={th} style={{ color: '#64748B' }}>Aciertos</th>
                    <th className={th} style={{ color: '#64748B' }}>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(232,240,247,0.7)' }}>
                      <td className="px-3 py-2.5" style={{ maxWidth: 260 }}>
                        <p className="font-medium truncate" style={{ color: 'var(--color-primario)' }}>
                          {r.alumno_nombre ?? r.alumno_email ?? 'Alumno sin nombre'}
                        </p>
                        {r.alumno_nombre && r.alumno_email && (
                          <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{r.alumno_email}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-texto-secundario)' }}>
                        {new Date(r.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium" style={{ color: 'var(--color-primario)' }}>
                        {r.aciertos} / {r.total}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                          style={{ background: 'rgba(27,48,104,0.1)', color: 'var(--color-primario)' }}
                        >
                          {r.porcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar pregunta */}
      {modal && (
        <PreguntaExamenModal
          open
          cursoId={cursoId}
          pregunta={modal.pregunta}
          onClose={() => setModal(null)}
          onSaved={msg => { onExito(msg); void cargarPreguntas() }}
          onError={onError}
        />
      )}

      {/* Confirmar eliminar pregunta */}
      <ConfirmDialog
        open={aEliminar !== null}
        danger
        title="Eliminar pregunta"
        message={
          <>
            Vas a eliminar la pregunta <strong>{aEliminar?.orden}</strong> del examen final. Esta acción
            no se puede deshacer y los resultados ya registrados no se recalculan.
          </>
        }
        confirmLabel="Eliminar pregunta"
        busy={eliminando}
        onConfirm={eliminarPregunta}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  )
}
