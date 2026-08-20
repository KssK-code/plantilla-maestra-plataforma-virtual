/**
 * Helpers de Storage — SOLO para API routes (reciben el admin client con
 * service role). Los buckets de este proyecto son PRIVADOS: todo se sirve con
 * createSignedUrl, nunca con getPublicUrl.
 *
 * El bucket es PARÁMETRO. Antes vivía cableado dentro de estas funciones, y con
 * dos módulos usándolas eso significaba escribir los archivos de uno en el
 * bucket del otro.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const SIGNED_URL_TTL = 3600 // 1 hora

export async function signedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

/**
 * Borra recursivamente todos los objetos bajo un prefijo.
 * storage.list() no es recursivo: las "carpetas" se detectan porque no tienen id.
 */
export async function removeFolder(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<void> {
  const cleanPrefix = prefix.replace(/\/+$/, '')
  if (!cleanPrefix) return // jamás vaciar el bucket completo por un prefijo vacío

  // list() pagina de a 1000 y aquí vamos BORRANDO lo listado, así que se
  // repite sin offset hasta vaciar; si una pasada no avanza, se corta.
  for (let pasada = 0; pasada < 20; pasada++) {
    const { data: entries, error } = await admin.storage.from(bucket).list(cleanPrefix, { limit: 1000 })
    if (error || !entries || entries.length === 0) return

    const files: string[] = []
    const subfolders: string[] = []
    for (const entry of entries) {
      if (entry.id) files.push(`${cleanPrefix}/${entry.name}`)
      else subfolders.push(`${cleanPrefix}/${entry.name}`)
    }

    let avance = false
    if (files.length > 0) {
      const { error: rmError } = await admin.storage.from(bucket).remove(files)
      if (rmError) console.error(`[storage] error borrando bajo ${cleanPrefix}:`, rmError.message)
      else avance = true
    }
    for (const sub of subfolders) {
      await removeFolder(admin, bucket, sub)
      avance = true
    }
    if (!avance) return
    if (entries.length < 1000 && subfolders.length === 0) return
  }
}
