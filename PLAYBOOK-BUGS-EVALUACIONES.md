# PLAYBOOK — BUGS CONOCIDOS EVALUACIONES & QUIZZES

> Bugs descubiertos durante combos MEV y cómo blindarlos en plantilla maestra.
> Última actualización: mayo 2026 (post-ICCYDEH).

---

## ✅ Bug 21 (RESUELTO PR #12) — `seed-evaluaciones-y-quiz.sql` no crea evaluaciones

**Síntoma:**
Al ejecutar `seed-evaluaciones-y-quiz.sql` en cliente nuevo, el archivo asume que las evaluaciones ya existen en la tabla `public.evaluaciones`. Si no existen, los INSERTs en `public.preguntas` fallan silenciosamente o asocian preguntas a NULL.

**Causa:**
El seed busca `evaluaciones.id` por `materia_id + tipo='final'` con un SELECT, pero no crea la fila si no existe. En clientes nuevos, las evaluaciones se crean por trigger del schema o por seed previo, y si ese paso falla, este seed queda inútil.

**Detección:**
```sql
SELECT m.nombre, COUNT(e.id) AS evals, COUNT(p.id) AS preguntas
FROM public.materias m
LEFT JOIN public.evaluaciones e ON e.materia_id = m.id
LEFT JOIN public.preguntas p ON p.evaluacion_id = e.id
GROUP BY m.nombre
HAVING COUNT(e.id) = 0;  -- materias sin evaluación
```

**Fix temporal (cliente afectado):**
Ejecutar `scripts/seed-crear-evaluaciones.sql` ANTES de `seed-evaluaciones-y-quiz.sql`.

**Fix permanente (PENDIENTE plantilla):**
Modificar `seed-evaluaciones-y-quiz.sql` para incluir `INSERT INTO evaluaciones ... ON CONFLICT DO NOTHING` al inicio de cada bloque `DO $$`.

**Clientes potencialmente afectados:** Todos los desplegados antes de mayo 2026.

---

## 🐛 Bug 22 — `vercel deploy --yes` crea proyecto huérfano

**Síntoma:**
Al ejecutar `vercel deploy --yes` sin que exista `.vercel/project.json`, Vercel crea un proyecto NUEVO con nombre genérico (`plataforma-virtual`) en lugar de vincularse al proyecto correcto del cliente.

**Causa:**
El flag `--yes` acepta los defaults. Sin `.vercel/project.json` previo, Vercel asume que es proyecto nuevo y lo crea con el nombre del directorio padre.

**Detección:**
Después del primer `vercel deploy`, verificar:
```bash
cat .vercel/project.json
# Debe mostrar projectId que coincide con el proyecto del cliente en dashboard.
```

**Fix:**
ANTES del primer deploy, vincular explícitamente:
```bash
vercel link --project [NOMBRE-CLIENTE]-plataforma-virtual --yes
```

**Si ya se generó proyecto huérfano:**
1. Borrar proyecto huérfano en Vercel dashboard
2. `rm -rf .vercel`
3. `vercel link --project [NOMBRE-CORRECTO] --yes`
4. `vercel deploy --prod`

**Fix permanente en `mev-deploy.sh`:** agregar `vercel link` automático tras crear el proyecto en Vercel.

---

## 🐛 Bug 23 — Branding parcial: landing OK pero auth/internas con colores default

**Síntoma:**
Cliente reporta que el landing tiene sus colores correctos pero las páginas `/login`, `/register`, `/dashboard` y sidebar interno aparecen con paleta default de la plantilla.

**Causa:**
Las páginas `(auth)` y componentes internos no leen del objeto `CONFIG.colores`. Tienen Tailwind classes hardcoded con los colores de la plantilla original.

**Detección:**
Después del branding del landing, verificar:
```bash
grep -rE "bg-(blue|indigo|purple)-[0-9]{3}" src/app/\(auth\)/ src/app/dashboard/
# Si retorna líneas, el branding está incompleto
```

**Fix temporal:**
Reemplazo masivo de hex/Tailwind classes en los archivos afectados (típicamente 30-45 archivos). Documentado en prompt maestro #2.

**Fix permanente (PENDIENTE plantilla):**
Refactorizar todos los archivos para usar variables CSS del CONFIG (`var(--color-primario)`) en lugar de Tailwind classes hardcoded.

**Clientes potencialmente afectados:** Todos los desplegados antes de mayo 2026 con branding aplicado solo al landing.

---

## 🐛 Bug 24 — `scripts/quiz-data.sql` con schema incompatible

**Síntoma:**
El archivo `scripts/quiz-data.sql` (282 preguntas, ~267 KB) usa un schema viejo con columnas `opciones JSONB`, `pregunta_en`, `opciones_en`, `explicacion_en` (bilingüe) que NO existen en el schema canónico actual.

**Causa:**
Regresión histórica. El schema fue simplificado a columnas `opcion_a/b/c TEXT` separadas, pero el seed nunca se actualizó. Es **código muerto** que nunca pudo ejecutarse exitosamente.

**Impacto:**
Los 11 clientes en producción NUNCA tuvieron contenido en `quiz_semana` excepto las 16 preguntas demo de `seed-demo-materia.sql`. Los alumnos veían el tutorial demo pero las semanas reales no tenían quiz.

**Fix permanente (mayo 2026):**
1. ❌ Borrado `scripts/quiz-data.sql` del repo
2. ✅ Reemplazado por `scripts/seed-quiz-semanal-universal.sql` (576 preguntas, schema actual con 4 opciones + explicación)

**Clientes existentes:**
Aplicar migración `2026-05-add-opcion-d-quiz-semana.sql` + ejecutar `seed-quiz-semanal-universal.sql` cuando reporten que falta contenido en quiz semanal.

---

## ✅ Bug 25 (RESUELTO PR #12) — API `/api/alumno/materias` excluye nivel "demo"

**Síntoma:**
Alumnos con `nivel = 'preparatoria'` (o `secundaria`) no ven la materia demo del tutorial inicial.

**Causa:**
En `src/app/api/alumno/materias/route.ts:51`, el filtro WHERE incluye `m.nivel = alumno.nivel`. Como la materia demo tiene `nivel = 'demo'`, queda excluida.

**Fix temporal (cliente afectado):**
Modificar query en route.ts para incluir OR `m.nivel = 'demo'`:
```typescript
.or(`nivel.eq.${alumno.nivel},nivel.eq.demo`)
```

**Fix permanente (PENDIENTE plantilla):** Aplicar el patch al route.ts en plantilla maestra.

**Clientes potencialmente afectados:** Todos. Verificar si el alumno demo ve el tutorial.

---

## 📋 Checklist de auditoría post-ejecución de seeds

Después de ejecutar TODOS los seeds en cliente nuevo, validar:

```sql
-- 1. Materias por nivel
SELECT nivel, COUNT(*) AS materias
FROM public.materias
GROUP BY nivel;
-- Esperado: demo=1, preparatoria=12, secundaria=12

-- 2. Evaluaciones finales
SELECT COUNT(DISTINCT materia_id) AS materias_con_eval
FROM public.evaluaciones
WHERE tipo = 'final';
-- Esperado: 25 (24 reales + 1 demo)

-- 3. Preguntas de evaluación
SELECT COUNT(*) AS preguntas_eval FROM public.preguntas;
-- Esperado: 250 (10 × 25 materias)

-- 4. Quiz semanal
SELECT m.nivel, COUNT(qs.id) AS preguntas_quiz
FROM public.quiz_semana qs
JOIN public.semanas s ON s.id = qs.semana_id
JOIN public.meses_contenido mc ON mc.id = s.mes_id
JOIN public.materias m ON m.id = mc.materia_id
GROUP BY m.nivel;
-- Esperado:
--   demo         | 16
--   preparatoria | 288  (12 mat × 8 sem × 3 preg)
--   secundaria   | 288  (12 mat × 8 sem × 3 preg)

-- 5. Distribución de respuestas correctas en quiz semanal
SELECT respuesta_correcta, COUNT(*) AS cantidad
FROM public.quiz_semana
WHERE respuesta_correcta IN ('a','b','c','d')
GROUP BY respuesta_correcta
ORDER BY respuesta_correcta;
-- Esperado: a~144, b~144, c~144, d~144 (balanceado)
```

Si alguna métrica no cuadra, consultar el bug correspondiente en este playbook.

---

## 🔄 Orden correcto de ejecución de seeds (cliente nuevo)

```
1. supabase/schema.sql
2. scripts/setup.sql
3. scripts/seed-demo-materia.sql           (1 materia demo + 16 preg quiz)
4. scripts/seed-contenido-ivs.sql          (estructura semanas materias reales)
5. scripts/seed-contenido-semanas.sql      (contenido textual semanas)
6. scripts/seed-materias-ejemplo.sql       (24 materias reales)
7. scripts/seed-crear-evaluaciones.sql     (crea filas en evaluaciones)
8. scripts/seed-evaluaciones-y-quiz.sql    (250 preguntas examen final)
9. scripts/seed-quiz-semanal-universal.sql (576 preg quiz por semana)  ⭐ NUEVO
```

**Cliente existente que se actualiza:**
1. `scripts/migrations/2026-05-add-opcion-d-quiz-semana.sql` (migration)
2. `scripts/seed-quiz-semanal-universal.sql` (576 preguntas)
