-- ============================================================
--  EDVEX Academy — Columnas bilingüe para contenido ES/EN
--  Ejecutar en: Supabase SQL Editor ANTES de correr el import
-- ============================================================

-- ── materias: nombre, descripción y bibliografía en inglés ─
ALTER TABLE public.materias
  ADD COLUMN IF NOT EXISTS nombre_en        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion_en   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bibliografia_en  JSONB NOT NULL DEFAULT '[]';

-- ── semanas: contenido y URL de video en inglés ───────────
ALTER TABLE public.semanas
  ADD COLUMN IF NOT EXISTS contenido_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS url_en       TEXT NOT NULL DEFAULT '';

-- ── Verificación ──────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('materias', 'semanas')
  AND column_name IN ('nombre_en', 'descripcion_en', 'bibliografia_en', 'contenido_en', 'url_en')
ORDER BY table_name, column_name;
