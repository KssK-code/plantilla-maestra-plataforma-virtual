/**
 * Modo de producto — el interruptor de la línea Solo-Cursos (B7).
 *
 * Un solo lugar decide qué significa cada modo. Si esta lógica se repartiera
 * entre el sidebar, el middleware y los dashboards, en tres meses habría tres
 * respuestas distintas a "¿este cliente vende diplomados?".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EL INVARIANTE, y no es negociable:
 *
 *   Con `modo: 'tradicional'` (el default) la plataforma es IDÉNTICA a la de
 *   antes de B7. Mismos menús, mismo registro, mismas rutas. 144 clientes
 *   comparten esta plantilla y actualizarla no puede moverles nada.
 *
 * Y al revés: 'solo_cursos' NO apaga el módulo de cursos en modo tradicional.
 * Un cliente de preparatoria puede seguir vendiendo diplomados como
 * complemento exactamente como hoy. El modo cambia cuál es la SUPERFICIE
 * PRINCIPAL, no qué módulos existen.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { CONFIG } from '@/lib/config'

/** ¿Este cliente vende únicamente diplomados? */
export function esSoloCursos(): boolean {
  return CONFIG.modo === 'solo_cursos'
}

/**
 * Rutas del PROGRAMA académico que no significan nada en modo solo_cursos.
 *
 * No es cosmética: ocultar una entrada del menú es UX, pero la URL sigue
 * existiendo y se comparte por WhatsApp. Estas rutas se atajan en el
 * middleware (server-side) para que un enlace directo no aterrice en una
 * pantalla que consulta materias que el cliente nunca sembró.
 *
 * Se REDIRIGE en vez de dar 404 a propósito: la ruta no es inválida, es
 * inaplicable a este cliente. Un 404 le diría al alumno "te equivocaste";
 * el redirect lo deja donde sí hay algo que hacer.
 */
export const RUTAS_PROGRAMA_ALUMNO = [
  '/alumno/materias',      // catálogo de materias del programa
  '/alumno/materia',       // /alumno/materia/[id]
  '/alumno/mes',           // /alumno/mes/[numero]
  '/alumno/calificaciones',
  '/alumno/evaluacion',    // /alumno/evaluacion/[id]
  '/alumno/constancia',    // constancia del PROGRAMA (la del curso vive en /cursos/[id]/constancia)
] as const

export const RUTAS_PROGRAMA_ADMIN = [
  '/admin/contenido',      // materias, meses y semanas del programa
  '/admin/estado-cuenta',  // estado de cuenta DEL PROGRAMA: en solo_cursos siempre sale vacío (ver B7/T4)
] as const

/**
 * Rutas que solo se atajan con coincidencia EXACTA.
 *
 * `/alumno` es el dashboard del programa: racha, logros, meses desbloqueados y
 * materias. En solo_cursos no tiene nada que enseñar, así que el alumno cae
 * directo en sus diplomados. No se adapta el dashboard porque asume el programa
 * de punta a punta y lo rellena con valores por defecto en cascada (`?? 0`,
 * `|| 6`): no reventaría, pintaría cifras inventadas, que es peor.
 *
 * ⚠️ VA APARTE, Y ES LA RAZÓN DE QUE ESTA LISTA EXISTA. Si '/alumno' entrara en
 * `RUTAS_PROGRAMA_ALUMNO`, la regla `startsWith('/alumno/')` atraparía también
 * a `/alumno/cursos` — que es justo el destino — y el redirect se perseguiría a
 * sí mismo hasta que el navegador cortara con ERR_TOO_MANY_REDIRECTS.
 */
export const RUTAS_EXACTAS_PROGRAMA_ALUMNO = ['/alumno'] as const

/** A dónde mandar a cada rol cuando pisa una ruta del programa en solo_cursos. */
export const DESTINO_ALUMNO = '/alumno/cursos'
export const DESTINO_ADMIN  = '/admin'

/**
 * ¿Esta ruta pertenece al programa académico? Devuelve el destino, o null si la
 * ruta es válida en este modo.
 *
 * Se compara con `===` o con `startsWith(ruta + '/')`, NUNCA con
 * `startsWith(ruta)` a secas: `'/alumno/materias'.startsWith('/alumno/materia')`
 * es true, y una regla escrita así atraparía rutas hermanas por accidente. El
 * mismo error al revés dejaría pasar `/alumno/materia/123`.
 */
export function destinoSiEsRutaDeProgama(pathname: string): string | null {
  if (!esSoloCursos()) return null

  // El destino nunca se redirige a sí mismo. Es un cinturón sobre el tirante de
  // la lista exacta: cualquier regla futura mal escrita muere aquí en vez de
  // convertirse en un bucle de redirección en producción.
  if (pathname === DESTINO_ALUMNO || pathname === DESTINO_ADMIN) return null

  const coincide = (base: string) => pathname === base || pathname.startsWith(`${base}/`)

  if (RUTAS_EXACTAS_PROGRAMA_ALUMNO.some(r => pathname === r)) return DESTINO_ALUMNO
  if (RUTAS_PROGRAMA_ALUMNO.some(coincide)) return DESTINO_ALUMNO
  if (RUTAS_PROGRAMA_ADMIN.some(coincide))  return DESTINO_ADMIN
  return null
}

/**
 * Ruta de aterrizaje del alumno tras autenticarse.
 *
 * En tradicional sigue siendo `/alumno` (su dashboard de siempre). En
 * solo_cursos aterriza directo en sus diplomados, que es todo lo que tiene.
 */
export function aterrizajeAlumno(): string {
  return esSoloCursos() ? DESTINO_ALUMNO : '/alumno'
}

/**
 * Nivel con el que se da de alta a un alumno en el registro público.
 *
 * En solo_cursos el alumno no cursa secundaria ni preparatoria: se le pone
 * 'diplomado', que es el valor que B1 agregó al CHECK de `alumnos.nivel`.
 * Devuelve null en tradicional para que el llamador use lo que eligió el
 * usuario en el formulario.
 */
export function nivelForzadoDeRegistro(): 'diplomado' | null {
  return esSoloCursos() ? 'diplomado' : null
}
