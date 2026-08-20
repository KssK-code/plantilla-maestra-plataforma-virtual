/**
 * Envoltorio de storage-comun.ts atado al bucket 'cursos'. Existe para que los
 * consumidores del módulo Cursos sigan llamando signedUrl(admin, path) sin
 * repetir el bucket en cada llamada.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { BUCKET_CURSOS } from './archivos'
import { signedUrl as signedUrlComun, removeFolder as removeFolderComun, SIGNED_URL_TTL } from '@/lib/storage-comun'

export { SIGNED_URL_TTL }

export function signedUrl(admin: SupabaseClient, path: string | null | undefined) {
  return signedUrlComun(admin, BUCKET_CURSOS, path)
}

export function removeFolder(admin: SupabaseClient, prefix: string) {
  return removeFolderComun(admin, BUCKET_CURSOS, prefix)
}
