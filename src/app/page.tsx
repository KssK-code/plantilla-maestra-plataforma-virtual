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
import { CONFIG } from '@/lib/config'
import { listarCatalogoPublico } from '@/lib/cursos/catalogo'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function LandingPage() {
  const catalogo = CONFIG.landing.mostrarCatalogoCursos
    ? await listarCatalogoPublico()
    : []

  return <LandingClient catalogo={catalogo} />
}
