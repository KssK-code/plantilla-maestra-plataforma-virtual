import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

/**
 * GET /api/admin/alumnos/pendientes-count
 * Retorna el número de alumnos con inscripcion_pagada=false y contactado_whatsapp=false
 * (los que todavía no han sido contactados por Control Escolar).
 * Devuelve { count: 0 } en caso de error para no romper el sidebar.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return NextResponse.json({ count: 0 })

    const admin = createAdminClient()

    const { count, error } = await admin
      .from('alumnos')
      .select('id', { count: 'exact', head: true })
      .eq('inscripcion_pagada', false)
      .eq('contactado_whatsapp', false)

    if (error) {
      console.error('[GET /api/admin/alumnos/pendientes-count]', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch (err) {
    console.error('[GET /api/admin/alumnos/pendientes-count]', err)
    return NextResponse.json({ count: 0 })
  }
}
