# CMS de Contenido — F1: apuntes y datos de la semana

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda editar los apuntes (Markdown), el título, la descripción y el tiempo estimado de cada semana desde Contenido — no solo las tres URLs de video.

**Architecture:** La validación del body sale de la ruta a `src/lib/contenido-semana.ts` como función pura (mismo patrón que `lib/corregir-plan.ts`), para poder probarla sin servidor ni base de datos. El render de Markdown se extrae del alumno a un componente compartido `src/components/ContenidoMarkdown.tsx` que usan **tanto la vista del alumno como el preview del editor**, de modo que el preview no pueda divergir de lo que el alumno ve. El editor, hoy un único componente de 396 líneas, se parte en `SemanaEditor` + `ApuntesEditor` antes de añadirle campos.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript, Supabase (service role vía `createAdminClient`), `react-markdown` ^10.1 + `remark-gfm` ^4.0 (ya son dependencias — F1 no instala nada), Playwright para las pruebas unitarias (`pnpm test:unit`).

**Spec:** `docs/superpowers/specs/2026-08-19-cms-contenido-admin-design.md` §5 F1
**Rama:** `feat/cms-contenido-admin` (desde `origin/main` @ `461f7d5`)
**Sin migración.** F1 no toca el esquema: `semanas.contenido`, `descripcion` y `tiempo_estimado_minutos` ya existen.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/contenido-semana.ts` **(crear)** | Whitelist y validación pura del PATCH. Sin imports de Next ni de Supabase — es la única forma de probarlo en `tests/unit/` |
| `src/components/ContenidoMarkdown.tsx` **(crear)** | Render de `semanas.contenido`. Única fuente del Markdown, compartida alumno ↔ admin |
| `src/app/(dashboard)/admin/contenido/[id]/ApuntesEditor.tsx` **(crear)** | Textarea de apuntes + preview + contador |
| `src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx` **(crear)** | Tarjeta de una semana: datos + videos + apuntes + guardado |
| `src/app/api/admin/semanas/[id]/route.ts` **(modificar)** | Delegar la validación en el lib nuevo |
| `src/app/api/admin/contenido/[id]/route.ts` **(modificar)** | Devolver los campos que hoy no viajan al editor |
| `src/app/(dashboard)/admin/contenido/[id]/page.tsx` **(modificar)** | Queda solo con carga + acordeón; delega la semana en `SemanaEditor` |
| `src/app/(dashboard)/alumno/materia/[id]/page.tsx` **(modificar)** | Usa `ContenidoMarkdown` en vez de su bloque propio |
| `tests/unit/cms-contenido-f1.spec.ts` **(crear)** | Invariantes de F1 |

---

### Task 1: Validación pura del PATCH de semanas

**Files:**
- Create: `src/lib/contenido-semana.ts`
- Test: `tests/unit/cms-contenido-f1.spec.ts`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `tests/unit/cms-contenido-f1.spec.ts`:

```ts
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
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

```bash
cd ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual
pnpm test:unit cms-contenido-f1
```

Esperado: FALLA. El primer error es de resolución de módulo —
`Cannot find module '@/lib/contenido-semana'` — porque el lib todavía no existe.

- [ ] **Step 3: Escribir el lib**

Crear `src/lib/contenido-semana.ts`:

```ts
// ─── Edición de una semana desde Contenido (admin) ───────────────────────────
// La validación del body vive aquí, fuera de la ruta, para poder probarla como
// función pura — mismo patrón que lib/corregir-plan.ts.
//
// Whitelist ESTRICTA: una clave desconocida rechaza la petición entera. Este
// PATCH escribe con service role, saltándose RLS; un llamador que manda un
// campo que la ruta no conoce espera escribir algo que jamás vamos a escribir,
// y fallar ruidosamente es mejor que ignorarlo en silencio.
//
// Todos los campos son OPCIONALES pero al menos uno debe venir: la pantalla
// guarda semana por semana y no siempre manda el formulario completo.

export const CAMPOS_SEMANA = [
  'titulo', 'descripcion', 'contenido', 'tiempo_estimado_minutos',
  'video_url', 'video_url_2', 'video_url_3',
] as const

export type CampoSemana = (typeof CAMPOS_SEMANA)[number]

// Topes. `contenido` es TEXT sin límite en Postgres: sin tope, un pegado
// accidental mete megabytes en una fila que el alumno carga en cada visita.
// 200k caracteres ≈ 400 páginas — generoso para una clase, pero acotado.
export const CONTENIDO_MAX   = 200_000
export const TITULO_MAX      = 300
export const DESCRIPCION_MAX = 2_000
export const URL_MAX         = 2_000
export const TIEMPO_MIN      = 1
export const TIEMPO_MAX      = 600

export interface ParcheSemana {
  titulo?: string
  descripcion?: string | null
  contenido?: string | null
  tiempo_estimado_minutos?: number
  video_url?: string | null
  video_url_2?: string | null
  video_url_3?: string | null
}

export type ResultadoSemana =
  | { ok: true; update: ParcheSemana }
  | { ok: false; error: string }

type Texto =
  | { ok: true; valor: string | null }
  | { ok: false; error: string }

/**
 * Texto opcional. '' y '   ' se guardan como NULL, nunca como cadena vacía:
 * el alumno hace `contenido ?? descripcion` y una cadena vacía NO dispara el
 * fallback, así que guardar '' dejaría la semana en blanco en vez de caer a la
 * descripción, que es lo que pasa cuando el seed no escribió nada.
 */
function textoOpcional(v: unknown, max: number, campo: string): Texto {
  if (v === null || v === undefined) return { ok: true, valor: null }
  if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
  if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
  const limpio = v.trim()
  return { ok: true, valor: limpio === '' ? null : limpio }
}

export function validarSemanaPatch(body: unknown): ResultadoSemana {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }

  const claves = Object.keys(body)
  const extras = claves.filter(k => !(CAMPOS_SEMANA as readonly string[]).includes(k))
  if (extras.length > 0) {
    return {
      ok: false,
      error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${CAMPOS_SEMANA.join(', ')}.`,
    }
  }
  if (claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const b = body as Record<string, unknown>
  const update: ParcheSemana = {}

  // titulo — el único NOT NULL entre los editables: se cambia, no se vacía.
  if ('titulo' in b) {
    if (typeof b.titulo !== 'string' || b.titulo.trim() === '') {
      return { ok: false, error: 'titulo es requerido y no puede quedar vacío' }
    }
    if (b.titulo.length > TITULO_MAX) {
      return { ok: false, error: `titulo no puede pasar de ${TITULO_MAX} caracteres` }
    }
    update.titulo = b.titulo.trim()
  }

  if ('descripcion' in b) {
    const r = textoOpcional(b.descripcion, DESCRIPCION_MAX, 'descripcion')
    if (!r.ok) return r
    update.descripcion = r.valor
  }

  if ('contenido' in b) {
    const r = textoOpcional(b.contenido, CONTENIDO_MAX, 'contenido')
    if (!r.ok) return r
    update.contenido = r.valor
  }

  if ('tiempo_estimado_minutos' in b) {
    const n = b.tiempo_estimado_minutos
    if (typeof n !== 'number' || !Number.isInteger(n) || n < TIEMPO_MIN || n > TIEMPO_MAX) {
      return {
        ok: false,
        error: `tiempo_estimado_minutos debe ser un entero entre ${TIEMPO_MIN} y ${TIEMPO_MAX}`,
      }
    }
    update.tiempo_estimado_minutos = n
  }

  // Los tres videos, explícitos y no en bucle: el bucle obliga a un índice
  // dinámico sobre ParcheSemana que TypeScript no puede estrechar.
  if ('video_url' in b) {
    const r = textoOpcional(b.video_url, URL_MAX, 'video_url')
    if (!r.ok) return r
    update.video_url = r.valor
  }
  if ('video_url_2' in b) {
    const r = textoOpcional(b.video_url_2, URL_MAX, 'video_url_2')
    if (!r.ok) return r
    update.video_url_2 = r.valor
  }
  if ('video_url_3' in b) {
    const r = textoOpcional(b.video_url_3, URL_MAX, 'video_url_3')
    if (!r.ok) return r
    update.video_url_3 = r.valor
  }

  return { ok: true, update }
}
```

- [ ] **Step 4: Correr las pruebas del lib**

```bash
pnpm test:unit cms-contenido-f1
```

Esperado: las pruebas de whitelist, titulo, contenido, tiempo y videos **PASAN**.
Las cuatro últimas (análisis estático de rutas y `ApuntesEditor`) **siguen
fallando** — sus archivos aún no cambian. Es lo correcto en este punto.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contenido-semana.ts tests/unit/cms-contenido-f1.spec.ts
git commit -m "feat(contenido): validacion pura del PATCH de semanas

El PATCH solo aceptaba las tres URLs de video, asi que el campo contenido
(los apuntes) ni siquiera viajaba al editor pese a existir en el esquema y
estar ya renderizado del lado del alumno.

La whitelist y la validacion salen de la ruta a un lib puro para poder
probarlas sin servidor ni base de datos, igual que lib/corregir-plan.ts."
```

---

### Task 2: La ruta PATCH delega en el lib

**Files:**
- Modify: `src/app/api/admin/semanas/[id]/route.ts`

- [ ] **Step 1: Reemplazar el armado manual del update**

En `src/app/api/admin/semanas/[id]/route.ts`, añadir el import:

```ts
import { validarSemanaPatch } from '@/lib/contenido-semana'
```

y sustituir este bloque:

```ts
    const body = await request.json()
    const update: Record<string, string | null> = {}
    if ('video_url'   in body) update.video_url   = body.video_url   || null
    if ('video_url_2' in body) update.video_url_2 = body.video_url_2 || null
    if ('video_url_3' in body) update.video_url_3 = body.video_url_3 || null

    const admin = createAdminClient()
    const { error } = await admin
      .from('semanas')
      .update(update)
      .eq('id', params.id)
```

por:

```ts
    const body = await request.json()
    const validacion = validarSemanaPatch(body)
    if (!validacion.ok) {
      return Response.json({ error: validacion.error }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('semanas')
      .update(validacion.update)
      .eq('id', params.id)
```

- [ ] **Step 2: Correr las pruebas**

```bash
pnpm test:unit cms-contenido-f1
```

Esperado: la prueba `la ruta PATCH delega en validarSemanaPatch...` pasa a **PASS**.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/semanas/[id]/route.ts"
git commit -m "feat(contenido): el PATCH de semanas acepta apuntes, titulo, descripcion y tiempo"
```

---

### Task 3: El editor recibe los campos que hoy no le llegan

**Files:**
- Modify: `src/app/api/admin/contenido/[id]/route.ts`

- [ ] **Step 1: Ampliar el select**

En `src/app/api/admin/contenido/[id]/route.ts`, sustituir el select anidado:

```ts
        meses_contenido (
          id, numero_mes, titulo,
          semanas (
            id, numero_semana, titulo,
            video_url, video_url_2, video_url_3
          )
        )
```

por:

```ts
        meses_contenido (
          id, numero_mes, titulo,
          semanas (
            id, numero_semana, titulo, descripcion, contenido,
            tiempo_estimado_minutos,
            video_url, video_url_2, video_url_3
          )
        )
```

- [ ] **Step 2: Correr las pruebas**

```bash
pnpm test:unit cms-contenido-f1
```

Esperado: `el GET del editor devuelve los campos que F1 hace editables` pasa a **PASS**.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/contenido/[id]/route.ts"
git commit -m "feat(contenido): el GET del editor manda apuntes, descripcion y tiempo estimado"
```

---

### Task 4: Un solo render de Markdown, compartido alumno ↔ admin

Extracción **sin cambio de comportamiento** para el alumno: el mismo `prose`, los
mismos overrides y la misma normalización de saltos de línea, movidos a un
componente. Se hace antes de escribir el editor para que el preview nazca ya
compartiendo la fuente.

**Files:**
- Create: `src/components/ContenidoMarkdown.tsx`
- Modify: `src/app/(dashboard)/alumno/materia/[id]/page.tsx`

- [ ] **Step 1: Crear el componente compartido**

Crear `src/components/ContenidoMarkdown.tsx`:

```tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Render de los apuntes de una semana (`semanas.contenido`).
 *
 * Vive compartido A PROPÓSITO: lo usan la vista del ALUMNO y el preview del
 * EDITOR del admin. Si cada uno montara su propio ReactMarkdown, el preview
 * dejaría de ser lo que el alumno ve en cuanto alguien tocara un override en
 * uno de los dos — y esa equivalencia es justamente la promesa de la pantalla.
 */

/**
 * Normaliza los saltos de línea. Parte del seed guardó "\n" ESCAPADO (la barra
 * y la ene como dos caracteres) en vez de un salto real; sin esto, un apunte
 * entero se pinta como un solo párrafo. Se exporta aparte porque el alumno la
 * necesita también para contar palabras y estimar el tiempo de lectura.
 */
export function normalizarContenido(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
}

export default function ContenidoMarkdown({ texto }: { texto: string }) {
  if (!texto) return null

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-white prose-strong:font-semibold prose-p:text-slate-200 prose-li:text-slate-200 prose-ul:my-4 prose-ol:my-4 prose-a:text-cyan-400 prose-blockquote:border-cyan-500">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2" style={{ color: '#F1F5F9' }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2" style={{ color: '#F1F5F9' }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-1" style={{ color: '#F1F5F9' }}>{children}</h3>,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 2: Que el alumno lo use**

En `src/app/(dashboard)/alumno/materia/[id]/page.tsx`:

1. Borrar estos dos imports:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

2. Añadir en su lugar:

```tsx
import ContenidoMarkdown, { normalizarContenido } from '@/components/ContenidoMarkdown'
```

3. Sustituir el cálculo:

```tsx
                  const contenidoSemana = (semana.contenido ?? '')
                    .replace(/\\r\\n/g, '\n')
                    .replace(/\\n/g, '\n')
```

por:

```tsx
                  const contenidoSemana = normalizarContenido(semana.contenido)
```

4. Sustituir el bloque de render completo — desde `{contenidoSemana && (` hasta
   su cierre `)}`, el que contiene el `<div className="prose ...">` y el
   `<ReactMarkdown>` con los overrides de `h1/h2/h3` — por:

```tsx
                      {/* Contenido — Markdown renderizado (compartido con el editor del admin) */}
                      <ContenidoMarkdown texto={contenidoSemana} />
```

`ContenidoMarkdown` ya devuelve `null` con texto vacío, así que el guard
`{contenidoSemana && ...}` deja de hacer falta.

- [ ] **Step 3: Verificar que no cambió nada para el alumno**

```bash
pnpm lint && pnpm build
```

Esperado: build en verde. La prueba `alumno y editor comparten UN solo render`
sigue fallando (falta `ApuntesEditor.tsx`) — es lo esperado hasta la Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/components/ContenidoMarkdown.tsx "src/app/(dashboard)/alumno/materia/[id]/page.tsx"
git commit -m "refactor(markdown): un solo render de apuntes, compartido alumno-admin

Extraccion sin cambio de comportamiento. El preview del editor que viene en
F1 tiene que ser literalmente lo que el alumno ve; con dos ReactMarkdown
montados por separado esa equivalencia dura hasta que alguien toque uno."
```

---

### Task 5: Editor de apuntes con preview

**Files:**
- Create: `src/app/(dashboard)/admin/contenido/[id]/ApuntesEditor.tsx`

- [ ] **Step 1: Crear el componente**

Crear `src/app/(dashboard)/admin/contenido/[id]/ApuntesEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import ContenidoMarkdown, { normalizarContenido } from '@/components/ContenidoMarkdown'
import { CONTENIDO_MAX } from '@/lib/contenido-semana'

/**
 * Apuntes de una semana. El alumno los recibe como Markdown, así que el editor
 * es Markdown — no texto plano y no un WYSIWYG que emita HTML, que obligaría a
 * cambiar el render del alumno.
 *
 * El preview usa el MISMO componente que la vista del alumno (ContenidoMarkdown),
 * de modo que lo que el admin ve en la pestaña "Vista previa" es exactamente lo
 * que se va a pintar en la materia, no una aproximación.
 */

interface Props {
  valor: string
  onChange: (valor: string) => void
}

const TAB_BASE: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '0.375rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  transition: 'all .15s',
}

export default function ApuntesEditor({ valor, onChange }: Props) {
  const [modo, setModo] = useState<'editar' | 'preview'>('editar')

  const excedido = valor.length > CONTENIDO_MAX
  const palabras = valor.trim() ? valor.trim().split(/\s+/).length : 0
  const minLectura = palabras > 0 ? Math.ceil(palabras / 200) : 0

  function tabStyle(activo: boolean): React.CSSProperties {
    return {
      ...TAB_BASE,
      background: activo ? 'rgba(21,101,192,0.2)' : 'transparent',
      color: activo ? 'var(--color-acento)' : '#64748B',
      border: `1px solid ${activo ? 'rgba(21,101,192,0.4)' : 'transparent'}`,
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs" style={{ color: '#64748B' }}>
          Apuntes de la clase (Markdown)
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setModo('editar')} style={tabStyle(modo === 'editar')}>
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button type="button" onClick={() => setModo('preview')} style={tabStyle(modo === 'preview')}>
            <Eye className="w-3 h-3" /> Vista previa
          </button>
        </div>
      </div>

      {modo === 'editar' ? (
        <textarea
          value={valor}
          onChange={e => onChange(e.target.value)}
          rows={12}
          spellCheck
          placeholder={'## Tema de la clase\n\nExplicación...\n\n- Punto uno\n- Punto dos'}
          style={{
            background: '#0D1017',
            border: `1px solid ${excedido ? '#EF4444' : '#2A2F3E'}`,
            color: '#F1F5F9',
            borderRadius: '0.5rem',
            padding: '0.625rem',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            width: '100%',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        />
      ) : (
        <div
          className="rounded-lg p-4 overflow-x-auto"
          style={{ background: '#0D1017', border: '1px solid #2A2F3E', minHeight: '12rem' }}
        >
          {valor.trim()
            ? <ContenidoMarkdown texto={normalizarContenido(valor)} />
            : <p className="text-xs" style={{ color: '#64748B' }}>Sin apuntes todavía.</p>}
        </div>
      )}

      <p className="text-xs" style={{ color: excedido ? '#EF4444' : '#64748B' }}>
        {excedido
          ? `Te pasaste por ${(valor.length - CONTENIDO_MAX).toLocaleString('es-MX')} caracteres — no se va a guardar.`
          : `${palabras.toLocaleString('es-MX')} palabras · el alumno verá "${minLectura} min lectura"`}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Correr las pruebas**

```bash
pnpm test:unit cms-contenido-f1
```

Esperado: `alumno y editor comparten UN solo render de Markdown` pasa a **PASS**.
Ahora las 18 pruebas del spec están en verde.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/contenido/[id]/ApuntesEditor.tsx"
git commit -m "feat(contenido): editor de apuntes en Markdown con vista previa

El preview monta el mismo componente que la vista del alumno, asi que no es
una aproximacion de lo que el alumno vera: es lo que vera."
```

---

### Task 6: Partir el editor en `SemanaEditor` y conectar los campos nuevos

`page.tsx` son 396 líneas para editar tres URLs. Añadirle cuatro campos más sin
partirlo lo lleva a un componente inmanejable, y F2–F4 le suman material,
quizzes y estructura. Se corta ahora.

**Files:**
- Create: `src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx`
- Modify: `src/app/(dashboard)/admin/contenido/[id]/page.tsx`

- [ ] **Step 1: Crear `SemanaEditor.tsx`**

```tsx
'use client'

import { Loader2, Save, Check, AlertCircle, Video } from 'lucide-react'
import ApuntesEditor from './ApuntesEditor'
import { TIEMPO_MIN, TIEMPO_MAX, TITULO_MAX } from '@/lib/contenido-semana'

/** Estado editable de una semana. Lo dueña `page.tsx`; aquí solo se pinta. */
export interface SemanaState {
  titulo: string
  descripcion: string
  contenido: string
  tiempo_estimado_minutos: number
  video_url: string
  video_url_2: string
  video_url_3: string
  saving: boolean
  saved: boolean
  error: string | null
  dirty: boolean
}

export type CampoTexto =
  | 'titulo' | 'descripcion' | 'contenido'
  | 'video_url' | 'video_url_2' | 'video_url_3'

interface Props {
  numero: number
  estado: SemanaState
  onCampo: (campo: CampoTexto, valor: string) => void
  onTiempo: (minutos: number) => void
  onGuardar: () => void
}

const INNER = { background: '#0D1017', border: '1px solid #2A2F3E' }

const INPUT: React.CSSProperties = {
  background: '#0D1017',
  border: '1px solid #2A2F3E',
  color: '#F1F5F9',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.625rem',
  fontSize: '0.75rem',
  width: '100%',
  outline: 'none',
}

/** Extrae el video ID de una URL youtube.com/watch?v=ID */
function getYoutubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

const VIDEOS = [
  { field: 'video_url'   as const, label: 'Video 1 (principal)' },
  { field: 'video_url_2' as const, label: 'Video 2'             },
  { field: 'video_url_3' as const, label: 'Video 3'             },
]

export default function SemanaEditor({ numero, estado: v, onCampo, onTiempo, onGuardar }: Props) {
  return (
    <div className="rounded-xl p-4 space-y-4" style={INNER}>

      {/* Encabezado: numero + titulo editable */}
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(21,101,192,0.2)', color: 'var(--color-acento)' }}
        >
          {numero}
        </span>
        <input
          type="text"
          value={v.titulo}
          maxLength={TITULO_MAX}
          onChange={e => onCampo('titulo', e.target.value)}
          placeholder="Título de la semana"
          className="flex-1 min-w-0"
          style={{ ...INPUT, fontSize: '0.875rem', fontWeight: 600 }}
        />
      </div>

      {/* Descripcion + tiempo estimado */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 8rem' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Descripción corta</label>
          <input
            type="text"
            value={v.descripcion}
            onChange={e => onCampo('descripcion', e.target.value)}
            placeholder="Una línea sobre de qué va la semana"
            style={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Minutos estimados</label>
          <input
            type="number"
            min={TIEMPO_MIN}
            max={TIEMPO_MAX}
            value={v.tiempo_estimado_minutos}
            onChange={e => onTiempo(Number(e.target.value))}
            style={INPUT}
          />
        </div>
      </div>

      {/* Apuntes */}
      <ApuntesEditor valor={v.contenido} onChange={valor => onCampo('contenido', valor)} />

      {/* Miniaturas de los tres videos */}
      <div className="flex gap-2">
        {VIDEOS.map(({ field }, i) => {
          const url = v[field]
          const vid = getYoutubeId(url)
          return (
            <div key={field} className="flex-1">
              <p className="text-xs mb-1" style={{ color: '#64748B' }}>Video {i + 1}</p>
              {vid ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                  alt={`Preview video ${i + 1}`}
                  className="w-full h-20 object-cover rounded cursor-pointer"
                  style={{ border: '1px solid #2A2F3E' }}
                  onClick={() => window.open(url, '_blank')}
                  title="Abrir en YouTube"
                />
              ) : (
                <div
                  className="w-full h-20 rounded flex items-center justify-center text-xs"
                  style={{ background: '#1A1F2E', border: '1px solid #2A2F3E', color: '#94A3B8' }}
                >
                  Sin video
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* URLs de los tres videos */}
      <div className="space-y-2">
        {VIDEOS.map(({ field, label }) => (
          <div key={field}>
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>
              <Video className="inline w-3 h-3 mr-1" style={{ verticalAlign: 'middle' }} />
              {label}
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={v[field]}
              onChange={e => onCampo(field, e.target.value)}
              style={{ ...INPUT, fontFamily: 'monospace' }}
            />
          </div>
        ))}
      </div>

      {/* Feedback + guardar */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs">
          {v.error && (
            <span className="flex items-center gap-1" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-3 h-3" /> {v.error}
            </span>
          )}
          {v.saved && (
            <span className="flex items-center gap-1" style={{ color: '#10B981' }}>
              <Check className="w-3 h-3" /> Guardado
            </span>
          )}
        </div>
        <button
          onClick={onGuardar}
          disabled={v.saving || (!v.dirty && !v.saved)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
          style={v.saved
            ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
            : { background: v.dirty ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.04)', color: v.dirty ? 'var(--color-acento)' : '#64748B', border: `1px solid ${v.dirty ? 'rgba(21,101,192,0.4)' : '#2A2F3E'}` }
          }
        >
          {v.saving
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>
            : v.saved
              ? <><Check className="w-3 h-3" /> Guardado</>
              : <><Save className="w-3 h-3" /> Guardar</>
          }
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `page.tsx` para usarlo**

Cambios puntuales en `src/app/(dashboard)/admin/contenido/[id]/page.tsx`:

1. **Imports** — sustituir la línea de `lucide-react` y añadir el componente:

```tsx
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import SemanaEditor, { type SemanaState, type CampoTexto } from './SemanaEditor'
import { TIEMPO_MIN, TIEMPO_MAX } from '@/lib/contenido-semana'
```

2. **Borrar** de `page.tsx` la `interface VideoState`, la función `inputStyle`,
   la función `getYoutubeId` **y la constante `INNER`** — las cuatro se mudaron
   a `SemanaEditor`. `CARD` se queda: la sigue usando el acordeón de meses.

   ⚠️ Olvidar `INNER` rompe el lint con `'INNER' is assigned a value but never
   used`, no el build. Se detecta en el Step 3.

3. **Ampliar** la interfaz `Semana`:

```tsx
interface Semana {
  id: string
  numero_semana: number
  titulo: string
  descripcion: string | null
  contenido: string | null
  tiempo_estimado_minutos: number
  video_url:   string | null
  video_url_2: string | null
  video_url_3: string | null
}
```

4. **Renombrar el estado** `videos` → `semanas` y su tipo:

```tsx
  const [semanas, setSemanas] = useState<Record<string, SemanaState>>({})
```

5. **Inicialización** — sustituir el bloque `const initVideos ... setVideos(initVideos)` por:

```tsx
        const init: Record<string, SemanaState> = {}
        for (const mes of mesesOrdenados) {
          for (const sem of mes.semanas) {
            init[sem.id] = {
              titulo:      sem.titulo ?? '',
              descripcion: sem.descripcion ?? '',
              contenido:   sem.contenido ?? '',
              tiempo_estimado_minutos: sem.tiempo_estimado_minutos ?? 60,
              video_url:   sem.video_url   ?? '',
              video_url_2: sem.video_url_2 ?? '',
              video_url_3: sem.video_url_3 ?? '',
              saving: false, saved: false, error: null, dirty: false,
            }
          }
        }
        setSemanas(init)
```

6. **Handlers** — sustituir `handleChange` por estos dos:

```tsx
  function handleCampo(semanaId: string, campo: CampoTexto, valor: string) {
    setSemanas(prev => ({
      ...prev,
      [semanaId]: { ...prev[semanaId], [campo]: valor, dirty: true, saved: false, error: null },
    }))
  }

  function handleTiempo(semanaId: string, minutos: number) {
    setSemanas(prev => ({
      ...prev,
      [semanaId]: { ...prev[semanaId], tiempo_estimado_minutos: minutos, dirty: true, saved: false, error: null },
    }))
  }
```

7. **Guardar** — sustituir el cuerpo de `guardar` por:

```tsx
  const guardar = useCallback(async (semanaId: string) => {
    const v = semanas[semanaId]
    if (!v || v.saving) return

    setSemanas(prev => ({ ...prev, [semanaId]: { ...prev[semanaId], saving: true, error: null } }))

    // El <input type="number"> devuelve '' cuando el admin borra el campo para
    // reescribirlo, y Number('') es 0 — que el servidor rechaza con 400. Se
    // acota aquí, al guardar, y no en el onChange: recortar mientras escribe le
    // pelearía el cursor al usuario en cada tecla.
    const minutos = Math.min(
      TIEMPO_MAX,
      Math.max(TIEMPO_MIN, Math.round(Number(v.tiempo_estimado_minutos) || 60)),
    )

    try {
      const res = await fetch(`/api/admin/semanas/${semanaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo:      v.titulo,
          descripcion: v.descripcion || null,
          contenido:   v.contenido   || null,
          tiempo_estimado_minutos: minutos,
          video_url:   v.video_url   || null,
          video_url_2: v.video_url_2 || null,
          video_url_3: v.video_url_3 || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      setSemanas(prev => ({
        ...prev,
        // `minutos` va de vuelta al estado: si se acotó, el input debe mostrar
        // lo que quedó guardado y no el 0 que el admin dejó a medio escribir.
        [semanaId]: {
          ...prev[semanaId],
          tiempo_estimado_minutos: minutos,
          saving: false, saved: true, dirty: false,
        },
      }))
      setTimeout(() => {
        setSemanas(prev => ({ ...prev, [semanaId]: { ...prev[semanaId], saved: false } }))
      }, 3000)
    } catch (err) {
      setSemanas(prev => ({
        ...prev,
        [semanaId]: { ...prev[semanaId], saving: false, error: (err as Error).message },
      }))
    }
  }, [semanas])
```

8. **Render de la semana** — sustituir todo el bloque `mes.semanas.map(sem => {...})`
   (desde `const v = videos[sem.id]` hasta el cierre del `<div key={sem.id}>`) por:

```tsx
                      {mes.semanas.map(sem => {
                        const v = semanas[sem.id]
                        if (!v) return null
                        return (
                          <SemanaEditor
                            key={sem.id}
                            numero={sem.numero_semana}
                            estado={v}
                            onCampo={(campo, valor) => handleCampo(sem.id, campo, valor)}
                            onTiempo={minutos => handleTiempo(sem.id, minutos)}
                            onGuardar={() => guardar(sem.id)}
                          />
                        )
                      })}
```

9. **Copy del encabezado** — la pantalla ya no es solo de videos. Sustituir:

```tsx
          <p className="text-xs mt-0.5 text-gray-600">{totalSemanas} semanas · Edita las URLs de video por semana</p>
```

por:

```tsx
          <p className="text-xs mt-0.5 text-gray-600">{totalSemanas} semanas · Edita los apuntes, los videos y los datos de cada semana</p>
```

- [ ] **Step 3: Verificar tipos, lint y build**

```bash
pnpm lint && pnpm build
```

Esperado: verde. Ojo — `next build` tiene `ignoreBuildErrors`, así que **no**
valida tipos por sí solo. Correr además:

```bash
pnpm exec tsc --noEmit
```

Esperado: sin errores. Si aparece `Property 'videos' does not exist`, quedó una
referencia al estado viejo sin renombrar.

- [ ] **Step 4: Correr toda la suite unitaria**

```bash
pnpm test:unit
```

Esperado: **todos** los specs en verde, incluido `guardian-schema-onboarding`
(F1 no toca migraciones, así que debe seguir intacto) y los specs previos.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/contenido/[id]/"
git commit -m "feat(contenido): el admin edita apuntes, titulo, descripcion y tiempo por semana

La pantalla era un editor de URLs de video que se llamaba Contenido; su
propio encabezado lo decia. Ahora edita la clase completa.

page.tsx se parte en SemanaEditor + ApuntesEditor antes de sumar campos:
eran 396 lineas para tres inputs, y F2-F4 le suman material, quizzes y
estructura encima."
```

---

### Task 7: Verificación manual contra el piloto

El análisis estático no prueba que el alumno vea lo que el admin escribió. Esto
sí.

**Sin archivos que tocar.**

- [ ] **Step 1: Levantar en local contra GLOBALMIND**

El repo de la plantilla no trae `.env.local`. Traerlo del piloto:

```bash
cd ~/clientes-MEV/GLOBALMIND/plataforma-virtual
vercel env pull .env.local
cp .env.local ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual/.env.local
cd ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual
pnpm dev
```

- [ ] **Step 2: Editar una semana como admin**

1. Entrar como admin a `/admin/contenido`.
2. Abrir una materia, expandir un mes, elegir una semana.
3. En **Apuntes**, escribir Markdown con encabezado, lista y negritas:

```markdown
## Prueba F1

Texto de prueba con **negritas**.

- punto uno
- punto dos
```

4. Cambiar el título de la semana y poner **45** minutos estimados.
5. Pulsar **Guardar** → debe salir "✓ Guardado".
6. Recargar la página → los tres cambios siguen ahí (o sea, se persistieron; no
   fue solo estado de React).

- [ ] **Step 3: Comprobar que el alumno lo ve igual**

Entrar como alumno a esa materia y esa semana. Verificar:
- el encabezado con el título nuevo,
- los apuntes **renderizados** (encabezado grande, viñetas, negritas) — no el
  Markdown en crudo,
- que la "Vista previa" del admin se veía igual que esto.

- [ ] **Step 4: Comprobar el rechazo del servidor**

Que la validación no dependa de la UI:

```bash
# Desde la consola del navegador, con sesión de admin abierta:
await fetch('/api/admin/semanas/<UUID-DE-UNA-SEMANA>', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mes_id: '00000000-0000-0000-0000-000000000000' }),
}).then(r => r.json())
```

Esperado: `{ error: "Campo no permitido: mes_id. Solo se aceptan titulo, ..." }`
con status **400**. Si esto pasara, un admin podría mover semanas de materia
desde la consola.

- [ ] **Step 5: Limpiar y cerrar**

```bash
rm ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual/.env.local
```

Devolver la semana de prueba a su título y contenido originales.

- [ ] **Step 6: Abrir el PR**

```bash
git push -u origin feat/cms-contenido-admin
gh pr create \
  --title "feat(contenido): el admin edita los apuntes y los datos de cada semana (F1)" \
  --body "Primera fase del CMS de Contenido. Spec: docs/superpowers/specs/2026-08-19-cms-contenido-admin-design.md

La seccion Contenido era, pese al nombre, un editor de URLs de video: su
encabezado decia literal 'Edita las URLs de video por semana'. La columna
semanas.contenido ya existia y el alumno ya la renderizaba como Markdown,
pero el campo ni siquiera viajaba al editor.

Que trae F1:
- PATCH /api/admin/semanas/[id] acepta titulo, descripcion, contenido y
  tiempo_estimado_minutos, con whitelist estricta en un lib puro y probado.
- Editor de apuntes en Markdown con vista previa.
- El preview y la vista del alumno montan el MISMO componente, asi que no
  pueden divergir.
- page.tsx partido en SemanaEditor + ApuntesEditor.

Sin migracion: F1 no toca el esquema.

Verificado contra GLOBALMIND (185 materias / 360 semanas)."
```

⚠️ **Mergear en local, no desde Vercel** — la convención MEVI: Vercel bloquea el
deploy por autor del commit.

---

## Definición de terminado para F1

- [ ] `pnpm test:unit` en verde, incluido `guardian-schema-onboarding`
- [ ] `pnpm exec tsc --noEmit` sin errores (el build **no** valida tipos)
- [ ] `pnpm lint && pnpm build` en verde
- [ ] Un apunte escrito por el admin se ve renderizado en la vista del alumno
- [ ] El PATCH rechaza con 400 un campo fuera de la whitelist
- [ ] `page.tsx` bajó de 396 líneas y ya no monta `ReactMarkdown` por su cuenta
- [ ] `.env.local` borrado del repo de la plantilla

## Qué NO entra en F1

Fases siguientes, cada una con su plan:

- **F2** — materiales PDF por semana (migración + bucket + gate en API route)
- **F3** — CRUD de quizzes semanales y evaluaciones mensuales
- **F4** — estructura del programa (crear/archivar/reordenar) + barrido del
  filtro `activa` en los 9 archivos + arreglo del N+1

El rollout a los ~100 clientes restantes es una tanda aparte, posterior al piloto.
