'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Printer, Download } from 'lucide-react'
import { CONFIG } from '@/lib/config'

const C = CONFIG.colores

type Estado = 'Acreditada' | 'No acreditada' | 'Pendiente'

interface MateriaCursada {
  materia_id: string
  codigo: string
  nombre_materia: string
  mes_numero: number
  estado: Estado
}

interface DatosConstancia {
  nombre_completo: string
  nombre: string
  apellidos: string
  matricula: string
  plan_nombre: string
  meses_desbloqueados: number
  duracion_meses: number
  porcentaje_avance: number
  avatar_url?: string | null
  materias_cursadas: MateriaCursada[]
}

function generarFolio() {
  const year = new Date().getFullYear()
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `CONST-${year}-${rand}`
}

const BADGE: Record<Estado, React.CSSProperties> = {
  Acreditada:      { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
  'No acreditada': { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  Pendiente:       { background: '#fef9ec', color: '#b45309', border: '1px solid #fde68a' },
}

const estadoLabel: Record<Estado, string> = {
  Acreditada:      'Acreditada',
  'No acreditada': 'No acreditada',
  Pendiente:       'Pendiente',
}

export default function ConstanciaPage() {
  const [datos, setDatos] = useState<DatosConstancia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const folioRef = useRef<string>('')

  useEffect(() => {
    folioRef.current = generarFolio()
    fetch('/api/alumno/constancia')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setDatos(data)
      })
      .catch(() => setError('Error al cargar los datos'))
      .finally(() => setLoading(false))
  }, [])

  const folio = folioRef.current

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  const porcentaje = datos
    ? Math.round((datos.meses_desbloqueados / datos.duracion_meses) * 100)
    : 0

  const disclaimerParts = `Este documento es un comprobante académico interno con folio {folio} generado digitalmente por ${CONFIG.nombre}. Para verificar su autenticidad, contacte a administración.`.split('{folio}')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.primario }} />
    </div>
  )

  if (error || !datos) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <p style={{ fontSize: 14, color: '#ef4444' }}>{error ?? 'Error al cargar'}</p>
    </div>
  )

  return (
    <>
      {/* Importar fuentes de Google */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', width: '100%', maxWidth: 780, margin: '0 auto' }}>

        {/* ── Botones de acción ── */}
        <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 22px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: '1px solid #2a3a5e', color: '#94a3b8',
            }}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 22px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              display: 'flex', alignItems: 'center', gap: 7,
              background: C.primario, color: '#fff', border: 'none',
            }}
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>

        {/* ── Certificado ── */}
        <div
          id="constancia-print"
          style={{
            width: '100%', background: '#fff', borderRadius: 6,
            overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
            position: 'relative', fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {/* Barra superior */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${C.primario}, ${C.secundario} 55%, ${C.acento})` }} />

          {/* ── Encabezado ── */}
          <div style={{
            padding: '28px 48px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #edf0f7',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CONFIG.logo} alt={CONFIG.nombre} style={{ height: 60, width: 'auto', objectFit: 'contain' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontWeight: 800, fontSize: 16, letterSpacing: '0.04em',
                  background: `linear-gradient(135deg, ${C.primario}, ${C.secundario}, ${C.acento})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', lineHeight: 1.2,
                }}>{CONFIG.nombreCompleto}</span>
                <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', marginTop: 4 }}>
                  {CONFIG.cct?.trim()
                    ? <>Incorporado a la SEP &nbsp;·&nbsp; CCT: {CONFIG.cct.trim()}</>
                    : <>Incorporado a la SEP</>}
                </span>
                <span style={{
                  fontSize: 8, letterSpacing: '0.12em', color: '#94a3b8', fontWeight: 400,
                  borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 5,
                }}>
                  Preparatoria &nbsp;•&nbsp; Secundaria
                </span>
              </div>
            </div>

            {/* Meta folio / fecha */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#a0aec0', textTransform: 'uppercase', fontWeight: 600 }}>
                Folio
              </div>
              <div style={{ fontSize: 13, color: C.primario, fontWeight: 700, marginTop: 2 }}>
                {folio}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                Fecha de emisión: {fecha}
              </div>
            </div>
          </div>

          {/* ── Cuerpo ── */}
          <div style={{ padding: '36px 48px 4px' }}>

            {/* Título */}
            <div style={{
              marginBottom: 22, paddingBottom: 18,
              borderBottom: '1px solid #edf0f7',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {/* Título izquierdo */}
              <div style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 26, color: '#0f172a', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{
                  display: 'inline-block', width: 4, height: 28, flexShrink: 0,
                  background: `linear-gradient(180deg, ${C.primario}, ${C.secundario})`, borderRadius: 2,
                }} />
                Constancia de Estudios
              </div>

              {/* Foto del alumno */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {datos.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={datos.avatar_url}
                    alt={[datos.nombre, datos.apellidos].filter(Boolean).join(' ') || datos.nombre_completo}
                    style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.primario}` }}
                  />
                ) : (
                  <div style={{
                    width: 90, height: 90, borderRadius: '50%',
                    background: C.primario, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 700,
                  }}>
                    {((datos.nombre?.[0] ?? '') + (datos.apellidos?.[0] ?? '')).toUpperCase() || datos.nombre_completo[0]?.toUpperCase() || 'A'}
                  </div>
                )}
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, textAlign: 'center', maxWidth: 110 }}>
                  {[datos.nombre, datos.apellidos].filter(Boolean).join(' ') || datos.nombre_completo}
                </span>
              </div>
            </div>

            {/* Párrafo 1 */}
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.9, marginBottom: 6 }}>
              Se certifica que el alumno{' '}
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{[datos.nombre, datos.apellidos].filter(Boolean).join(' ') || datos.nombre_completo}</strong>,{' '}
              con matrícula{' '}
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{datos.matricula}</strong>,{' '}
              está inscrito en el programa{' '}
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{datos.plan_nombre}</strong>{' '}
              {` de ${CONFIG.nombre}.`}
            </p>

            {/* Párrafo 2 */}
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.9, marginTop: 6 }}>
              Ha completado{' '}
              <span style={{ color: C.primario, fontWeight: 600 }}>
                {datos.meses_desbloqueados} de {datos.duracion_meses} meses del programa
              </span>.
            </p>

            {/* Datos institucionales */}
            <div style={{
              marginTop: 14, padding: '10px 16px', borderRadius: 8,
              background: CONFIG.colores.fondo, border: `1px solid rgba(27, 47, 110, 0.12)`,
              display: 'flex', flexWrap: 'wrap', gap: '6px 24px',
            }}>
              {[
                { label: 'Institución', value: CONFIG.nombreCompleto },
                ...(CONFIG.cct?.trim()
                  ? [{ label: 'CCT' as const, value: CONFIG.cct.trim() }]
                  : []),
                { label: 'Autoridad educativa', value: 'Incorporado a la SEP' },
                { label: 'Sistema', value: datos.duracion_meses <= 6 && datos.plan_nombre?.toLowerCase().includes('prepa')
                    ? 'Sistema Nacional de Educación Media Superior'
                    : 'Sistema Educativo Nacional' },
              ].map(item => (
                <div key={item.label} style={{ fontSize: 11, color: '#475569' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{item.label}: </span>
                  <span style={{ color: '#0f172a' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Barra de progreso */}
            <div style={{ margin: '20px 0 4px' }}>
              <div style={{ background: 'rgba(27, 47, 110, 0.08)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${porcentaje}%`,
                  background: `linear-gradient(90deg, ${C.primario}, ${C.secundario})`, borderRadius: 3,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>
                <span>Avance total</span>
                <span style={{ color: C.primario, fontWeight: 700 }}>{porcentaje}%</span>
              </div>
            </div>

            {/* Etiqueta sección */}
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, margin: '26px 0 10px' }}>
              Materias cursadas
            </div>

            {/* Tabla de materias */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafd' }}>
                  {['Mes', 'Código', 'Materia', 'Estado'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '9px 14px',
                      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #e8edf5',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.materias_cursadas
                  .sort((a, b) => a.mes_numero - b.mes_numero)
                  .map(m => (
                    <tr key={m.materia_id}>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12, borderBottom: '1px solid #f4f6fb' }}>
                        Mes {m.mes_numero}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.primario, fontWeight: 700, letterSpacing: '0.06em', borderBottom: '1px solid #f4f6fb' }}>
                        {m.codigo}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155', borderBottom: '1px solid #f4f6fb' }}>
                        {m.nombre_materia}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f4f6fb' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 11px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          ...BADGE[m.estado],
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                          {estadoLabel[m.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ── Marca de agua ── */}
          <svg
            style={{ position: 'absolute', bottom: 50, right: 40, opacity: 0.028, pointerEvents: 'none' }}
            width="220" height="220" viewBox="0 0 100 100"
          >
            <polygon points="50,4 93,28 93,72 50,96 7,72 7,28" fill="none" stroke={C.primario} strokeWidth="2.5" />
            <polygon points="50,14 83,33 83,67 50,86 17,67 17,33" fill="none" stroke={C.primario} strokeWidth="1.2" />
          </svg>

          {/* ── Pie del certificado ── */}
          <div style={{
            padding: '22px 48px 32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            borderTop: '1px solid #edf0f7', marginTop: 26,
          }}>
            {/* Disclaimer */}
            <p style={{ fontSize: 10, color: '#a0aec0', maxWidth: 260, lineHeight: 1.7 }}>
              {disclaimerParts[0]}
              <strong style={{ color: '#64748b' }}>{folio}</strong>
              {disclaimerParts[1]}
            </p>

            {/* Firma */}
            <div style={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/firma-direccion.png"
                alt="Firma"
                style={{ height: 110, width: 'auto', display: 'block', margin: '0 auto 2px' }}
              />
              <div style={{ width: 180, height: 1, background: '#cbd5e1', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', letterSpacing: '0.05em' }}>
                Dirección Académica
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
                {CONFIG.nombre}
              </div>
            </div>
          </div>

          {/* Barra inferior */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${C.acento}, ${C.secundario} 50%, ${C.primario})` }} />
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body > *:not(#constancia-print) { display: none !important; }
          #constancia-print {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  )
}
