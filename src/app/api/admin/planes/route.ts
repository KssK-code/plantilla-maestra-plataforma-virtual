import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('planes_estudio')
      .select('id, nombre, duracion_meses, precio_mensual')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.warn('[GET /api/admin/planes]', error.message)
      return NextResponse.json([])
    }

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
