import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { armarCSV, nombreArchivoSeguro } from '@/lib/reportes/csv'

/**
 * GET /api/admin/reportes/export?dataset=...
 *
 * Descarga en CSV los datos del vertical de Cursos. ADMIN-ONLY, igual que el
 * resto del módulo de Reportes: aquí sale el padrón completo de inscritos con
 * matrícula y correo, y los pagos con quién los registró.
 *
 * Cada dataset es su propia descarga en vez de un solo archivo con varias
 * hojas: un ZIP o un .xlsx exigirían una dependencia nueva (ver src/lib/reportes/csv.ts),
 * y contabilidad abre estos CSV en Excel igual.
 *
 * El armado va server-side sobre funciones SQL (B6) — no se traen filas crudas
 * al endpoint para agregarlas en JS.
 */

const DATASETS = {
  inscripciones: {
    rpc: 'reporte_curso_inscripciones',
    encabezados: ['Alumno', 'Matrícula', 'Correo', 'Diplomado', 'Tipo', 'Estado', 'Fecha de inscripción',
                  'Meses abiertos', 'Tope de meses', 'Módulos visibles', 'Módulos totales', 'Vencimiento'],
    fila: (r: Record<string, unknown>) => [
      r.alumno, r.matricula, r.email, r.diplomado, r.tipo, r.estado, fecha(r.fecha_inscripcion),
      r.meses_abiertos, r.tope_meses, r.modulos_visibles, r.modulos_totales, r.fecha_vencimiento,
    ],
  },
  pagos: {
    rpc: 'reporte_curso_pagos',
    encabezados: ['Fecha', 'Alumno', 'Matrícula', 'Diplomado', 'Concepto', 'Monto', 'Método',
                  'Referencia', 'Registrado por', 'Mes que abrió'],
    fila: (r: Record<string, unknown>) => [
      r.fecha_pago, r.alumno, r.matricula, r.diplomado, r.concepto, r.monto, r.metodo_pago,
      r.referencia, r.registrado_por, r.mes_que_abrio,
    ],
  },
  constancias: {
    rpc: 'reporte_curso_constancias',
    encabezados: ['Folio', 'Alumno', 'Diplomado', 'Calificación', 'Horas', 'Fecha de emisión'],
    fila: (r: Record<string, unknown>) => [
      r.folio, r.alumno_nombre, r.curso_nombre, r.calificacion, r.horas, fecha(r.emitido_en),
    ],
  },
  avance: {
    rpc: 'reporte_curso_avance',
    encabezados: ['Alumno', 'Matrícula', 'Diplomado', 'Lecciones completadas', 'Lecciones del curso', '% de avance'],
    fila: (r: Record<string, unknown>) => [
      r.alumno, r.matricula, r.diplomado, r.lecciones_completadas, r.lecciones_totales, r.porcentaje,
    ],
  },
} as const

type DatasetId = keyof typeof DATASETS

function fecha(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const pedido = request.nextUrl.searchParams.get('dataset') ?? ''
    // Lista blanca: el parámetro NUNCA se concatena a un nombre de función.
    // Sin esto, `?dataset=` sería una invitación a invocar RPCs arbitrarias.
    if (!Object.prototype.hasOwnProperty.call(DATASETS, pedido)) {
      return NextResponse.json(
        { error: `Dataset inválido. Usa: ${Object.keys(DATASETS).join(', ')}` },
        { status: 400 }
      )
    }
    const def = DATASETS[pedido as DatasetId]

    const admin = createAdminClient()
    const { data, error } = await admin.rpc(def.rpc)

    if (error) {
      console.error(`[GET /api/admin/reportes/export] ${def.rpc}:`, error.message)
      return NextResponse.json(
        { error: 'No se pudo generar el reporte. ¿Está aplicada la migración 20260730160000_b6_reportes_por_vertical.sql?' },
        { status: 500 }
      )
    }

    const filas = ((data ?? []) as Record<string, unknown>[]).map(def.fila)
    const csv = armarCSV([...def.encabezados], filas as unknown[][])
    const hoy = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nombreArchivoSeguro(pedido, hoy)}"`,
        // Un padrón de alumnos no se cachea en ningún proxy intermedio.
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/reportes/export]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
