'use client'

import { useState, useEffect } from 'react'
import { Loader2, Settings, BookOpen, Palette, Info, Lock, Eye, EyeOff } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface Plan {
  id: string
  nombre: string
  duracion_meses: number
  precio_mensual: number
}

interface ConfigData {
  escuela: {
    nombre: string
    slug: string
    logoUrl: string | null
    colorPrimario: string
    colorSecundario: string
    contactoEmail: string
    contactoTelefono: string | null
  }
  sistema: {
    version: string
    total_materias: number
    total_planes: number
    fecha_deploy: string
  }
}

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }
const FIELD_BG = { background: '#0D1017', border: '1px solid #2A2F3E' }
// Mismo estilo de input que el card "Cambiar Contraseña" de alumno/perfil
const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F1F5F9',
}

function Campo({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>{label}</p>
      <div className="px-3 py-2.5 rounded-lg text-sm" style={{ ...FIELD_BG, color: value ? '#F1F5F9' : '#475569' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  const { toasts, showToast, removeToast } = useToast()
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [passForm, setPassForm] = useState({ current: '', nueva: '', confirmar: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)

  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setPassError(null)

    if (passForm.nueva.length < 8) {
      setPassError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (passForm.nueva !== passForm.confirmar) {
      setPassError('Las contraseñas no coinciden.')
      return
    }
    if (passForm.nueva === passForm.current) {
      setPassError('La nueva contraseña debe ser distinta de la actual.')
      return
    }

    setPassLoading(true)
    try {
      const res = await fetch('/api/admin/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passForm.current, newPassword: passForm.nueva }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPassError(data.error ?? 'Error al cambiar contraseña.')
        return
      }
      setPassForm({ current: '', nueva: '', confirmar: '' })
      showToast('Contraseña actualizada correctamente', 'success')
    } catch {
      setPassError('Ocurrió un error inesperado.')
    } finally {
      setPassLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/configuracion').then(r => r.json()),
      fetch('/api/admin/planes').then(r => r.json()),
    ])
      .then(([configData, planesData]) => {
        if (configData.error) { setError(configData.error); return }
        setConfig(configData)
        setPlanes(Array.isArray(planesData) ? planesData : [])
      })
      .catch(() => setError('Error al cargar la configuración'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
    </div>
  )

  if (error || !config) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error ?? 'Error al cargar'}</p>
    </div>
  )

  const { escuela, sistema } = config

  return (
    <div className="space-y-6 max-w-3xl">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div>
        <h2 className="text-xl font-bold text-gray-900">Configuración de la Escuela</h2>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
          Información general de la plataforma
        </p>
      </div>

      {/* Aviso readonly */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(21,101,192,0.08)', border: '1px solid rgba(21,101,192,0.2)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-acento)' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
          Para modificar estos datos, edita el archivo <code className="font-mono text-xs px-1 rounded" style={{ background: 'rgba(21,101,192,0.15)', color: 'var(--color-acento)' }}>src/lib/config.ts</code> y redeploya la plataforma. Contacta al administrador del sistema si necesitas ayuda.
        </p>
      </div>

      {/* Datos de la escuela */}
      <div className="rounded-xl p-5 space-y-4" style={CARD}>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: 'var(--color-acento)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Datos de la Escuela</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre de la Escuela" value={escuela.nombre} />
          <Campo label="Slug / Identificador" value={escuela.slug} />
          <Campo label="Correo de Contacto" value={escuela.contactoEmail} />
          <Campo label="Teléfono de Contacto" value={escuela.contactoTelefono} />
        </div>
      </div>

      {/* Colores */}
      <div className="rounded-xl p-5 space-y-4" style={CARD}>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" style={{ color: 'var(--color-acento)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Colores de la Marca</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Color Primario', value: escuela.colorPrimario },
            { label: 'Color Secundario', value: escuela.colorSecundario },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-[180px]" style={FIELD_BG}>
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 shadow-lg"
                style={{ background: value, border: '2px solid rgba(255,255,255,0.1)' }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{label}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: '#94A3B8' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Planes de estudio */}
      <div className="rounded-xl overflow-hidden" style={CARD}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #2A2F3E' }}>
          <BookOpen className="w-4 h-4" style={{ color: 'var(--color-acento)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Planes de Estudio Activos</h3>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(21,101,192,0.15)', color: 'var(--color-acento)' }}>
            {planes.length} plan{planes.length !== 1 ? 'es' : ''}
          </span>
        </div>
        {planes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            No hay planes activos
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#2A2F3E' }}>
            {planes.map(plan => (
              <div key={plan.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{plan.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {plan.duracion_meses} meses de duración
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                    ${plan.precio_mensual.toLocaleString('es-MX')}<span className="text-xs font-normal" style={{ color: '#94A3B8' }}>/mes</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info del sistema */}
      <div className="rounded-xl p-5 space-y-4" style={CARD}>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" style={{ color: 'var(--color-acento)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Información del Sistema</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Versión', value: sistema.version },
            { label: 'Materias cargadas', value: String(sistema.total_materias) },
            { label: 'Planes activos', value: String(sistema.total_planes) },
            { label: 'Último deploy', value: sistema.fecha_deploy },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl" style={{ background: '#0D1017', border: '1px solid #2A2F3E' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--color-acento)' }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Card Cambiar Contraseña — réplica del card de alumno/perfil. Es el
          único bloque editable de esta pantalla: cambia la contraseña de LA
          CUENTA con la que el admin inició sesión (nunca la de otro usuario). */}
      <div className="rounded-xl overflow-hidden" style={CARD}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #2A2F3E' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Lock className="w-4 h-4" style={{ color: '#F59E0B' }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Cambiar Contraseña</h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            {[
              { label: 'Contraseña actual',           key: 'current',   show: showCurrent,   toggle: () => setShowCurrent(v => !v) },
              { label: 'Nueva contraseña',            key: 'nueva',     show: showNueva,     toggle: () => setShowNueva(v => !v) },
              { label: 'Confirmar nueva contraseña',  key: 'confirmar', show: showConfirmar, toggle: () => setShowConfirmar(v => !v) },
            ].map(({ label, key, show, toggle }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: '#94A3B8' }}>{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={passForm[key as keyof typeof passForm]}
                    onChange={e => setPassForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-4 pr-11 py-3 rounded-lg text-sm outline-none transition-all"
                    style={INPUT_STYLE}
                    onFocus={e => {
                      e.currentTarget.style.border = '1px solid rgba(21,101,192,0.6)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21,101,192,0.1)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    style={{ color: '#64748B' }}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <p className="text-xs" style={{ color: '#64748B' }}>
              Mínimo 8 caracteres. Esta es la cuenta que administra toda la escuela: usa una contraseña que no uses en otro sitio.
            </p>

            {passError && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
              >
                <span className="mt-px">⚠</span>
                <span>{passError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-acento)', color: 'var(--color-texto-sobre-acento)' }}
            >
              {passLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cambiando...</> : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
