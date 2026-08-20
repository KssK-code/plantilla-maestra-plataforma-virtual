-- ============================================================================
-- F4 — Retirar semanas y meses sin destruir historial de alumnos
-- ============================================================================
-- Al abrir el CRUD de la estructura hace falta poder RETIRAR una semana o un
-- mes. Borrarlos no sirve: la cascada del esquema se lleva por delante cosas
-- que no son contenido, son del alumno.
--
--   semanas         → CASCADE: progreso_semanas, notas_alumno (las notas
--                     PERSONALES que el alumno escribió), quiz_semana — y con
--                     ellas quiz_respuestas —, y semana_materiales.
--   meses_contenido → CASCADE: semanas, o sea todo lo anterior.
--                     Y SET NULL sobre evaluaciones.mes_id: los exámenes
--                     sobreviven pero quedan inalcanzables por la API, que
--                     lista por mes.
--
-- `activa` permite retirarlos de lo que el alumno ve DE AHORA EN ADELANTE sin
-- tocar nada de eso. El borrado físico se sigue ofreciendo, pero solo cuando no
-- hay ni una fila colgando: esa decisión la toma la API, no esta migración.
--
-- `materias.activa` ya existía y el alumno ya la filtra, así que ese nivel
-- funciona desde el primer día sin tocar nada más.
--
-- DEFAULT true es lo que hace esto seguro en los ~100 clientes ya desplegados:
-- toda semana y todo mes existentes siguen exactamente igual de visibles.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS. Re-ejecutable.
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543).
-- ============================================================================

ALTER TABLE public.semanas
  ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true NOT NULL;

ALTER TABLE public.meses_contenido
  ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true NOT NULL;

-- Índices parciales: las consultas del alumno siempre piden activa = true.
CREATE INDEX IF NOT EXISTS idx_semanas_activa
  ON public.semanas (mes_id) WHERE activa;

CREATE INDEX IF NOT EXISTS idx_meses_contenido_activa
  ON public.meses_contenido (materia_id) WHERE activa;

-- ── Verificación manual (no altera nada) ────────────────────────────────────
--   SELECT count(*) FILTER (WHERE activa) AS activas, count(*) AS todas
--     FROM public.semanas;
--   -- deben coincidir justo después de aplicar
