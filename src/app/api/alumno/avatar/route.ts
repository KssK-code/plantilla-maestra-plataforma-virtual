import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AVATAR_BUCKET, urlDeAvatar } from '@/lib/avatar'

/** Lo que el bucket acepta. El límite real de tamaño lo pone Supabase. */
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const EXT_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // `formData()` LANZA si el cuerpo no es multipart (o si no viene cuerpo).
    // Sin este try, una petición mal armada terminaba en el catch de abajo y
    // se respondía 500: un error del cliente contado como falla del servidor.
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { error: 'La petición debe enviar la imagen como multipart/form-data.' },
        { status: 400 },
      )
    }

    const file = formData.get('avatar') as File | null
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })
    }

    // La extensión sale del tipo MIME, no del nombre del archivo: el nombre lo
    // controla quien sube y `foto.png.exe` habría entrado tal cual al bucket.
    const tipo = (file.type || '').toLowerCase()
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: 'Formato no admitido. Usa JPG, PNG o WebP.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'La imagen supera los 5 MB.' },
        { status: 400 },
      )
    }

    const ext = EXT_POR_TIPO[tipo]
    const path = `${user.id}.${ext}`
    const buffer = new Uint8Array(await file.arrayBuffer())

    const admin = createAdminClient()

    const { error: uploadError } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, { contentType: tipo, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // Si el alumno cambia de formato (png -> jpg), el archivo anterior queda
    // huérfano en el bucket y `foto_url` ya no lo apunta. Se limpia aquí.
    const sobrantes = Object.values(EXT_POR_TIPO)
      .filter(e => e !== ext)
      .map(e => `${user.id}.${e}`)
    if (sobrantes.length > 0) {
      await admin.storage.from(AVATAR_BUCKET).remove(sobrantes)
    }

    // Se guarda la RUTA, no una URL. Una URL firmada caduca —guardarla dejaría
    // la foto rota al vencer el token— y la pública no sirve porque el bucket
    // es privado. Ver src/lib/avatar.ts.
    const { error: updateError } = await admin
      .from('usuarios')
      .update({ foto_url: path })
      .eq('id', user.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Se devuelve ya firmada para que la pantalla actualice sin recargar.
    const url = await urlDeAvatar(admin, path)

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[POST /api/alumno/avatar]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
