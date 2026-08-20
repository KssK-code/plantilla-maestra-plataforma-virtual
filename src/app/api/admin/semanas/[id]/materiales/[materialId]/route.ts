import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { BUCKET_MATERIAS } from '@/lib/materiales-semana'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; materialId: string } },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // El material tiene que ser DE ESA semana: sin este filtro, conociendo un id
    // se podría borrar el material de cualquier otra.
    const { data: material } = await admin
      .from('semana_materiales')
      .select('id, path')
      .eq('id', params.materialId)
      .eq('semana_id', params.id)
      .maybeSingle()
    if (!material) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

    // Primero la fila, después el objeto: si falla el storage queda un huérfano
    // invisible; al revés quedaría una fila apuntando a un archivo que ya no
    // existe, que es lo que el alumno vería como un enlace roto.
    const { error } = await admin.from('semana_materiales').delete().eq('id', params.materialId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.storage.from(BUCKET_MATERIAS).remove([(material as { path: string }).path])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/semanas/[id]/materiales/[materialId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
