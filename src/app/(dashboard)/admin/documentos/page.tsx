'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Search, CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react'

type DocEstado = 'pendiente' | 'aprobado' | 'rechazado'
type DocTipo =
  | 'acta_nacimiento'
  | 'curp'
  | 'certificado_primaria'
  | 'certificado_secundaria'
  | 'identificacion_oficial'
  | 'foto_perfil_doc'

const DOC_LABELS: Record<string, string> = {
  acta_nacimiento: 'Acta de Nacimiento',
  curp: 'CURP',
  certificado_primaria: 'Certificado de Primaria',
  certificado_secundaria: 'Certificado de Secundaria',
  identificacion_oficial: 'Identificación Oficial',
  foto_perfil_doc: 'Foto (fondo blanco)',
}

interface Documento {
  id: string
  alumno_id: string
  tipo: DocTipo
  nombre_archivo: string
  estado: DocEstado
  comentario_admin: string | null
  signed_url: string | null
  subido_en: string
  alumno_nombre?: string
}

const CARD = { background: '#1E2230', border: '1px solid #2A2F3E' }
const INPUT_STYLE = {
  background: '#0B0D11',
  border: '1px solid #2A2F3E',
  color: '#F1F5F9',
}

const ESTADO_CONFIG: Record<
  DocEstado,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: Clock },
  aprobado: {
    label: 'Aprobado',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
    icon: CheckCircle,
  },
  rechazado: { label: 'Rechazado', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: XCircle },
}

export default function DocumentosAdminPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<DocEstado | ''>('pendiente')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comentarios, setComentarios] = useState<Record<string, string>>({})

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/documentos')
      if (!res.ok) throw new Error('Error al cargar documentos')
      const data = await res.json()
      setDocumentos(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function actualizarEstado(docId: string, alumnoId: string, estado: DocEstado) {
    setActionLoading(`${docId}-${estado}`)
    try {
      const comentario = comentarios[docId] ?? ''
      const res = await fetch(`/api/admin/documentos/${docId}/verificar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, comentario, alumno_id: alumnoId }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Error al actualizar')
        return
      }
      await cargar()
    } catch {
      alert('Error inesperado')
    } finally {
      setActionLoading(null)
    }
  }

  const filtrados = documentos.filter((d) => {
    const nombre = d.alumno_nombre ?? ''
    const matchBusqueda =
      !busqueda ||
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.tipo.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = !filtroTipo || d.tipo === filtroTipo
    const matchEstado = !filtroEstado || d.estado === filtroEstado
    return matchBusqueda && matchTipo && matchEstado
  })

  const totalPendientes = documentos.filter((d) => d.estado === 'pendiente').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Revisión y verificación de documentos de alumnos
          </p>
        </div>
        {totalPendientes > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}
          >
            <Clock className="w-4 h-4" />
            {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''} de revisión
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#64748B' }}
          />
          <input
            type="text"
            placeholder="Buscar por alumno o tipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={INPUT_STYLE}
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ ...INPUT_STYLE, minWidth: 180 }}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(DOC_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as DocEstado | '')}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ ...INPUT_STYLE, minWidth: 150 }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#3AAFA9' }} />
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-center min-h-[200px] rounded-xl"
          style={CARD}
        >
          <p className="text-sm" style={{ color: '#EF4444' }}>
            {error}
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] rounded-xl gap-3"
          style={CARD}
        >
          <FileText className="w-10 h-10" style={{ color: '#2A2F3E' }} />
          <p className="text-sm" style={{ color: '#64748B' }}>
            {documentos.length === 0
              ? 'No hay documentos registrados'
              : 'No hay documentos con esos filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((doc) => {
            const estadoCfg = ESTADO_CONFIG[doc.estado]
            const EstadoIcon = estadoCfg.icon
            const isProcessing =
              actionLoading === `${doc.id}-aprobado` ||
              actionLoading === `${doc.id}-rechazado`

            return (
              <div key={doc.id} className="rounded-xl p-4" style={CARD}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Doc info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                      style={{ background: estadoCfg.bg }}
                    >
                      <FileText className="w-5 h-5" style={{ color: estadoCfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>
                          {DOC_LABELS[doc.tipo] ?? doc.tipo}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: estadoCfg.bg, color: estadoCfg.color }}
                        >
                          <EstadoIcon className="w-3 h-3" />
                          {estadoCfg.label}
                        </span>
                      </div>
                      {doc.alumno_nombre && (
                        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                          Alumno: {doc.alumno_nombre}
                        </p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        Subido:{' '}
                        {new Date(doc.subido_en).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {doc.comentario_admin && (
                        <p className="text-xs mt-1 italic" style={{ color: '#F59E0B' }}>
                          Nota: {doc.comentario_admin}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:items-end min-w-0 sm:min-w-[260px]">
                    {doc.signed_url && (
                      <a
                        href={doc.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full sm:w-auto justify-center"
                        style={{ background: 'rgba(58,175,169,0.1)', color: '#3AAFA9' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver documento
                      </a>
                    )}

                    {doc.estado === 'pendiente' && (
                      <>
                        <input
                          type="text"
                          placeholder="Comentario (opcional)"
                          value={comentarios[doc.id] ?? ''}
                          onChange={(e) =>
                            setComentarios((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          className="px-3 py-1.5 rounded-lg text-xs outline-none w-full"
                          style={INPUT_STYLE}
                        />
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => actualizarEstado(doc.id, doc.alumno_id, 'aprobado')}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
                          >
                            {actionLoading === `${doc.id}-aprobado` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            Verificar
                          </button>
                          <button
                            onClick={() => actualizarEstado(doc.id, doc.alumno_id, 'rechazado')}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                          >
                            {actionLoading === `${doc.id}-rechazado` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Rechazar
                          </button>
                        </div>
                      </>
                    )}

                    {doc.estado !== 'pendiente' && (
                      <button
                        onClick={() => actualizarEstado(doc.id, doc.alumno_id, 'pendiente')}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full sm:w-auto disabled:opacity-50"
                        style={{ background: 'rgba(100,116,139,0.1)', color: '#94A3B8' }}
                      >
                        <Clock className="w-3 h-3" />
                        Marcar pendiente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
