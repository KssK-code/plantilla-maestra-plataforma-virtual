# CMS de Contenido — F3: quizzes semanales y evaluaciones mensuales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda crear, editar, reordenar y retirar las preguntas del quiz de cada semana y del examen mensual de cada mes, sin que eso destruya lo que los alumnos ya respondieron.

**Architecture:** Quiz y examen tienen la MISMA forma (enunciado + cuatro opciones + correcta + orden), así que la validación vive una sola vez en `src/lib/preguntas.ts` como función pura. Retirar una pregunta respondida **archiva** (`activa=false`), nunca borra: `quiz_respuestas → quiz_semana` es `ON DELETE CASCADE`, así que un DELETE se lleva en silencio las respuestas de los alumnos. El borrado físico solo se ofrece cuando nadie la ha respondido.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase (service role vía `createAdminClient`), Playwright para `tests/unit` (`pnpm test:unit`, **sin** `--`).

**Spec:** `docs/superpowers/specs/2026-08-19-cms-contenido-admin-design.md` §5 F3, D2
**Rama:** `feat/cms-contenido-f3-quizzes` (desde `main`, con F1 y F2 ya mergeados)

---

## Lo que hay hoy

| Tabla | Columnas | Quién cuelga de ella |
|---|---|---|
| `quiz_semana` | `id, semana_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d (NULL), respuesta_correcta CHECK(a-d), orden, explicacion` | `quiz_respuestas.quiz_id` **ON DELETE CASCADE** |
| `evaluaciones` | `id, materia_id, mes_id, titulo, descripcion, tiempo_limite_minutos, intentos_permitidos, activa` | `preguntas` CASCADE, `intentos_evaluacion` CASCADE, `calificaciones` SET NULL |
| `preguntas` | `id, evaluacion_id, pregunta, opcion_a..d (todas NOT NULL), respuesta_correcta CHECK(a-d), orden` | nadie |

Ninguna ruta `api/admin/*` toca hoy `quiz_semana` ni `preguntas`. Los quizzes
precargados solo se cambian por base de datos.

**Dos agujeros del esquema que F3 destapa al abrir el CRUD:**

1. `quiz_semana.opcion_d` es *nullable* pero el CHECK admite
   `respuesta_correcta='d'`: se puede marcar como correcta una opción que no
   existe. Hoy es teórico porque nadie puede crear preguntas desde la UI.
2. Ni `quiz_semana` ni `preguntas` tienen `activa`. Sin ella no hay forma de
   retirar una pregunta sin borrarla — y borrarla, en el caso del quiz, arrastra
   las respuestas de los alumnos por CASCADE.

## Decisión: qué lector filtra `activa` y cuál NO

Un filtro a ciegas en los seis puntos **rompe la calificación**. La regla es por
intención, no por tabla:

| Archivo | Qué hace | ¿Filtra `activa`? |
|---|---|---|
| `api/alumno/quiz/[semanaId]/route.ts` (~257, por `semana_id`) | **lista** el quiz al alumno | **SÍ** |
| `api/alumno/quiz/[semanaId]/route.ts` (~196, por `.in('id', ids)`) | **califica** lo que ya respondió | NO |
| `api/alumno/evaluacion/[id]/route.ts` (~55) | **lista** el examen al alumno | **SÍ** |
| `api/alumno/evaluacion/[id]/enviar/route.ts` (~68) | **califica** el examen enviado | NO |
| `api/admin/alumnos/[id]/avance/route.ts` (~110) | lee por id desde respuestas históricas | NO |
| `api/admin/alumnos/[id]/cerrar-mes/route.ts` (~114) | recoge ids para **borrar** las respuestas del alumno | NO — necesita TODOS, si no deja huérfanas las de preguntas archivadas |
| `api/admin/contenido/[id]/route.ts` | el editor | NO — el admin ve las archivadas, marcadas |

Archivar retira la pregunta de lo que el alumno ve **a partir de ahora**; lo que
ya contestó se sigue calificando y contando igual.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260820120000_cms_contenido_preguntas.sql` **(crear)** | `activa` en `quiz_semana` y `preguntas` |
| `scripts/schema.sql`, `supabase/schema.sql`, `supabase/schema-01-tablas.sql` **(modificar)** | Los tres, siempre |
| `src/lib/preguntas.ts` **(crear)** | Validación pura compartida por quiz y examen |
| `src/app/api/admin/semanas/[id]/quiz/route.ts` **(crear)** | `GET` listar, `POST` crear |
| `src/app/api/admin/quiz/[id]/route.ts` **(crear)** | `PATCH` editar, `DELETE` archivar-o-borrar |
| `src/app/api/admin/meses/[id]/evaluaciones/route.ts` **(crear)** | `GET` listar, `POST` crear |
| `src/app/api/admin/evaluaciones/[id]/route.ts` **(crear)** | `PATCH`, `DELETE` |
| `src/app/api/admin/evaluaciones/[id]/preguntas/route.ts` **(crear)** | `POST` crear pregunta |
| `src/app/api/admin/preguntas/[id]/route.ts` **(crear)** | `PATCH`, `DELETE` |
| `src/app/(dashboard)/admin/contenido/[id]/PreguntaEditor.tsx` **(crear)** | Una pregunta: enunciado, 4 opciones, correcta |
| `src/app/(dashboard)/admin/contenido/[id]/QuizEditor.tsx` **(crear)** | El quiz de una semana |
| `src/app/(dashboard)/admin/contenido/[id]/EvaluacionEditor.tsx` **(crear)** | El examen de un mes |
| `tests/unit/cms-contenido-f3.spec.ts` **(crear)** | Invariantes de F3 |

---

### Task 1: Migración `activa` y los tres esquemas

⚠️ **Tres archivos de esquema, siempre**: `scripts/schema.sql` (el que instala
`mev-onboarding.py` en clientes nuevos), `supabase/schema.sql` y
`supabase/schema-01-tablas.sql`. Y **ninguna tabla puede declarar una columna
dos veces** — hay un test que lo vigila desde que un auto-merge dejó
`semanas.contenido` duplicada y eso habría reventado el instalador.

**Files:**
- Create: `supabase/migrations/20260820120000_cms_contenido_preguntas.sql`
- Modify: los tres `schema.sql`
- Test: `tests/unit/cms-contenido-f3.spec.ts`

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/unit/cms-contenido-f3.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * CMS de Contenido — F3 (quizzes semanales y evaluaciones mensuales).
 *
 * Invariantes:
 *  1. Retirar una pregunta RESPONDIDA archiva, nunca borra: quiz_respuestas
 *     cuelga de quiz_semana con ON DELETE CASCADE, así que un DELETE se lleva
 *     en silencio lo que los alumnos contestaron.
 *  2. `activa` se filtra donde se LISTA para el alumno, y NO donde se
 *     CALIFICA: archivar a mitad de un examen no puede cambiar la nota.
 *  3. respuesta_correcta='d' exige opcion_d no vacía. El CHECK del esquema
 *     admite 'd' pero opcion_d es nullable en quiz_semana.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

const MIGRACION = 'supabase/migrations/20260820120000_cms_contenido_preguntas.sql'
const ESQUEMAS = ['scripts/schema.sql', 'supabase/schema.sql', 'supabase/schema-01-tablas.sql']

test('la migración añade activa a las dos tablas de preguntas', () => {
  const sql = leer(MIGRACION)
  for (const t of ['quiz_semana', 'preguntas']) {
    expect(sql, `sin ALTER de ${t}`).toMatch(
      new RegExp(`ALTER TABLE public\\.${t}[\\s\\S]{0,120}ADD COLUMN IF NOT EXISTS activa`))
  }
  // DEFAULT true: en los ~100 clientes ya desplegados nada puede desaparecer
  expect((sql.match(/DEFAULT true/g) ?? []).length).toBeGreaterThanOrEqual(2)
})

test('activa llega a los TRES esquemas', () => {
  for (const archivo of ESQUEMAS) {
    const sql = leer(archivo)
    for (const tabla of ['quiz_semana', 'preguntas']) {
      const ddl = sql.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?public\\.${tabla}[\\s\\S]*?\\n\\s*\\);`))?.[0] ?? ''
      expect(ddl, `${archivo}: sin DDL de ${tabla}`).not.toBe('')
      expect(ddl, `${archivo}: ${tabla} sin activa`).toMatch(/^\s*activa\s+(?:boolean|BOOLEAN)/m)
    }
  }
})
```

- [ ] **Step 2: Correr y ver que falla**

```bash
cd ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual
pnpm test:unit cms-contenido-f3
```
⚠️ **SIN `--`**: con `--` no filtra y corre la suite entera.
Esperado: 2 fallos, el primero por `ENOENT` de la migración.

- [ ] **Step 3: La migración**

Crear `supabase/migrations/20260820120000_cms_contenido_preguntas.sql`:

```sql
-- ============================================================================
-- F3 — Retirar preguntas sin destruir lo que los alumnos ya respondieron
-- ============================================================================
-- Al abrir el CRUD de preguntas hace falta poder RETIRAR una. Borrarla no
-- sirve: quiz_respuestas cuelga de quiz_semana con ON DELETE CASCADE, así que
-- un DELETE se lleva en silencio lo que los alumnos contestaron, y en el examen
-- cambia retroactivamente el conjunto de preguntas contra el que se calculó una
-- calificación que ya está emitida.
--
-- `activa` permite retirarla de lo que el alumno ve DE AHORA EN ADELANTE, sin
-- tocar su historial. El borrado físico se sigue ofreciendo, pero solo cuando
-- nadie la ha respondido: esa decisión la toma la API, no esta migración.
--
-- DEFAULT true es lo que hace esto seguro en los ~100 clientes ya desplegados:
-- toda pregunta existente sigue exactamente igual de visible.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS. Re-ejecutable.
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543).
-- ============================================================================

ALTER TABLE public.quiz_semana
  ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true NOT NULL;

ALTER TABLE public.preguntas
  ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true NOT NULL;

-- Índices parciales: las consultas del alumno siempre piden activa = true.
CREATE INDEX IF NOT EXISTS idx_quiz_semana_activa
  ON public.quiz_semana (semana_id) WHERE activa;

CREATE INDEX IF NOT EXISTS idx_preguntas_activa
  ON public.preguntas (evaluacion_id) WHERE activa;

-- ── Verificación manual (no altera nada) ────────────────────────────────────
--   SELECT count(*) FILTER (WHERE activa) AS activas, count(*) AS todas
--     FROM public.quiz_semana;
--   -- deben coincidir justo después de aplicar
```

- [ ] **Step 4: Reflejarlo en los tres esquemas**

En cada uno, añadir `activa` al `CREATE TABLE` de `quiz_semana` y de
`preguntas`, con el estilo de ese archivo (`scripts/schema.sql` usa
`activa boolean DEFAULT true NOT NULL,`; los de `supabase/` alinean el tipo en
columnas). Añadir también los dos índices donde ese archivo agrupe los suyos.

⚠️ **Comprueba que no duplicas**: si la columna ya estuviera, no la añadas otra
vez. La prueba `ningún CREATE TABLE declara una columna repetida` de
`cms-contenido-f2.spec.ts` te avisará, pero míralo antes.

- [ ] **Step 5: Verificar y commitear**

```bash
pnpm test:unit
```
Esperado: los 2 nuevos en verde y **cero regresiones**, en particular
`guardian-schema-onboarding`, `corregir-plan` y el anti-duplicados de F2.

```bash
git add supabase/ scripts/schema.sql tests/unit/cms-contenido-f3.spec.ts
git commit -m "feat(preguntas): activa en quiz_semana y preguntas, para retirar sin destruir

quiz_respuestas cuelga de quiz_semana con ON DELETE CASCADE: borrar una
pregunta se lleva en silencio lo que los alumnos contestaron. Con activa se
retira de lo que ven de ahora en adelante y su historial queda intacto.

DEFAULT true: en los ~100 clientes ya desplegados nada cambia de visibilidad."
```

---

### Task 2: Validación pura, compartida por quiz y examen

Las dos tablas tienen la misma forma. La validación vive una vez.

**Files:**
- Create: `src/lib/preguntas.ts`

- [ ] **Step 1: Las pruebas**

Añadir a `tests/unit/cms-contenido-f3.spec.ts` (y al import de la cabecera):

```ts
import { validarPregunta, CAMPOS_PREGUNTA, CAMPOS_QUIZ, PREGUNTA_MAX, OPCION_MAX } from '@/lib/preguntas'

// ────────────────────────── Validación de preguntas ─────────────────────────

test('la whitelist del examen NO incluye explicacion — esa columna no existe ahí', () => {
  expect([...CAMPOS_PREGUNTA]).toEqual([
    'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
    'respuesta_correcta', 'orden',
  ])
  expect([...CAMPOS_QUIZ]).toContain('explicacion')
})

test('mandar explicacion a una pregunta de examen se rechaza, no revienta el insert', () => {
  // `preguntas` no tiene columna explicacion: sin esto, Postgres respondería
  // "column explicacion does not exist" y la ruta devolvería un 500 opaco.
  expect(validarPregunta({ explicacion: 'x' }, { crear: false, tipo: 'examen' }).ok).toBe(false)
  expect(validarPregunta({ explicacion: 'x' }, { crear: false, tipo: 'quiz' }).ok).toBe(true)
})

test('una clave fuera de la whitelist rechaza la petición entera', () => {
  const r = validarPregunta({ pregunta: '¿?', semana_id: 'otra' }, { crear: false, tipo: 'quiz' })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('Campo no permitido: semana_id')
})

test('crear exige enunciado, tres opciones y respuesta correcta', () => {
  const r = validarPregunta({}, { crear: true, tipo: 'quiz' })
  expect(r.ok).toBe(false)
  const base = { pregunta: '¿2+2?', opcion_a: '3', opcion_b: '4', opcion_c: '5', respuesta_correcta: 'b' }
  expect(validarPregunta(base, { crear: true, tipo: 'quiz' }).ok).toBe(true)
})

test('editar acepta un solo campo — no obliga a reenviar la pregunta entera', () => {
  const r = validarPregunta({ explicacion: 'porque sí' }, { crear: false, tipo: 'quiz' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(Object.keys(r.datos)).toEqual(['explicacion'])
})

test('respuesta_correcta solo admite a, b, c o d', () => {
  for (const mala of ['e', 'A', '', 'ab', 1, null]) {
    expect(validarPregunta({ respuesta_correcta: mala }, { crear: false, tipo: 'quiz' }).ok, String(mala)).toBe(false)
  }
})

test("marcar 'd' como correcta exige que opcion_d exista — el CHECK del esquema no lo cubre", () => {
  // quiz_semana.opcion_d es NULLABLE y el CHECK admite 'd': sin esto se puede
  // dejar como correcta una opción que el alumno no ve.
  const sinD = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'd' }
  expect(validarPregunta(sinD, { crear: true, tipo: 'quiz' }).ok).toBe(false)
  expect(validarPregunta({ ...sinD, opcion_d: '4' }, { crear: true, tipo: 'quiz' }).ok).toBe(true)
  // Y tampoco vale vaciar opcion_d dejando 'd' como correcta
  expect(validarPregunta({ opcion_d: '', respuesta_correcta: 'd' }, { crear: false, tipo: 'quiz' }).ok).toBe(false)
})

test('las opciones a, b y c no pueden quedar vacías; la d sí (es opcional)', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  for (const campo of ['opcion_a', 'opcion_b', 'opcion_c']) {
    expect(validarPregunta({ ...base, [campo]: '   ' }, { crear: true, tipo: 'quiz' }).ok, campo).toBe(false)
  }
  expect(validarPregunta({ ...base, opcion_d: '' }, { crear: true, tipo: 'quiz' }).ok).toBe(true)
})

test('los textos tienen tope', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  expect(validarPregunta({ ...base, pregunta: 'a'.repeat(PREGUNTA_MAX + 1) }, { crear: true, tipo: 'quiz' }).ok).toBe(false)
  expect(validarPregunta({ ...base, opcion_a: 'a'.repeat(OPCION_MAX + 1) }, { crear: true, tipo: 'quiz' }).ok).toBe(false)
})

test('orden debe ser un entero no negativo', () => {
  for (const malo of [-1, 1.5, '3', null]) {
    expect(validarPregunta({ orden: malo }, { crear: false, tipo: 'quiz' }).ok, String(malo)).toBe(false)
  }
  expect(validarPregunta({ orden: 0 }, { crear: false, tipo: 'quiz' }).ok).toBe(true)
})
```

- [ ] **Step 2: Correr y ver que falla**

```bash
pnpm test:unit cms-contenido-f3
```

- [ ] **Step 3: Escribir `src/lib/preguntas.ts`**

```ts
// ─── Preguntas: quiz semanal y examen mensual ────────────────────────────────
// Las dos tablas (quiz_semana y preguntas) tienen la MISMA forma: enunciado,
// cuatro opciones, cuál es la correcta y en qué orden va. La validación vive
// aquí una sola vez, como función pura, para poder probarla sin servidor.
//
// Mismo patrón que lib/corregir-plan.ts y lib/contenido-semana.ts: whitelist
// estricta, porque estas rutas escriben con service role y sin RLS.

// ⚠️ Asimetría REAL entre las dos tablas: `explicacion` solo existe en
// quiz_semana. `preguntas` (el examen mensual) NO la tiene, así que mandarla
// ahí revienta con "column explicacion does not exist".
export const CAMPOS_PREGUNTA = [
  'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
  'respuesta_correcta', 'orden',
] as const

/** El quiz semanal acepta además una explicación que el alumno ve al fallar. */
export const CAMPOS_QUIZ = [...CAMPOS_PREGUNTA, 'explicacion'] as const

export type CampoPregunta = (typeof CAMPOS_QUIZ)[number]

export type TipoPregunta = 'quiz' | 'examen'

export const PREGUNTA_MAX    = 2_000
export const OPCION_MAX      = 500
export const EXPLICACION_MAX = 2_000

export const OPCIONES = ['a', 'b', 'c', 'd'] as const
export type Opcion = (typeof OPCIONES)[number]

export interface DatosPregunta {
  pregunta?: string
  opcion_a?: string
  opcion_b?: string
  opcion_c?: string
  /** Cuarta opción OPCIONAL: en quiz_semana la columna es nullable. */
  opcion_d?: string | null
  respuesta_correcta?: Opcion
  orden?: number
  explicacion?: string | null
}

export type ResultadoPregunta =
  | { ok: true; datos: DatosPregunta }
  | { ok: false; error: string }

function texto(v: unknown, max: number, campo: string):
  { ok: true; valor: string } | { ok: false; error: string } {
  if (typeof v !== 'string') return { ok: false, error: `${campo} debe ser texto` }
  if (v.length > max) return { ok: false, error: `${campo} no puede pasar de ${max} caracteres` }
  const limpio = v.trim()
  if (!limpio) return { ok: false, error: `${campo} no puede quedar vacío` }
  return { ok: true, valor: limpio }
}

/**
 * Valida el cuerpo de una pregunta.
 *
 * `crear: true` exige el mínimo con el que una pregunta tiene sentido
 * (enunciado, tres opciones y cuál es la correcta). `crear: false` es un parche:
 * acepta un solo campo, para que editar la explicación no obligue a reenviar
 * toda la pregunta.
 */
export function validarPregunta(
  body: unknown,
  opciones: { crear: boolean; tipo: TipoPregunta },
): ResultadoPregunta {
  const permitidos: readonly string[] =
    opciones.tipo === 'quiz' ? CAMPOS_QUIZ : CAMPOS_PREGUNTA
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto.' }
  }

  const claves = Object.keys(body)
  const extras = claves.filter(k => !permitidos.includes(k))
  if (extras.length > 0) {
    return {
      ok: false,
      error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan ${permitidos.join(', ')}.`,
    }
  }
  if (!opciones.crear && claves.length === 0) {
    return { ok: false, error: 'No se envió ningún campo para actualizar.' }
  }

  const b = body as Record<string, unknown>
  const datos: DatosPregunta = {}

  // Enunciado y las tres opciones obligatorias.
  for (const campo of ['pregunta', 'opcion_a', 'opcion_b', 'opcion_c'] as const) {
    const max = campo === 'pregunta' ? PREGUNTA_MAX : OPCION_MAX
    if (claves.includes(campo)) {
      const r = texto(b[campo], max, campo)
      if (!r.ok) return r
      datos[campo] = r.valor
    } else if (opciones.crear) {
      return { ok: false, error: `${campo} es requerido` }
    }
  }

  // opcion_d es OPCIONAL: la columna es nullable en quiz_semana. '' → null.
  if (claves.includes('opcion_d')) {
    const v = b.opcion_d
    if (v === null || v === undefined) {
      datos.opcion_d = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'opcion_d debe ser texto' }
    } else if (v.length > OPCION_MAX) {
      return { ok: false, error: `opcion_d no puede pasar de ${OPCION_MAX} caracteres` }
    } else {
      datos.opcion_d = v.trim() || null
    }
  }

  if (claves.includes('respuesta_correcta')) {
    const v = b.respuesta_correcta
    if (typeof v !== 'string' || !(OPCIONES as readonly string[]).includes(v)) {
      return { ok: false, error: `respuesta_correcta debe ser una de: ${OPCIONES.join(', ')}` }
    }
    datos.respuesta_correcta = v as Opcion
  } else if (opciones.crear) {
    return { ok: false, error: 'respuesta_correcta es requerida' }
  }

  if (claves.includes('orden')) {
    const n = b.orden
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
      return { ok: false, error: 'orden debe ser un entero mayor o igual que 0' }
    }
    datos.orden = n
  }

  if (claves.includes('explicacion')) {
    const v = b.explicacion
    if (v === null || v === undefined) {
      datos.explicacion = null
    } else if (typeof v !== 'string') {
      return { ok: false, error: 'explicacion debe ser texto' }
    } else if (v.length > EXPLICACION_MAX) {
      return { ok: false, error: `explicacion no puede pasar de ${EXPLICACION_MAX} caracteres` }
    } else {
      datos.explicacion = v.trim() || null
    }
  }

  // El CHECK del esquema admite respuesta_correcta='d', pero quiz_semana.opcion_d
  // es NULLABLE: sin esta regla se puede dejar como correcta una opción que el
  // alumno no ve por ninguna parte. Se comprueba al final, cuando ya sabemos qué
  // valores quedan tras aplicar el parche.
  if (datos.respuesta_correcta === 'd' && claves.includes('opcion_d') && !datos.opcion_d) {
    return { ok: false, error: 'No puedes marcar la opción D como correcta si está vacía' }
  }
  if (opciones.crear && datos.respuesta_correcta === 'd' && !datos.opcion_d) {
    return { ok: false, error: 'No puedes marcar la opción D como correcta si está vacía' }
  }

  return { ok: true, datos }
}
```

⚠️ Al **editar** solo `respuesta_correcta='d'` sin tocar `opcion_d`, esta
función no puede saber si la opción D existe: no tiene la fila. Esa comprobación
la hace la ruta `PATCH`, que sí la lee (Task 4).

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm test:unit cms-contenido-f3
pnpm exec tsc --noEmit
git add src/lib/preguntas.ts tests/unit/cms-contenido-f3.spec.ts
git commit -m "feat(preguntas): validacion pura compartida por quiz y examen

El CHECK del esquema admite respuesta_correcta='d' pero quiz_semana.opcion_d
es nullable: se podia marcar como correcta una opcion que el alumno no ve.
Hoy era teorico porque nadie podia crear preguntas desde la UI; en cuanto F3
abre el CRUD deja de serlo."
```

---

### Task 3: Regla de retirada compartida

Antes de las rutas, la decisión de "archivar o borrar" vive en un helper propio
porque la usan cuatro rutas y tiene que comportarse igual en las cuatro.

**Files:**
- Create: `src/lib/retirar-contenido.ts`

- [ ] **Step 1: Las pruebas**

```ts
import { decidirRetirada } from '@/lib/retirar-contenido'

// ──────────────────── Archivar o borrar (regla D2) ──────────────────────────

test('sin dependencias se borra de verdad', () => {
  expect(decidirRetirada(0)).toEqual({ accion: 'borrar' })
})

test('con dependencias se archiva y se dice cuántas', () => {
  const r = decidirRetirada(7)
  expect(r.accion).toBe('archivar')
  if (r.accion === 'archivar') expect(r.dependencias).toBe(7)
})
```

- [ ] **Step 2: El helper**

```ts
// ─── Retirar contenido sin destruir historial (regla D2 del spec) ────────────
// El admin pulsa un solo botón, "Eliminar". Quién decide qué pasa es el
// servidor, no él: no tiene forma de saber si esa pregunta la respondieron
// alumnos, y hacerle elegir entre "archivar" y "borrar" le traslada una
// decisión que el sistema puede tomar con certeza.

export type Retirada =
  | { accion: 'borrar' }
  | { accion: 'archivar'; dependencias: number }

/**
 * @param dependencias filas de alumnos que apuntan a esto (respuestas,
 *   intentos, calificaciones). Cero → nadie lo ha tocado y se puede borrar.
 */
export function decidirRetirada(dependencias: number): Retirada {
  return dependencias > 0 ? { accion: 'archivar', dependencias } : { accion: 'borrar' }
}
```

- [ ] **Step 3: Verificar y commitear**

```bash
pnpm test:unit cms-contenido-f3
git add src/lib/retirar-contenido.ts tests/unit/cms-contenido-f3.spec.ts
git commit -m "feat(contenido): regla unica de archivar-o-borrar, compartida por las 4 rutas"
```

---

### Task 4: Rutas admin del quiz semanal

**Files:**
- Create: `src/app/api/admin/semanas/[id]/quiz/route.ts`
- Create: `src/app/api/admin/quiz/[id]/route.ts`

- [ ] **Step 1: `semanas/[id]/quiz/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarPregunta } from '@/lib/preguntas'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

// El editor ve TODAS, archivadas incluidas: para poder restaurarlas.
export async function GET(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('quiz_semana')
      .select('id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion, activa')
      .eq('semana_id', params.id)
      .order('orden', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ preguntas: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/semanas/[id]/quiz]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const { data: semana } = await admin
      .from('semanas').select('id').eq('id', params.id).maybeSingle()
    if (!semana) return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })

    const validacion = validarPregunta(await request.json(), { crear: true, tipo: 'quiz' })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    // `orden` explícito: dejarlo NULL funciona de rebote pero deja la columna
    // inerte, y en este repo ya hubo un bug de posición por un orden NULL.
    let orden = validacion.datos.orden
    if (orden === undefined) {
      const { data: ultimo } = await admin
        .from('quiz_semana').select('orden').eq('semana_id', params.id)
        .order('orden', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
      orden = ((ultimo as { orden: number | null } | null)?.orden ?? -1) + 1
    }

    const { data: fila, error } = await admin
      .from('quiz_semana')
      .insert({ ...validacion.datos, orden, semana_id: params.id })
      .select('id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, explicacion, activa')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pregunta: fila })
  } catch (err) {
    console.error('[POST /api/admin/semanas/[id]/quiz]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: `quiz/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarPregunta } from '@/lib/preguntas'
import { decidirRetirada } from '@/lib/retirar-contenido'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json()
    // `activa` no está en la whitelist de validarPregunta: restaurar una
    // pregunta archivada es su propia acción, no una edición de contenido.
    if (Object.keys(body).length === 1 && typeof body.activa === 'boolean') {
      const admin = createAdminClient()
      const { error } = await admin.from('quiz_semana').update({ activa: body.activa }).eq('id', params.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, activa: body.activa })
    }

    const validacion = validarPregunta(body, { crear: false, tipo: 'quiz' })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const admin = createAdminClient()
    const { data: actual } = await admin
      .from('quiz_semana').select('opcion_d, respuesta_correcta').eq('id', params.id).maybeSingle()
    if (!actual) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

    // La coherencia 'd'↔opcion_d se cierra AQUÍ: el validador puro no ve la
    // fila, así que no puede saber si la D existe cuando solo se cambia una de
    // las dos cosas. Se evalúa el resultado FINAL del parche.
    const fila = actual as { opcion_d: string | null; respuesta_correcta: string }
    const opcionDFinal = 'opcion_d' in validacion.datos ? validacion.datos.opcion_d : fila.opcion_d
    const correctaFinal = validacion.datos.respuesta_correcta ?? fila.respuesta_correcta
    if (correctaFinal === 'd' && !opcionDFinal) {
      return NextResponse.json(
        { error: 'No puedes dejar la opción D como correcta si está vacía' }, { status: 400 })
    }

    const { error } = await admin.from('quiz_semana').update(validacion.datos).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/admin/quiz/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // quiz_respuestas cuelga con ON DELETE CASCADE: sin este conteo, borrar la
    // pregunta se lleva en silencio lo que los alumnos contestaron.
    const { count } = await admin
      .from('quiz_respuestas').select('*', { count: 'exact', head: true }).eq('quiz_id', params.id)

    const decision = decidirRetirada(count ?? 0)
    if (decision.accion === 'archivar') {
      const { error } = await admin.from('quiz_semana').update({ activa: false }).eq('id', params.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({
        accion: 'archivada',
        dependencias: decision.dependencias,
        mensaje: `${decision.dependencias} alumno(s) ya respondieron esta pregunta, así que se archivó en vez de borrarse: deja de aparecer, pero sus respuestas y calificaciones quedan intactas.`,
      })
    }

    const { error } = await admin.from('quiz_semana').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accion: 'borrada' })
  } catch (err) {
    console.error('[DELETE /api/admin/quiz/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Pruebas**

```ts
// ─────────────────────── Rutas admin del quiz ───────────────────────────────

test('las rutas de quiz exigen rol ADMIN', () => {
  for (const r of [
    'src/app/api/admin/semanas/[id]/quiz/route.ts',
    'src/app/api/admin/quiz/[id]/route.ts',
  ]) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('borrar una pregunta cuenta las respuestas antes de tocarla', () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  const del = src.slice(src.indexOf('export async function DELETE'))
  expect(del).toContain("from('quiz_respuestas')")
  expect(del).toContain('decidirRetirada')
  // Y el DELETE fisico va DESPUES de la decision, nunca antes
  expect(del.indexOf('decidirRetirada')).toBeLessThan(del.indexOf('.delete()'))
})

test("el PATCH cierra la coherencia 'd' contra la fila, no solo contra el body", () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  expect(src).toContain('opcionDFinal')
  expect(src).toContain('correctaFinal')
})
```

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm test:unit && pnpm exec tsc --noEmit && pnpm lint && pnpm build
git add src/app/api/admin tests/unit/cms-contenido-f3.spec.ts
git commit -m "feat(quiz): el admin crea, edita y retira preguntas del quiz semanal"
```

---

### Task 5: Rutas admin de evaluaciones y sus preguntas

**Files:**
- Create: `src/app/api/admin/meses/[id]/evaluaciones/route.ts` (GET, POST)
- Create: `src/app/api/admin/evaluaciones/[id]/route.ts` (PATCH, DELETE)
- Create: `src/app/api/admin/evaluaciones/[id]/preguntas/route.ts` (GET, POST)
- Create: `src/app/api/admin/preguntas/[id]/route.ts` (PATCH, DELETE)

> **Nota de honestidad sobre este plan.** Las tareas 5 y 7 están especificadas
> por DELTA contra la Task 4 y contra los componentes de F2, no con su código
> completo: reproducirlo entero duplicaría el documento. Quien las ejecute debe
> tener delante `src/app/api/admin/quiz/[id]/route.ts` (Task 4) y
> `MaterialesPanel.tsx` (F2) — el despacho de cada tarea incluye ese código.
> Si ejecutas este plan fuera de ese flujo, ábrelos antes de empezar.

Mismo patrón que la Task 4, con estas diferencias:

- **`evaluaciones` ya tiene `activa`**, así que su `DELETE` archiva con la
  columna existente. Sus dependencias se cuentan en `intentos_evaluacion`
  (CASCADE) **y** `calificaciones` (SET NULL): las dos, sumadas.
- **Al crear una evaluación** hacen falta `titulo`, `mes_id` y `materia_id`. El
  `materia_id` NO viene del body: se deriva del mes
  (`meses_contenido.materia_id`), igual que `materiaDeSemana` en F2. Aceptarlo
  del cliente permitiría colgar un examen de una materia ajena.
- **`preguntas.opcion_d` es NOT NULL** (a diferencia de `quiz_semana`), así que
  al insertar hay que mandar `opcion_d ?? ''`. Documéntalo en el código: es la
  única asimetría real entre las dos tablas.
- **`preguntas` no tiene nadie colgando**, así que el conteo de dependencias de
  una pregunta de examen son los `intentos_evaluacion` **de su evaluación**:
  borrarla cambiaría retroactivamente el examen contra el que se calculó una
  calificación ya emitida.

Validación de la evaluación en sí (título, minutos, intentos) va en
`src/lib/preguntas.ts` como `validarEvaluacion(body, {crear})`, con los mismos
criterios: whitelist estricta, `tiempo_limite_minutos` entero 1–600,
`intentos_permitidos` entero 1–20, `titulo` no vacío ≤300.

Pruebas equivalentes a las de la Task 4, más:

```ts
test('la materia de una evaluación se deriva del mes, no se acepta del cliente', () => {
  const src = leer('src/app/api/admin/meses/[id]/evaluaciones/route.ts')
  expect(src).toContain('meses_contenido')
  expect(src).toContain('materia_id')
  // No se lee materia_id del body en ningun punto
  expect(src).not.toMatch(/body\.materia_id/)
})

test('preguntas.opcion_d es NOT NULL: se inserta cadena vacía, no null', () => {
  const src = leer('src/app/api/admin/evaluaciones/[id]/preguntas/route.ts')
  expect(src).toContain("opcion_d")
  expect(src).toMatch(/opcion_d[^\n]*\?\?\s*''/)
})
```

---

### Task 6: El barrido de `activa` — una decisión por rama

Añadir la columna no sirve de nada si se filtra en el sitio equivocado. **Un
filtro a ciegas rompe la calificación.**

**Files (modificar, uno por uno):**

| Archivo | Acción |
|---|---|
| `src/app/api/alumno/quiz/[semanaId]/route.ts` (select por `semana_id`) | **añadir** `.eq('activa', true)` |
| `src/app/api/alumno/quiz/[semanaId]/route.ts` (select por `.in('id', ids)`) | **NO tocar** — califica lo ya respondido |
| `src/app/api/alumno/evaluacion/[id]/route.ts` (select por `evaluacion_id`) | **añadir** `.eq('activa', true)` |
| `src/app/api/alumno/evaluacion/[id]/enviar/route.ts` | **NO tocar** — califica el envío |
| `src/app/api/admin/alumnos/[id]/avance/route.ts` | **NO tocar** — lee historial por id |
| `src/app/api/admin/alumnos/[id]/cerrar-mes/route.ts` | **NO tocar** — necesita TODOS los ids para limpiar |
| `src/app/api/admin/contenido/[id]/route.ts` | **NO tocar** — el editor ve las archivadas |

- [ ] **Prueba que congela la decisión** (análisis estático, para que el barrido no se deshaga con el tiempo):

```ts
// ───────── `activa` se filtra al LISTAR, nunca al CALIFICAR ─────────────────

test('el alumno no ve las preguntas archivadas al abrir quiz y examen', () => {
  const quiz = leer('src/app/api/alumno/quiz/[semanaId]/route.ts')
  const listar = quiz.slice(quiz.indexOf(".eq('semana_id'") - 400, quiz.indexOf(".eq('semana_id'") + 200)
  expect(listar, 'el listado del quiz no filtra activa').toContain("activa")

  const ev = leer('src/app/api/alumno/evaluacion/[id]/route.ts')
  expect(ev, 'el listado del examen no filtra activa').toContain("activa', true")
})

test('CALIFICAR nunca filtra activa: archivar a mitad no puede cambiar la nota', () => {
  const enviar = leer('src/app/api/alumno/evaluacion/[id]/enviar/route.ts')
  const bloque = enviar.slice(enviar.indexOf("from('preguntas')"), enviar.indexOf("from('preguntas')") + 300)
  expect(bloque, 'el calificador filtra activa y no debe').not.toContain('activa')

  const cerrar = leer('src/app/api/admin/alumnos/[id]/cerrar-mes/route.ts')
  const bq = cerrar.slice(cerrar.indexOf("from('quiz_semana')"), cerrar.indexOf("from('quiz_semana')") + 250)
  expect(bq, 'cerrar-mes filtra activa y dejaria respuestas huerfanas').not.toContain('activa')
})
```

---

### Task 7: UI — `PreguntaEditor`, `QuizEditor` y `EvaluacionEditor`

- `PreguntaEditor.tsx`: enunciado (textarea), cuatro inputs de opción, radio
  para la correcta, textarea de explicación, botón Guardar y botón Eliminar.
  Una pregunta archivada se pinta atenuada con una etiqueta "Archivada" y un
  botón Restaurar (`PATCH {activa:true}`).
- `QuizEditor.tsx`: monta las preguntas de una semana + "Añadir pregunta".
  Se monta en `SemanaEditor.tsx` después de `MaterialesPanel`.
- `EvaluacionEditor.tsx`: el examen del mes (título, minutos, intentos) + sus
  preguntas. Se monta en `page.tsx`, dentro del acordeón del mes, **fuera** de
  las semanas: el examen es del mes, no de una semana.

El `DELETE` devuelve `{accion:'archivada'|'borrada', mensaje?}`. La UI muestra
el `mensaje` del servidor cuando archiva — es donde el admin se entera de que
había respuestas de alumnos.

Estilo: el de `ApuntesEditor`/`MaterialesPanel` (`#0D1017`, `1px solid #2A2F3E`,
`#64748B`, acento `var(--color-acento)`).

---

### Task 8: Verificación contra el piloto

- [ ] Aplicar la migración en GLOBALMIND y comprobar que
      `count(*) FILTER (WHERE activa) = count(*)` en las dos tablas (nada
      desapareció).
- [ ] Con admin desechable (crear, usar, **borrar y verificar**): crear una
      pregunta de quiz, editarla, reordenarla.
- [ ] **La prueba que importa**: responder esa pregunta como alumno, luego
      pulsar Eliminar como admin → debe **archivar**, no borrar, y decir cuántos
      alumnos la respondieron. Verificar en SQL que la fila de `quiz_respuestas`
      **sigue ahí**.
- [ ] Comprobar que el alumno ya no la ve al abrir el quiz, y que su
      calificación anterior no cambió.
- [ ] Crear una pregunta nueva, no responderla, y Eliminar → debe **borrar**.
- [ ] Dejar el tenant como estaba y abrir el PR.

---

## Definición de terminado para F3

- [ ] `pnpm test:unit` en verde, incluidos los guardianes de esquema y el anti-duplicados
- [ ] `pnpm exec tsc --noEmit` sin errores nuevos
- [ ] `pnpm lint && pnpm build` en verde
- [ ] `activa` en los **tres** esquemas, sin columnas duplicadas
- [ ] Retirar una pregunta respondida **archiva** y la respuesta del alumno sigue en la base
- [ ] Retirar una pregunta sin responder **borra**
- [ ] Calificar NO filtra `activa` en ninguno de los cuatro puntos marcados

## ⚠️ Para F4: la cascada que esquiva toda esta regla

F3 protege el borrado de una PREGUNTA. Pero la cadena
`semanas → quiz_semana → quiz_respuestas` es **CASCADE de punta a punta**, así
que en cuanto F4 añada un `DELETE` de semanas, borrar una semana se llevará las
respuestas de los alumnos sin pasar por `decidirRetirada` ni contar nada.

El `DELETE` de semanas de F4 **tiene que contar también `quiz_respuestas`**, no
solo `progreso_semanas`. Y hay más, encontrado al hacer las rutas del examen:

| Cadena | Comportamiento | Qué implica para F4 |
|---|---|---|
| `semanas → quiz_semana → quiz_respuestas` | CASCADE entera | Borrar una semana destruye respuestas sin pasar por `decidirRetirada` |
| `materias → meses_contenido → evaluaciones → intentos_evaluacion` | CASCADE entera | Borrar una materia destruye historial de exámenes |
| `evaluaciones.mes_id` | **SET NULL**, no CASCADE | Borrar un mes deja exámenes huérfanos con `mes_id=NULL`: conservan preguntas e intentos pero quedan **inalcanzables por la API**, que lista por mes |
| `meses_contenido.materia_id` | nullable | Un mes sin materia produce exámenes invisibles: no los ve la vista de la materia ni `cerrar-mes`, que busca por materia |

Y si algún día se añade "mover un mes a otra materia", los exámenes existentes
quedarían colgados de la materia ANTIGUA: habría que arrastrarlos en la misma
operación.

## Qué NO entra en F3

- F4: crear/archivar/reordenar materias, meses y semanas, el barrido de `activa`
  sobre `semanas`/`meses_contenido`, y el arreglo del N+1 de
  `GET /api/admin/contenido`.
- Tipos de pregunta que no sean opción múltiple.
- Banco de preguntas reutilizable entre materias.
