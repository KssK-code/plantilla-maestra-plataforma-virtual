import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json()
    const update: Record<string, string | null> = {}
    if ('video_url'   in body) update.video_url   = body.video_url   || null
    if ('video_url_2' in body) update.video_url_2 = body.video_url_2 || null
    if ('video_url_3' in body) update.video_url_3 = body.video_url_3 || null

    const admin = createAdminClient()
    const { error } = await admin
      .from('semanas')
      .update(update)
      .eq('id', params.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/semanas/[id]]', err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
