import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ESCUELA_CONFIG, CONFIG } from '@/lib/config'
import { getModalidadesActivas, getModalidadesLicenciatura } from '@/lib/modalidades'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { count: totalMaterias, error: eMat } = await admin
      .from('materias')
      .select('*', { count: 'exact', head: true })

    // ⚠️ `planes_estudio` NO existe en el esquema vivo: es un vestigio del
    // schema EDVEX previo. La consulta fallaba con PGRST205 y el ternario
    // devolvía 0 en silencio, así que el panel mostraba "0 Planes activos" en
    // clientes con el contenido completo y alumnos ya inscritos — leído por el
    // cliente como "no puedo operar" (TICKET-2026-09-02-26). Los planes salen
    // de CONFIG, la misma fuente que consume el registro público.
    const licCfg = (CONFIG as { licenciaturas?: { activas?: boolean; carreras?: readonly unknown[] } }).licenciaturas
    const totalPlanes =
      getModalidadesActivas().length +
      (licCfg?.activas ? (licCfg.carreras?.length ?? 0) * getModalidadesLicenciatura().length : 0)

    return NextResponse.json({
      escuela: {
        ...ESCUELA_CONFIG,
        // El panel lee estas claves con estos nombres exactos, pero CONFIG las
        // guarda en otra ruta (`colores.primario` / `colores.secundario`) y no
        // siempre define `slug`: sin este mapeo el identificador salía como
        // "—" y los swatches de marca en blanco, en toda la flota.
        slug:            (ESCUELA_CONFIG as { slug?: string }).slug ?? ESCUELA_CONFIG.dominio ?? null,
        colorPrimario:   CONFIG.colores.primario,
        colorSecundario: CONFIG.colores.secundario,
      },
      sistema: {
        version: '1.0.0',
        total_materias: eMat ? 0 : (totalMaterias ?? 0),
        total_planes: totalPlanes,
        fecha_deploy: new Date().toISOString().split('T')[0],
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    return NextResponse.json({
      success: true,
      message: 'Estos datos son de solo lectura desde el panel. Contacta a soporte para modificarlos.',
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
