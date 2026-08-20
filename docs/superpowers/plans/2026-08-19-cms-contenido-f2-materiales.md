# CMS de Contenido — F2: materiales PDF por semana

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda subir, listar y quitar PDFs por semana desde Contenido, y que el alumno pueda descargarlos desde su materia.

**Architecture:** Tabla `semana_materiales` (varios archivos por semana) + bucket privado `materias`. El bucket **no** lleva política de lectura para alumnos: un único endpoint `GET /api/material/[id]` resuelve el acceso —admin o alumno con `tieneAccesoSemana()`— y responde con un 302 a una URL firmada. Los helpers de archivo del módulo Cursos se generalizan para aceptar bucket en vez de duplicarse.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase Storage (bucket privado + `createSignedUploadUrl`), Playwright para `tests/unit` (`pnpm test:unit`, **sin** `--`).

**Spec:** `docs/superpowers/specs/2026-08-19-cms-contenido-admin-design.md` §5 F2, §4, D3, D4
**Rama:** `feat/cms-contenido-f2-materiales` (desde `main` @ `38b9f25`, con F1 ya mergeado)

---

## Por qué el bucket no lleva política para alumnos

El módulo Cursos **sí** duplica la regla de acceso dentro de la política SQL de
storage, y esa duplicación ya causó un bug real documentado en
`supabase/migrations/20260729122000_fix_portadas_storage_policy.sql`: las
portadas salían en blanco **solo para el alumno**, invisible en cualquier QA
hecho con cuenta de admin.

Aquí el bucket es admin-only en RLS. El alumno nunca lee del bucket: pide
`/api/material/[id]`, que reusa `tieneAccesoSemana()` —la misma función que ya
gatea el quiz— y firma con service role. Una sola definición de "quién puede ver
esto", en TypeScript, con pruebas.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260819130000_cms_contenido_materiales.sql` **(crear)** | Tabla, RLS, bucket y políticas |
| `scripts/schema.sql` **(modificar)** | El que instala `mev-onboarding.py` en clientes nuevos |
| `supabase/schema.sql`, `supabase/schema-01-tablas.sql` **(modificar)** | Los dos espejos; además cierran una deriva preexistente |
| `src/lib/archivos-comunes.ts` **(crear)** | Helpers puros de archivo, sin bucket dentro |
| `src/lib/storage-comun.ts` **(crear)** | `signedUrl(admin, bucket, path)` y `removeFolder(admin, bucket, prefix)` |
| `src/lib/upload-comun.ts` **(crear)** | Subida de cliente en 3 pasos, con el bucket como parámetro |
| `src/lib/cursos/{archivos,storage,upload}.ts` **(modificar)** | Pasan a envoltorios finos sobre lo anterior |
| `src/lib/materiales-semana.ts` **(crear)** | Bucket, rutas y validación de los materiales de semana |
| `src/app/api/admin/semanas/[id]/materiales/route.ts` **(crear)** | `POST` (upload-url / confirm) y `GET` (listar) |
| `src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts` **(crear)** | `DELETE` |
| `src/app/api/material/[id]/route.ts` **(crear)** | Descarga gateada, admin o alumno. 302 a la URL firmada |
| `src/app/api/admin/contenido/[id]/route.ts` **(modificar)** | Devuelve los materiales de cada semana |
| `src/app/api/alumno/materia/[id]/route.ts` **(modificar)** | Idem, para el alumno |
| `src/app/(dashboard)/admin/contenido/[id]/MaterialesPanel.tsx` **(crear)** | Subir / listar / quitar |
| `src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx` **(modificar)** | Monta el panel |
| `src/app/(dashboard)/alumno/materia/[id]/page.tsx` **(modificar)** | Sección "Material de la clase" |
| `tests/unit/cms-contenido-f2.spec.ts` **(crear)** | Invariantes de F2 |

---

### Task 1: Migración, los tres esquemas y la deriva preexistente

⚠️ **Contexto que no es opcional.** `semanas` está definida en **tres** archivos,
y ya están divergidos:

- `scripts/schema.sql` — **el que `mev-onboarding.py` instala en clientes
  nuevos**. Tiene `contenido`, `video_url_2`, `video_url_3`. Le faltan la FK a
  `meses_contenido` y el `UNIQUE (mes_id, numero_semana)`.
- `supabase/schema.sql` y `supabase/schema-01-tablas.sql` — espejos. Tienen FK y
  UNIQUE, pero **les faltan las tres columnas de arriba**.

El test guardián (`tests/unit/guardian-schema-onboarding.spec.ts`) exige que todo
`CREATE` de una migración exista en `scripts/schema.sql`, y
`tests/unit/corregir-plan.spec.ts` lo exige además en `supabase/schema.sql`.
Esta tarea añade lo de F2 **a los tres** y de paso cierra la deriva de las tres
columnas, que es lo que hace que un cliente instalado desde un espejo nazca sin
los apuntes que F1 acaba de hacer editables.

**No** se toca la divergencia de FK/UNIQUE: es anterior, no la agrava F2, y
tocarla sin verificar contra un tenant vivo es arriesgado. Queda dicho aquí.

**Files:**
- Create: `supabase/migrations/20260819130000_cms_contenido_materiales.sql`
- Modify: `scripts/schema.sql`, `supabase/schema.sql`, `supabase/schema-01-tablas.sql`
- Test: `tests/unit/cms-contenido-f2.spec.ts`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `tests/unit/cms-contenido-f2.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * CMS de Contenido — F2 (materiales PDF por semana).
 *
 * Invariantes:
 *  1. La migración va en los TRES archivos de esquema. El de scripts/ es el que
 *     instala el onboarding: faltar ahí = nacer roto en todo cliente nuevo.
 *  2. El bucket es admin-only en RLS. El alumno NUNCA lee del bucket: pasa por
 *     /api/material/[id], que reusa tieneAccesoSemana(). Una sola definición de
 *     acceso, no dos que puedan divergir (el bug T3 de las portadas de Cursos).
 *  3. Los helpers de archivo se COMPARTEN con Cursos, no se copian.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

const MIGRACION = 'supabase/migrations/20260819130000_cms_contenido_materiales.sql'
const ESQUEMAS = ['scripts/schema.sql', 'supabase/schema.sql', 'supabase/schema-01-tablas.sql']

test('la migración crea la tabla, su índice y el bucket privado', () => {
  const sql = leer(MIGRACION)
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.semana_materiales')
  expect(sql).toContain('REFERENCES public.semanas(id) ON DELETE CASCADE')
  expect(sql).toContain('idx_semana_materiales_semana')
  // Bucket privado y con tope, igual que 'cursos'
  expect(sql).toContain("INSERT INTO storage.buckets")
  expect(sql).toMatch(/'materias'.*false.*10485760/s)
})

test('el bucket NO abre lectura a authenticated — solo admin', () => {
  const sql = leer(MIGRACION)
  const politicas = sql.match(/CREATE POLICY[^;]+;/gs) ?? []
  const deStorage = politicas.filter(p => p.includes('storage.objects'))
  expect(deStorage.length).toBeGreaterThan(0)
  for (const p of deStorage) {
    expect(p, `política de storage sin es_admin(): ${p.slice(0, 80)}`).toContain('public.es_admin()')
    // Si alguna vez alguien añade acceso por alumno aquí, la regla queda
    // duplicada con /api/material/[id] y vuelve el bug de las portadas.
    expect(p).not.toContain('alumnos')
    expect(p).not.toContain('progreso_semanas')
  }
})

test('la tabla lleva RLS con el mismo par de políticas que el resto del contenido', () => {
  const sql = leer(MIGRACION)
  expect(sql).toContain('ALTER TABLE public.semana_materiales ENABLE ROW LEVEL SECURITY')
  expect(sql).toContain('semana_materiales: admin gestiona')
  expect(sql).toContain('semana_materiales: lectura autenticados')
})

test('la migración se refleja en los TRES esquemas', () => {
  for (const archivo of ESQUEMAS) {
    const s = leer(archivo)
    expect(s, `${archivo} sin semana_materiales`).toContain('public.semana_materiales')
  }
})

test('los espejos dejan de nacer sin las columnas que F1 hizo editables', () => {
  // Deriva PREEXISTENTE: supabase/schema.sql y schema-01-tablas.sql creaban
  // `semanas` sin contenido/video_url_2/video_url_3, que scripts/schema.sql sí
  // tiene. Un cliente instalado desde un espejo nacía sin los apuntes.
  for (const archivo of ESQUEMAS) {
    const ddl = leer(archivo).match(/CREATE TABLE (?:IF NOT EXISTS )?public\.semanas[\s\S]*?\n\);/)?.[0] ?? ''
    expect(ddl, `${archivo}: no encontré el DDL de semanas`).not.toBe('')
    for (const col of ['contenido', 'video_url_2', 'video_url_3']) {
      expect(ddl, `${archivo}: semanas sin ${col}`).toContain(col)
    }
  }
})
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
cd ~/work-plantilla-mev/plantilla-maestra-plataforma-virtual
pnpm test:unit cms-contenido-f2
```

⚠️ **Sin `--`.** `pnpm test:unit -- cms-contenido-f2` NO filtra: corre los 146
tests y este paso te mentiría.

Esperado: 5 fallos, el primero `ENOENT` sobre el archivo de migración.

- [ ] **Step 3: Escribir la migración**

Crear `supabase/migrations/20260819130000_cms_contenido_materiales.sql`:

```sql
-- ============================================================================
-- F2 — Materiales (PDF) por semana
-- ============================================================================
-- El admin puede subir varios PDF por semana (guía, ejercicios, lectura) y el
-- alumno los descarga desde su materia.
--
-- TABLA, no columna: el módulo Cursos guarda UN material por lección en
--   curso_lecciones.material_path. Con una columna, subir el segundo archivo
--   borra el primero sin avisar. Una clase suele repartir varios.
--
-- BUCKET ADMIN-ONLY, a propósito. El bucket 'cursos' SÍ tiene una política que
--   reproduce en SQL la regla de "quién puede ver esto", y esa duplicación ya
--   costó un bug: las portadas salían en blanco solo para el ALUMNO —invisible
--   en cualquier QA hecho con cuenta de admin— porque la política y el path que
--   escribía el código no coincidían (ver
--   20260729122000_fix_portadas_storage_policy.sql).
--
--   Aquí el alumno NUNCA lee del bucket. Pide GET /api/material/[id], que reusa
--   tieneAccesoSemana() —la misma funcion que ya gatea el quiz— y firma la URL
--   con service role. La regla vive en un solo sitio y tiene pruebas.
--
-- IDEMPOTENTE: IF NOT EXISTS + DROP POLICY IF EXISTS. Re-ejecutable.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543). Si el DDL
-- sobre storage.objects falla con "must be owner of table objects", crear las
-- políticas desde la UI del Dashboard (Storage → Policies) con el mismo USING
-- — es la misma limitación de ownership que documenta el módulo de Cursos.
-- ============================================================================

-- ── Tabla ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semana_materiales (
    id            uuid DEFAULT gen_random_uuid() NOT NULL,
    semana_id     uuid NOT NULL,
    -- Nombre visible para el alumno. NO es el nombre en storage: ese va
    -- saneado y con timestamp para evitar colisiones y caracteres raros.
    nombre        text NOT NULL,
    path          text NOT NULL,
    tamano_bytes  bigint,
    orden         integer,
    created_at    timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT semana_materiales_pkey PRIMARY KEY (id),
    CONSTRAINT semana_materiales_semana_id_fkey
      FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_semana_materiales_semana
  ON public.semana_materiales (semana_id);

-- ── RLS: el mismo par que materias / meses_contenido / semanas / quiz_semana ─
ALTER TABLE public.semana_materiales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "semana_materiales: admin gestiona" ON public.semana_materiales;
CREATE POLICY "semana_materiales: admin gestiona"
  ON public.semana_materiales USING (public.es_admin());

-- Lectura de METADATOS (nombre, tamaño) para authenticated, igual que semanas.
-- El ARCHIVO no se abre con esto: vive en un bucket privado admin-only.
DROP POLICY IF EXISTS "semana_materiales: lectura autenticados" ON public.semana_materiales;
CREATE POLICY "semana_materiales: lectura autenticados"
  ON public.semana_materiales FOR SELECT
  USING ((auth.role() = 'authenticated'::text));

-- ── Bucket privado, 10 MB (mismo tope que 'cursos') ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('materias', 'materias', false, 10485760)
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 10485760;

-- ── Políticas de storage: SOLO admin, en las cuatro operaciones ─────────────
-- Deliberadamente NO hay política para el alumno. Ver el encabezado.
DROP POLICY IF EXISTS "materias: solo admin lee"     ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin escribe" ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin borra"   ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin actualiza" ON storage.objects;

CREATE POLICY "materias: solo admin lee" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin escribe" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin actualiza" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin borra" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

-- ── Verificación manual (no altera nada) ────────────────────────────────────
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'materias';
--   SELECT polname FROM pg_policy
--    WHERE polrelid = 'storage.objects'::regclass AND polname LIKE 'materias:%';
```

- [ ] **Step 4: Reflejarlo en los tres esquemas**

En **cada uno** de `scripts/schema.sql`, `supabase/schema.sql` y
`supabase/schema-01-tablas.sql`, justo después del `CREATE TABLE ... semanas`,
añadir el bloque de tabla + índice + RLS + políticas (todo lo de arriba **menos**
el `INSERT INTO storage.buckets` y las políticas de `storage.objects`, que en
`scripts/schema.sql` van al final junto al resto de storage si ya hay una sección
así; si no la hay, añádelas también tras la tabla).

Adáptalo al estilo de cada archivo: `scripts/schema.sql` usa `CREATE TABLE
public.x (...)` con `ALTER TABLE ... ADD CONSTRAINT` aparte; los dos de
`supabase/` usan `CREATE TABLE IF NOT EXISTS` con las constraints inline. **Que
la tabla exista en los tres es lo que la prueba comprueba**; el estilo es
cosmético.

Y en los **dos espejos** (`supabase/schema.sql` y `supabase/schema-01-tablas.sql`),
añadir al `CREATE TABLE ... semanas` las tres columnas que le faltan:

```sql
    contenido                TEXT,
    video_url_2              TEXT,
    video_url_3              TEXT,
```

(justo antes de la línea `UNIQUE (mes_id, numero_semana)`).

- [ ] **Step 5: Verificar**

```bash
pnpm test:unit cms-contenido-f2
pnpm test:unit
```

Esperado: los 5 tests de F2 en verde, y la suite completa sin regresiones —
en particular `guardian-schema-onboarding` y `corregir-plan`, que son los que
vigilan la deriva de esquema.

- [ ] **Step 6: Commit**

```bash
git add supabase/ scripts/schema.sql tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): tabla, RLS y bucket privado para los PDF de cada semana

El bucket es admin-only a proposito. El de Cursos reproduce en SQL la regla de
quien puede ver cada archivo, y esa duplicacion ya costo un bug: las portadas
salian en blanco SOLO para el alumno, invisible en cualquier QA hecho con
cuenta de admin. Aqui el alumno nunca lee del bucket.

De paso cierra una deriva preexistente: los dos espejos de supabase/ creaban
semanas sin contenido, video_url_2 ni video_url_3, asi que un cliente
instalado desde ahi nacia sin los apuntes que F1 acaba de hacer editables."
```

---

### Task 2: Helpers de archivo compartidos con Cursos

`signedUrl()` y `removeFolder()` tienen `BUCKET_CURSOS` **cableado dentro**
(`admin.storage.from(BUCKET_CURSOS)`). Reusarlas tal cual escribiría el material
de las semanas en el bucket de Cursos. Se generalizan; no se copian.

**Files:**
- Create: `src/lib/archivos-comunes.ts`, `src/lib/storage-comun.ts`
- Modify: `src/lib/cursos/archivos.ts`, `src/lib/cursos/storage.ts`

- [ ] **Step 1: Añadir las pruebas**

Añadir a `tests/unit/cms-contenido-f2.spec.ts`:

```ts
// ─────────── Los helpers se comparten con Cursos, no se copian ──────────────

test('los helpers de archivo viven en un solo sitio', () => {
  const comunes = leer('src/lib/archivos-comunes.ts')
  for (const fn of ['sanitizeFilename', 'extensionDe', 'validarMaterial', 'MATERIAL_MAX_BYTES', 'MATERIAL_MIMES']) {
    expect(comunes, `archivos-comunes sin ${fn}`).toContain(fn)
  }
  // Cursos los reexporta en vez de tener su propia copia
  const cursos = leer('src/lib/cursos/archivos.ts')
  expect(cursos).toContain("from '@/lib/archivos-comunes'")
  expect(cursos).not.toMatch(/export function sanitizeFilename/)
})

test('signedUrl y removeFolder reciben el bucket, no lo llevan cableado', () => {
  const comun = leer('src/lib/storage-comun.ts')
  expect(comun).toContain('bucket: string')
  expect(comun).not.toContain('BUCKET_CURSOS')
  // El envoltorio de Cursos sigue existiendo para no tocar a sus consumidores
  const cursos = leer('src/lib/cursos/storage.ts')
  expect(cursos).toContain('BUCKET_CURSOS')
  expect(cursos).toContain("from '@/lib/storage-comun'")
})
```

- [ ] **Step 2: Correr y ver que falla**

```bash
pnpm test:unit cms-contenido-f2
```
Esperado: los dos nuevos fallan con `ENOENT`.

- [ ] **Step 3: Crear `src/lib/archivos-comunes.ts`**

Mover aquí, **literalmente y sin cambiarles una línea**, estos símbolos que hoy
están en `src/lib/cursos/archivos.ts`:

`MATERIAL_MAX_BYTES`, `MATERIAL_MIMES`, `MATERIAL_EXTS`, `sanitizeFilename`,
`extensionDe`, `ValidacionArchivo`, `validarMaterial`.

Encabezado del archivo nuevo:

```ts
/**
 * Reglas de archivo compartidas entre módulos (Cursos y los materiales de
 * semana de Contenido). Son funciones PURAS y sin bucket dentro: el bucket lo
 * decide quien llama, en storage-comun.ts.
 *
 * Salieron de lib/cursos/archivos.ts al aparecer el segundo consumidor. Ese
 * archivo las reexporta, así que ningún consumidor de Cursos cambia.
 */
```

En `src/lib/cursos/archivos.ts`: borrar esos símbolos y reexportarlos, dejando
ahí solo lo que es propio de Cursos (`BUCKET_CURSOS`, `PORTADA_*`,
`validarPortada`, `portadaPath`, `materialPath`):

```ts
export {
  MATERIAL_MAX_BYTES, MATERIAL_MIMES, MATERIAL_EXTS,
  sanitizeFilename, extensionDe, validarMaterial,
} from '@/lib/archivos-comunes'
export type { ValidacionArchivo } from '@/lib/archivos-comunes'
```

⚠️ `validarPortada` usa `extensionDe`: tendrá que importarlo de
`@/lib/archivos-comunes` para seguir compilando.

- [ ] **Step 4: Crear `src/lib/storage-comun.ts`**

Copiar el cuerpo de `src/lib/cursos/storage.ts` cambiando `BUCKET_CURSOS` por un
parámetro `bucket`:

```ts
/**
 * Helpers de Storage — SOLO para API routes (reciben el admin client con
 * service role). Los buckets de este proyecto son PRIVADOS: todo se sirve con
 * createSignedUrl, nunca con getPublicUrl.
 *
 * El bucket es PARÁMETRO. Antes vivía cableado dentro de estas funciones, y con
 * dos módulos usándolas eso significaba escribir los archivos de uno en el
 * bucket del otro.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const SIGNED_URL_TTL = 3600 // 1 hora

export async function signedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

/**
 * Borra recursivamente todos los objetos bajo un prefijo.
 * storage.list() no es recursivo: las "carpetas" se detectan porque no tienen id.
 */
export async function removeFolder(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<void> {
  const cleanPrefix = prefix.replace(/\/+$/, '')
  if (!cleanPrefix) return // jamás vaciar el bucket completo por un prefijo vacío

  // list() pagina de a 1000 y aquí vamos BORRANDO lo listado, así que se
  // repite sin offset hasta vaciar; si una pasada no avanza, se corta.
  for (let pasada = 0; pasada < 20; pasada++) {
    const { data: entries, error } = await admin.storage.from(bucket).list(cleanPrefix, { limit: 1000 })
    if (error || !entries || entries.length === 0) return

    const files: string[] = []
    const subfolders: string[] = []
    for (const entry of entries) {
      if (entry.id) files.push(`${cleanPrefix}/${entry.name}`)
      else subfolders.push(`${cleanPrefix}/${entry.name}`)
    }

    let avance = false
    if (files.length > 0) {
      const { error: rmError } = await admin.storage.from(bucket).remove(files)
      if (rmError) console.error(`[storage] error borrando bajo ${cleanPrefix}:`, rmError.message)
      else avance = true
    }
    for (const sub of subfolders) {
      await removeFolder(admin, bucket, sub)
      avance = true
    }
    if (!avance) return
    if (entries.length < 1000 && subfolders.length === 0) return
  }
}
```

Y `src/lib/cursos/storage.ts` pasa a ser el envoltorio, para no tocar a sus
consumidores actuales:

```ts
/**
 * Envoltorio de storage-comun.ts atado al bucket 'cursos'. Existe para que los
 * consumidores del módulo Cursos sigan llamando signedUrl(admin, path) sin
 * repetir el bucket en cada llamada.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { BUCKET_CURSOS } from './archivos'
import { signedUrl as signedUrlComun, removeFolder as removeFolderComun, SIGNED_URL_TTL } from '@/lib/storage-comun'

export { SIGNED_URL_TTL }

export function signedUrl(admin: SupabaseClient, path: string | null | undefined) {
  return signedUrlComun(admin, BUCKET_CURSOS, path)
}

export function removeFolder(admin: SupabaseClient, prefix: string) {
  return removeFolderComun(admin, BUCKET_CURSOS, prefix)
}
```

- [ ] **Step 5: Generalizar el uploader de cliente**

`src/lib/cursos/upload.ts` ya encapsula los tres pasos de la subida y documenta
el porqué (Vercel corta bodies > 4.5 MB con un 413, así que el archivo va DIRECTO
del navegador a Storage). Lo único específico de Cursos es el bucket.

Crear `src/lib/upload-comun.ts` con el mismo cuerpo, cambiando `BUCKET_CURSOS`
por un parámetro y admitiendo campos extra en el `confirm`:

```ts
/**
 * Subida de archivos SIN pasar por el body de las API routes. Vercel corta
 * bodies > 4.5MB (413), así que los archivos van DIRECTO del navegador a
 * Supabase Storage con una signed upload URL de un solo uso:
 *   1. POST {action:'upload-url'} → el server valida y emite {path, token}
 *   2. uploadToSignedUrl(path, token, file) → navegador → Storage (hasta 10MB)
 *   3. POST {action:'confirm', path, ...extra} → el server verifica el objeto y
 *      escribe en la DB.
 *
 * El bucket es PARÁMETRO: salió de lib/cursos/upload.ts al aparecer el segundo
 * consumidor (los materiales de semana).
 */
import { createClient } from '@/lib/supabase/client'

export type ResultadoSubida =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; error: string }

export async function subirArchivo(
  endpoint: string,
  bucket: string,
  file: File,
  extraConfirm: Record<string, unknown> = {},
): Promise<ResultadoSubida> {
  let r1: Response
  try {
    r1 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-url', filename: file.name, size: file.size, type: file.type }),
    })
  } catch {
    return { ok: false, error: 'Sin conexión al preparar la subida' }
  }
  const j1 = (await r1.json().catch(() => ({}))) as { path?: string; token?: string; error?: string }
  if (!r1.ok || !j1.path || !j1.token) {
    return { ok: false, error: j1.error ?? 'No se pudo preparar la subida' }
  }

  const supabase = createClient()
  const { error: upError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(j1.path, j1.token, file, { contentType: file.type })
  if (upError) {
    return { ok: false, error: `No se pudo subir el archivo: ${upError.message}` }
  }

  let r3: Response
  try {
    r3 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', path: j1.path, ...extraConfirm }),
    })
  } catch {
    return { ok: false, error: 'El archivo se subió pero no se pudo confirmar (revisa tu conexión y reintenta)' }
  }
  const j3 = (await r3.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!r3.ok) {
    return { ok: false, error: j3.error ?? 'La subida no se pudo confirmar' }
  }
  return { ok: true, json: j3 }
}
```

Y `src/lib/cursos/upload.ts` pasa a ser el envoltorio, sin tocar a sus llamadores:

```ts
/**
 * Envoltorio de upload-comun.ts atado al bucket 'cursos'.
 */
import { subirArchivo, type ResultadoSubida } from '@/lib/upload-comun'
import { BUCKET_CURSOS } from './archivos'

export type { ResultadoSubida }

export function subirArchivoCursos(endpoint: string, file: File): Promise<ResultadoSubida> {
  return subirArchivo(endpoint, BUCKET_CURSOS, file)
}
```

- [ ] **Step 6: Verificar que Cursos no se rompió**

```bash
pnpm test:unit
pnpm exec tsc --noEmit
pnpm build
```

Esperado: suite completa en verde; `tsc` solo con el `TS1501` preexistente de
`tests/unit/corregir-plan.spec.ts:223`; build verde. Si algún import de Cursos
se queja, arréglalo importando de `@/lib/archivos-comunes` — **no** devolviendo
la copia.

- [ ] **Step 7: Commit**

```bash
git add src/lib tests/unit/cms-contenido-f2.spec.ts
git commit -m "refactor(storage): el bucket es parametro, no una constante cableada

signedUrl y removeFolder tenian BUCKET_CURSOS dentro. Con un segundo modulo
usandolas, reusarlas tal cual habria escrito los materiales de las semanas en
el bucket de Cursos. Cursos conserva su envoltorio: ningun consumidor cambia."
```

---

### Task 3: Reglas de los materiales de semana

**Files:**
- Create: `src/lib/materiales-semana.ts`

- [ ] **Step 1: Añadir las pruebas**

Añadir a `tests/unit/cms-contenido-f2.spec.ts` (y ampliar el import de la
cabecera para traer lo que se usa):

```ts
import {
  BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA,
  materialPathSemana, nombreVisible, validarRutaMaterial,
} from '@/lib/materiales-semana'

// ───────────────────── Rutas y nombres de material ──────────────────────────

test('la ruta lleva materia y semana, en ese orden', () => {
  const p = materialPathSemana('MAT', 'SEM', 'Guía de estudio.pdf', 1700000000000)
  expect(p.startsWith('MAT/SEM/')).toBe(true)
  // Nombre saneado: sin acentos, sin espacios, minúsculas
  expect(p).toContain('guia-de-estudio.pdf')
  expect(p).toContain('1700000000000-')
})

test('el nombre visible conserva el original, no el saneado', () => {
  expect(nombreVisible('Guía de estudio.pdf')).toBe('Guía de estudio.pdf')
  expect(nombreVisible('   ')).toBe('material.pdf')
  expect(nombreVisible('a'.repeat(300)).length).toBeLessThanOrEqual(200)
})

test('una ruta que se sale de su carpeta se rechaza', () => {
  const ok = validarRutaMaterial('MAT/SEM/1700000000000-guia.pdf', 'MAT', 'SEM')
  expect(ok.ok).toBe(true)
  for (const mala of [
    'OTRA/SEM/1-guia.pdf',            // otra materia
    'MAT/OTRA/1-guia.pdf',            // otra semana
    'MAT/SEM/sub/1-guia.pdf',         // subcarpeta
    'MAT/SEM/../../otro.pdf',         // escape
    'MAT/SEM/',                       // sin archivo
    '',                               // vacía
  ]) {
    expect(validarRutaMaterial(mala, 'MAT', 'SEM').ok, mala).toBe(false)
  }
})

test('hay un tope de materiales por semana', () => {
  expect(MATERIALES_MAX_POR_SEMANA).toBeGreaterThan(0)
  expect(BUCKET_MATERIAS).toBe('materias')
})
```

- [ ] **Step 2: Correr y ver que falla**

```bash
pnpm test:unit cms-contenido-f2
```
Esperado: los cuatro nuevos fallan por módulo inexistente.

- [ ] **Step 3: Escribir `src/lib/materiales-semana.ts`**

```ts
// ─── Materiales (PDF) de una semana ──────────────────────────────────────────
// Funciones puras: rutas y nombres. La validación de tipo y tamaño se reusa de
// archivos-comunes (la misma que Cursos), no se duplica.

import { sanitizeFilename } from '@/lib/archivos-comunes'

export const BUCKET_MATERIAS = 'materias'

/** Tope por semana. No es una restricción técnica: es que una semana con 30
 *  PDFs es un error de captura, y sin tope el panel del admin se vuelve
 *  ilegible y el borrado en cascada, caro. */
export const MATERIALES_MAX_POR_SEMANA = 10

/** Tope del nombre VISIBLE. La columna es TEXT; esto evita que un nombre de
 *  archivo absurdo rompa el layout de la lista del alumno. */
export const NOMBRE_MAX = 200

/**
 * Ruta dentro del bucket: {materiaId}/{semanaId}/{timestamp}-{archivo-saneado}
 *
 * Dos niveles, como en Cursos. El primero es la materia para poder limpiar todo
 * su material con un solo prefijo si algún día se borra. El timestamp evita que
 * subir dos veces el mismo nombre pise el archivo anterior.
 *
 * `ahora` es parámetro para que la función sea pura y probable.
 */
export function materialPathSemana(
  materiaId: string,
  semanaId: string,
  filename: string,
  ahora: number,
): string {
  return `${materiaId}/${semanaId}/${ahora}-${sanitizeFilename(filename)}`
}

/**
 * Nombre que ve el alumno. Conserva acentos y espacios —es el nombre que el
 * profesor le puso— al contrario que el de storage, que va saneado.
 */
export function nombreVisible(filename: string): string {
  const limpio = (filename ?? '').trim()
  if (!limpio) return 'material.pdf'
  return limpio.slice(0, NOMBRE_MAX)
}

export type ValidacionRuta = { ok: true } | { ok: false; error: string }

/**
 * La ruta que el cliente dice haber subido tiene que caer EXACTAMENTE en la
 * carpeta de esa semana. El cliente propone la ruta en el paso 'confirm', así
 * que sin esto podría confirmar un objeto de otra semana —o de otra materia— y
 * colgarlo de la suya.
 */
export function validarRutaMaterial(
  path: string,
  materiaId: string,
  semanaId: string,
): ValidacionRuta {
  const prefijo = `${materiaId}/${semanaId}/`
  if (!path || !path.startsWith(prefijo)) {
    return { ok: false, error: 'La ruta del material no corresponde a esta semana' }
  }
  const nombre = path.slice(prefijo.length)
  if (!nombre || nombre.includes('/') || nombre.includes('..')) {
    return { ok: false, error: 'Ruta de material inválida' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm test:unit cms-contenido-f2
pnpm exec tsc --noEmit
git add src/lib/materiales-semana.ts tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): rutas y nombres de los PDF de semana, como funciones puras"
```

---

### Task 4: API admin — subir, listar y quitar materiales

**Files:**
- Create: `src/app/api/admin/semanas/[id]/materiales/route.ts`
- Create: `src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts`

- [ ] **Step 1: `materiales/route.ts` (GET + POST)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { MATERIAL_MAX_BYTES, MATERIAL_MIMES, validarMaterial } from '@/lib/archivos-comunes'
import {
  BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA,
  materialPathSemana, nombreVisible, validarRutaMaterial,
} from '@/lib/materiales-semana'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

/** materia a la que pertenece la semana. null si la semana no existe. */
async function materiaDeSemana(
  admin: ReturnType<typeof createAdminClient>,
  semanaId: string,
): Promise<string | null> {
  const { data: semana } = await admin
    .from('semanas').select('mes_id').eq('id', semanaId).maybeSingle()
  const mesId = (semana as { mes_id: string | null } | null)?.mes_id
  if (!mesId) return null
  const { data: mes } = await admin
    .from('meses_contenido').select('materia_id').eq('id', mesId).maybeSingle()
  return (mes as { materia_id: string | null } | null)?.materia_id ?? null
}

export async function GET(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('semana_materiales')
      .select('id, nombre, tamano_bytes, orden, created_at')
      .eq('semana_id', params.id)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ materiales: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/semanas/[id]/materiales]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST — dos acciones, mismo patrón que el material de Cursos:
//   {action:'upload-url', filename, size, type} → {path, token}
//   {action:'confirm', path, filename, size}    → inserta la fila
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const materiaId = await materiaDeSemana(admin, params.id)
    if (!materiaId) return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })

    const body = await request.json()

    if (body.action === 'upload-url') {
      const filename = String(body.filename ?? '')
      const size = Number(body.size ?? 0)
      const type = String(body.type ?? '')

      const valid = validarMaterial({ name: filename, size, type })
      if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 })

      // El tope se comprueba ANTES de dar la URL de subida: si no, el archivo
      // ya está en el bucket cuando se rechaza y queda huérfano.
      const { count } = await admin
        .from('semana_materiales')
        .select('*', { count: 'exact', head: true })
        .eq('semana_id', params.id)
      if ((count ?? 0) >= MATERIALES_MAX_POR_SEMANA) {
        return NextResponse.json(
          { error: `Esta semana ya tiene ${MATERIALES_MAX_POR_SEMANA} materiales. Quita alguno antes de subir otro.` },
          { status: 400 },
        )
      }

      const path = materialPathSemana(materiaId, params.id, filename, Date.now())
      const { data, error } = await admin.storage.from(BUCKET_MATERIAS).createSignedUploadUrl(path)
      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'No se pudo crear la URL de subida' }, { status: 500 })
      }
      return NextResponse.json({ path: data.path, token: data.token })
    }

    if (body.action === 'confirm') {
      const path = String(body.path ?? '')
      const ruta = validarRutaMaterial(path, materiaId, params.id)
      if (!ruta.ok) return NextResponse.json({ error: ruta.error }, { status: 400 })

      // Verificar el objeto REALMENTE subido, no lo que dice el cliente.
      const carpeta = `${materiaId}/${params.id}`
      const nombreEnStorage = path.slice(carpeta.length + 1)
      const { data: entries } = await admin.storage.from(BUCKET_MATERIAS).list(carpeta, { limit: 1000 })
      const objeto = (entries ?? []).find(e => e.name === nombreEnStorage && e.id)
      if (!objeto) {
        return NextResponse.json({ error: 'El archivo no se subió correctamente, reintenta' }, { status: 400 })
      }

      const meta = objeto.metadata as { size?: number; mimetype?: string } | null
      const mimeOk = !meta?.mimetype || (MATERIAL_MIMES as readonly string[]).includes(meta.mimetype)
      const sizeOk = !meta?.size || meta.size <= MATERIAL_MAX_BYTES
      if (!mimeOk || !sizeOk) {
        await admin.storage.from(BUCKET_MATERIAS).remove([path])
        return NextResponse.json({ error: 'El archivo subido no es un PDF válido (≤10MB)' }, { status: 400 })
      }

      const { data: fila, error: dbError } = await admin
        .from('semana_materiales')
        .insert({
          semana_id: params.id,
          nombre: nombreVisible(String(body.filename ?? nombreEnStorage)),
          path,
          tamano_bytes: meta?.size ?? null,
        })
        .select('id, nombre, tamano_bytes, orden, created_at')
        .single()

      if (dbError) {
        // La fila es la que hace visible el archivo: sin ella, el objeto sería
        // basura invisible en el bucket. Se limpia.
        await admin.storage.from(BUCKET_MATERIAS).remove([path])
        return NextResponse.json({ error: dbError.message }, { status: 500 })
      }

      return NextResponse.json({ material: fila })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/admin/semanas/[id]/materiales]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: `materiales/[materialId]/route.ts` (DELETE)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { BUCKET_MATERIAS } from '@/lib/materiales-semana'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; materialId: string } },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // El material tiene que ser DE ESA semana: sin este filtro, conociendo un id
    // se podría borrar el material de cualquier otra.
    const { data: material } = await admin
      .from('semana_materiales')
      .select('id, path')
      .eq('id', params.materialId)
      .eq('semana_id', params.id)
      .maybeSingle()
    if (!material) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

    // Primero la fila, después el objeto: si falla el storage queda un huérfano
    // invisible; al revés quedaría una fila apuntando a un archivo que ya no
    // existe, que es lo que el alumno vería como un enlace roto.
    const { error } = await admin.from('semana_materiales').delete().eq('id', params.materialId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.storage.from(BUCKET_MATERIAS).remove([(material as { path: string }).path])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/semanas/[id]/materiales/[materialId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Pruebas de análisis estático**

Añadir a `tests/unit/cms-contenido-f2.spec.ts`:

```ts
// ─────────────────────── Rutas admin de material ────────────────────────────

test('las rutas admin de material exigen rol ADMIN', () => {
  for (const r of [
    'src/app/api/admin/semanas/[id]/materiales/route.ts',
    'src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts',
  ]) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('el confirm valida el objeto REALMENTE subido, no lo que dice el cliente', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  expect(src).toContain('validarRutaMaterial')
  expect(src).toContain('.list(carpeta')          // se consulta el storage
  expect(src).toContain('MATERIAL_MIMES')          // y se valida el mime real
  expect(src).toContain('MATERIAL_MAX_BYTES')
})

test('el tope por semana se comprueba antes de dar la URL de subida', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  const upload = src.slice(src.indexOf("action === 'upload-url'"), src.indexOf("action === 'confirm'"))
  expect(upload).toContain('MATERIALES_MAX_POR_SEMANA')
})

test('borrar un material exige que sea de esa semana', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts')
  expect(src).toContain(".eq('semana_id', params.id)")
})
```

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm test:unit
pnpm exec tsc --noEmit
pnpm build
git add src/app/api/admin tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): el admin sube, lista y quita PDF por semana"
```

---

### Task 5: Descarga gateada — una sola regla para admin y alumno

**Files:**
- Create: `src/app/api/material/[id]/route.ts`
- Modify: `src/app/api/alumno/materia/[id]/route.ts`, `src/app/api/admin/contenido/[id]/route.ts`

- [ ] **Step 1: La ruta de descarga**

Crear `src/app/api/material/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRol } from '@/lib/supabase/verify-admin'
import { cargarAlumnoAcceso, tieneAccesoSemana } from '@/lib/acceso-materias'
import { signedUrl } from '@/lib/storage-comun'
import { BUCKET_MATERIAS } from '@/lib/materiales-semana'

/**
 * Descarga de un material de semana. UNA sola ruta para admin y alumno, y por
 * tanto una sola definición de "quién puede ver esto".
 *
 * El bucket 'materias' es admin-only en RLS: el alumno NUNCA lee de él. Aquí se
 * comprueba el acceso con `tieneAccesoSemana()` —la misma función que gatea el
 * quiz— y se firma con service role.
 *
 * El módulo Cursos resolvió esto reproduciendo la regla dentro de la política
 * SQL del bucket, y esa duplicación produjo el bug de las portadas en blanco
 * SOLO para el alumno. Aquí no hay dos reglas que puedan divergir.
 *
 * Responde 302 a la URL firmada para que un <a href> normal funcione.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: material } = await admin
      .from('semana_materiales')
      .select('id, semana_id, path, nombre')
      .eq('id', params.id)
      .maybeSingle()

    const mat = material as { id: string; semana_id: string; path: string; nombre: string } | null
    if (!mat) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

    const rol = await getUserRol(supabase, user.id)
    if (rol !== 'ADMIN' && rol !== 'SECRETARIO') {
      // Alumno: el mismo gate que el resto de su contenido.
      const alumno = await cargarAlumnoAcceso(admin, user.id)
      if (!alumno) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      const { acceso } = await tieneAccesoSemana(admin, alumno, mat.semana_id)
      if (!acceso) {
        return NextResponse.json({ error: 'No tienes acceso a este contenido' }, { status: 403 })
      }
    }

    const url = await signedUrl(admin, BUCKET_MATERIAS, mat.path)
    if (!url) return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 })

    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[GET /api/material/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

Firma ya verificada contra el código: `cargarAlumnoAcceso(db, alumnoId)` devuelve
`(AlumnoAcceso & { id: string }) | null`, y busca en `alumnos` por `id`, que es el
mismo uuid del usuario de auth. `tieneAccesoSemana(db, alumno, semanaId)` devuelve
`{ acceso, materiaId, encontrada }`. Encaja tal cual.

- [ ] **Step 2: Que las dos APIs devuelvan los materiales**

En `src/app/api/admin/contenido/[id]/route.ts`, añadir al select anidado de
`semanas`:

```
            semana_materiales ( id, nombre, tamano_bytes, orden, created_at ),
```

En `src/app/api/alumno/materia/[id]/route.ts`, añadir lo mismo al select de
`semanas` y mapearlo en el objeto de cada semana:

```ts
        materiales: (s.semana_materiales ?? [])
          .slice()
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.created_at).localeCompare(String(b.created_at)))
          .map(m => ({ id: m.id, nombre: m.nombre, tamano_bytes: m.tamano_bytes })),
```

Y ampliar el tipo `SemanaRow` de ese archivo con
`semana_materiales: { id: string; nombre: string; tamano_bytes: number | null; orden: number | null; created_at: string }[]`.

⚠️ **No se firman URLs aquí.** Una materia de 48 semanas con 3 materiales cada
una serían 144 llamadas de red por carga de página. Solo viajan los metadatos; la
URL se firma al hacer clic, en `/api/material/[id]`.

- [ ] **Step 3: Pruebas**

```ts
// ───────── Una sola regla de acceso para el archivo, no dos ─────────────────

test('la descarga reusa tieneAccesoSemana y no reimplementa el gate', () => {
  const src = leer('src/app/api/material/[id]/route.ts')
  expect(src).toContain('tieneAccesoSemana')
  expect(src).toContain('BUCKET_MATERIAS')
  // La regla NO se reescribe a mano aquí
  expect(src).not.toContain('meses_desbloqueados')
  expect(src).not.toContain('modalidad')
})

test('las APIs devuelven metadatos, no URLs firmadas por adelantado', () => {
  for (const r of ['src/app/api/alumno/materia/[id]/route.ts', 'src/app/api/admin/contenido/[id]/route.ts']) {
    const src = leer(r)
    expect(src, `${r} no devuelve materiales`).toContain('semana_materiales')
    expect(src, `${r} firma URLs por adelantado (N+1 de red)`).not.toContain('createSignedUrl')
  }
})
```

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm test:unit
pnpm exec tsc --noEmit
pnpm build
git add src/app/api tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): descarga gateada por una sola regla, admin y alumno"
```

---

### Task 6: Panel de materiales en el editor del admin

**Files:**
- Create: `src/app/(dashboard)/admin/contenido/[id]/MaterialesPanel.tsx`
- Modify: `src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx`, `page.tsx`

- [ ] **Step 1: El componente**

Crear `src/app/(dashboard)/admin/contenido/[id]/MaterialesPanel.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react'
import { FileText, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react'
import { validarMaterial } from '@/lib/archivos-comunes'
import { subirArchivo } from '@/lib/upload-comun'
import { BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA } from '@/lib/materiales-semana'

/**
 * PDFs de una semana.
 *
 * El estado vive AQUÍ y no en page.tsx a propósito: los materiales se guardan
 * al instante (subir es guardar), así que no entran en `camposCambiados` ni
 * dependen del botón Guardar de la semana. Mezclarlos haría que el botón
 * dijera "sin cambios" con un archivo recién subido, o al revés.
 */

export interface Material {
  id: string
  nombre: string
  tamano_bytes: number | null
}

interface Props {
  semanaId: string
  iniciales: Material[]
}

function pesoLegible(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function MaterialesPanel({ semanaId, iniciales }: Props) {
  const [materiales, setMateriales] = useState<Material[]>(iniciales)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const endpoint = `/api/admin/semanas/${semanaId}/materiales`
  const lleno = materiales.length >= MATERIALES_MAX_POR_SEMANA

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // El input se limpia siempre: si no, elegir el MISMO archivo dos veces
    // seguidas no dispara change y parece que el boton se quedo muerto.
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setError(null)

    // Validar antes de gastar el viaje al servidor. Es la MISMA funcion que
    // valida el servidor, asi que cliente y servidor no pueden discrepar.
    const valid = validarMaterial({ name: file.name, size: file.size, type: file.type })
    if (!valid.ok) { setError(valid.error); return }

    setSubiendo(true)
    const r = await subirArchivo(endpoint, BUCKET_MATERIAS, file, { filename: file.name })
    setSubiendo(false)

    if (!r.ok) { setError(r.error); return }
    const material = (r.json as { material?: Material }).material
    if (material) setMateriales(prev => [...prev, material])
  }

  async function quitar(m: Material) {
    if (!window.confirm(`¿Quitar "${m.nombre}"? El alumno dejará de verlo.`)) return
    setError(null)
    try {
      const res = await fetch(`${endpoint}/${m.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'No se pudo quitar')
      setMateriales(prev => prev.filter(x => x.id !== m.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs" style={{ color: '#64748B' }}>
          Material de la clase (PDF)
        </label>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {materiales.length} / {MATERIALES_MAX_POR_SEMANA}
        </span>
      </div>

      {materiales.length > 0 && (
        <div className="space-y-1.5">
          {materiales.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: '#0D1017', border: '1px solid #2A2F3E' }}
            >
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-acento)' }} />
              <a
                href={`/api/material/${m.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate text-xs hover:underline"
                style={{ color: '#F1F5F9' }}
                title={m.nombre}
              >
                {m.nombre}
              </a>
              <span className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>
                {pesoLegible(m.tamano_bytes)}
              </span>
              <button
                type="button"
                onClick={() => quitar(m)}
                title="Quitar material"
                className="p-1 rounded flex-shrink-0 transition-all"
                style={{ color: '#EF4444' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={alElegir}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo || lleno}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
        style={{
          background: 'rgba(21,101,192,0.2)',
          color: 'var(--color-acento)',
          border: '1px solid rgba(21,101,192,0.4)',
        }}
      >
        {subiendo
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo…</>
          : <><Upload className="w-3 h-3" /> Subir PDF</>}
      </button>

      {lleno && !subiendo && (
        <p className="text-xs" style={{ color: '#64748B' }}>
          Llegaste al máximo de {MATERIALES_MAX_POR_SEMANA} materiales. Quita alguno para subir otro.
        </p>
      )}

      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Montarlo**

En `SemanaEditor.tsx`: añadir `materiales: Material[]` y `semanaId: string` a las
props (**no** a `SemanaState`: no son campos editables con diff) y renderizar
`<MaterialesPanel semanaId={semanaId} iniciales={materiales} />` justo después
de `<ApuntesEditor ... />`.

En `page.tsx`: pasar `semanaId={sem.id}` y `materiales={sem.semana_materiales ?? []}`
al `SemanaEditor`, y añadir `semana_materiales` a la interfaz `Semana`.

- [ ] **Step 3: Prueba**

```ts
test('los materiales no entran en el diff de campos de la semana', () => {
  const lib = leer('src/lib/contenido-semana.ts')
  expect(lib).not.toContain('materiales')          // CAMPOS_VALOR sigue con 7
  const editor = leer('src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx')
  expect(editor).toContain('MaterialesPanel')
})

test('el panel valida el PDF antes de pedir la URL de subida', () => {
  const src = leer('src/app/(dashboard)/admin/contenido/[id]/MaterialesPanel.tsx')
  // La MISMA funcion que valida el servidor: cliente y servidor no pueden
  // discrepar sobre que es un PDF valido.
  expect(src).toContain('validarMaterial')
  // La subida pasa por el helper compartido, no reimplementa los tres pasos
  expect(src).toContain('subirArchivo')
  expect(src).not.toContain('uploadToSignedUrl')
  expect(src).toContain('/api/material/')          // el enlace de descarga
})

test('el uploader de cliente tambien recibe el bucket como parametro', () => {
  const comun = leer('src/lib/upload-comun.ts')
  expect(comun).toContain('bucket: string')
  expect(comun).not.toContain('BUCKET_CURSOS')
  const cursos = leer('src/lib/cursos/upload.ts')
  expect(cursos).toContain("from '@/lib/upload-comun'")
})
```

- [ ] **Step 4: Verificar y commitear**

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:unit
git add "src/app/(dashboard)/admin" tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): panel de PDF por semana en el editor del admin"
```

---

### Task 7: "Material de la clase" en la vista del alumno

**Files:**
- Modify: `src/app/(dashboard)/alumno/materia/[id]/page.tsx`

- [ ] **Step 1: La sección**

En el bloque de la semana seleccionada, **después** de `<ContenidoMarkdown />` y
**antes** de los videos, añadir una sección que solo se pinta si hay materiales:

```tsx
                      {semana.materiales?.length > 0 && (
                        <div className="space-y-2 pt-1" style={{ borderTop: '1px solid #2A2F3E', paddingTop: '1rem' }}>
                          <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                            Material de la clase
                          </p>
                          {semana.materiales.map(m => (
                            <a
                              key={m.id}
                              href={`/api/material/${m.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all"
                              style={{ background: '#0D1017', border: '1px solid #2A2F3E', color: '#F1F5F9' }}
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: CONFIG.colores.acento }} />
                              <span className="flex-1 min-w-0 truncate">{m.nombre}</span>
                            </a>
                          ))}
                        </div>
                      )}
```

Añadir `FileText` al import de `lucide-react` y `materiales` a la interfaz
`Semana` de ese archivo:
`materiales: { id: string; nombre: string; tamano_bytes: number | null }[]`.

- [ ] **Step 2: Prueba**

```ts
test('el alumno ve el material y lo pide por la ruta gateada', () => {
  const src = leer('src/app/(dashboard)/alumno/materia/[id]/page.tsx')
  expect(src).toContain('Material de la clase')
  expect(src).toContain('/api/material/')
  // Nunca una URL de storage directa
  expect(src).not.toContain('supabase.co/storage')
})
```

- [ ] **Step 3: Verificar y commitear**

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:unit
git add "src/app/(dashboard)/alumno" tests/unit/cms-contenido-f2.spec.ts
git commit -m "feat(materiales): el alumno descarga el material de su clase"
```

---

### Task 8: Verificación contra el piloto

**Sin archivos que tocar.** La hace el controlador de la sesión, no un subagente:
requiere credenciales del tenant y navegador.

- [ ] **Step 1: Aplicar la migración en GLOBALMIND** (`slpgczkoehnsdkjvhqdk`) por
  Management API, y comprobar que el bucket quedó privado con tope de 10 MB y
  que las cuatro políticas `materias:%` existen.
- [ ] **Step 2:** Con un admin temporal (crear, usar, **borrar y verificar que no
  quedó rastro**), subir un PDF a una semana desde la UI y comprobar que aparece
  en la lista.
- [ ] **Step 3:** Descargar ese PDF desde `/api/material/[id]` como admin → 302.
- [ ] **Step 4:** Comprobar que un usuario **sin** acceso a esa semana recibe
  **403** en esa misma ruta. Es la prueba que de verdad importa: es el gate que
  sustituye a la política SQL.
- [ ] **Step 5:** Quitar el material desde la UI y verificar que desaparecen la
  fila **y** el objeto del bucket.
- [ ] **Step 6:** Dejar el tenant como estaba y abrir el PR.

---

## Definición de terminado para F2

- [ ] `pnpm test:unit` en verde, incluidos `guardian-schema-onboarding` y `corregir-plan`
- [ ] `pnpm exec tsc --noEmit` sin errores nuevos (el `TS1501` de `corregir-plan.spec.ts:223` es preexistente)
- [ ] `pnpm lint && pnpm build` en verde
- [ ] `semana_materiales` existe en los **tres** archivos de esquema
- [ ] Los dos espejos ya crean `semanas` con `contenido`, `video_url_2` y `video_url_3`
- [ ] El bucket `materias` no tiene ninguna política que mencione al alumno
- [ ] Un alumno sin acceso a la semana recibe 403 en `/api/material/[id]`
- [ ] El módulo Cursos sigue funcionando (sus helpers cambiaron de sitio)

## Qué NO entra en F2

- Materiales que no sean PDF. El bucket y la validación quedan preparados, pero
  se limita a PDF igual que Cursos.
- Reordenar materiales arrastrando. La columna `orden` existe y se respeta al
  leer; la UI de reordenar es de F4, junto con el resto del reordenamiento.
- F3 (quizzes y evaluaciones) y F4 (estructura), cada una con su plan.
