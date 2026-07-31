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
 */
import { unstable_noStore as noStore } from 'next/cache'
import { CONFIG } from '@/lib/config'
import { listarCatalogoPublico } from '@/lib/cursos/catalogo'
import { LandingClient } from '@/components/landing/LandingClient'

/**
 * ⚠️ REVALIDACIÓN — lo encontró el E2E de B8.1, y sin esto el catálogo NO SIRVE.
 *
 * La landing se prerenderiza en el build. Con `mostrarCatalogoCursos` encendido
 * eso significaba que `listarCatalogoPublico()` corría UNA vez, al compilar, y
 * el HTML quedaba congelado: el cliente publicaba un diplomado nuevo desde el
 * panel y **no aparecía nunca** hasta el siguiente deploy. Verificado en el
 * E2E: el `index.html` prerenderizado traía cero referencias al curso creado
 * minutos después.
 *
 * El valor es CONDICIONAL a propósito:
 *   - Flag apagado (los 144 tradicionales): `false` = estática de siempre, sin
 *     revalidación, sin una sola consulta. La landing no cambia en nada.
 *   - Flag encendido: revalida cada 60 s, así que un diplomado recién publicado
 *     sale solo. Sigue sirviéndose de caché — no es render por petición.
 *
 * `CONFIG.landing.mostrarCatalogoCursos` es una constante de build, así que
 * Next resuelve esta expresión al compilar igual que si fuera un literal.
 */
export const revalidate = CONFIG.landing.mostrarCatalogoCursos ? 60 : false

export default async function LandingPage() {
  // ⚠️ `noStore()` DENTRO de la rama, no fuera. Lo encontró el E2E de B8.1:
  // con `revalidate = 60` la página sí se regeneraba, pero seguía mostrando el
  // catálogo viejo. La causa no era la página sino la CACHÉ DE DATOS de Next 14,
  // que memoriza el `fetch` interno del cliente de Supabase: regenerar el HTML
  // volvía a leer la respuesta cacheada, así que un diplomado recién publicado
  // no aparecía nunca.
  //
  // Va dentro del `if` a propósito: con el flag apagado NO se llama, la página
  // no se marca como dinámica y los 144 clientes conservan su landing estática
  // pura. Encendido, cada regeneración consulta de verdad.
  let catalogo: Awaited<ReturnType<typeof listarCatalogoPublico>> = []
  if (CONFIG.landing.mostrarCatalogoCursos) {
    noStore()
    catalogo = await listarCatalogoPublico()
  }

  return <LandingClient catalogo={catalogo} />
}
