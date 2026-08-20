-- ============================================================================
-- FIX Bug 98 — `alumnos_nivel_check` sin 'diplomado' tras la cadena completa
-- ============================================================================
-- B1 (`20260730120000_b1_fundacion_solo_cursos.sql`, LOCK-1) amplía el CHECK a
-- ('secundaria','preparatoria','licenciatura','diplomado'). La migración de
-- licenciaturas (`20260812120000`), que corre DESPUÉS, lo dropea por nombre y
-- lo recrea SIN 'diplomado': revierte el LOCK-1 sin saberlo. Resultado en un
-- cliente solo_cursos: todo registro nuevo muere con 23514 y la ruta de alta
-- borra el usuario de Auth recién creado (mecánica del Bug 68).
--
-- Este archivo deja el constraint igual al schema canónico
-- (`scripts/schema.sql`, que ya advierte el Bug 98 en sus líneas 269-273).
-- NO se edita `20260812120000_licenciaturas.sql`: ya está aplicada en clientes,
-- y una migración nueva al final de la cadena repara también a los que la
-- corrieron en orden.
--
-- Idempotente. Conexión DIRECTA puerto 5432, NUNCA el pooler 6543.
-- ============================================================================

ALTER TABLE public.alumnos DROP CONSTRAINT IF EXISTS alumnos_nivel_check;
ALTER TABLE public.alumnos ADD  CONSTRAINT alumnos_nivel_check
  CHECK (nivel IN ('secundaria','preparatoria','licenciatura','diplomado'));

-- `materias_nivel_check` NO se toca: ('secundaria','preparatoria','demo',
-- 'licenciatura') es correcto — los diplomados viven en las tablas curso_*,
-- no en materias (scripts/schema.sql:395).

NOTIFY pgrst, 'reload schema';
