import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { CONFIG } from '@/lib/config'

/**
 * GET /api/admin/reportes/excel
 *
 * Un solo .xlsx con 6 hojas — Resumen, Pagos, Alumnos, Rendimiento, Ingresos
 * por mes e Ingresos semanal — para que administración abra el corte completo
 * de una vez en lugar de descargar cuatro CSV sueltos.
 *
 * ADMIN-ONLY, NUNCA secretario: aquí sale el padrón entero con matrícula,
 * correo y teléfono, más el desglose de ingresos. `verifyAdmin` (no
 * `verifyStaff`) es justamente esa línea.
 *
 * ⚠️ Sobre la dependencia `xlsx`: sus avisos de seguridad conocidos son de
 * PARSEO (leer un libro malicioso). Aquí solo se ESCRIBE — no hay `read` ni
 * `readFile` en toda la ruta y ningún dato de este endpoint viene de un
 * archivo subido por nadie.
 *
 * Los CSV por vertical de /api/admin/reportes/export siguen donde estaban:
 * cubren el detalle de Diplomados, que este libro no repite.
 */
export const dynamic = 'force-dynamic'

const NIVEL_LABELS: Record<string, string> = {
  secundaria: 'Secundaria', preparatoria: 'Preparatoria',
  licenciatura: 'Licenciatura', diplomado: 'Diplomado',
}
const CONCEPTO_LABELS: Record<string, string> = {
  inscripcion: 'Inscripción', mensualidad: 'Mensualidad', otro: 'Otro',
}
const MODALIDAD_LABELS: Record<string, string> = { '3_meses': '3 meses', '6_meses': '6 meses' }

const nombreDe = (u?: { nombre?: string | null; apellidos?: string | null }) =>
  [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || 'Alumno'

/** 'YYYY-MM' → 'Marzo de 2026'. Se arma con día 15 para que ningún desfase de
 *  zona horaria empuje la fecha al mes anterior. */
function mesLegible(iso: string): string {
  const d = new Date(`${iso.slice(0, 7)}-15T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const s = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const soloFecha = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : '')

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const [
      { data: alumnosRaw }, { data: pagosRaw }, { data: califsRaw },
      mesRes, semRes,
    ] = await Promise.all([
      admin.from('alumnos').select('id, matricula, nivel, modalidad, activo, inscripcion_pagada, meses_desbloqueados, fecha_inscripcion'),
      admin.from('pagos').select('id, alumno_id, monto, concepto, mes_desbloqueado, metodo_pago, referencia, fecha_pago, registrado_por').order('fecha_pago', { ascending: false }),
      admin.from('calificaciones').select('materia_id, calificacion, acreditado, materias(nombre)'),
      admin.rpc('reporte_ingresos_mensuales', { num_meses: 12 }),
      admin.rpc('reporte_ingresos_semanales', { num_semanas: 12 }),
    ])

    const alumnos = alumnosRaw ?? []
    const pagos   = pagosRaw   ?? []

    // Nombres de alumnos y de quien registró cada pago, en una sola consulta.
    const ids = [...new Set([
      ...alumnos.map(a => a.id),
      ...pagos.map(p => p.alumno_id),
      ...pagos.map(p => p.registrado_por),
    ].filter(Boolean))]
    const { data: usuariosRaw } = ids.length
      ? await admin.from('usuarios').select('id, nombre, apellidos, email, telefono').in('id', ids)
      : { data: [] as { id: string; nombre: string | null; apellidos: string | null; email: string; telefono: string | null }[] }
    const uMap = new Map((usuariosRaw ?? []).map(u => [u.id, u]))
    const aMap = new Map(alumnos.map(a => [a.id, a]))

    // ── Hoja 2 · Pagos ─────────────────────────────────────────────────────
    const hojaPagos = pagos.map(p => ({
      'Fecha':          soloFecha(p.fecha_pago),
      'Alumno':         nombreDe(uMap.get(p.alumno_id)),
      'Matrícula':      aMap.get(p.alumno_id)?.matricula ?? '',
      'Nivel':          NIVEL_LABELS[aMap.get(p.alumno_id)?.nivel ?? ''] ?? '',
      'Concepto':       CONCEPTO_LABELS[p.concepto ?? ''] ?? p.concepto ?? '',
      'Mes que abrió':  p.mes_desbloqueado ?? '',
      'Monto (MXN)':    Number(p.monto ?? 0),
      'Método':         p.metodo_pago ?? '',
      'Referencia':     p.referencia ?? '',
      'Registrado por': nombreDe(uMap.get(p.registrado_por)),
    }))

    // ── Hoja 3 · Alumnos ───────────────────────────────────────────────────
    const hojaAlumnos = alumnos.map(a => {
      const u = uMap.get(a.id)
      return {
        'Matrícula':            a.matricula ?? '',
        'Alumno':               nombreDe(u),
        'Correo':               u?.email ?? '',
        'Teléfono':             u?.telefono ?? '',
        'Nivel':                NIVEL_LABELS[a.nivel ?? ''] ?? '',
        'Modalidad':            MODALIDAD_LABELS[a.modalidad ?? ''] ?? a.modalidad ?? '',
        'Inscripción pagada':   a.inscripcion_pagada ? 'Sí' : 'No',
        'Meses desbloqueados':  a.meses_desbloqueados ?? 0,
        'Estado':               a.activo === false ? 'Inactivo' : 'Activo',
        'Fecha de inscripción': soloFecha(a.fecha_inscripcion),
      }
    })

    // ── Hoja 4 · Rendimiento por materia ───────────────────────────────────
    type Cal = { materia_id: string; calificacion: number | null; acreditado: boolean; materias: { nombre: string } | null }
    const califs = (califsRaw ?? []) as unknown as Cal[]
    const porMateria = new Map<string, { nombre: string; total: number; acred: number; suma: number; conNota: number }>()
    for (const c of califs) {
      if (!c.materia_id) continue
      const e = porMateria.get(c.materia_id)
        ?? { nombre: c.materias?.nombre ?? 'Materia', total: 0, acred: 0, suma: 0, conNota: 0 }
      e.total += 1
      if (c.acreditado) e.acred += 1
      if (typeof c.calificacion === 'number') { e.suma += c.calificacion; e.conNota += 1 }
      porMateria.set(c.materia_id, e)
    }
    const hojaRendimiento = [...porMateria.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(m => ({
        'Materia':            m.nombre,
        'Calificaciones':     m.total,
        'Acreditados':        m.acred,
        'No acreditados':     m.total - m.acred,
        '% de acreditación':  m.total ? Math.round((m.acred / m.total) * 100) : 0,
        'Promedio':           m.conNota ? Number((m.suma / m.conNota).toFixed(1)) : '',
      }))

    // ── Hojas 5 y 6 · Ingresos ─────────────────────────────────────────────
    // Si la migración de reportes no estuviera aplicada, la RPC falla y la hoja
    // sale vacía en vez de tumbar la descarga entera.
    const filasMes = (!mesRes.error && Array.isArray(mesRes.data) ? mesRes.data : []) as Record<string, unknown>[]
    const hojaMes = filasMes.map(r => ({
      'Mes':                 mesLegible(String(r.mes)),
      'Programa (MXN)':      Number(r.programa ?? 0),
      'Diplomados (MXN)':    Number(r.cursos ?? 0),
      'Total (MXN)':         Number(r.total ?? 0),
    }))

    const filasSem = (!semRes.error && Array.isArray(semRes.data) ? semRes.data : []) as Record<string, unknown>[]
    const hojaSemana = filasSem.map(r => ({
      'Semana del':          soloFecha(String(r.semana_inicio)),
      'Programa (MXN)':      Number(r.programa ?? 0),
      'Diplomados (MXN)':    Number(r.cursos ?? 0),
      'Total (MXN)':         Number(r.total ?? 0),
    }))

    // ── Hoja 1 · Resumen ───────────────────────────────────────────────────
    const totalIngresos = pagos.reduce((s, p) => s + Number(p.monto ?? 0), 0)
    const ingresosMes = hojaMes.length ? hojaMes[hojaMes.length - 1]['Total (MXN)'] : 0
    const hoy = new Date()
    const hojaResumen = [
      { Concepto: 'Institución',             Valor: CONFIG.nombreCompleto },
      { Concepto: 'Generado',                Valor: hoy.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) },
      { Concepto: 'Total de alumnos',        Valor: alumnos.length },
      { Concepto: 'Alumnos activos',         Valor: alumnos.filter(a => a.activo !== false).length },
      { Concepto: 'Con inscripción pagada',  Valor: alumnos.filter(a => a.inscripcion_pagada).length },
      { Concepto: 'Pagos registrados',       Valor: pagos.length },
      { Concepto: 'Ingresos del mes (MXN)',  Valor: ingresosMes },
      { Concepto: 'Ingresos totales (MXN)',  Valor: totalIngresos },
      { Concepto: 'Materias con calificaciones', Valor: hojaRendimiento.length },
    ]

    // ── Libro ──────────────────────────────────────────────────────────────
    // Cada hoja lleva su fila de encabezados aunque no haya datos: un .xlsx con
    // una pestaña en blanco parece roto; con encabezados se lee como "todavía
    // no hay nada aquí", que es la verdad de un cliente recién entregado.
    const wb = XLSX.utils.book_new()
    const hoja = (filas: Record<string, unknown>[], encabezados: string[]) =>
      filas.length
        ? XLSX.utils.json_to_sheet(filas)
        : XLSX.utils.aoa_to_sheet([encabezados])

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaResumen), 'Resumen')
    XLSX.utils.book_append_sheet(wb, hoja(hojaPagos,       ['Fecha', 'Alumno', 'Matrícula', 'Nivel', 'Concepto', 'Mes que abrió', 'Monto (MXN)', 'Método', 'Referencia', 'Registrado por']), 'Pagos')
    XLSX.utils.book_append_sheet(wb, hoja(hojaAlumnos,     ['Matrícula', 'Alumno', 'Correo', 'Teléfono', 'Nivel', 'Modalidad', 'Inscripción pagada', 'Meses desbloqueados', 'Estado', 'Fecha de inscripción']), 'Alumnos')
    XLSX.utils.book_append_sheet(wb, hoja(hojaRendimiento, ['Materia', 'Calificaciones', 'Acreditados', 'No acreditados', '% de acreditación', 'Promedio']), 'Rendimiento')
    XLSX.utils.book_append_sheet(wb, hoja(hojaMes,         ['Mes', 'Programa (MXN)', 'Diplomados (MXN)', 'Total (MXN)']), 'Ingresos por mes')
    XLSX.utils.book_append_sheet(wb, hoja(hojaSemana,      ['Semana del', 'Programa (MXN)', 'Diplomados (MXN)', 'Total (MXN)']), 'Ingresos semanal')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const slug = CONFIG.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const fecha = new Date().toISOString().slice(0, 10)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reportes-${slug}-${fecha}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/reportes/excel]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
