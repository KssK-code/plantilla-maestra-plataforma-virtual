import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ESCUELA_CONFIG } from '@/lib/config'
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

    const { count: totalPlanes, error: ePlan } = await admin
      .from('planes_estudio')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    return NextResponse.json({
      escuela: ESCUELA_CONFIG,
      sistema: {
        version: '1.0.0',
        total_materias: eMat ? 0 : (totalMaterias ?? 0),
        total_planes: ePlan ? 0 : (totalPlanes ?? 0),
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
      message: 'Para modificar la configuración, edita el archivo src/lib/config.ts y redeploy.',
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
