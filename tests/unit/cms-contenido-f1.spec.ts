import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  validarSemanaPatch, CAMPOS_SEMANA,
  CONTENIDO_MAX, TITULO_MAX, DESCRIPCION_MAX, TIEMPO_MIN, TIEMPO_MAX,
} from '@/lib/contenido-semana'

/**
 * CMS de Contenido — F1 (apuntes y datos de la semana).
 *
 * Invariantes que protegen estas pruebas:
 *  1. La whitelist del body es estricta: una clave desconocida rechaza TODO.
 *     El PATCH escribe con service role y sin RLS; un campo que la ruta no
 *     conoce es señal de un llamador que espera escribir algo que jamás
 *     vamos a escribir. Fallar ruidosamente > ignorar en silencio.
 *  2. `titulo` es NOT NULL en el esquema: se puede cambiar, nunca vaciar.
 *  3. El texto vacío se guarda como NULL, no como '', para que el fallback
 *     `contenido ?? descripcion` del alumno se comporte igual que cuando el
 *     seed no escribió nada.
 *  4. La ruta NO arma el update a mano: delega en validarSemanaPatch.
 *  5. El editor y el alumno comparten un solo render de Markdown.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

// ─────────────────────────── Whitelist del body ──────────────────────────────

test('la whitelist es exactamente los 7 campos editables de la semana', () => {
  expect([...CAMPOS_SEMANA]).toEqual([
    'titulo', 'descripcion', 'contenido', 'tiempo_estimado_minutos',
    'video_url', 'video_url_2', 'video_url_3',
  ])
})

test('una clave fuera de la whitelist rechaza la petición entera', () => {
  const r = validarSemanaPatch({ contenido: 'hola', mes_id: 'otro-mes' })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('Campo no permitido: mes_id')
})

test('no se puede reasignar la semana a otro mes ni cambiarle el numero', () => {
  for (const clave of ['mes_id', 'numero_semana', 'id', 'created_at']) {
    expect(validarSemanaPatch({ [clave]: 'x' }).ok).toBe(false)
  }
})

test('body que no es objeto se rechaza', () => {
  for (const body of [null, undefined, 'contenido', 42, ['titulo']]) {
    expect(validarSemanaPatch(body).ok).toBe(false)
  }
})

test('body vacío se rechaza — un UPDATE sin campos es un llamador roto', () => {
  const r = validarSemanaPatch({})
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('ningún campo')
})

// ─────────────────────────────── titulo ──────────────────────────────────────

test('titulo se puede cambiar', () => {
  const r = validarSemanaPatch({ titulo: '  Semana 3: derivadas  ' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.update.titulo).toBe('Semana 3: derivadas')
})

test('titulo NO se puede vaciar — es NOT NULL en el esquema', () => {
  for (const titulo of ['', '   ', null, 42]) {
    const r = validarSemanaPatch({ titulo })
    expect(r.ok).toBe(false)
  }
})

test('titulo tiene tope de longitud', () => {
  expect(validarSemanaPatch({ titulo: 'a'.repeat(TITULO_MAX + 1) }).ok).toBe(false)
  expect(validarSemanaPatch({ titulo: 'a'.repeat(TITULO_MAX) }).ok).toBe(true)
})

// ──────────────────────── contenido / descripcion ────────────────────────────

test('contenido acepta Markdown y lo guarda tal cual', () => {
  const md = '## Tema\n\n- punto uno\n- punto dos\n\n**negritas**'
  const r = validarSemanaPatch({ contenido: md })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.update.contenido).toBe(md)
})

test('contenido vacío se guarda como NULL, no como cadena vacía', () => {
  for (const vacio of ['', '   ', null]) {
    const r = validarSemanaPatch({ contenido: vacio })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.update.contenido).toBeNull()
  }
})

test('contenido y descripcion tienen tope de longitud', () => {
  expect(validarSemanaPatch({ contenido: 'a'.repeat(CONTENIDO_MAX + 1) }).ok).toBe(false)
  expect(validarSemanaPatch({ descripcion: 'a'.repeat(DESCRIPCION_MAX + 1) }).ok).toBe(false)
})

// ───────────────────── tiempo_estimado_minutos ───────────────────────────────

test('tiempo_estimado_minutos acepta enteros dentro del rango', () => {
  const r = validarSemanaPatch({ tiempo_estimado_minutos: 90 })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.update.tiempo_estimado_minutos).toBe(90)
})

test('tiempo_estimado_minutos rechaza 0, negativos, decimales, texto y el tope', () => {
  for (const malo of [0, -5, 12.5, '60', null, TIEMPO_MAX + 1, TIEMPO_MIN - 1]) {
    expect(validarSemanaPatch({ tiempo_estimado_minutos: malo }).ok).toBe(false)
  }
})

// ──────────────────────────── videos (no regresión) ──────────────────────────

test('los tres videos siguen funcionando igual que antes de F1', () => {
  const r = validarSemanaPatch({
    video_url: 'https://www.youtube.com/watch?v=abc',
    video_url_2: '',
    video_url_3: null,
  })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.update.video_url).toBe('https://www.youtube.com/watch?v=abc')
    expect(r.update.video_url_2).toBeNull()
    expect(r.update.video_url_3).toBeNull()
  }
})

test('solo se actualizan los campos enviados — el resto ni aparece en el update', () => {
  const r = validarSemanaPatch({ contenido: 'solo esto' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(Object.keys(r.update)).toEqual(['contenido'])
})

// ───────────────────── Análisis estático de las rutas ────────────────────────

test('la ruta PATCH delega en validarSemanaPatch y no arma el update a mano', () => {
  const src = leer('src/app/api/admin/semanas/[id]/route.ts')
  expect(src).toContain('validarSemanaPatch')
  // El patrón viejo, campo por campo, no debe sobrevivir: era justo lo que
  // dejaba `contenido` fuera del editor.
  expect(src).not.toContain("if ('video_url'   in body)")
})

test('el GET del editor devuelve los campos que F1 hace editables', () => {
  const src = leer('src/app/api/admin/contenido/[id]/route.ts')
  for (const campo of ['contenido', 'descripcion', 'tiempo_estimado_minutos']) {
    expect(src).toContain(campo)
  }
})

test('alumno y editor comparten UN solo render de Markdown', () => {
  const alumno = leer('src/app/(dashboard)/alumno/materia/[id]/page.tsx')
  const editor = leer('src/app/(dashboard)/admin/contenido/[id]/ApuntesEditor.tsx')
  expect(alumno).toContain('ContenidoMarkdown')
  expect(editor).toContain('ContenidoMarkdown')
  // Nadie monta su propio ReactMarkdown: si vuelve a aparecer fuera del
  // componente compartido, el preview del admin puede divergir del alumno.
  expect(alumno).not.toContain('react-markdown')
  expect(editor).not.toContain('react-markdown')
})
