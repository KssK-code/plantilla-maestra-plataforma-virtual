import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  errorDeRpcCurso, esConceptoCurso, esMetodoPago, fechaValida,
} from '@/lib/cursos/inscripciones'

// ─── POST /api/admin/inscripciones/[id]/pago ─────────────────────────────────
// Registra un pago ligado a la inscripción y, opcionalmente, abre el mes EN LA
// MISMA OPERACIÓN ATÓMICA. Es el caso real: el alumno pagó y el admin hace las
// dos cosas. La atomicidad la da la función de Postgres — desde el cliente de
// Supabase no hay transacciones multi-tabla, así que hacerlo en dos llamadas
// dejaría la puerta a cobrar sin abrir, o abrir sin cobrar.
//
// No es un sistema de pagos paralelo: escribe en la MISMA tabla public.pagos
// que el módulo tradicional, poblando curso_inscripcion_id.
//
// body {
//   monto, metodo_pago, concepto?, referencia?, fecha_pago?,
//   abrir_mes?: boolean (default true), meses_esperados?: number
// }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))

    const monto = Number(body?.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 })
    }
    if (!esMetodoPago(body?.metodo_pago)) {
      return NextResponse.json({ error: 'Método de pago inválido. Usa: EFECTIVO, TRANSFERENCIA, TARJETA, OTRO' }, { status: 400 })
    }
    const concepto = body?.concepto ?? 'curso_mensualidad'
    if (!esConceptoCurso(concepto)) {
      return NextResponse.json({ error: 'Concepto inválido. Usa: curso_mensualidad, curso_inscripcion, curso_otro' }, { status: 400 })
    }
    if (body?.fecha_pago !== undefined && body.fecha_pago !== null && body.fecha_pago !== '' && !fechaValida(body.fecha_pago)) {
      return NextResponse.json({ error: 'fecha_pago inválida. Usa una fecha real en formato YYYY-MM-DD' }, { status: 400 })
    }

    const abrirMes = body?.abrir_mes !== false
    const esperados =
      typeof body?.meses_esperados === 'number' && Number.isInteger(body.meses_esperados)
        ? body.meses_esperados
        : null

    const { data, error } = await supabase.rpc('curso_registrar_pago', {
      p_inscripcion_id: params.id,
      p_monto: monto,
      p_metodo_pago: String(body.metodo_pago).toUpperCase(),
      p_concepto: concepto,
      p_referencia: typeof body?.referencia === 'string' && body.referencia.trim() !== '' ? body.referencia.trim() : null,
      p_fecha_pago: body?.fecha_pago ? body.fecha_pago : null,
      p_abrir_mes: abrirMes,
      p_meses_esperados: esperados,
    })

    if (error) {
      const { status, mensaje } = errorDeRpcCurso(error)
      return NextResponse.json({ error: mensaje }, { status })
    }

    const fila = Array.isArray(data) ? data[0] : data
    return NextResponse.json({
      ok: true,
      pago_id: fila?.pago_id ?? null,
      meses_desbloqueados: fila?.meses_desbloqueados ?? null,
      tope: fila?.tope ?? null,
      abrio_mes: abrirMes,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/inscripciones/[id]/pago]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
