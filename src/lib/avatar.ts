import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Foto de perfil del usuario (`usuarios.foto_url`).
 *
 * ── El bug que cierra este archivo ───────────────────────────────────────
 * `POST /api/alumno/avatar` guardaba en la columna `avatar_url`, que no
 * existe —la real es `foto_url`—, así que el alta terminaba en 500 y NINGÚN
 * alumno podía subir su foto. Y aunque la columna hubiera sido la correcta,
 * la URL se armaba con `getPublicUrl()` sobre el bucket `avatars`, que es
 * PRIVADO y además no tiene ni una policy de lectura: esa URL responde 400
 * para todo el mundo, incluido el propio dueño de la foto.
 *
 * ── La convención que se restablece ──────────────────────────────────────
 * En esta plantilla, un bucket privado guarda la RUTA en la base y firma al
 * leer — es lo que ya hacían `documentos` (src/app/api/alumno/documentos)
 * y `cursos` (src/lib/cursos/storage.ts). El avatar era la excepción y por
 * eso era el único roto. Ahora `foto_url` guarda `"<uid>.<ext>"` y la URL
 * mostrable se produce aquí.
 *
 * Firmar exige service role: sin policies sobre el bucket, la sesión del
 * propio alumno no alcanza sus archivos. Por eso todas estas funciones piden
 * un cliente admin y solo se pueden llamar desde el servidor.
 */

export const AVATAR_BUCKET = 'avatars'

/** 1 hora, igual que documentos y cursos. */
export const AVATAR_TTL = 3600

/**
 * Convierte lo que haya en `usuarios.foto_url` en una URL que el navegador
 * pueda mostrar.
 *
 * Acepta los tres formatos que pueden convivir en la columna:
 *
 *  1. Ruta de storage (`"<uid>.png"`) — lo que se guarda desde este fix.
 *  2. URL pública heredada del bucket `avatars`, con o sin `?t=` de
 *     cache-busting. Son las filas que dejó el código anterior en clientes ya
 *     desplegados: la ruta se extrae y se vuelve a firmar, así que esas fotos
 *     se recuperan solas sin migración de datos.
 *  3. Cualquier otra URL absoluta (un avatar externo) — se devuelve tal cual.
 *
 * Nunca lanza: una foto que no se puede firmar vale mucho menos que la
 * pantalla que la contiene, así que ante cualquier fallo devuelve null y la
 * UI cae a sus iniciales.
 */
export async function urlDeAvatar(
  admin: SupabaseClient,
  valor: string | null | undefined,
): Promise<string | null> {
  const ruta = rutaDeAvatar(valor)
  if (!ruta) {
    const v = (valor ?? '').trim()
    // Caso 3: URL externa que no es de este bucket — se respeta.
    return /^https?:\/\//i.test(v) ? v : null
  }

  try {
    const { data, error } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(ruta, AVATAR_TTL)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}

/**
 * Versión por LOTE, para listados.
 *
 * Firmar en un `.map()` dispara una petición a Storage por alumno; con un
 * padrón de varios cientos eso convierte una consulta en una tormenta. Aquí se
 * firma todo de una sola llamada (`createSignedUrls`) y se devuelve un mapa
 * `valor guardado -> URL mostrable`, listo para consultar dentro del map.
 *
 * Los valores que no son rutas del bucket (URLs externas) entran al mapa tal
 * cual, sin gastar firma.
 */
export async function urlesDeAvatar(
  admin: SupabaseClient,
  valores: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, string>> {
  const salida = new Map<string, string>()

  // valor original -> ruta. Se deduplica por ruta: dos filas pueden apuntar al
  // mismo archivo y no tiene sentido firmarlo dos veces.
  const porRuta = new Map<string, string[]>()
  for (const v of valores) {
    const bruto = (v ?? '').trim()
    if (!bruto) continue
    const ruta = rutaDeAvatar(bruto)
    if (!ruta) {
      if (/^https?:\/\//i.test(bruto)) salida.set(bruto, bruto)
      continue
    }
    const previos = porRuta.get(ruta)
    if (previos) previos.push(bruto)
    else porRuta.set(ruta, [bruto])
  }

  const rutas = [...porRuta.keys()]
  if (rutas.length === 0) return salida

  try {
    const { data, error } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrls(rutas, AVATAR_TTL)
    if (error || !data) return salida

    for (const item of data) {
      if (!item?.signedUrl || !item.path) continue
      for (const original of porRuta.get(item.path) ?? []) {
        salida.set(original, item.signedUrl)
      }
    }
  } catch {
    // Sin firmas, la UI cae a las iniciales. No se rompe el listado.
  }

  return salida
}

/**
 * Extrae la ruta dentro del bucket. Devuelve null si el valor es una URL que
 * no pertenece a `avatars` (o si está vacío).
 *
 * Exportada aparte porque el borrado necesita la ruta, no la URL firmada.
 */
export function rutaDeAvatar(valor: string | null | undefined): string | null {
  const v = (valor ?? '').trim()
  if (!v) return null

  if (/^https?:\/\//i.test(v)) {
    // Caso 2: URL del bucket. Sirve igual para `/object/public/avatars/…` y
    // para `/object/sign/avatars/…`, que es lo que devuelve una firma previa.
    const marca = `/${AVATAR_BUCKET}/`
    const i = v.indexOf(marca)
    if (i === -1) return null
    const cola = v.slice(i + marca.length).split('?')[0]
    try {
      return decodeURIComponent(cola) || null
    } catch {
      return cola || null
    }
  }

  // Caso 1: ya es una ruta. Se limpian `?` y `/` iniciales por si viene con
  // el cache-busting viejo pegado.
  return v.replace(/^\/+/, '').split('?')[0] || null
}
