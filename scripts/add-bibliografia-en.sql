-- Columna bibliografía en inglés para materias (EDVEX)
-- Ejecutar en: Supabase SQL Editor
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS bibliografia_en JSONB NOT NULL DEFAULT '[]';
