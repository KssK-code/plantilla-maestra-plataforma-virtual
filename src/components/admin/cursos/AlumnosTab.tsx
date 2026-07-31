'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, UserMinus, UserPlus, Users } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import type { AlumnoAdminRow, CursoInscrito } from '@/types/cursos'

interface AlumnosTabProps {
  cursoId: string
  inscritos: CursoInscrito[]
  onChanged: (mensaje?: string) => void | Promise<void>
  onError: (mensaje: string) => void
}

export function AlumnosTab({ cursoId, inscritos, onChanged, onError }: AlumnosTabProps) {
  const [alumnos, setAlumnos] = useState<AlumnoAdminRow[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [ocupadoId, setOcupadoId] = useState<string | null>(null)
  const [confirmTodos, setConfirmTodos] = useState<0 | 1 | 2>(0) // doble confirmación
  const [asignandoTodos, setAsignandoTodos] = useState(false)

  // El buscador usa el endpoint admin existente (usuarios con rol alumno)
  useEffect(() => {
    let cancelled = false
    async function cargar() {
      try {
        const res = await fetch('/api/admin/alumnos')
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setAlumnos(Array.isArray(json) ? json : [])
      } catch {
        if (!cancelled) {
          setAlumnos([])
          onError('No se pudo cargar la lista de alumnos')
        }
      }
    }
    cargar()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inscritosIds = useMemo(() => new Set(inscritos.map(i => i.alumno_id)), [inscritos])

  /**
   * Abre o cierra un mes de la inscripcion.
   *
   * `meses_esperados` viaja con el valor que esta pantalla tiene a la vista: es
   * el candado contra el doble clic. Si otro admin (u otra pestaña) ya lo movio,
   * el servidor responde 409 y se pide recargar, en vez de incrementar dos veces.
   * El boton tambien se deshabilita, pero eso es cortesia: el candado esta en el
   * servidor.
   */
  const moverMes = async (
    inscripcionId: string,
    accion: 'abrir-mes' | 'cerrar-mes',
    mesesActuales: number,
    nombre: string
  ) => {
    if (accion === 'cerrar-mes') {
      const ok = window.confirm(
        `Cerrar un mes de ${nombre}.

Esto REVOCA acceso que el alumno ya tenia: ` +
        `los modulos de ese mes dejaran de verse.

¿Continuar?`
      )
      if (!ok) return
    }
    setOcupadoId(inscripcionId)
    try {
      const res = await fetch(`/api/admin/inscripciones/${inscripcionId}/${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses_esperados: mesesActuales }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar')
      onChanged()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo actualizar')
    } finally {
      setOcupadoId(null)
    }
  }

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return []
    return (alumnos ?? [])
      .filter(a =>
        !inscritosIds.has(a.id) &&
        (a.nombre_completo.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [busqueda, alumnos, inscritosIds])

  const totalActivos = useMemo(
    () => (alumnos ?? []).filter(a => a.activo).length,
    [alumnos]
  )

  async function asignar(alumnoId: string, nombre: string) {
    setOcupadoId(alumnoId)
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId }),
      })
      const json = await res.json().catch(() => ({} as { error?: string }))
      if (res.status === 409) {
        onError(json.error ?? 'Este alumno ya está asignado al curso')
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Error al asignar')
      onChanged(`${nombre} asignado al curso`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al asignar')
    } finally {
      setOcupadoId(null)
    }
  }

  async function quitar(alumnoId: string, nombre: string) {
    setOcupadoId(alumnoId)
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/inscripciones/${alumnoId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? 'Error al quitar')
      }
      onChanged(`${nombre} quitado del curso`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al quitar')
    } finally {
      setOcupadoId(null)
    }
  }

  async function asignarTodosActivos() {
    setAsignandoTodos(true)
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos_activos: true }),
      })
      const json = await res.json().catch(() => ({} as { agregados?: number; totalActivos?: number; error?: string }))
      if (!res.ok) throw new Error(json.error ?? 'Error en la asignación masiva')
      onChanged(`${json.agregados} alumno(s) nuevos asignados (de ${json.totalActivos} activos)`)
      setConfirmTodos(0)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error en la asignación masiva')
    } finally {
      setAsignandoTodos(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Buscador + asignación masiva */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7', boxShadow: '0 2px 8px rgba(27,58,87,0.06)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-primario)' }}>Asignar alumnos</h2>
          <button
            onClick={() => setConfirmTodos(1)}
            disabled={asignandoTodos || alumnos === null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            style={{ border: '1px solid rgba(27,48,104,0.3)', color: 'var(--color-primario)', background: '#fff' }}
          >
            <Users className="w-3.5 h-3.5" />
            Asignar a todos los alumnos activos ({totalActivos})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={alumnos === null ? 'Cargando alumnos…' : 'Buscar por nombre o email…'}
            disabled={alumnos === null}
            className="w-full rounded-xl pl-9 pr-3.5 py-2.5 text-sm outline-none"
            style={{ border: '1px solid var(--color-borde)', color: 'var(--color-primario)', background: 'var(--color-superficie)' }}
            aria-label="Buscar alumnos por nombre o email"
          />
        </div>

        {busqueda.trim() && (
          <div className="space-y-1.5">
            {resultados.length === 0 && (
              <p className="text-xs px-1" style={{ color: '#9CA3AF' }}>
                Sin resultados (los ya asignados no aparecen aquí).
              </p>
            )}
            {resultados.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'var(--color-fondo)', border: '1px solid #EEF2F6' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-primario)' }}>{a.nombre_completo}</p>
                  <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{a.email}</p>
                </div>
                {!a.activo && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: 'rgba(156,163,175,0.15)', color: '#6B7280' }}>
                    Inactivo
                  </span>
                )}
                <button
                  onClick={() => asignar(a.id, a.nombre_completo)}
                  disabled={ocupadoId === a.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 disabled:opacity-50"
                  style={{ background: 'var(--color-acento)', color: '#fff' }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Asignar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de asignados */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7', boxShadow: '0 2px 8px rgba(27,58,87,0.06)' }}
      >
        <h2 className="text-base font-bold mb-3" style={{ color: 'var(--color-primario)' }}>
          Alumnos asignados ({inscritos.length})
        </h2>
        {inscritos.length === 0 ? (
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Nadie asignado todavía. Usa el buscador de arriba. ☝️
          </p>
        ) : (
          <div className="space-y-1.5">
            {inscritos.map(i => (
              <div
                key={i.alumno_id}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'var(--color-fondo)', border: '1px solid #EEF2F6' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-primario)' }}>{i.nombre}</p>
                  <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                    {i.email}{i.matricula ? ` · ${i.matricula}` : ''}
                  </p>
                </div>
                {!i.activo && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: 'rgba(156,163,175,0.15)', color: '#6B7280' }}>
                    Inactivo
                  </span>
                )}

                {i.estado !== 'activa' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309' }}>
                    {i.estado}
                  </span>
                )}

                {/* Ventana de pago: lo que el alumno ve hoy */}
                <span className="text-xs font-semibold flex-shrink-0 tabular-nums"
                  style={{ color: 'var(--color-primario)' }}
                  title="Meses abiertos de esta inscripción">
                  {i.meses_desbloqueados} {i.meses_desbloqueados === 1 ? 'mes' : 'meses'}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => moverMes(i.inscripcion_id, 'cerrar-mes', i.meses_desbloqueados, i.nombre)}
                    disabled={ocupadoId === i.inscripcion_id || i.meses_desbloqueados <= 0}
                    title="Cerrar un mes (revoca acceso)"
                    className="px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{ border: '1px solid rgba(27,48,104,0.2)', color: 'var(--color-primario)', background: 'var(--color-superficie)' }}
                  >
                    −
                  </button>
                  <button
                    onClick={() => moverMes(i.inscripcion_id, 'abrir-mes', i.meses_desbloqueados, i.nombre)}
                    disabled={ocupadoId === i.inscripcion_id || i.estado !== 'activa'}
                    title={i.estado !== 'activa' ? `Inscripción ${i.estado}: reactívala para abrir meses` : 'Abrir el siguiente mes'}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{ background: 'var(--color-acento)', color: '#fff' }}
                  >
                    + Abrir mes
                  </button>
                </div>

                <button
                  onClick={() => quitar(i.alumno_id, i.nombre)}
                  disabled={ocupadoId === i.alumno_id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 disabled:opacity-50"
                  style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#EF4444', background: 'var(--color-superficie)' }}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doble confirmación para asignación masiva */}
      <ConfirmDialog
        open={confirmTodos === 1}
        title="Asignar a todos los alumnos activos"
        message={
          <>
            Se asignará este curso a los <strong>{totalActivos}</strong> alumnos activos
            (los que ya están asignados no se duplican). ¿Continuar?
          </>
        }
        confirmLabel="Sí, continuar"
        onConfirm={() => setConfirmTodos(2)}
        onCancel={() => setConfirmTodos(0)}
      />
      <ConfirmDialog
        open={confirmTodos === 2}
        danger
        title="¿Seguro? Segunda confirmación"
        message={
          <>
            Esta es una asignación masiva a <strong>{totalActivos}</strong> alumnos activos.
            Confirma una vez más para ejecutarla.
          </>
        }
        confirmLabel="Asignar a todos"
        busy={asignandoTodos}
        onConfirm={asignarTodosActivos}
        onCancel={() => setConfirmTodos(0)}
      />
    </div>
  )
}
