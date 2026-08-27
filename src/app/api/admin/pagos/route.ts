import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStaff } from '@/lib/supabase/verify-admin'

const CONCEPTOS = ['inscripcion', 'mensualidad', 'otro'] as const
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'] as const

/**
 * GET /api/admin/pagos
 * Historial GLOBAL de pagos + KPIs, para /admin/pagos. Staff: admin y
 * secretario (el mismo alcance que el POST de abajo; el DELETE sigue
 * admin-only en [id]/route.ts).
 *
 * Query: ?q= (nombre, matrícula o referencia) &concepto= &desde= &hasta=
 *
 * El filtro por texto se resuelve EN EL SERVIDOR sobre las filas ya unidas y
 * no con un `.or()` de PostgREST: `alumnos.nombre.ilike.%x%` dentro de un
 * `.or()` no filtra la tabla embebida, devuelve la fila con el embed en null y
 * el resultado sale plagado de pagos "sin alumno". El volumen de una escuela
 * (miles de pagos, no millones) hace que traerlos y filtrarlos aquí sea
 * correcto y predecible.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyStaff(supabase, user.id)
    if (denied) return denied

    const { searchParams } = new URL(request.url)
    const q        = (searchParams.get('q') ?? '').trim().toLowerCase()
    const concepto = searchParams.get('concepto') || undefined
    const desde    = searchParams.get('desde')    || undefined
    const hasta    = searchParams.get('hasta')    || undefined

    if (concepto && !CONCEPTOS.includes(concepto as typeof CONCEPTOS[number])) {
      return NextResponse.json({ error: `Concepto inválido. Usa: ${CONCEPTOS.join(', ')}` }, { status: 400 })
    }

    const admin = createAdminClient()

    let query = admin
      .from('pagos')
      .select('id, alumno_id, monto, concepto, mes_desbloqueado, metodo_pago, referencia, fecha_pago, created_at')
      .order('fecha_pago', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000)

    if (concepto) query = query.eq('concepto', concepto)
    if (desde)    query = query.gte('fecha_pago', desde)
    if (hasta)    query = query.lte('fecha_pago', hasta)

    const { data: pagosRaw, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pagos = pagosRaw ?? []

    // Datos del alumno en una sola pasada, no un join por fila.
    const ids = [...new Set(pagos.map(p => p.alumno_id))]
    const [{ data: usuarios }, { data: alumnos }] = ids.length
      ? await Promise.all([
          admin.from('usuarios').select('id, nombre, apellidos, telefono').in('id', ids),
          admin.from('alumnos').select('id, matricula, nivel').in('id', ids),
        ])
      : [{ data: [] }, { data: [] }]

    const porUsuario = new Map((usuarios ?? []).map(u => [u.id, u]))
    const porAlumno  = new Map((alumnos  ?? []).map(a => [a.id, a]))

    let filas = pagos.map(p => {
      const u = porUsuario.get(p.alumno_id)
      const a = porAlumno.get(p.alumno_id)
      return {
        ...p,
        monto: Number(p.monto),
        alumno_nombre: [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || 'Alumno',
        // `nivel` viaja porque la mensualidad correcta depende de él: en este
        // cliente prepa y secundaria no cuestan lo mismo.
        alumno_nivel: a?.nivel ?? null,
        matricula: a?.matricula ?? null,
        tiene_telefono: Boolean(u?.telefono),
      }
    })

    if (q) {
      filas = filas.filter(f =>
        f.alumno_nombre.toLowerCase().includes(q)
        || (f.matricula  ?? '').toLowerCase().includes(q)
        || (f.referencia ?? '').toLowerCase().includes(q)
      )
    }

    // KPIs sobre lo que el usuario está viendo, no sobre la tabla entera: si
    // filtró por marzo, "Ingresos del mes" de todo el histórico sería un dato
    // que no corresponde a nada de la pantalla.
    const hoy = new Date()
    const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    const suma = (xs: typeof filas) => xs.reduce((acc, f) => acc + f.monto, 0)

    return NextResponse.json({
      pagos: filas,
      kpis: {
        ingresosMes:      suma(filas.filter(f => (f.fecha_pago ?? '') >= inicioMes)),
        ingresosTotales:  suma(filas),
        pagosRegistrados: filas.length,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/pagos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/pagos
 * Registra un pago manual de un alumno (siempre capturado por admin).
 * Body: { alumno_id, monto, concepto?, mes_desbloqueado?, metodo_pago, referencia? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Staff: el secretario también registra pagos (el DELETE sigue admin-only)
    const denied = await verifyStaff(supabase, user.id)
    if (denied) return denied

    const body = await request.json()
    const { alumno_id, monto, referencia } = body
    const concepto = body.concepto ?? 'mensualidad'
    const metodo_pago = body.metodo_pago

    // fecha_pago editable (YYYY-MM-DD). Si no viene, la BD usa CURRENT_DATE por
    // default. Permite registrar pagos con fecha real/retroactiva. Se valida que
    // sea una fecha REAL (el regex solo no basta: new Date('2026-02-30') hace
    // roll-over y Postgres la rechazaría con un 500 críptico).
    let fechaPago: string | undefined
    if (body.fecha_pago !== undefined && body.fecha_pago !== null && body.fecha_pago !== '') {
      const f = String(body.fecha_pago)
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f)
      const d = m ? new Date(`${f}T12:00:00`) : null
      const esFechaReal = !!m && !!d && !Number.isNaN(d.getTime())
        && d.getFullYear() === Number(m[1])
        && d.getMonth() + 1 === Number(m[2])
        && d.getDate() === Number(m[3])
      if (!esFechaReal) {
        return NextResponse.json({ error: 'fecha_pago inválida. Usa una fecha real en formato YYYY-MM-DD' }, { status: 400 })
      }
      fechaPago = f
    }

    if (typeof alumno_id !== 'string' || !alumno_id) {
      return NextResponse.json({ error: 'El campo alumno_id es requerido' }, { status: 400 })
    }
    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 })
    }
    if (!CONCEPTOS.includes(concepto)) {
      return NextResponse.json({ error: `Concepto inválido. Usa: ${CONCEPTOS.join(', ')}` }, { status: 400 })
    }
    if (typeof metodo_pago !== 'string' || !METODOS.includes(metodo_pago.toUpperCase() as typeof METODOS[number])) {
      return NextResponse.json({ error: `Método de pago inválido. Usa: ${METODOS.join(', ')}` }, { status: 400 })
    }

    // mes_desbloqueado solo aplica a mensualidades; NULL para inscripción/otro
    let mesDesbloqueado: number | null = null
    if (concepto === 'mensualidad' && body.mes_desbloqueado !== undefined && body.mes_desbloqueado !== null && body.mes_desbloqueado !== '') {
      const mes = Number(body.mes_desbloqueado)
      if (!Number.isInteger(mes) || mes <= 0) {
        return NextResponse.json({ error: 'mes_desbloqueado debe ser un entero mayor a 0' }, { status: 400 })
      }
      mesDesbloqueado = mes
    }

    const admin = createAdminClient()

    // Validar que el alumno exista antes de insertar
    const { data: alumno, error: alumnoErr } = await admin
      .from('alumnos')
      .select('id')
      .eq('id', alumno_id)
      .single()
    if (alumnoErr || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const { data: pago, error } = await admin
      .from('pagos')
      .insert({
        alumno_id,
        monto: montoNum,
        concepto,
        mes_desbloqueado: mesDesbloqueado,
        metodo_pago: metodo_pago.toUpperCase(),
        referencia: typeof referencia === 'string' && referencia.trim() !== '' ? referencia.trim() : null,
        registrado_por: user.id,
        ...(fechaPago ? { fecha_pago: fechaPago } : {}),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, pago }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/pagos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
