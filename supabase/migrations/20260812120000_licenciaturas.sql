-- ============================================================================
-- MIGRACIÓN: add-on de LICENCIATURAS (tercer programa)
-- ============================================================================
-- Habilita el nivel 'licenciatura' junto a secundaria y preparatoria.
--
-- ES SEGURA EN UN CLIENTE QUE NO VENDE LICENCIATURAS: solo agrega columnas
-- nullable y AMPLÍA los CHECK existentes. Ningún alumno ni materia actual
-- cambia de valor, y con `CONFIG.licenciaturas.activas = false` la app no
-- dibuja nada nuevo. Se aplica a todos para que el día que un cliente encienda
-- el add-on no haya que tocar su base a mano.
--
-- Idempotente. Conexión DIRECTA puerto 5432, NUNCA el pooler 6543.
-- ============================================================================

-- ── COLUMNAS ────────────────────────────────────────────────────────────────
-- `alumnos.carrera`  → qué catálogo ve el alumno. NULL fuera de licenciatura.
-- `materias.carrera` → a qué carrera pertenece la materia. NULL en Sec/Prepa/demo.
-- `materias.modalidad` → con qué plan de REFERENCIA se sembró el escalonamiento
--    de `meses_contenido`. Es metadato del seed: NO se usa para filtrar lo que
--    ve el alumno (ver la nota de scoping al final).
ALTER TABLE public.alumnos  ADD COLUMN IF NOT EXISTS carrera   TEXT;
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS carrera   TEXT;
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS modalidad TEXT;

CREATE INDEX IF NOT EXISTS idx_materias_carrera
  ON public.materias (carrera) WHERE carrera IS NOT NULL;

COMMENT ON COLUMN public.alumnos.carrera IS
  'Slug de la carrera (CONFIG.licenciaturas.carreras[].slug). Solo licenciatura; NULL en el resto. Sin esto el alumno de licenciatura entra a un catálogo vacío.';
COMMENT ON COLUMN public.materias.modalidad IS
  'Plan de referencia con el que se sembró el escalonamiento. Metadato del seed: NO filtrar el catálogo del alumno por esta columna.';

-- ── CHECKS ──────────────────────────────────────────────────────────────────
-- Se DROPEAN por nombre y se recrean: ampliar un CHECK "corre OK" pero el valor
-- nuevo sigue rechazado si el viejo sigue puesto (ver Bug 72 del playbook).
ALTER TABLE public.materias DROP CONSTRAINT IF EXISTS materias_nivel_check;
ALTER TABLE public.materias ADD  CONSTRAINT materias_nivel_check
  CHECK (nivel IN ('secundaria','preparatoria','demo','licenciatura'));

ALTER TABLE public.alumnos DROP CONSTRAINT IF EXISTS alumnos_nivel_check;
ALTER TABLE public.alumnos ADD  CONSTRAINT alumnos_nivel_check
  CHECK (nivel IN ('secundaria','preparatoria','licenciatura'));

-- Los planes de licenciatura pueden durar más que los del programa. Sin ampliar
-- este CHECK, dar de alta un alumno en '9_meses' falla con 23514 y la ruta de
-- alta borra el usuario de Auth que acababa de crear (ver Bug 68).
ALTER TABLE public.alumnos DROP CONSTRAINT IF EXISTS alumnos_modalidad_check;
ALTER TABLE public.alumnos ADD  CONSTRAINT alumnos_modalidad_check
  CHECK (modalidad IS NULL OR modalidad IN (
    '3_meses','6_meses','9_meses','12_meses','18_meses','24_meses','36_meses'));

-- ── duracion_meses ──────────────────────────────────────────────────────────
-- Columna GENERATED: la expresión vieja era `WHEN '3_meses' THEN 3 ELSE 6`, así
-- que un alumno en '9_meses' quedaba con duracion_meses = 6 y su avance se
-- calculaba contra un plan que no cursa. No se puede ALTERar la expresión de una
-- columna generada: hay que dropearla y recrearla.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='alumnos'
      AND a.attname='duracion_meses' AND a.attgenerated = 's'
      AND pg_get_expr(
            (SELECT adbin FROM pg_attrdef d
             WHERE d.adrelid=a.attrelid AND d.adnum=a.attnum),
            a.attrelid) NOT LIKE '%9_meses%'
  ) THEN
    ALTER TABLE public.alumnos DROP COLUMN duracion_meses;
  END IF;
END $$;

ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS duracion_meses INTEGER GENERATED ALWAYS AS (
    CASE modalidad
      WHEN '3_meses'  THEN 3
      WHEN '6_meses'  THEN 6
      WHEN '9_meses'  THEN 9
      WHEN '12_meses' THEN 12
      WHEN '18_meses' THEN 18
      WHEN '24_meses' THEN 24
      WHEN '36_meses' THEN 36
      ELSE 6
    END
  ) STORED;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- NOTA DE SCOPING — leer antes de tocar el filtrado del catálogo
-- ============================================================================
-- El catálogo de licenciatura se filtra SOLO por `carrera`, NUNCA por
-- `modalidad`, y en los DOS sitios que deben coincidir:
--   - src/app/api/alumno/materias/route.ts
--   - cargarContextoAcceso() en src/lib/acceso-materias.ts
-- Si divergen, el índice de la ventana se corre y lista y gate dejan de
-- coincidir (Bug 59). Si se filtra por modalidad, todo alumno cuyo plan no sea
-- aquel con el que se sembró el catálogo ve CERO materias (Bug 91).
--
-- Verificación tras habilitar el add-on en un cliente:
--   SELECT DISTINCT a.modalidad AS plan_alumno, m.modalidad AS plan_catalogo
--   FROM alumnos a, materias m
--   WHERE a.nivel='licenciatura' AND m.nivel='licenciatura'
--     AND a.modalidad IS DISTINCT FROM m.modalidad;
--   -- filas > 0 y catálogo vacío para esos alumnos → el filtro por modalidad volvió.
-- ============================================================================
