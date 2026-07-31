import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

function nombreCompleto(u: { nombre?: string | null; apellidos?: string | null } | null | undefined) {
  return [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || '—'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { count: totalAlumnos } = await admin
      .from('alumnos')
      .select('*', { count: 'exact', head: true })

    const { data: alumnosData } = await admin
      .from('alumnos')
      .select('id, meses_desbloqueados, activo')

    type AlumnoR = { id: string; meses_desbloqueados: number; activo: boolean }
    const alumnosList = (alumnosData ?? []) as AlumnoR[]
    const alumnosActivos = alumnosList.filter(a => a.activo !== false).length
    const promMeses = alumnosList.length > 0
      ? alumnosList.reduce((s, a) => s + (a.meses_desbloqueados ?? 0), 0) / alumnosList.length
      : 0

    let pagosList: { monto: number; alumno_id: string; concepto?: string | null; metodo_pago: string; referencia?: string | null; fecha_pago: string }[] = []
    const pagosRes = await admin
      .from('pagos')
      .select('monto, alumno_id, concepto, metodo_pago, referencia, fecha_pago')
    if (!pagosRes.error && pagosRes.data) {
      pagosList = pagosRes.data as typeof pagosList
    }

    const pagosAlumnoIds = [...new Set(pagosList.map(p => p.alumno_id))]
    const { data: usuariosPagos } = pagosAlumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', pagosAlumnoIds)
      : { data: [] as { id: string; nombre?: string; apellidos?: string }[] }

    const uMap = new Map((usuariosPagos ?? []).map(u => [u.id, u]))

    const totalIngresos = pagosList.reduce((s, p) => s + Number(p.monto ?? 0), 0)

    const pagosOrdenados = pagosList
      .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())

    const pagosRecientes = pagosOrdenados
      .slice(0, 20)
      .map(p => ({
        alumno: nombreCompleto(uMap.get(p.alumno_id)),
        monto: p.monto,
        metodo_pago: p.metodo_pago,
        fecha_pago: p.fecha_pago,
      }))

    const ultimosPagos = pagosOrdenados
      .slice(0, 20)
      .map(p => ({
        alumno: nombreCompleto(uMap.get(p.alumno_id)),
        monto: p.monto,
        concepto: p.concepto ?? 'mensualidad',
        metodo_pago: p.metodo_pago,
        referencia: p.referencia ?? null,
        fecha_pago: p.fecha_pago,
      }))

    // Desglose por semana (lunes, 8 últimas) y por mes (6 últimos) — agregado
    // server-side con GROUP BY date_trunc (RPC), no en JS. Degrada a [] si la
    // función aún no existe en la BD (migración 20260716150000 sin aplicar).
    //
    // B6: cada periodo trae además `programa` y `cursos`. `total` NO cambió de
    // significado ni de nombre — sigue siendo la suma de todo, para no romper a
    // quien ya lo lee. Si la BD todavía tiene la versión vieja de la función,
    // esas dos columnas llegan undefined y quedan en 0: el desglose desaparece,
    // el total sigue bien.
    let ingresosSemanales: { semana_inicio: string; total: number; programa: number; cursos: number }[] = []
    let ingresosMensuales: { mes: string; total: number; programa: number; cursos: number }[] = []
    const [semRes, mesRes] = await Promise.all([
      admin.rpc('reporte_ingresos_semanales', { num_semanas: 8 }),
      admin.rpc('reporte_ingresos_mensuales', { num_meses: 6 }),
    ])
    if (!semRes.error && Array.isArray(semRes.data)) {
      ingresosSemanales = (semRes.data as Record<string, unknown>[])
        .map(r => ({
          semana_inicio: String(r.semana_inicio),
          total:    Number(r.total ?? 0),
          programa: Number(r.programa ?? 0),
          cursos:   Number(r.cursos ?? 0),
        }))
    }
    if (!mesRes.error && Array.isArray(mesRes.data)) {
      ingresosMensuales = (mesRes.data as Record<string, unknown>[])
        .map(r => ({
          mes:      String(r.mes),
          total:    Number(r.total ?? 0),
          programa: Number(r.programa ?? 0),
          cursos:   Number(r.cursos ?? 0),
        }))
    }

    // Ingresos del mes en curso: mismo corte SQL America/Mexico_City que el
    // desglose de 6 meses (su último elemento ES el mes actual) — antes se
    // cortaba con Date de JS en la TZ del servidor (UTC en Vercel), desfasando
    // hasta 6h los pagos de fin de mes respecto a la gráfica mensual.
    // Fallback JS solo si la migración 20260716150000 no está aplicada.
    let ingresosMesActual: number
    if (ingresosMensuales.length > 0) {
      ingresosMesActual = ingresosMensuales[ingresosMensuales.length - 1].total
    } else {
      const ahora = new Date()
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      ingresosMesActual = pagosList
        .filter(p => new Date(`${p.fecha_pago}T12:00:00`) >= inicioMes)
        .reduce((s, p) => s + Number(p.monto ?? 0), 0)
    }

    const { data: califs } = await admin
      .from('calificaciones')
      .select('materia_id, acreditado, materias(nombre)')

    type CalifR = {
      materia_id: string
      acreditado: boolean
      materias: { nombre: string } | null
    }
    const califsList = (califs ?? []) as unknown as CalifR[]

    const materiaMap = new Map<string, { codigo: string; nombre: string; aprobados: number; reprobados: number }>()
    for (const c of califsList) {
      if (!c.materia_id) continue
      if (!materiaMap.has(c.materia_id)) {
        materiaMap.set(c.materia_id, {
          codigo: '',
          nombre: c.materias?.nombre ?? '',
          aprobados: 0,
          reprobados: 0,
        })
      }
      const entry = materiaMap.get(c.materia_id)!
      if (c.acreditado) entry.aprobados++
      else entry.reprobados++
    }

    const rendimientoMaterias = Array.from(materiaMap.entries()).map(([id, v]) => {
      const total = v.aprobados + v.reprobados
      return {
        materia_id: id,
        codigo: v.codigo,
        nombre: v.nombre,
        total_cursaron: total,
        aprobados: v.aprobados,
        reprobados: v.reprobados,
        porcentaje_aprobacion: total > 0 ? Math.round((v.aprobados / total) * 100) : 0,
      }
    }).sort((a, b) => b.total_cursaron - a.total_cursaron)

    // ── VERTICAL DE CURSOS (B6) ──────────────────────────────────────────────
    // Hasta B6 este módulo no sabía NADA de diplomados: un cliente Solo-Cursos
    // abría Reportes y no veía un solo dato de su negocio.
    //
    // Las cuatro funciones son de B6 y las tres tablas base son del módulo
    // opcional de Cursos. En un cliente tradicional (sin ese módulo) las RPC
    // fallan, y eso es NORMAL, no un error que valga la pena reportar: todo
    // degrada a listas vacías y `tiene_datos` queda en false, con lo que la UI
    // no pinta la sección. Por eso no se loguea el error de estas cuatro.
    const [insRes, pagCurRes, consRes, avanRes, cohRes] = await Promise.all([
      admin.rpc('reporte_curso_inscripciones'),
      admin.rpc('reporte_curso_pagos'),
      admin.rpc('reporte_curso_constancias'),
      admin.rpc('reporte_curso_avance'),
      admin.rpc('reporte_coherencia_pagos'),
    ])

    const arr = (r: { error: unknown; data: unknown }) =>
      !r.error && Array.isArray(r.data) ? (r.data as Record<string, unknown>[]) : []

    const inscripcionesCurso = arr(insRes)
    const pagosCurso         = arr(pagCurRes)
    const constanciasCurso   = arr(consRes)
    const avanceCurso        = arr(avanRes)

    const ingresosCursos = pagosCurso.reduce((s, p) => s + Number(p.monto ?? 0), 0)

    // Agregado por diplomado: es la vista que de verdad usa quien dirige la
    // escuela ("¿cuál se vende?"), y no existe en ninguna otra pantalla.
    const porDiplomado = new Map<string, { diplomado: string; inscritos: number; activos: number; ingresos: number }>()
    for (const i of inscripcionesCurso) {
      const k = String(i.diplomado ?? '—')
      if (!porDiplomado.has(k)) porDiplomado.set(k, { diplomado: k, inscritos: 0, activos: 0, ingresos: 0 })
      const e = porDiplomado.get(k)!
      e.inscritos++
      if (i.estado === 'activa') e.activos++
    }
    for (const p of pagosCurso) {
      const k = String(p.diplomado ?? '—')
      if (!porDiplomado.has(k)) porDiplomado.set(k, { diplomado: k, inscritos: 0, activos: 0, ingresos: 0 })
      porDiplomado.get(k)!.ingresos += Number(p.monto ?? 0)
    }

    // La coherencia entre los dos criterios de clasificación (FK vs concepto).
    // Se expone SIEMPRE que la función exista; la UI solo avisa si hay > 0.
    const coh = (!cohRes.error && Array.isArray(cohRes.data) ? cohRes.data[0] : null) as Record<string, unknown> | null

    const cursos = {
      // Gobierna si la UI pinta la sección. Un cliente tradicional nunca la ve.
      tiene_datos: inscripcionesCurso.length > 0 || pagosCurso.length > 0,
      inscripciones_totales: inscripcionesCurso.length,
      inscripciones_activas: inscripcionesCurso.filter(i => i.estado === 'activa').length,
      constancias_emitidas: constanciasCurso.length,
      ingresos_cursos: ingresosCursos,
      por_diplomado: Array.from(porDiplomado.values()).sort((a, b) => b.ingresos - a.ingresos),
      avance: avanceCurso.map(a => ({
        alumno: String(a.alumno ?? '—'),
        diplomado: String(a.diplomado ?? '—'),
        lecciones_completadas: Number(a.lecciones_completadas ?? 0),
        lecciones_totales: Number(a.lecciones_totales ?? 0),
        porcentaje: Number(a.porcentaje ?? 0),
      })),
      constancias: constanciasCurso.map(c => ({
        folio: String(c.folio ?? ''),
        alumno: String(c.alumno_nombre ?? ''),
        diplomado: String(c.curso_nombre ?? ''),
        calificacion: c.calificacion === null || c.calificacion === undefined ? null : Number(c.calificacion),
        horas: c.horas === null || c.horas === undefined ? null : Number(c.horas),
        emitido_en: c.emitido_en ? String(c.emitido_en) : null,
      })),
    }

    const coherencia = coh
      ? {
          concepto_curso_sin_inscripcion: Number(coh.concepto_curso_sin_inscripcion ?? 0),
          inscripcion_con_concepto_programa: Number(coh.inscripcion_con_concepto_programa ?? 0),
        }
      : null

    return NextResponse.json({
      stats: {
        total_alumnos: totalAlumnos ?? 0,
        alumnos_activos: alumnosActivos,
        total_ingresos: totalIngresos,
        promedio_meses: Math.round(promMeses * 10) / 10,
      },
      rendimiento_materias: rendimientoMaterias,
      pagos_recientes: pagosRecientes,
      // Módulo de pagos (Panel Admin Unificado) — campos nuevos, no romper los anteriores
      ingresos_mes_actual: ingresosMesActual,
      ingresos_totales: totalIngresos,
      ultimos_pagos: ultimosPagos,
      // Fase 4 — desglose de tendencia (solo agrega, no rompe lo anterior)
      ingresos_ultimas_8_semanas: ingresosSemanales,
      ingresos_ultimos_6_meses: ingresosMensuales,
      // B6 — vertical de cursos y salud de la clasificación de pagos
      cursos,
      coherencia,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
