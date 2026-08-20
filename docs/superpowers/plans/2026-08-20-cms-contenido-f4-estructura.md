# CMS de Contenido — F4: estructura del programa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda crear, reordenar y retirar materias, meses y semanas desde Contenido — sin que un clic destruya calificaciones, constancias ni el progreso de un alumno.

**Architecture:** El corazón de la fase no es el CRUD, es el **conteo de dependencias**. Cada nivel de la jerarquía arrastra una cascada distinta, así que el conteo vive en `src/lib/estructura-contenido.ts` con una consulta por nivel y se prueba por separado. Retirar algo con dependencias **archiva**; el borrado físico solo ocurre cuando el conteo es cero, verificado dos veces.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase (service role), Playwright para `tests/unit` (`pnpm test:unit`, **sin** `--`).

**Spec:** `docs/superpowers/specs/2026-08-19-cms-contenido-admin-design.md` §5 F4, D2
**Rama:** `feat/cms-contenido-f4-estructura` (desde `main`, con F1, F2 y F3 mergeados)

---

## ⚠️ El mapa de cascadas: lo que destruye cada borrado

Esto no es contexto de fondo, es **el diseño**. Verificado en `scripts/schema.sql`:

| Borrar… | Se lleva por CASCADE | Deja huérfano (SET NULL) |
|---|---|---|
| **semana** | `progreso_semanas`, `notas_alumno` (las notas personales del alumno), `quiz_semana` → y con ellas `quiz_respuestas`, `semana_materiales` | — |
| **mes** | `semanas` → todo lo de arriba | `evaluaciones.mes_id`: los exámenes sobreviven pero quedan **inalcanzables por la API**, que lista por mes |
| **materia** | `calificaciones` (**las notas del alumno**), `evaluaciones` → `preguntas` + `intentos_evaluacion`, `glosario_materia`, `meses_contenido` → todo lo de arriba | `constancias.materia_id`: la constancia emitida pierde su referencia |

Un clic en "Eliminar materia" puede, hoy, borrar las calificaciones de un alumno
y dejar su constancia sin referencia. **Por eso el conteo de dependencias es la
tarea central de F4, no un detalle del DELETE.**

## Decisión: qué se cuenta en cada nivel

| Nivel | Dependencias a contar |
|---|---|
| semana | `progreso_semanas` + `notas_alumno` + `quiz_respuestas` (vía sus `quiz_semana`) + `semana_materiales` |
| mes | la suma de sus semanas + `intentos_evaluacion` de sus `evaluaciones` |
| materia | `calificaciones` + `constancias` + `intentos_evaluacion` de sus evaluaciones + la suma de sus meses |

`semana_materiales` cuenta como dependencia **a propósito**: no es historial de
alumno, pero son archivos que el admin subió y que se perderían del bucket sin
que nada los recoja. Mejor archivar y que los quite a mano.

## Estado de `activa` por nivel

| Tabla | ¿Tiene `activa`? | ¿La filtra el alumno hoy? |
|---|---|---|
| `materias` | **sí** | **sí** (`api/alumno/materias`, `lib/acceso-materias`) |
| `meses_contenido` | no → **la crea F4** | — |
| `semanas` | no → **la crea F4** | — |

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260820130000_cms_contenido_estructura.sql` **(crear)** | `activa` en `semanas` y `meses_contenido` |
| los **tres** `schema.sql` **(modificar)** | Siempre los tres, y sin duplicar columnas |
| `src/lib/estructura-contenido.ts` **(crear)** | Validación pura de materia/mes/semana + los tres conteos de dependencias |
| `src/app/api/admin/materias/route.ts` + `[id]/route.ts` **(crear)** | POST, PATCH, DELETE |
| `src/app/api/admin/meses/route.ts` + `[id]/route.ts` **(crear)** | POST, PATCH, DELETE (el `[id]/evaluaciones` de F3 ya existe) |
| `src/app/api/admin/semanas/route.ts` **(crear)** + `[id]/route.ts` **(ampliar)** | POST y DELETE (el PATCH es de F1) |
| `src/app/api/admin/contenido/orden/route.ts` **(crear)** | Reordenamiento en lote |
| `src/app/api/admin/contenido/route.ts` **(modificar)** | Arreglo del N+1 |
| Los **9 archivos** que leen `semanas` **(revisar uno a uno)** | Barrido de `activa` |
| `src/app/(dashboard)/admin/contenido/[id]/EstructuraBar.tsx` **(crear)** | Crear / reordenar / retirar |
| `tests/unit/cms-contenido-f4.spec.ts` **(crear)** | Invariantes de F4 |

> **Nota de honestidad sobre este plan.** A diferencia de los de F1 y F2, este
> especifica las tareas 3 a 8 **por delta** contra patrones que ya están en el
> repo y probados, no con su código completo: el `DELETE` de archivar-primero-y-
> recontar (`src/app/api/admin/quiz/[id]/route.ts`), el barrido con decisión por
> rama (`tests/unit/cms-contenido-f3.spec.ts`) y la UI
> (`MaterialesPanel.tsx`, `PreguntaEditor.tsx`). Reproducirlo entero triplicaría
> el documento y duplicaría código que ya tiene su fuente de verdad.
>
> Quien ejecute cada tarea recibe ese código en su despacho. Si ejecutas este
> plan fuera de ese flujo, **abre esos archivos antes de empezar**.

---

### Task 1: Migración `activa` en semanas y meses_contenido

Idéntica en forma a la de F3. `DEFAULT true` para que nada cambie de visibilidad
en los ~100 clientes desplegados. Índices parciales por `mes_id` y `materia_id`.

**Files:** la migración + los tres `schema.sql` + `tests/unit/cms-contenido-f4.spec.ts`

Pruebas: que la migración añada `activa` a las dos tablas con `DEFAULT true`, que
llegue a los tres esquemas, y **que ninguna tabla declare una columna repetida**
(la prueba de F2 ya lo vigila globalmente; comprueba antes con grep si `activa` ya
está, porque en `materias` sí y en estas dos no).

---

### Task 2: Conteo de dependencias y validación

**Files:** `src/lib/estructura-contenido.ts`

Dos cosas, ambas puras salvo los conteos (que reciben el cliente):

**2a. Validación** — `validarMateria`, `validarMes`, `validarSemana`, cada una con
whitelist estricta y `{crear}`:

- **materia**: `nombre` (≤300, requerido al crear), `descripcion` (≤2000),
  `nivel` ∈ `secundaria|preparatoria|demo|licenciatura` (el CHECK del esquema),
  `carrera` (solo si `nivel==='licenciatura'`, validada contra
  `getCarreras()` de `@/lib/licenciatura-utils`; en cualquier otro nivel se
  fuerza a `NULL`), `color`, `icono`, `orden` (entero 0..2147483647).
- **mes**: `numero_mes` (entero 1..120), `titulo` (≤300), `descripcion`.
- **semana**: `numero_semana` (entero 1..520), `titulo` (≤300). El resto de
  campos de la semana ya los valida `lib/contenido-semana.ts` (F1) — **no los
  dupliques**: esta validación es solo para el POST de creación.

**2b. Conteos** — una función por nivel, cada una devolviendo el desglose además
del total, porque el mensaje al admin tiene que decir QUÉ se conserva:

```ts
export interface Dependencias {
  total: number
  detalle: Record<string, number>
}

export async function dependenciasSemana(admin, semanaId): Promise<Dependencias>
export async function dependenciasMes(admin, mesId): Promise<Dependencias>
export async function dependenciasMateria(admin, materiaId): Promise<Dependencias>
```

Cada una cuenta exactamente lo de la tabla de arriba. `dependenciasMes` reusa
`dependenciasSemana` sobre sus semanas; `dependenciasMateria` reusa
`dependenciasMes`. **No dupliques la lógica por nivel.**

Pruebas: las de validación son puras y directas. Las de conteo son de análisis
estático sobre el fuente — que `dependenciasSemana` mencione las cuatro tablas,
que `dependenciasMes` llame a `dependenciasSemana`, y que `dependenciasMateria`
mencione `calificaciones` y `constancias`. La verificación real es la Task 8.

---

### Task 3: Rutas de semanas

- `POST /api/admin/semanas` — body `{mes_id, numero_semana?, titulo}`. El
  `numero_semana` se calcula como max+1 del mes si no viene. 404 si el mes no
  existe.
- `DELETE /api/admin/semanas/[id]` — **archivar primero, recontar, y solo
  entonces borrar**, exactamente el patrón de `api/admin/quiz/[id]/route.ts` de
  F3 (léelo). Usa `dependenciasSemana`. El mensaje al archivar enumera el
  detalle: *"3 alumnos tienen progreso y 1 tiene notas personales en esta
  semana…"*.
- El `PATCH` existente (F1) **no se toca**, salvo para aceptar `{activa:boolean}`
  como su propia rama, igual que hizo F3 en `quiz/[id]`.

---

### Task 4: Rutas de meses

`POST /api/admin/meses` (body `{materia_id, numero_mes?, titulo}`),
`PATCH/DELETE /api/admin/meses/[id]`. Mismo patrón.

⚠️ **El DELETE de un mes tiene que avisar de los exámenes.** `evaluaciones.mes_id`
es SET NULL: si el mes se borra de verdad, sus exámenes sobreviven pero quedan
inalcanzables por la API, que lista por mes. Así que un mes **con evaluaciones
cuenta como dependencia aunque nadie las haya respondido**, y el mensaje lo dice.

---

### Task 5: Rutas de materias

`POST /api/admin/materias`, `PATCH/DELETE /api/admin/materias/[id]`.

- `materias.activa` **ya existe y ya se filtra** del lado del alumno, así que
  archivar funciona desde el primer día sin tocar nada más.
- Al crear con `nivel='licenciatura'`, `carrera` es **requerida** y se valida
  contra `getCarreras()`. Con cualquier otro nivel se fuerza a `NULL`.
- El DELETE usa `dependenciasMateria`. Su mensaje es el más importante de toda
  la fase: menciona explícitamente **calificaciones y constancias**.

---

### Task 6: Reordenar

`PATCH /api/admin/contenido/orden` — body:

```ts
{ tipo: 'materia' | 'mes' | 'semana', orden: { id: string, posicion: number }[] }
```

Escribe `materias.orden`, `meses_contenido.numero_mes` o `semanas.numero_semana`
según el tipo. Validación: `tipo` de la lista, `orden` array no vacío de ≤500
elementos, ids uuid no repetidos, `posicion` entero ≥0 sin repetir.

⚠️ **Todos los ids tienen que pertenecer al mismo padre.** Sin esa comprobación,
un reordenamiento podría reescribir el `numero_semana` de semanas de otra
materia. Verifícalo con una consulta antes de escribir nada.

---

### Task 7: El barrido de `activa` y el arreglo del N+1

**7a. El barrido.** Son **nueve** archivos los que leen `semanas`. La regla es la
misma que en F3 — filtrar donde se LISTA, nunca donde se califica o se limpia —
pero aquí hay un nivel más: `meses_contenido`.

| Archivo | Acción |
|---|---|
| `api/alumno/materia/[id]/route.ts` | filtrar `activa` en semanas **y** en meses |
| `api/alumno/materias/route.ts` | idem (afecta los conteos del catálogo) |
| `api/alumno/progreso/semana/route.ts` | rechazar progreso sobre una semana archivada |
| `lib/acceso-materias.ts` | el gate no debe contar semanas archivadas |
| `api/admin/alumnos/[id]/avance/route.ts` | **NO filtrar** — cuenta lo que el alumno YA hizo |
| `api/admin/alumnos/[id]/cerrar-mes/route.ts` | **NO filtrar** — recoge ids para BORRAR |
| `api/admin/contenido/route.ts` | conteo de la lista: filtrar |
| `api/admin/contenido/[id]/route.ts` | **NO filtrar** — el editor ve las archivadas, marcadas |
| `api/admin/semanas/[id]/route.ts` | sin filtro |

**Antes de tocar nada, abre los nueve y confirma que la tabla coincide.** Si
alguno tiene más selects de los que la tabla menciona, PARA y repórtalo.

Y añade pruebas que **congelen** la decisión, como las de F3. Después,
**muta el código** —mete el filtro donde no va— y confirma que las pruebas
fallan. Si no fallan, las pruebas están vacías.

**7b. El N+1.** `GET /api/admin/contenido` hace 2–3 queries **por materia**
dentro de un `Promise.all`: en GLOBALMIND (185 materias) son ~550 queries por
carga, y F4 añade conteos encima. Sustituir por tres queries agregadas:

1. todas las materias
2. semanas agrupadas por materia (vía `meses_contenido`)
3. evaluaciones agrupadas por materia

Y agrupar en JS. Prueba: que el archivo **no** contenga un `await` dentro de un
`.map()` sobre materias.

---

### Task 8: UI y verificación contra el piloto

`EstructuraBar.tsx` con "Añadir materia / mes / semana", flechas de reordenar y
el botón Eliminar que muestra el `mensaje` del servidor cuando archiva. Una
materia, mes o semana archivada se pinta atenuada con etiqueta y botón Restaurar.

**Verificación contra GLOBALMIND** (con usuarios desechables que se borran y se
verifica que no queda rastro):

- [ ] Migración aplicada; `count(*) FILTER (WHERE activa) = count(*)` en las dos
      tablas.
- [ ] Crear una materia de licenciatura **sin carrera** → 400.
- [ ] Crear materia, mes y semana; comprobar que el alumno los ve.
- [ ] **La prueba que importa**: dar de alta progreso y una nota personal en esa
      semana como alumno, pulsar Eliminar como admin → debe **archivar** y decir
      qué conserva. Verificar en SQL que `progreso_semanas` y `notas_alumno`
      **siguen ahí**.
- [ ] Eliminar una semana recién creada y sin tocar → debe **borrar**.
- [ ] Reordenar y comprobar que el alumno ve el orden nuevo.
- [ ] Comprobar que `GET /api/admin/contenido` sigue devolviendo lo mismo tras el
      arreglo del N+1, comparando la respuesta antes y después sobre las 185
      materias reales.
- [ ] Dejar el tenant como estaba.

---

## Definición de terminado para F4

- [ ] Suite en verde, incluidos los guardianes de esquema y el anti-duplicados
- [ ] `tsc --noEmit` sin errores nuevos; `lint` y `build` verdes
- [ ] Retirar algo con historial **archiva** y el historial sigue en la base
- [ ] Retirar algo limpio **borra**
- [ ] Ningún reordenamiento puede tocar ids de otro padre
- [ ] `GET /api/admin/contenido` pasa de ~550 queries a 3, con la misma salida

## Qué NO entra en F4

- Rollout a los ~100 clientes restantes: tanda aparte, después del piloto.
- Mover un mes de una materia a otra (arrastraría exámenes; ver el plan de F3).
- Duplicar una materia entera como plantilla.
