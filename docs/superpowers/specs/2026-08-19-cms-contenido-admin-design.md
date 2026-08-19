# CMS de Contenido para el admin — diseño

**Fecha:** 2026-08-19
**Repo:** `plantilla-maestra-plataforma-virtual`
**Base:** `origin/main` @ `461f7d5`
**Rama:** `feat/cms-contenido-admin`
**Piloto:** GLOBALMIND — PV, Supabase `slpgczkoehnsdkjvhqdk` (sa-east-1, ACTIVE_HEALTHY)

---

## 1. Problema

Hoy la sección **Contenido** del admin es, pese a su nombre, un editor de URLs de
video. Su propio encabezado lo dice literal: *"Edita las URLs de video por
semana"*. El admin no puede tocar nada más del programa precargado: ni los
apuntes, ni materiales, ni los quizzes, ni los exámenes, ni la estructura.

Estado verificado contra el código en `461f7d5` (no asumido):

| # | Capacidad | Hoy | Causa exacta |
|---|-----------|-----|--------------|
| 1 | Editar apuntes de una semana | ❌ | `PATCH /api/admin/semanas/[id]` solo acepta `video_url`, `video_url_2`, `video_url_3`. La columna `semanas.contenido` **existe y el alumno ya la renderiza**, pero no viaja al editor |
| 2 | Cambiar el video | ✅ | Único camino implementado |
| 3 | PDFs / materiales por semana | ❌ | No hay columna, ni tabla, ni bucket, ni UI |
| 4 | Quizzes semanales | ❌ | Ninguna ruta `api/admin/*` toca `quiz_semana` |
| 5 | Evaluaciones mensuales | ❌ | Ninguna ruta admin toca `evaluaciones` / `preguntas` |
| 6 | Crear/eliminar semanas y materias | ❌ | No hay `POST`/`DELETE` para `materias`, `meses_contenido` ni `semanas` |
| 7 | Licenciaturas | igual | Misma pantalla, mismo editor: son filas de `materias` con `nivel='licenciatura'` + `carrera` |

**Objetivo:** que el admin pueda modificar las clases y el programa completo
desde Contenido, sin que nosotros toquemos base de datos.

## 2. Contexto verificado

### 2.1 Esquema vivo == esquema del repo

Consultado por Management API contra GLOBALMIND. Las seis tablas de contenido
(`materias`, `meses_contenido`, `semanas`, `quiz_semana`, `evaluaciones`,
`preguntas`) coinciden **columna por columna** con `scripts/schema.sql`. No hay
deriva que absorber.

### 2.2 Volumen real del piloto

| | |
|---|---|
| materias | 185 |
| meses_contenido | 185 |
| semanas | 360 (todas con apuntes y con video) |
| quiz_semana | 1 392 |
| evaluaciones | 185 |
| preguntas | 1 850 |
| **progreso_semanas** | **2** |
| **quiz_respuestas** | **5** |
| **intentos_evaluacion** | **1** |
| **calificaciones** | **1** |
| alumnos | 2 |

Contenido de sobra para probar en serio, historial casi nulo: piloto de bajo riesgo.

### 2.3 Hallazgos que condicionan el diseño

1. **Los apuntes ya son Markdown.** `/(dashboard)/alumno/materia/[id]/page.tsx`
   renderiza `semanas.contenido` con `ReactMarkdown` + `remarkGfm`, con overrides
   de `h1/h2/h3`. El editor debe ser Markdown, no texto plano ni WYSIWYG-a-HTML.
2. **`materias.activa` y `evaluaciones.activa` ya se filtran del lado del
   alumno** (`api/alumno/materias/route.ts:55`, `lib/acceso-materias.ts:392`,
   `api/alumno/materia/[id]/route.ts:115`). Archivar una materia o una
   evaluación ya funciona hoy. `semanas` y `meses_contenido` **no tienen** esa
   columna.
3. **El módulo Cursos ya resolvió el problema de archivos** (`lib/cursos/archivos.ts`,
   `lib/cursos/storage.ts`, `cursos/[id]/lecciones/[leccionId]/material/route.ts`):
   signed upload URL → confirm → verificación de MIME y tamaño en servidor →
   limpieza de huérfanos. Es reutilizable tal cual.
4. **Existe un test guardián** (`tests/unit/guardian-schema-onboarding.spec.ts`,
   PR #71): todo `CREATE` en `supabase/migrations/` debe existir también en
   `scripts/schema.sql`.

   ⚠️ Y son **dos** archivos de esquema, no uno —
   `tests/unit/corregir-plan.spec.ts` lo verifica explícitamente contra los dos:
   - `supabase/schema.sql` — espejo documental
   - `scripts/schema.sql` — **el que `mev-onboarding.py` instala en los combos
     nuevos**

   Toda migración de este trabajo va reflejada en **los dos**. Faltar en el
   segundo es lo grave: el objeto nace ausente en todo cliente nuevo.
5. **`opcion_d` es nullable pero el CHECK admite `respuesta_correcta='d'`.**
   Hoy nadie puede crear preguntas desde la UI, así que el hueco es teórico. En
   cuanto F3 abra el CRUD deja de serlo.

## 3. Decisiones de diseño

### D1 — Un spec, cuatro fases

Las cuatro capacidades no son subsistemas independientes: son cuatro grupos de
campos de **una misma pantalla**, sobre un mismo modelo de datos, una misma ruta
de auth y una sola migración. Cuatro specs duplicarían las mismas decisiones
cuatro veces. Cada fase sí es desplegable por separado.

### D2 — Eliminar = archivar, salvo que esté limpio

Un `DELETE` cuenta primero las filas dependientes (`progreso_semanas`,
`quiz_respuestas`, `intentos_evaluacion`, `calificaciones`):

- **Hay dependencias** → `409` con el conteo. La UI ofrece archivar.
- **No hay ninguna** → borrado físico.

Un solo botón "Eliminar" en la UI; **el backend decide**. Razón: el admin no
tiene forma de saber si una semana tiene progreso colgando, y hacerle elegir
entre "archivar" y "borrar" traslada al usuario una decisión que el sistema
puede tomar con certeza.

### D3 — El bucket de materiales NO lleva política de lectura para alumnos

El bucket `materias` es privado y sus políticas son **solo-admin**. El alumno
nunca lee del bucket por RLS: pide el archivo a
`GET /api/alumno/material/[id]`, que reusa `tieneAccesoMateria()` y responde con
un signed URL de service role.

Es una **desviación deliberada** del patrón de Cursos, que sí duplica la regla
de acceso dentro de la política SQL. Esa duplicación ya causó un bug real
documentado en `20260729122000_fix_portadas_storage_policy.sql`: las portadas
salían en blanco **solo para el alumno**, invisible en cualquier QA hecho con
cuenta de admin. Con el gate en la API route la regla de acceso vive en un solo
sitio y no puede divergir.

### D4 — Varios materiales por semana, no uno

Tabla `semana_materiales` en vez de una columna `semanas.material_path`. Cursos
usa una columna porque una lección tiene un PDF; una clase suele repartir varios
(guía, ejercicios, lectura). Con columna única, subir el segundo archivo borra
el primero sin avisar.

### D5 — Rol requerido: ADMIN

Todas las rutas nuevas usan `verifyAdmin`, no `verifyStaff`. Sigue la convención
del repo: `verifyStaff` (ADMIN + SECRETARIO) está reservado a lectura de alumnos
y registro de pagos. Editar el programa no es tarea de secretaría.

## 4. Cambios de esquema

Una sola migración: `supabase/migrations/20260819120000_cms_contenido.sql`,
idempotente, reflejada en **`supabase/schema.sql` Y `scripts/schema.sql`**
(§2.3.4 — son dos archivos y el guardián exige los dos).

```sql
ALTER TABLE public.semanas          ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;
ALTER TABLE public.meses_contenido  ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.semana_materiales (
    id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    semana_id     uuid NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
    nombre        text NOT NULL,              -- nombre visible para el alumno
    path          text NOT NULL,              -- ruta dentro del bucket 'materias'
    tamano_bytes  bigint,
    orden         integer,
    created_at    timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_semana_materiales_semana ON public.semana_materiales(semana_id);
```

Más: bucket privado `materias` (límite 10 MB) y políticas de
`INSERT/UPDATE/DELETE/SELECT` restringidas a `public.es_admin()`.

`DEFAULT true` en ambas columnas `activa` es lo que hace la migración segura en
los ~100 clientes ya desplegados: todo el contenido existente queda activo.

## 5. Fases

### F1 — Apuntes y datos de la semana

Sin migración. Es la fase más barata y la que más valor entrega por sí sola.

- `PATCH /api/admin/semanas/[id]` acepta además `titulo`, `descripcion`,
  `contenido`, `tiempo_estimado_minutos`. **Whitelist explícita campo por
  campo**, nunca spread del body.
- `GET /api/admin/contenido/[id]` devuelve además `contenido`, `descripcion`,
  `tiempo_estimado_minutos` (hoy no los manda, por eso "el campo ni siquiera
  viaja al editor").
- `ApuntesEditor.tsx`: textarea Markdown + preview lado a lado, usando **el
  mismo `ReactMarkdown` + `remarkGfm` con los mismos overrides** que
  `/alumno/materia/[id]`. El preview del admin es literalmente lo que verá el
  alumno, no una aproximación.
- Validación servidor: `tiempo_estimado_minutos` entero 1–600; `titulo` no vacío.

### F2 — Materiales PDF por semana

- Migración (§4) + bucket.
- `POST /api/admin/semanas/[id]/materiales` con las dos acciones del patrón
  Cursos: `{action:'upload-url'}` → `{path, token}`; `{action:'confirm'}` →
  verifica el objeto realmente subido (MIME y tamaño desde `storage.list()`),
  inserta en `semana_materiales`, borra el objeto si no valida.
- `DELETE /api/admin/semanas/[id]/materiales/[materialId]` — primero desliga en
  DB, después limpia storage (mismo orden que Cursos).
- `GET /api/alumno/material/[id]` — gate con `tieneAccesoMateria()` + signed URL.
- Ruta en bucket: `{materiaId}/{semanaId}/{timestamp}-{archivo}`. El `materiaId`
  sale del join `semanas → meses_contenido → materias` que la ruta ya necesita
  para autorizar, así que no añade una query. Dos niveles como en Cursos, y
  permite limpiar todo el material de una materia con un solo prefijo.
- Reutilizable **tal cual** de `lib/cursos/archivos.ts` (son funciones puras, sin
  bucket dentro): `sanitizeFilename`, `extensionDe`, `validarMaterial`,
  `MATERIAL_MAX_BYTES`, `MATERIAL_MIMES`. Se mueven a `lib/archivos-comunes.ts`
  y `lib/cursos/archivos.ts` los re-exporta, para no tocar a los consumidores
  de Cursos.
- **NO reutilizable tal cual:** `signedUrl()` y `removeFolder()` de
  `lib/cursos/storage.ts` tienen `BUCKET_CURSOS` **cableado dentro**
  (`admin.storage.from(BUCKET_CURSOS)`). Hay que generalizarlas a
  `(admin, bucket, path)` y actualizar sus llamadas actuales en Cursos. Es un
  cambio mecánico, pero omitirlo haría que el material de semanas se escribiera
  en el bucket equivocado.
- Alumno: sección "Material de la clase" en `/alumno/materia/[id]`, bajo los
  videos.

### F3 — Quizzes y evaluaciones

- Quiz semanal: `GET/POST /api/admin/semanas/[id]/quiz`,
  `PATCH/DELETE /api/admin/quiz/[id]`.
- Examen mensual: `GET/POST /api/admin/meses/[id]/evaluaciones`,
  `PATCH/DELETE /api/admin/evaluaciones/[id]`,
  `POST /api/admin/evaluaciones/[id]/preguntas`,
  `PATCH/DELETE /api/admin/preguntas/[id]`.
- Validación en servidor, no solo en el formulario:
  - `respuesta_correcta ∈ {a,b,c,d}`;
  - **si `respuesta_correcta='d'`, `opcion_d` no puede ir vacía** (§2.3.5);
  - `pregunta`, `opcion_a..c` no vacías;
  - `orden` entero ≥ 0.
- Borrado de una pregunta ya respondida: misma regla D2.
- Las `evaluaciones` se archivan con su `activa` existente (ya filtrada).

### F4 — Estructura del programa

- `POST/PATCH/DELETE /api/admin/materias[/[id]]`
- `POST/PATCH/DELETE /api/admin/meses[/[id]]`
- `POST/DELETE /api/admin/semanas[/[id]]` (el `PATCH` ya existe, ampliado en F1)
- `PATCH /api/admin/contenido/orden` — reordenamiento en lote de
  `materias.orden`, `meses_contenido.numero_mes`, `semanas.numero_semana`.
- Al crear materia con `nivel='licenciatura'`: selector de `carrera` alimentado
  por `getCarreras()` de `lib/licenciatura-utils`. Con cualquier otro nivel,
  `carrera` se fuerza a `NULL`.
- `nivel` restringido a los valores del CHECK existente
  (`secundaria|preparatoria|demo|licenciatura`).

#### F4.a — Barrido obligatorio del filtro `activa`

Añadir la columna no sirve de nada si solo se filtra en el primer sitio que
aparece. **Los nueve archivos que leen `semanas` deben revisarse uno por uno:**

| Archivo | Acción |
|---|---|
| `api/alumno/materia/[id]/route.ts` | filtrar `activa` en semanas y en meses |
| `api/alumno/materias/route.ts` | idem (afecta conteos del catálogo) |
| `api/alumno/progreso/semana/route.ts` | rechazar progreso sobre semana archivada |
| `lib/acceso-materias.ts` | el gate de acceso no debe contar semanas archivadas |
| `api/admin/alumnos/[id]/avance/route.ts` | el avance no debe contra semanas archivadas |
| `api/admin/alumnos/[id]/cerrar-mes/route.ts` | idem al cerrar mes |
| `api/admin/contenido/route.ts` | conteo de la lista |
| `api/admin/contenido/[id]/route.ts` | el editor **sí** muestra archivadas, marcadas |
| `api/admin/semanas/[id]/route.ts` | sin cambio de filtro |

Nota: el select de semanas está **anidado** dentro del de `meses_contenido`
vía PostgREST. Filtrar hijos anidados requiere `!inner` o filtrado en JS tras
el fetch; se resuelve en JS donde ya existe un `.map`/`.sort`, para no cambiar
la semántica del join.

#### F4.b — Arreglo del N+1 (incluido)

`GET /api/admin/contenido` hace 2–3 queries **por materia** dentro de un
`Promise.all`. En GLOBALMIND (185 materias) son ~550 queries por carga, y F4
añadiría conteos encima. Se sustituye por 3 queries agregadas
(`materias`, conteo de semanas agrupado por materia vía `meses_contenido`,
conteo de evaluaciones agrupado por materia). Entra en el alcance porque es
exactamente la pantalla que se está tocando y esta feature la agrava; no es
refactor ajeno.

## 6. Pruebas

Convención del repo, verificada: `npm run test:unit` ejecuta
`playwright test --config=playwright-unit.config.ts`. Pese al nombre, los specs
de `tests/unit/` son de **Playwright** y varios son análisis estático sobre el
código fuente (`readFileSync` + regex), no pruebas de runtime. Los tests nuevos
siguen ese patrón, no vitest.

- **Unitarias** (`tests/unit/`):
  - `cms-contenido-borrado.spec.ts` — D2: con dependencias → 409; limpio → borra.
  - `cms-contenido-validacion.spec.ts` — whitelist del PATCH; `respuesta_correcta='d'` sin `opcion_d` → 400; rangos.
  - `cms-contenido-activa.spec.ts` — análisis estático: cada uno de los 9
    archivos de §F4.a que lee `semanas` filtra `activa` (o está en una lista de
    excepciones justificadas). Es la única forma barata de que el barrido no se
    deshaga con el tiempo.
- **Guardián**: `guardian-schema-onboarding.spec.ts` debe seguir en verde. La
  migración **no** entra en su lista de `EXCEPCIONES`: eso está reservado a
  módulos opcionales como Cursos, y este CMS es contenido base. `mev-onboarding.py`
  instala a los clientes nuevos desde `scripts/schema.sql`, así que no
  reflejarlo ahí haría que `semanas.activa`, `meses_contenido.activa` y
  `semana_materiales` **nacieran ausentes en todo cliente futuro** —
  exactamente la deriva del 17-ago-2026 que originó el test. Se refleja en los
  **dos** archivos de esquema (§2.3.4).
- **E2E** (`e2e/`, patrón de `cursos-diplomados.spec.ts`): admin edita apuntes →
  el alumno los ve renderizados.
- **Validación en el piloto**: aplicar migración en GLOBALMIND
  (`slpgczkoehnsdkjvhqdk`) por Management API, desplegar y comprobar contra las
  185 materias reales — en particular las de licenciatura (fila 7).

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Filtrar `activa` a medias deja fugas invisibles | §F4.a fuerza el barrido de los 9 archivos, uno por uno |
| Migración rompe clientes ya desplegados | `DEFAULT true` + `IF NOT EXISTS`; nada preexistente cambia de comportamiento |
| `page.tsx` crece a ~1500 líneas | Se parte en componentes antes de añadir campos (§Arquitectura) |
| Fallo de ownership al crear políticas de storage | Documentado ya en el repo: crear desde el Dashboard con el mismo `USING`; migración sin transacción |
| El admin borra contenido con alumnos dentro | D2: el backend lo impide y ofrece archivar |
| `signedUrl`/`removeFolder` tienen `BUCKET_CURSOS` cableado; reusarlas sin generalizar escribiría el material en el bucket de Cursos | §F2 lo marca explícitamente: generalizar a `(admin, bucket, path)` y actualizar las llamadas de Cursos |
| Deploy bloqueado por autor del commit (convención MEVI) | Mergear en local, no en Vercel |

## 8. Fuera de alcance

- Rollout a los ~100 clientes restantes (batch aparte, después del piloto).
- Editor WYSIWYG. El alumno renderiza Markdown; el editor es Markdown.
- Versionado / historial de cambios del contenido.
- Materiales que no sean PDF (el bucket y la validación quedan preparados,
  pero se limita a PDF como Cursos).
- Contenido bilingüe: la API expone `contenido_en` pero hoy es un alias de
  `contenido`; no hay columna real y no se crea aquí.
