import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const admin = createAdminClient()

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)

    // Añadir cache-busting para forzar recarga del navegador
    const urlConTimestamp = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await admin
      .from('usuarios')
      .update({ avatar_url: urlConTimestamp })
      .eq('id', user.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ url: urlConTimestamp })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
