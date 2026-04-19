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

    let pagosList: { monto: number; alumno_id: string; metodo_pago: string; created_at: string }[] = []
    const pagosRes = await admin
      .from('pagos')
      .select('monto, alumno_id, metodo_pago, created_at')
    if (!pagosRes.error && pagosRes.data) {
      pagosList = pagosRes.data as typeof pagosList
    }

    const pagosAlumnoIds = [...new Set(pagosList.map(p => p.alumno_id))]
    const { data: usuariosPagos } = pagosAlumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', pagosAlumnoIds)
      : { data: [] as { id: string; nombre?: string; apellidos?: string }[] }

    const uMap = new Map((usuariosPagos ?? []).map(u => [u.id, u]))

    const totalIngresos = pagosList.reduce((s, p) => s + (p.monto ?? 0), 0)

    const pagosRecientes = pagosList
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(p => ({
        alumno: nombreCompleto(uMap.get(p.alumno_id)),
        monto: p.monto,
        metodo_pago: p.metodo_pago,
        created_at: p.created_at,
      }))

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

    return NextResponse.json({
      stats: {
        total_alumnos: totalAlumnos ?? 0,
        alumnos_activos: alumnosActivos,
        total_ingresos: totalIngresos,
        promedio_meses: Math.round(promMeses * 10) / 10,
      },
      rendimiento_materias: rendimientoMaterias,
      pagos_recientes: pagosRecientes,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
