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
