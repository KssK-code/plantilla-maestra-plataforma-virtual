'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import SemanaEditor, { type SemanaState, type CampoTexto } from './SemanaEditor'
import { TIEMPO_MIN, TIEMPO_MAX, camposCambiados, type ValoresSemana } from '@/lib/contenido-semana'

interface Semana {
  id: string
  numero_semana: number
  titulo: string
  descripcion: string | null
  contenido: string | null
  tiempo_estimado_minutos: number
  video_url:   string | null
  video_url_2: string | null
  video_url_3: string | null
}

interface Mes {
  id: string
  numero_mes: number
  titulo: string
  semanas: Semana[]
}

interface Materia {
  id: string
  codigo: string
  nombre: string
  color: string | null
  nivel: string
  descripcion: string | null
}

const CARD  = { background: '#181C26', border: '1px solid #2A2F3E' }


export default function ContenidoDetallePage() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params.id as string

  const [materia, setMateria] = useState<Materia | null>(null)
  const [meses,   setMeses]   = useState<Mes[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Estado de edición: semanaId → SemanaState
  const [semanas, setSemanas] = useState<Record<string, SemanaState>>({})
  // Meses expandidos
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Guarda contra respuestas OBSOLETAS. El efecto se re-dispara al cambiar de
    // materia (y en desarrollo dos veces, por el StrictMode). Si una respuesta
    // vieja aterriza despues de que el admin ya empezo a escribir, `setSemanas`
    // le pisa lo tecleado con los valores del servidor y sin ningun aviso.
    // Antes de F1 el dano era perder tres URLs a medio pegar; ahora son los
    // apuntes de la clase. Pasó de verdad durante la verificacion de F1.
    let vivo = true
    async function cargar() {
      try {
        const res = await fetch(`/api/admin/contenido/${id}`)
        const data = await res.json()
        if (!vivo) return
        if (!res.ok || data.error) { setError(data.error ?? 'Materia no encontrada'); return }

        const mat = data.materia
        setMateria({
          id:          mat.id,
          codigo:      '',
          nombre:      mat.nombre,
          color:       mat.color ?? null,
          nivel:       mat.nivel,
          descripcion: mat.descripcion ?? null,
        })

        type MesRow = {
          id: string; numero_mes: number; titulo: string
          semanas: Semana[]
        }
        const mesesOrdenados = ((mat.meses_contenido ?? []) as MesRow[])
          .sort((a, b) => a.numero_mes - b.numero_mes)
          .map(mes => ({
            ...mes,
            semanas: (mes.semanas ?? []).sort((a, b) => a.numero_semana - b.numero_semana),
          }))
        setMeses(mesesOrdenados)

        // Expandir primer mes por defecto
        if (mesesOrdenados.length > 0) {
          setAbiertos(new Set([mesesOrdenados[0].id]))
        }

        // Inicializar estado de edición
        const init: Record<string, SemanaState> = {}
        for (const mes of mesesOrdenados) {
          for (const sem of mes.semanas) {
            const valores: ValoresSemana = {
              titulo:      sem.titulo ?? '',
              descripcion: sem.descripcion ?? '',
              contenido:   sem.contenido ?? '',
              tiempo_estimado_minutos: sem.tiempo_estimado_minutos ?? 60,
              video_url:   sem.video_url   ?? '',
              video_url_2: sem.video_url_2 ?? '',
              video_url_3: sem.video_url_3 ?? '',
            }
            init[sem.id] = { ...valores, inicial: valores, saving: false, saved: false, error: null }
          }
        }
        setSemanas(init)
      } catch {
        if (vivo) setError('Error inesperado al cargar la materia')
      } finally {
        if (vivo) setLoading(false)
      }
    }
    cargar()
    return () => { vivo = false }
  }, [id])

  function toggleMes(mesId: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(mesId)) next.delete(mesId); else next.add(mesId)
      return next
    })
  }

  function handleCampo(semanaId: string, campo: CampoTexto, valor: string) {
    setSemanas(prev => ({
      ...prev,
      [semanaId]: { ...prev[semanaId], [campo]: valor, saved: false, error: null },
    }))
  }

  function handleTiempo(semanaId: string, minutos: number) {
    setSemanas(prev => ({
      ...prev,
      [semanaId]: { ...prev[semanaId], tiempo_estimado_minutos: minutos, saved: false, error: null },
    }))
  }

  const guardar = useCallback(async (semanaId: string) => {
    const v = semanas[semanaId]
    if (!v || v.saving) return

    const cambiados = camposCambiados(v, v.inicial)
    if (cambiados.length === 0) return

    // El titulo es NOT NULL: si se vacio, el servidor rechaza el PATCH ENTERO y
    // los apuntes tampoco se guardan. Se ataja aqui para que el admin vea por
    // que, en vez de perder el guardado por un campo que ni estaba mirando.
    if (cambiados.includes('titulo') && v.titulo.trim() === '') {
      setSemanas(prev => ({
        ...prev,
        [semanaId]: { ...prev[semanaId], error: 'El título de la semana no puede quedar vacío' },
      }))
      return
    }

    // El <input type="number"> devuelve '' cuando el admin borra el campo para
    // reescribirlo, y Number('') es 0 — que el servidor rechaza con 400. Se
    // acota aquí, al guardar, y no en el onChange: recortar mientras escribe le
    // pelearía el cursor al usuario en cada tecla.
    const minutos = Math.min(
      TIEMPO_MAX,
      Math.max(TIEMPO_MIN, Math.round(Number(v.tiempo_estimado_minutos) || 60)),
    )

    // SOLO lo que cambió. Mandar la fila entera hace que un admin que corrige
    // una URL pise los apuntes que otro escribió mientras esta pestaña estaba
    // abierta — y sin dejar rastro.
    const body: Record<string, string | number | null> = {}
    for (const campo of cambiados) {
      body[campo] = campo === 'tiempo_estimado_minutos' ? minutos : (v[campo] as string) || null
    }

    setSemanas(prev => ({ ...prev, [semanaId]: { ...prev[semanaId], saving: true, error: null } }))

    try {
      const res = await fetch(`/api/admin/semanas/${semanaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      setSemanas(prev => {
        const actual = prev[semanaId]
        // `inicial` pasa a ser lo que quedó guardado, no lo que se cargó: si el
        // admin siguió escribiendo mientras el PATCH iba en vuelo, esos cambios
        // deben seguir marcados como pendientes.
        const guardado: ValoresSemana = {
          titulo:      actual.titulo,
          descripcion: actual.descripcion,
          contenido:   actual.contenido,
          tiempo_estimado_minutos: actual.tiempo_estimado_minutos,
          video_url:   actual.video_url,
          video_url_2: actual.video_url_2,
          video_url_3: actual.video_url_3,
          ...Object.fromEntries(cambiados.map(c =>
            [c, c === 'tiempo_estimado_minutos' ? minutos : v[c]],
          )),
        } as ValoresSemana
        return {
          ...prev,
          [semanaId]: {
            ...actual,
            tiempo_estimado_minutos: cambiados.includes('tiempo_estimado_minutos')
              ? minutos
              : actual.tiempo_estimado_minutos,
            inicial: guardado,
            saving: false,
            saved: true,
          },
        }
      })
      setTimeout(() => {
        setSemanas(prev => (prev[semanaId] ? { ...prev, [semanaId]: { ...prev[semanaId], saved: false } } : prev))
      }, 3000)
    } catch (err) {
      setSemanas(prev => ({
        ...prev,
        [semanaId]: { ...prev[semanaId], saving: false, error: (err as Error).message },
      }))
    }
  }, [semanas])

  // Antes de F1 salirse sin guardar costaba tres URLs pegadas; ahora puede
  // costar 50 000 caracteres tecleados a mano.
  const haySinGuardar = Object.values(semanas).some(s => camposCambiados(s, s.inicial).length > 0)

  useEffect(() => {
    if (!haySinGuardar) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [haySinGuardar])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
    </div>
  )

  if (error || !materia) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error ?? 'Materia no encontrada'}</p>
      <button onClick={() => router.back()} className="text-sm" style={{ color: 'var(--color-acento)' }}>Regresar</button>
    </div>
  )

  const totalSemanas = meses.reduce((acc, m) => acc + m.semanas.length, 0)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => {
            if (haySinGuardar && !window.confirm('Tienes cambios sin guardar en esta materia. ¿Salir de todas formas?')) return
            router.push('/admin/contenido')
          }}
          className="mt-1 p-2 rounded-lg transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid #2A2F3E' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: materia.color || 'var(--color-acento)' }} />
            <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              {materia.nivel}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{materia.nombre}</h1>
          <p className="text-xs mt-0.5 text-gray-600">{totalSemanas} semanas · Edita los apuntes, los videos y los datos de cada semana</p>
        </div>
      </div>

      {/* Info materia */}
      {materia.descripcion && (
        <div className="rounded-xl px-5 py-4" style={CARD}>
          <p className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>Descripción</p>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{materia.descripcion}</p>
        </div>
      )}

      {/* Lista de meses → semanas con edición */}
      {meses.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={CARD}>
          <p className="text-sm" style={{ color: '#94A3B8' }}>No hay semanas cargadas para esta materia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meses.map(mes => {
            const abierto = abiertos.has(mes.id)
            return (
              <div key={mes.id} className="rounded-xl overflow-hidden" style={CARD}>
                {/* Header mes */}
                <button
                  onClick={() => toggleMes(mes.id)}
                  className="w-full flex items-center justify-between px-5 py-4 transition-all text-left"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold flex-shrink-0"
                      style={{ background: abierto ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.06)', color: abierto ? 'var(--color-acento)' : '#94A3B8' }}
                    >
                      {mes.numero_mes}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-left" style={{ color: '#F1F5F9' }}>
                        {mes.titulo || `Mes ${mes.numero_mes}`}
                      </p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{mes.semanas.length} semanas</p>
                    </div>
                  </div>
                  {abierto
                    ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
                    : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />}
                </button>

                {/* Semanas */}
                {abierto && (
                  <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid #2A2F3E' }}>
                    <div className="pt-4 space-y-3">
                      {mes.semanas.map(sem => {
                        const v = semanas[sem.id]
                        if (!v) return null
                        return (
                          <SemanaEditor
                            key={sem.id}
                            numero={sem.numero_semana}
                            estado={v}
                            onCampo={(campo, valor) => handleCampo(sem.id, campo, valor)}
                            onTiempo={minutos => handleTiempo(sem.id, minutos)}
                            onGuardar={() => guardar(sem.id)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
