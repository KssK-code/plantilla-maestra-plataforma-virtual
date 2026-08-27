'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, CreditCard, Search, FileText, MessageCircle, TrendingUp, Receipt } from 'lucide-react'

interface Pago {
  id: string
  alumno_id: string
  monto: number
  concepto: string
  mes_desbloqueado: number | null
  metodo_pago: string
  referencia: string | null
  fecha_pago: string | null
  created_at: string
  alumno_nombre: string
  alumno_nivel: string | null
  matricula: string | null
  tiene_telefono: boolean
}

interface Kpis { ingresosMes: number; ingresosTotales: number; pagosRegistrados: number }

const CONCEPTO_LABELS: Record<string, string> = {
  inscripcion: 'Inscripción',
  mensualidad: 'Mensualidad',
  otro:        'Otro',
}

const NIVEL_LABELS: Record<string, string> = {
  secundaria:   'Secundaria',
  preparatoria: 'Preparatoria',
  licenciatura: 'Licenciatura',
  diplomado:    'Diplomado',
}

const mxn = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fecha = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function PagosPage() {
  const [pagos, setPagos]   = useState<Pago[]>([])
  const [kpis, setKpis]     = useState<Kpis>({ ingresosMes: 0, ingresosTotales: 0, pagosRegistrados: 0 })
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [concepto, setConcepto] = useState('')
  const [desde, setDesde]       = useState('')
  const [hasta, setHasta]       = useState('')

  // Qué recibo se está generando, para no dejar el botón mudo mientras el PDF
  // se renderiza y se sube a Storage (la primera vez tarda).
  const [generando, setGenerando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    const qs = new URLSearchParams()
    if (concepto) qs.set('concepto', concepto)
    if (desde)    qs.set('desde', desde)
    if (hasta)    qs.set('hasta', hasta)
    setLoad(true)
    fetch(`/api/admin/pagos?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setError(null)
        setPagos(d.pagos ?? [])
        setKpis(d.kpis ?? { ingresosMes: 0, ingresosTotales: 0, pagosRegistrados: 0 })
      })
      .catch(() => setError('Error al cargar el historial de pagos'))
      .finally(() => setLoad(false))
  }, [concepto, desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  // La búsqueda por texto se filtra en el cliente para que escribir no dispare
  // una petición por tecla; concepto y fechas sí van al servidor.
  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return pagos
    return pagos.filter(p =>
      p.alumno_nombre.toLowerCase().includes(q)
      || (p.matricula  ?? '').toLowerCase().includes(q)
      || (p.referencia ?? '').toLowerCase().includes(q)
    )
  }, [pagos, busqueda])

  const totalFiltrado = useMemo(() => filas.reduce((a, p) => a + p.monto, 0), [filas])

  async function recibo(pagoId: string, accion: 'pdf' | 'whatsapp') {
    setGenerando(pagoId + accion)
    try {
      const r = await fetch(`/api/admin/pagos/${pagoId}/recibo`)
      const d = await r.json()
      if (!r.ok) { alert(d.error ?? 'No se pudo generar el recibo'); return }
      if (accion === 'pdf') { window.open(d.signedUrl, '_blank', 'noopener'); return }
      if (!d.whatsappUrl) {
        alert('Este alumno no tiene teléfono registrado. Agrégalo en su ficha para enviarle el recibo por WhatsApp.')
        return
      }
      window.open(d.whatsappUrl, '_blank', 'noopener')
    } catch {
      alert('Error de red al generar el recibo')
    } finally {
      setGenerando(null)
    }
  }

  const KPI = [
    { label: 'Ingresos del mes',  valor: mxn(kpis.ingresosMes),     Icon: TrendingUp },
    { label: 'Ingresos totales',  valor: mxn(kpis.ingresosTotales), Icon: CreditCard },
    { label: 'Pagos registrados', valor: String(kpis.pagosRegistrados), Icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primario)' }}>Pagos</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-texto-secundario)' }}>
          Historial global de pagos registrados — busca, filtra, descarga el recibo o envíalo por WhatsApp
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPI.map(k => (
          <div key={k.label} className="rounded-2xl p-5"
            style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
              <k.Icon size={17} style={{ color: 'var(--color-acento)' }} aria-hidden />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-primario)' }}>{k.valor}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-texto-secundario)' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-texto-secundario)' }} />
          <input
            type="text"
            placeholder="Buscar por alumno, matrícula o referencia…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold" style={{ color: 'var(--color-texto-secundario)' }}>
            Concepto
            <select value={concepto} onChange={e => setConcepto(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
              <option value="">Todos</option>
              <option value="inscripcion">Inscripción</option>
              <option value="mensualidad">Mensualidad</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="text-xs font-semibold" style={{ color: 'var(--color-texto-secundario)' }}>
            Desde
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }} />
          </label>
          <label className="text-xs font-semibold" style={{ color: 'var(--color-texto-secundario)' }}>
            Hasta
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }} />
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[240px]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-acento)' }} />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm py-8 text-center" style={{ color: '#DC2626' }}>{error}</p>
      )}

      {!loading && !error && filas.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm" style={{ color: 'var(--color-texto-secundario)' }}>
            {pagos.length === 0
              ? 'Todavía no hay pagos registrados. Se capturan desde la ficha de cada alumno.'
              : 'Ningún pago coincide con la búsqueda.'}
          </p>
        </div>
      )}

      {!loading && !error && filas.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
          {/* Tabla ancha: scroll dentro de su propio contenedor, para que la
              página nunca desborde de lado en teléfono. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 780 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-borde)' }}>
                  {['Alumno', 'Concepto', 'Monto', 'Método', 'Referencia', 'Fecha', 'Recibo'].map(h => (
                    <th key={h} className="text-left font-semibold px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-texto-secundario)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/alumnos/${p.alumno_id}`} className="font-semibold hover:underline"
                        style={{ color: 'var(--color-acento)' }}>
                        {p.alumno_nombre}
                      </Link>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-texto-secundario)' }}>
                        {p.matricula ?? 'sin matrícula'}
                        {p.alumno_nivel ? ` · ${NIVEL_LABELS[p.alumno_nivel] ?? p.alumno_nivel}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-texto)' }}>
                      {CONCEPTO_LABELS[p.concepto] ?? p.concepto}
                      {p.mes_desbloqueado ? (
                        <span className="text-xs ml-1" style={{ color: 'var(--color-texto-secundario)' }}>· mes {p.mes_desbloqueado}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--color-primario)' }}>{mxn(p.monto)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-texto-secundario)' }}>{p.metodo_pago}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-texto-secundario)' }}>{p.referencia ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-texto-secundario)' }}>{fecha(p.fecha_pago ?? p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => recibo(p.id, 'pdf')} disabled={generando === p.id + 'pdf'}
                          title="Descargar recibo en PDF"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                          style={{ background: 'var(--color-superficie)', color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>
                          {generando === p.id + 'pdf'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <FileText size={13} />}
                          PDF
                        </button>
                        <button onClick={() => recibo(p.id, 'whatsapp')} disabled={generando === p.id + 'whatsapp'}
                          title={p.tiene_telefono ? 'Enviar recibo por WhatsApp' : 'El alumno no tiene teléfono registrado'}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                          style={{ background: '#25D366', color: '#fff' }}>
                          {generando === p.id + 'whatsapp'
                            ? <Loader2 size={13} className="animate-spin" />
                            : <MessageCircle size={13} />}
                          WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-texto-secundario)' }}>
                    {filas.length} {filas.length === 1 ? 'pago' : 'pagos'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-texto-secundario)' }}>Total</td>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-primario)' }}>{mxn(totalFiltrado)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
