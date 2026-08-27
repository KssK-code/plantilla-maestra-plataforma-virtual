import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * B8.2 — Catálogo fresco + emisión manual con actor.
 *
 * Lo aritmético (guard de aprobación, actor real, folio no duplicado) se prueba
 * contra Postgres y contra la app corriendo en el E2E dirigido. Aquí se clava lo
 * estructural: que los remedios muertos no revivan, que el cableado de la purga
 * exista, y que la emisión no recupere un camino automático en silencio.
 */

const raiz = process.cwd()
// Normaliza los finales de linea a LF antes de que ninguna prueba mire el
// texto. En Windows `core.autocrlf=true` deja los fuentes con CRLF, y una
// prueba que recorte buscando dos saltos de linea seguidos no encuentra
// nada: el `indexOf` devuelve -1, el `slice` entrega el resto del archivo
// entero, y la asercion termina evaluandose sobre texto que no le tocaba.
// Eso tenia roja a cms-contenido-f3 en `main` desde el PR #79, con el
// codigo de la app correcto.
const leer = (p: string) =>
  readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')
const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

// ─────────────────────── T-A: catálogo fresco por purga ───────────────────────

test('la landing NO usa los remedios que no funcionaron', () => {
  // `export const revalidate = <condicional>` se ignora en silencio (la config
  // de segmento se extrae estáticamente en build) y `noStore()` destapa la Data
  // Cache pero el HTML viejo lo servía la Full Route Cache. Si reaparecen,
  // alguien está "arreglando" esto de vuelta a un remedio que ya se demostró
  // muerto (Bug 82 del PLAYBOOK).
  const src = sinComentarios(leer('src/app/page.tsx'))
  expect(src).not.toContain('export const revalidate')
  expect(src).not.toContain('noStore')
  expect(src).not.toContain('unstable_noStore')
})

test('las mutaciones de curso purgan el catálogo público', () => {
  // PATCH toca exactamente los campos que el catálogo pinta (estado, nombre,
  // precios, horas, duración) y DELETE lo saca de circulación. Sin la purga,
  // la landing estática sigue sirviendo el HTML del build y publicar un
  // diplomado no lo pone a la venta hasta el siguiente deploy (Bug 81).
  const ruta = sinComentarios(leer('src/app/api/admin/cursos/[id]/route.ts'))
  const ocurrencias = (ruta.match(/purgarCatalogoPublico\(/g) ?? []).length
  expect(ocurrencias, 'PATCH y DELETE deben purgar').toBeGreaterThanOrEqual(2)

  const purga = sinComentarios(leer('src/lib/cursos/purga.ts'))
  expect(purga).toContain("revalidatePath('/')")
  expect(purga).toContain('revalidatePath(`/diplomados/${cursoId}`)')

  // Y la purga NO puede vivir en catalogo.ts: LandingClient ('use client') lo
  // importa por precioMXN, y next/cache por esa cadena va al bundle del
  // navegador (+14 kB en la landing de los 144 — medido, no teórico).
  expect(sinComentarios(leer('src/lib/cursos/catalogo.ts'))).not.toContain('next/cache')
})

// ─────────────────────── T-B: emisión manual con actor ────────────────────────

test('la auto-emisión NO existe: ni el helper ni su llamada', () => {
  // La emisión es manual por decisión de producto. Un helper muerto que
  // "emite si aprobó" es exactamente el medio camino que alguien reconecta en
  // seis meses (la lección del cadáver excel de B0).
  expect(sinComentarios(leer('src/lib/cursos/constancia.ts'))).not.toContain('emitirConstanciaSiAprobo')
  const enviar = sinComentarios(leer('src/app/api/alumno/cursos/[id]/examen/enviar/route.ts'))
  expect(enviar).not.toContain('emitirConstanciaSiAprobo')
  expect(enviar).not.toContain('curso_emitir_constancia')
})

test('el endpoint de emisión llama con la SESIÓN, no con service_role', () => {
  // Con service_role, auth.uid() es NULL y el evento constancia_emitida queda
  // sin autor — el bug que B8.1 encontró. La sesión del admin es la única forma
  // de que la bitácora diga quién emitió.
  const src = sinComentarios(leer('src/app/api/admin/inscripciones/[id]/constancia/route.ts'))
  expect(src).toContain("supabase.rpc('curso_emitir_constancia'")
  expect(src).not.toContain('createAdminClient')
  // Y ya no manda calificación: el snapshot lo calcula y verifica la función.
  expect(src).not.toContain('p_calificacion')
})

test('la migración trae los dos guards y el GRANT a authenticated', () => {
  const mig = leer('supabase/migrations/20260730180000_b82_emision_manual_con_actor.sql')
  // Permiso: es_admin() — es lo que hace seguro el GRANT a authenticated en una
  // función SECURITY DEFINER.
  expect(mig).toContain('IF NOT public.es_admin()')
  expect(mig).toContain("ERRCODE = '42501'")
  // Aprobación: sin examen aprobado no hay emisión. La línea entre diploma y papel.
  expect(mig).toContain('MAX(r.porcentaje)')
  expect(mig).toContain('IF v_mejor IS NULL')
  expect(mig).toContain('IF v_mejor < v_minima')
  // El snapshot congela el valor VERIFICADO, no el del caller (Bug 78).
  expect(mig).toContain('v_mejor)')
  // Grants explícitos (Bug 77), con authenticated dentro.
  expect(mig).toContain('GRANT EXECUTE ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) TO authenticated')
})

test('el alumno aprobado sin constancia ve un estado honesto', () => {
  // Entre aprobar y tener el documento hay un estado nuevo (emisión manual).
  // Sin distinguirlo, la pantalla le decía "todavía no apruebas" a alguien que
  // sí aprobó.
  const ruta = sinComentarios(leer('src/app/api/alumno/cursos/[id]/constancia/route.ts'))
  expect(ruta).toContain("'aprobado_en_emision'")
  const page = leer('src/app/(cursos)/cursos/[id]/constancia/page.tsx')
  expect(page).toContain('aprobado_en_emision')
  expect(page).toContain('en emisión')
})

test('los docs dicen que la emisión manual es intencional', () => {
  // Para que nadie la "arregle" de vuelta a automática en seis meses.
  expect(leer('INSTRUCCIONES-SOLO-CURSOS.md')).toContain('La emisión es manual a propósito')
  expect(leer('SOLO-CURSOS-ARQUITECTURA.md')).toContain('La emisión de constancias es MANUAL')
})
