import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    // Usar admin client para bypass RLS
    const admin = createAdminClient()

    const { data: materia, error } = await admin
      .from('materias')
      .select(`
        id, nombre, descripcion, nivel, color, activa,
        meses_contenido (
          id, numero_mes, titulo,
          semanas (
            id, numero_semana, titulo,
            video_url, video_url_2, video_url_3
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !materia) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ materia })
  } catch (err) {
    console.error('[GET /api/admin/contenido/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
