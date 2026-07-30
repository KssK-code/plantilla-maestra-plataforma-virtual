'use client'

import { useState, useEffect } from 'react'
import { Users, UserCheck, DollarSign, TrendingUp, BarChart3, Loader2, BookOpen, Award, GraduationCap, Download, AlertTriangle } from 'lucide-react'

interface Stats {
  total_alumnos: number
  alumnos_activos: number
  total_ingresos: number
  promedio_meses: number
}

interface RendimientoMateria {
  materia_id: string
  codigo: string
  nombre: string
  total_cursaron: number
  aprobados: number
  reprobados: number
  porcentaje_aprobacion: number
}

interface PagoReciente {
  alumno: string
  monto: number
  concepto?: string
  metodo_pago: string
  referencia?: string | null
  fecha_pago: string
}

const CONCEPTO_LABELS: Record<string, string> = {
  inscripcion: 'Inscripción',
  mensualidad: 'Mensualidad',
  otro:        'Otro',
}

interface IngresoSemana {
  semana_inicio: string // fecha del lunes (YYYY-MM-DD)
  total: number
  programa: number
  cursos: number
}

interface IngresoMes {
  mes: string // YYYY-MM
  total: number
  programa: number
  cursos: number
}

interface AvanceCurso {
  alumno: string
  diplomado: string
  lecciones_completadas: number
  lecciones_totales: number
  porcentaje: number
}

interface ConstanciaCurso {
  folio: string
  alumno: string
  diplomado: string
  calificacion: number | null
  horas: number | null
  emitido_en: string | null
}

interface DatosCursos {
  tiene_datos: boolean
  inscripciones_totales: number
  inscripciones_activas: number
  constancias_emitidas: number
  ingresos_cursos: number
  por_diplomado: { diplomado: string; inscritos: number; activos: number; ingresos: number }[]
  avance: AvanceCurso[]
  constancias: ConstanciaCurso[]
}

interface Coherencia {
  concepto_curso_sin_inscripcion: number
  inscripcion_con_concepto_programa: number
}

const fmtSemana = (iso: string) => {
  // iso es un date puro (YYYY-MM-DD); anclar a mediodía evita el corrimiento de TZ
  const d = new Date(`${iso}T12:00:00`)
  return `Sem del ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
}

const fmtMes = (yyyymm: string) => {
  const d = new Date(`${yyyymm}-15T12:00:00`)
  const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Color del vertical de diplomados. Deliberadamente distinto del verde de
// ingresos para que el ojo separe los dos negocios sin leer la leyenda.
const COLOR_CURSOS = '#A78BFA'

/**
 * Tabla de barras simple (sin librería de charts — no hay ninguna en el proyecto).
 *
 * B6 — DECISIÓN SOBRE EL DESGLOSE: la barra se parte en programa + diplomados
 * SOLO si `desglosar` es true, y quien la llama lo pone en true únicamente
 * cuando existe al menos un peso de ingreso por cursos. Los 144 clientes
 * tradicionales no tienen diplomados y nunca los van a tener: mostrarles para
 * siempre una leyenda "Diplomados $0.00" sería ruido que jamás se vuelve señal.
 * Con `desglosar` en false esta tabla renderiza exactamente lo mismo que antes
 * de B6.
 */
function TablaBarras({ titulo, icono: Icono, filas, desglosar }: {
  titulo: string
  icono: React.ElementType
  filas: { etiqueta: string; total: number; programa: number; cursos: number; actual?: boolean }[]
  desglosar: boolean
}) {
  const max = Math.max(...filas.map(f => f.total), 1)
  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Icono className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
          <h3 className="text-sm font-semibold truncate" style={{ color: '#F1F5F9' }}>{titulo}</h3>
        </div>
        {desglosar && (
          <div className="flex items-center gap-3 flex-shrink-0 text-[10px]" style={{ color: '#94A3B8' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: '#10B981' }} />Programa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: COLOR_CURSOS }} />Diplomados
            </span>
          </div>
        )}
      </div>
      {filas.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>
          Sin datos (aplica la migración 20260716150000_reporte_ingresos.sql)
        </div>
      ) : (
        <div className="p-5 space-y-2.5">
          {filas.map(f => (
            <div key={f.etiqueta} className="flex items-center gap-3">
              <span className="w-36 flex-shrink-0 text-xs" style={{ color: f.actual ? '#F1F5F9' : '#94A3B8', fontWeight: f.actual ? 600 : 400 }}>
                {f.etiqueta}{f.actual ? ' •' : ''}
              </span>
              <div className="flex-1 h-4 rounded overflow-hidden flex" style={{ background: '#0B0D11' }}>
                {desglosar ? (
                  <>
                    <div
                      className="h-full transition-all"
                      title={`Programa: ${fmt(f.programa)}`}
                      style={{ width: `${Math.max((f.programa / max) * 100, f.programa > 0 ? 2 : 0)}%`, background: f.actual ? '#10B981' : 'rgba(16,185,129,0.45)' }}
                    />
                    <div
                      className="h-full transition-all"
                      title={`Diplomados: ${fmt(f.cursos)}`}
                      style={{ width: `${Math.max((f.cursos / max) * 100, f.cursos > 0 ? 2 : 0)}%`, background: f.actual ? COLOR_CURSOS : 'rgba(167,139,250,0.45)' }}
                    />
                  </>
                ) : (
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${Math.max((f.total / max) * 100, f.total > 0 ? 2 : 0)}%`, background: f.actual ? '#10B981' : 'rgba(16,185,129,0.45)' }}
                  />
                )}
              </div>
              <span className="w-28 flex-shrink-0 text-right text-xs font-semibold" style={{ color: f.total > 0 ? '#10B981' : '#475569' }}>
                {fmt(f.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n)

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [ingresosMes, setIngresosMes] = useState(0)
  const [rendimiento, setRendimiento] = useState<RendimientoMateria[]>([])
  const [pagos, setPagos] = useState<PagoReciente[]>([])
  const [ingresosSemanas, setIngresosSemanas] = useState<IngresoSemana[]>([])
  const [ingresosMeses, setIngresosMeses] = useState<IngresoMes[]>([])
  const [cursos, setCursos] = useState<DatosCursos | null>(null)
  const [coherencia, setCoherencia] = useState<Coherencia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/reportes')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setStats(data.stats)
        setIngresosMes(data.ingresos_mes_actual ?? 0)
        setRendimiento(data.rendimiento_materias ?? [])
        setPagos(data.ultimos_pagos ?? data.pagos_recientes ?? [])
        setIngresosSemanas(data.ingresos_ultimas_8_semanas ?? [])
        setIngresosMeses(data.ingresos_ultimos_6_meses ?? [])
        setCursos(data.cursos ?? null)
        setCoherencia(data.coherencia ?? null)
      })
      .catch(() => setError('Error al cargar reportes'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
    </div>
  )

  // El desglose por vertical se enciende solo si de verdad hubo ingreso por
  // diplomados en alguna de las dos series. Un cliente tradicional ve la página
  // idéntica a como la veía antes de B6.
  const hayIngresoCursos =
    ingresosSemanas.some(s => s.cursos > 0) || ingresosMeses.some(m => m.cursos > 0)

  const mostrarSeccionCursos = Boolean(cursos?.tiene_datos)
  const incoherentes = (coherencia?.concepto_curso_sin_inscripcion ?? 0)
                     + (coherencia?.inscripcion_con_concepto_programa ?? 0)

  const statCards: {
    label: string; value: string; icon: React.ElementType; color: string; bg: string; sub: string | null
  }[] = [
    { label: 'Total Alumnos', value: String(stats?.total_alumnos ?? 0), icon: Users, color: 'var(--color-acento)', bg: 'rgba(21,101,192,0.15)', sub: null },
    { label: 'Alumnos Activos', value: String(stats?.alumnos_activos ?? 0), icon: UserCheck, color: '#10B981', bg: 'rgba(16,185,129,0.15)', sub: null },
    // El `sub` solo aparece si el cliente tiene ingresos por diplomados. Estas
    // dos tarjetas siempre han sumado TODO, y con dos verticales "ingresos"
    // dejaba de significar "ingresos del programa" sin que nada lo dijera.
    // El total no cambia; se aclara de qué está hecho.
    {
      label: 'Ingresos del Mes', value: fmt(ingresosMes), icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.15)',
      sub: hayIngresoCursos && ingresosMeses.length > 0
        ? `${fmt(ingresosMeses[ingresosMeses.length - 1].programa)} programa · ${fmt(ingresosMeses[ingresosMeses.length - 1].cursos)} diplomados`
        : null,
    },
    {
      label: 'Ingresos Totales', value: fmt(stats?.total_ingresos ?? 0), icon: DollarSign, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
      sub: hayIngresoCursos && cursos
        ? `${fmt((stats?.total_ingresos ?? 0) - cursos.ingresos_cursos)} programa · ${fmt(cursos.ingresos_cursos)} diplomados`
        : null,
    },
    { label: 'Promedio Meses', value: String(stats?.promedio_meses ?? 0), icon: TrendingUp, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', sub: null },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reportes y Estadísticas</h2>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Resumen general de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="rounded-xl p-5 flex items-center gap-4" style={CARD}>
            <div className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold truncate" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
              {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color: '#64748B' }}>{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Tendencia de ingresos — semana / mes (Fase 4, admin-only como toda esta página) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaBarras
          titulo="Ingresos — últimas 8 semanas"
          desglosar={hayIngresoCursos}
          icono={TrendingUp}
          filas={ingresosSemanas.map((s, i) => ({
            etiqueta: fmtSemana(s.semana_inicio),
            total: s.total,
            programa: s.programa,
            cursos: s.cursos,
            actual: i === ingresosSemanas.length - 1,
          }))}
        />
        <TablaBarras
          titulo="Ingresos — últimos 6 meses"
          desglosar={hayIngresoCursos}
          icono={BarChart3}
          filas={ingresosMeses.map((m, i) => ({
            etiqueta: fmtMes(m.mes),
            total: m.total,
            programa: m.programa,
            cursos: m.cursos,
            actual: i === ingresosMeses.length - 1,
          }))}
        />
      </div>

      {/* ── VERTICAL DE DIPLOMADOS (B6) ──────────────────────────────────────
          Solo se pinta si el cliente TIENE datos de cursos. Los 144 clientes
          tradicionales no ven nada de esto. */}
      {mostrarSeccionCursos && cursos && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pt-2">
            <GraduationCap className="w-5 h-5" style={{ color: COLOR_CURSOS }} />
            <h2 className="text-lg font-bold" style={{ color: '#F1F5F9' }}>Diplomados</h2>
          </div>

          {/* Aviso de clasificación incoherente. Se reporta, no se corrige solo:
              adivinar la intención de una fila ambigua es justo lo que no debe
              hacer un reporte. */}
          {incoherentes > 0 && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
              <div className="text-xs leading-relaxed" style={{ color: '#FCD34D' }}>
                <strong>{incoherentes} pago{incoherentes !== 1 ? 's' : ''}</strong> con clasificación
                incoherente: el concepto y la inscripción enlazada no coinciden. El desglose usa la
                inscripción, así que los totales cuadran, pero conviene revisar esos registros.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Inscripciones activas', value: String(cursos.inscripciones_activas), sub: `${cursos.inscripciones_totales} en total` },
              { label: 'Ingresos por diplomados', value: fmt(cursos.ingresos_cursos), sub: 'histórico' },
              { label: 'Constancias emitidas', value: String(cursos.constancias_emitidas), sub: 'con folio' },
              { label: 'Diplomados con alumnos', value: String(cursos.por_diplomado.length), sub: 'programas' },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-5" style={CARD}>
                <p className="text-xl font-bold truncate" style={{ color: COLOR_CURSOS }}>{c.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{c.label}</p>
                <p className="text-[10px] mt-1" style={{ color: '#64748B' }}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Por diplomado — la vista que responde "¿cuál se vende?" */}
          {cursos.por_diplomado.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={CARD}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
                <BookOpen className="w-4 h-4" style={{ color: COLOR_CURSOS }} />
                <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Ingresos e inscritos por diplomado</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                      {['Diplomado', 'Inscritos', 'Activos', 'Ingresos'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.por_diplomado.map(d => (
                      <tr key={d.diplomado} style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{d.diplomado}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{d.inscritos}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{d.activos}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: COLOR_CURSOS }}>{fmt(d.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Avance. El denominador es el CURSO ENTERO, no lo que el alumno
              tiene abierto — es la lección de B2: filtrar por la ventana de
              pago encogía el denominador y un alumno con 1 de 6 meses pagados
              salía al 100%. */}
          {cursos.avance.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={CARD}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
                <TrendingUp className="w-4 h-4" style={{ color: COLOR_CURSOS }} />
                <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Avance por inscripción activa</h3>
                <span className="text-[10px]" style={{ color: '#64748B' }}>sobre el curso completo</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                      {['Alumno', 'Diplomado', 'Lecciones', 'Avance'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.avance.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{a.alumno}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{a.diplomado}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: '#94A3B8' }}>
                          {a.lecciones_completadas} / {a.lecciones_totales}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: '#2A2F3E' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${a.porcentaje}%`, background: COLOR_CURSOS }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: COLOR_CURSOS }}>{a.porcentaje}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Constancias emitidas — el libro de folios de B4 */}
          {cursos.constancias.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={CARD}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
                <Award className="w-4 h-4" style={{ color: COLOR_CURSOS }} />
                <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Constancias emitidas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                      {['Folio', 'Alumno', 'Diplomado', 'Calificación', 'Horas', 'Emitida'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.constancias.map(c => (
                      <tr key={c.folio} style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: COLOR_CURSOS }}>{c.folio}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{c.alumno}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{c.diplomado}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{c.calificacion ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{c.horas ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                          {c.emitido_en ? new Date(c.emitido_en).toLocaleDateString('es-MX') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Descargas. CSV y no Excel: ver src/lib/reportes/csv.ts. */}
          <div className="rounded-xl p-5" style={CARD}>
            <div className="flex items-center gap-3 mb-3">
              <Download className="w-4 h-4" style={{ color: COLOR_CURSOS }} />
              <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Descargar detalle</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'inscripciones', label: 'Inscripciones' },
                { id: 'pagos',         label: 'Pagos de diplomados' },
                { id: 'constancias',   label: 'Constancias' },
                { id: 'avance',        label: 'Avance' },
              ].map(d => (
                <a
                  key={d.id}
                  href={`/api/admin/reportes/export?dataset=${d.id}`}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(167,139,250,0.12)', color: COLOR_CURSOS, border: '1px solid rgba(167,139,250,0.3)' }}
                >
                  {d.label} (CSV)
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rendimiento por materia */}
      <div className="rounded-xl overflow-hidden" style={CARD}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
          <BookOpen className="w-4 h-4" style={{ color: 'var(--color-acento)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Rendimiento por Materia</h3>
        </div>
        {rendimiento.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>
            Sin datos de calificaciones registradas aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                  {['Código', 'Materia', 'Cursaron', 'Aprobados', 'Reprobados', '% Aprobación'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rendimiento.map(r => (
                  <tr
                    key={r.materia_id}
                    style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(21,101,192,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-acento)' }}>{r.codigo}</td>
                    <td className="px-4 py-3 font-medium max-w-xs" style={{ color: '#F1F5F9' }}>
                      <span className="block truncate">{r.nombre}</span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{r.total_cursaron}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#10B981' }}>{r.aprobados}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#EF4444' }}>{r.reprobados}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: '#2A2F3E' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${r.porcentaje_aprobacion}%`,
                              background: r.porcentaje_aprobacion >= 60 ? '#10B981' : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{
                          color: r.porcentaje_aprobacion >= 60 ? '#10B981' : '#EF4444'
                        }}>
                          {r.porcentaje_aprobacion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de ingresos */}
      <div className="rounded-xl overflow-hidden" style={CARD}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2A2F3E' }}>
          <Award className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Historial de Ingresos Recientes</h3>
        </div>
        {pagos.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>
            Sin pagos registrados aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                  {['Fecha', 'Alumno', 'Concepto', 'Monto', 'Método', 'Referencia'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(21,101,192,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>
                      {new Date(`${p.fecha_pago}T12:00:00`).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{p.alumno}</td>
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{p.concepto ? (CONCEPTO_LABELS[p.concepto] ?? p.concepto) : '—'}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#10B981' }}>{fmt(Number(p.monto))}</td>
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{p.metodo_pago}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#64748B' }}>{p.referencia ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
