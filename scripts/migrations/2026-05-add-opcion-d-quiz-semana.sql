-- =============================================================
-- MIGRATION 2026-05: Agregar opcion_d + explicacion a quiz_semana
-- =============================================================
--
-- PROPÓSITO:
-- Permitir 4 opciones (a/b/c/d) y explicación pedagógica en quizzes semanales.
-- Habilita el seed universal de 576 preguntas (seed-quiz-semanal-universal.sql).
--
-- IDEMPOTENTE: Puede ejecutarse múltiples veces sin causar daño.
-- Si ya está aplicada (columna existe), no hace nada.
--
-- COMPATIBILIDAD CON CLIENTES EXISTENTES:
-- Las preguntas viejas con solo 3 opciones siguen funcionando
-- (opcion_d queda NULL, route.ts ignora opciones nulas).
--
-- USO EN CLIENTE EXISTENTE:
-- psql "postgresql://postgres.REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
--   -f scripts/migrations/2026-05-add-opcion-d-quiz-semana.sql
--
-- USO EN CLIENTE NUEVO:
-- No es necesaria — el schema.sql canónico ya incluye opcion_d desde 2026-05.
-- Esta migration solo aplica a clientes que se desplegaron antes de esa fecha.
-- =============================================================

BEGIN;

-- 1. Agregar columna opcion_d (NULL por defecto, no rompe preguntas existentes)
ALTER TABLE public.quiz_semana
  ADD COLUMN IF NOT EXISTS opcion_d TEXT;

-- 2. Agregar columna explicacion (NULL por defecto)
ALTER TABLE public.quiz_semana
  ADD COLUMN IF NOT EXISTS explicacion TEXT;

-- 3. Actualizar CHECK constraint para aceptar 'd'
--    DROP del constraint viejo (si existe con cualquier nombre que pueda tener)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Buscar el nombre del CHECK constraint actual sobre respuesta_correcta
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.quiz_semana'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%respuesta_correcta%'
  LIMIT 1;
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quiz_semana DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE 'Constraint % eliminado', v_constraint_name;
  END IF;
END $$;

-- 4. Crear nuevo CHECK constraint con nombre estable
ALTER TABLE public.quiz_semana
  ADD CONSTRAINT quiz_semana_respuesta_correcta_check
  CHECK (respuesta_correcta IN ('a', 'b', 'c', 'd'));

-- 5. Refrescar cache de PostgREST para que la API tome los cambios
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================
-- VERIFICACIÓN POST-MIGRATION (opcional)
-- =============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'quiz_semana'
-- ORDER BY ordinal_position;
--
-- Resultado esperado: debe incluir opcion_d (text, YES) y explicacion (text, YES)
--
-- SELECT pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.quiz_semana'::regclass AND contype = 'c';
--
-- Resultado esperado: CHECK ((respuesta_correcta = ANY (ARRAY['a','b','c','d'])))
-- =============================================================
