/**
 * Landing pública — Server Component.
 *
 * Existe SOLO para resolver el catálogo de diplomados del lado del servidor y
 * pasárselo ya cocido a `LandingClient`, que es el componente de siempre (el
 * mismo archivo de antes, movido a src/components/landing/).
 *
 * ⚠️ POR QUÉ ESTE ENVOLTORIO. La landing necesita animaciones y estado, así que
 * es `'use client'`; y el invariante de B2 es que ningún componente cliente lee
 * tablas `curso_*` — el navegador tiene la anon key y podría repetir la consulta
 * a mano. Sin este Server Component habría que abrir la RLS a `anon` o hacer un
 * fetch desde el cliente: las dos cosas son justo lo que B2 cerró.
 *
 * CON EL FLAG APAGADO (el default, y el estado de los 144 clientes
 * tradicionales) no se consulta la base y `catalogo` va vacío: la landing
 * renderiza exactamente lo mismo que antes de B5.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FRESCURA DEL CATÁLOGO (B8.2) — cómo se mantiene al día una página ESTÁTICA.
 *
 * Esta página se prerenderiza en el build y así se queda: es el invariante de
 * los 144 clientes tradicionales. Pero con el catálogo encendido su contenido
 * es ADMINISTRABLE — publicar o editar un diplomado debe verse sin redeploy.
 *
 * La solución NO vive aquí: las mutaciones de admin que cambian lo que esta
 * página pinta llaman `revalidatePath('/')` (ver src/lib/cursos/catalogo.ts,
 * `purgarCatalogoPublico`). Eso purga la Full Route Cache de esta ruta y la
 * siguiente petición la regenera con datos frescos, sin volverla dinámica.
 *
 * Dos remedios ANTERIORES se quitaron a propósito — no los restaures:
 *   - `export const revalidate = CONFIG…? 60 : false` — la config de segmento
 *     de Next se extrae ESTÁTICAMENTE en build; un export no-literal se ignora
 *     en silencio. Parecía aplicado y no existía (Bug 82 del PLAYBOOK).
 *   - `noStore()` — destapa la Data Cache, pero el HTML viejo lo servía la
 *     Full Route Cache: el dato fresco jamás llegaba a renderizarse.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { CONFIG } from '@/lib/config'
import { listarCatalogoPublico } from '@/lib/cursos/catalogo'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function LandingPage() {
  const catalogo = CONFIG.landing.mostrarCatalogoCursos
    ? await listarCatalogoPublico()
    : []

  return <LandingClient catalogo={catalogo} />
}
