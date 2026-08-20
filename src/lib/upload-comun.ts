/**
 * Subida de archivos SIN pasar por el body de las API routes. Vercel corta
 * bodies > 4.5MB (413), así que los archivos van DIRECTO del navegador a
 * Supabase Storage con una signed upload URL de un solo uso:
 *   1. POST {action:'upload-url'} → el server valida y emite {path, token}
 *   2. uploadToSignedUrl(path, token, file) → navegador → Storage (hasta 10MB)
 *   3. POST {action:'confirm', path, ...extra} → el server verifica el objeto y
 *      escribe en la DB.
 *
 * El bucket es PARÁMETRO: salió de lib/cursos/upload.ts al aparecer el segundo
 * consumidor (los materiales de semana).
 */
import { createClient } from '@/lib/supabase/client'

export type ResultadoSubida =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; error: string }

export async function subirArchivo(
  endpoint: string,
  bucket: string,
  file: File,
  extraConfirm: Record<string, unknown> = {},
): Promise<ResultadoSubida> {
  let r1: Response
  try {
    r1 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-url', filename: file.name, size: file.size, type: file.type }),
    })
  } catch {
    return { ok: false, error: 'Sin conexión al preparar la subida' }
  }
  const j1 = (await r1.json().catch(() => ({}))) as { path?: string; token?: string; error?: string }
  if (!r1.ok || !j1.path || !j1.token) {
    return { ok: false, error: j1.error ?? 'No se pudo preparar la subida' }
  }

  const supabase = createClient()
  const { error: upError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(j1.path, j1.token, file, { contentType: file.type })
  if (upError) {
    return { ok: false, error: `No se pudo subir el archivo: ${upError.message}` }
  }

  let r3: Response
  try {
    r3 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', path: j1.path, ...extraConfirm }),
    })
  } catch {
    return { ok: false, error: 'El archivo se subió pero no se pudo confirmar (revisa tu conexión y reintenta)' }
  }
  const j3 = (await r3.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!r3.ok) {
    return { ok: false, error: j3.error ?? 'La subida no se pudo confirmar' }
  }
  return { ok: true, json: j3 }
}
