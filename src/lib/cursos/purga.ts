/**
 * Purga de la copia prerenderizada del catálogo público (B8.2).
 *
 * ⚠️ ARCHIVO APARTE DE catalogo.ts A PROPÓSITO. `LandingClient` (componente
 * 'use client') importa `precioMXN` de catalogo.ts; cuando la purga vivió ahí,
 * `next/cache` entró por esa cadena al bundle del NAVEGADOR y la landing de los
 * 144 clientes engordó de 11.3 kB a 25.4 kB — por código de caché de servidor
 * que el cliente jamás puede ejecutar. Separado, la cadena cliente no lo toca.
 *
 * QUÉ RESUELVE. La landing es ESTÁTICA — invariante de los 144 — y con el
 * catálogo encendido su contenido es administrable. Esas dos decisiones,
 * correctas por separado, componían un bug: publicar un diplomado no lo ponía a
 * la venta hasta el siguiente deploy, porque la Full Route Cache seguía
 * sirviendo el HTML del build (Bug 81 del PLAYBOOK).
 *
 * `revalidatePath` purga esa caché SIN volver la página dinámica: la siguiente
 * petición regenera el HTML con datos frescos y vuelve a quedar cacheado. Se
 * llama desde las mutaciones de admin que cambian lo que el público ve — el
 * dato nuevo y la purga viajan juntos, no hay ventana de reloj. Verificado en
 * B8.2 contra `next start`: publicar aparece, editar se refleja y despublicar
 * desaparece, todo sin redeploy.
 *
 * El detalle (/diplomados/[id]) se purga también por completitud, aunque hoy es
 * una ruta dinámica (ƒ, se renderiza por petición): si mañana alguien la vuelve
 * estática, esta purga ya la cubre.
 *
 * NO se condiciona al modo: en tradicional la landing no pinta catálogo, así
 * que regenerarla produce el mismo HTML — purga inofensiva.
 */
import { revalidatePath } from 'next/cache'

export function purgarCatalogoPublico(cursoId?: string): void {
  revalidatePath('/')
  if (cursoId) revalidatePath(`/diplomados/${cursoId}`)
}
