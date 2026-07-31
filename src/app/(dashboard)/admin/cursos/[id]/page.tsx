'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, ClipboardCheck, Globe, Users } from 'lucide-react'
import { CursoDatosForm } from '@/components/admin/cursos/CursoDatosForm'
import { ModulosEditor } from '@/components/admin/cursos/ModulosEditor'
import { AlumnosTab } from '@/components/admin/cursos/AlumnosTab'
import { ExamenTab } from '@/components/admin/cursos/ExamenTab'
import { PublicacionTab } from '@/components/admin/cursos/PublicacionTab'
import { ToastContainer, useToast } from '@/components/ui/toast'
import type { CursoDetalle } from '@/types/cursos'

type Tab = 'contenido' | 'examen' | 'alumnos' | 'publicacion'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'contenido', label: 'Contenido', icon: BookOpen },
  { id: 'examen', label: 'Examen final', icon: ClipboardCheck },
  { id: 'alumnos', label: 'Alumnos', icon: Users },
  { id: 'publicacion', label: 'Publicación', icon: Globe },
]

export default function EditorCursoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const cursoId = params.id
  const { toasts, showToast, removeToast } = useToast()

  const [detalle, setDetalle] = useState<CursoDetalle | null>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [tab, setTab] = useState<Tab>('contenido')
  // Secuencia de peticiones: descarta respuestas obsoletas (dos refetch en
  // vuelo pueden resolverse fuera de orden y dejar la UI con datos viejos)
  const seqRef = useRef(0)

  const cargar = useCallback(async () => {
    const seq = ++seqRef.current
    try {
      const res = await fetch(`/api/admin/cursos/${cursoId}`)
      if (seq !== seqRef.current) return // llegó tarde: la descarta
      if (res.status === 404) {
        setNoEncontrado(true)
        return
      }
      if (!res.ok) throw new Error()
      const json = await res.json()
      if (seq !== seqRef.current) return
      setDetalle(json)
    } catch {
      if (seq === seqRef.current) showToast('No se pudo cargar el curso', 'error')
    }
  }, [cursoId, showToast])

  useEffect(() => { cargar() }, [cargar])

  // Aviso de portada fallida desde /admin/cursos/nuevo (?portada=fallo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('portada') === 'fallo') {
      showToast('El curso se creó, pero la portada no se pudo subir. Súbela desde la pestaña Contenido.', 'error', 8000)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [showToast])

  const onChanged = useCallback(async (mensaje?: string) => {
    if (mensaje) showToast(mensaje, 'success')
    await cargar()
  }, [cargar, showToast])

  const onError = useCallback((mensaje: string) => {
    showToast(mensaje, 'error')
  }, [showToast])

  // El examen no forma parte de CursoDetalle: avisa sin refetchear el curso.
  const onExito = useCallback((mensaje: string) => {
    showToast(mensaje, 'success')
  }, [showToast])

  if (noEncontrado) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
        <p className="text-base font-semibold mb-2" style={{ color: 'var(--color-primario)' }}>
          Curso no encontrado
        </p>
        <button
          onClick={() => router.push('/admin/cursos')}
          className="text-sm font-medium underline"
          style={{ color: 'var(--color-acento)' }}
        >
          Volver a la lista de cursos
        </button>
      </div>
    )
  }

  if (!detalle) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
        <p className="text-sm" style={{ color: 'var(--color-texto-secundario)' }}>Cargando curso…</p>
      </div>
    )
  }

  const { curso, modulos, inscritos } = detalle
  const publicado = curso.estado === 'publicado'

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Encabezado */}
      <div>
        <Link
          href="/admin/cursos"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-2"
          style={{ color: 'var(--color-acento)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a cursos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primario)' }}>{curso.nombre}</h1>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: publicado ? 'rgba(16,185,129,0.12)' : 'rgba(180,83,9,0.12)',
              color: publicado ? '#10B981' : '#F59E0B',
            }}
          >
            {publicado ? 'Publicado' : 'Borrador'}
          </span>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
            style={{ background: 'rgba(27,48,104,0.1)', color: 'var(--color-primario)' }}
          >
            {curso.tipo}
          </span>
        </div>
      </div>

      {/* Pestañas — con scroll horizontal: las cuatro no caben en un móvil */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(27,48,104,0.06)', width: 'fit-content' }} role="tablist">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={active}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                style={active
                  ? { background: 'var(--color-superficie)', color: 'var(--color-primario)', boxShadow: '0 1px 4px rgba(27,58,87,0.12)' }
                  : { background: 'transparent', color: '#64748B' }}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.id === 'alumnos' && (
                  <span
                    className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(27,48,104,0.1)', color: 'var(--color-primario)' }}
                  >
                    {inscritos.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido de pestañas */}
      {tab === 'contenido' && (
        <div className="space-y-5">
          {/* `inscritosActivos` alimenta la advertencia de cambio retroactivo:
              tocar el ritmo con alumnos dentro les mueve la ventana (B2). */}
          <CursoDatosForm
            curso={curso}
            inscritosActivos={inscritos.filter(i => i.estado === 'activa').length}
            onChanged={onChanged}
            onError={onError}
          />
          <div>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--color-primario)' }}>
              Módulos y lecciones
            </h2>
            <ModulosEditor cursoId={curso.id} modulos={modulos} onChanged={onChanged} onError={onError} />
          </div>
        </div>
      )}

      {tab === 'examen' && (
        <ExamenTab cursoId={curso.id} onExito={onExito} onError={onError} />
      )}

      {tab === 'alumnos' && (
        <AlumnosTab cursoId={curso.id} inscritos={inscritos} onChanged={onChanged} onError={onError} />
      )}

      {tab === 'publicacion' && (
        <PublicacionTab curso={curso} numInscritos={inscritos.length} onChanged={onChanged} onError={onError} />
      )}
    </div>
  )
}
