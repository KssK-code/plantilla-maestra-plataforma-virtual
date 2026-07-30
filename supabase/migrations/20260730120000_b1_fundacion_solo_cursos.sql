-- ============================================================================
-- B1 — FUNDACIÓN DE ESQUEMA · Línea Solo-Cursos y Diplomados
-- ============================================================================
-- Entrega TODO el DDL que consumen las fases siguientes, para que B2 (gate de
-- acceso), B3 (Abrir-Mes + pagos) y B4 (diploma con folio) sean puro código
-- contra un esquema ya estable.
--
-- POR QUÉ SOBRE curso_* Y NO SOBRE materias: en el modelo de materias un alumno
-- solo puede tener UN programa — `nivel`, `modalidad` y `meses_desbloqueados`
-- son columnas únicas de `alumnos` — y `alumnos.duracion_meses` es
-- GENERATED ALWAYS clavada a 3 o 6 meses. `curso_inscripciones` es una tabla
-- N-a-N, así que la ventana de pago puede vivir POR INSCRIPCIÓN y un mismo
-- alumno puede cursar dos diplomados a distinto ritmo. Eso es lo que habilita
-- esta migración.
--
-- ORDEN: correr DESPUÉS de scripts/migracion-cursos-diplomados.sql (crea
-- cursos/curso_inscripciones) y de supabase/migrations/20260716120000_pagos.sql.
-- El preflight aborta con un mensaje claro si falta alguna.
--
-- IDEMPOTENTE Y RE-EJECUTABLE. Todo va con ADD COLUMN IF NOT EXISTS /
-- CREATE ... IF NOT EXISTS, y todo constraint se DROP-IF-EXISTS antes de
-- re-crearse. Segura sobre una BD con el esquema viejo y segura corrida dos
-- veces. NO se edita ninguna migración previa.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543):
--   psql "postgresql://postgres:<PASS>@db.<REF>.supabase.co:5432/postgres" \
--        -v ON_ERROR_STOP=1 -f supabase/migrations/20260730120000_b1_fundacion_solo_cursos.sql
-- ============================================================================

BEGIN;

-- ── Preflight ───────────────────────────────────────────────────────────────
DO $preflight$
BEGIN
  IF to_regclass('public.cursos') IS NULL THEN
    RAISE EXCEPTION 'Falta public.cursos. Corre antes scripts/migracion-cursos-diplomados.sql.';
  END IF;
  IF to_regclass('public.curso_inscripciones') IS NULL THEN
    RAISE EXCEPTION 'Falta public.curso_inscripciones. Corre antes scripts/migracion-cursos-diplomados.sql.';
  END IF;
  IF to_regclass('public.alumnos') IS NULL THEN
    RAISE EXCEPTION 'Falta public.alumnos (schema base).';
  END IF;
  IF to_regclass('public.pagos') IS NULL THEN
    RAISE EXCEPTION 'Falta public.pagos. Corre antes supabase/migrations/20260716120000_pagos.sql.';
  END IF;
END
$preflight$;


-- ════════════════════════════════════════════════════════════════════════════
-- LOCK-1 — alumnos.nivel admite 'diplomado'
-- ════════════════════════════════════════════════════════════════════════════
-- Hoy el CHECK permite ('secundaria','preparatoria','licenciatura'), así que un
-- alumno de la línea Solo-Cursos no se puede dar de alta: el INSERT revienta y
-- la ruta de alta borra el usuario de Auth recién creado (ese fue el Bug 68,
-- con el cadáver 'excel'). La regla que dejó aquel bug: NUNCA puede existir un
-- camino en la app que acepte un `nivel` que el CHECK vaya a rechazar.
--
-- El cambio es ESTRICTAMENTE PERMISIVO: solo se agregan valores legales. Ningún
-- dato existente deja de ser válido, ninguna política cambia de resultado y un
-- cliente de secundaria/preparatoria queda idéntico. NO se toca el default ni
-- se migra ningún dato: el nivel por cliente se fija al provisionar (B7).
--
-- Se descubre el constraint por catálogo en vez de asumir el nombre: en
-- scripts/schema.sql viene nombrado (`alumnos_nivel_check`, por ser un pg_dump)
-- y en supabase/schema.sql es un CHECK inline anónimo. Postgres autonombra los
-- inline igual, pero un cliente con historia rara podría tener otro nombre, y
-- soltar un DROP a ciegas por nombre dejaría la tabla con DOS checks: el viejo
-- restrictivo seguiría vetando 'diplomado'. Se dropea todo CHECK de la tabla
-- cuya definición mencione la columna nivel, avisando cuál se quitó.
DO $nivel$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
     WHERE ns.nspname = 'public'
       AND cl.relname = 'alumnos'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%nivel%'
  LOOP
    RAISE NOTICE 'LOCK-1: quitando CHECK % -> %', c.conname, c.def;
    EXECUTE format('ALTER TABLE public.alumnos DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.alumnos
    ADD CONSTRAINT alumnos_nivel_check
    CHECK (nivel IN ('secundaria', 'preparatoria', 'demo', 'licenciatura', 'diplomado'));

  RAISE NOTICE 'LOCK-1: alumnos_nivel_check re-creado con diplomado incluido.';
END
$nivel$;


-- ════════════════════════════════════════════════════════════════════════════
-- LOCK-2 — Ventana de pago POR INSCRIPCIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- El contador vive en curso_inscripciones, no en alumnos. Es la diferencia que
-- permite venderle DOS diplomados a la misma persona, cada uno con su propio
-- avance de pago: en el modelo de materias eso era imposible porque
-- alumnos.meses_desbloqueados es una sola columna por alumno.
ALTER TABLE public.curso_inscripciones
  ADD COLUMN IF NOT EXISTS meses_desbloqueados INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.curso_inscripciones
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa';

-- El CHECK va por separado porque el CHECK inline de ADD COLUMN IF NOT EXISTS
-- solo se aplica cuando la columna se crea: si ya existía, quedaría sin validar.
ALTER TABLE public.curso_inscripciones
  DROP CONSTRAINT IF EXISTS curso_inscripciones_estado_check;
ALTER TABLE public.curso_inscripciones
  ADD CONSTRAINT curso_inscripciones_estado_check
  CHECK (estado IN ('activa', 'suspendida', 'completada', 'cancelada'));

ALTER TABLE public.curso_inscripciones
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- meses_desbloqueados no puede ser negativo: un contador de ventana en negativo
-- abriría contenido al revés en el gate de B2.
ALTER TABLE public.curso_inscripciones
  DROP CONSTRAINT IF EXISTS curso_inscripciones_meses_desbloqueados_check;
ALTER TABLE public.curso_inscripciones
  ADD CONSTRAINT curso_inscripciones_meses_desbloqueados_check
  CHECK (meses_desbloqueados >= 0);

-- fecha_inscripcion: la tabla ya tenía created_at, así que se agrega NULLABLE,
-- se rellena desde created_at (para no fechar hoy inscripciones viejas) y solo
-- entonces se pone NOT NULL con default. Poner NOT NULL DEFAULT now() de golpe
-- habría reescrito la historia de todos los inscritos existentes.
ALTER TABLE public.curso_inscripciones
  ADD COLUMN IF NOT EXISTS fecha_inscripcion TIMESTAMPTZ;

UPDATE public.curso_inscripciones
   SET fecha_inscripcion = COALESCE(created_at, NOW())
 WHERE fecha_inscripcion IS NULL;

ALTER TABLE public.curso_inscripciones
  ALTER COLUMN fecha_inscripcion SET DEFAULT NOW();
ALTER TABLE public.curso_inscripciones
  ALTER COLUMN fecha_inscripcion SET NOT NULL;


-- ════════════════════════════════════════════════════════════════════════════
-- LOCK-3 — Precio, horas, ritmo e intentos en cursos
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS precio_inscripcion NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS precio_mensualidad NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS horas INTEGER;

-- INT PLANO, deliberadamente NO GENERATED. Contraste con alumnos.duracion_meses,
-- que es GENERATED ALWAYS AS (CASE modalidad WHEN '3_meses' THEN 3 ELSE 6 END):
-- esa columna clava todo programa a 3 o 6 meses y fue una de las razones por las
-- que el modelo de materias no servía para diplomados. Aquí queda libre.
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS duracion_meses INTEGER;

-- Ritmo de liberación POR CURSO. Lo consume el gate de B2 como
--   límite = meses_desbloqueados × modulos_por_mes   sobre curso_modulos.orden
-- Es columna y no config global porque distintos diplomados llevan distinto
-- ritmo, y el cliente vende varios a la vez.
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS modulos_por_mes INTEGER NOT NULL DEFAULT 2;

ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_modulos_por_mes_check;
ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_modulos_por_mes_check CHECK (modulos_por_mes > 0);

-- Mismo nombre y mismo default que evaluaciones.intentos_permitidos
-- (supabase/schema.sql:102) para que el repo tenga UNA sola convención.
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS intentos_permitidos INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_intentos_permitidos_check;
ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_intentos_permitidos_check CHECK (intentos_permitidos > 0);

-- Precios no negativos: un precio negativo se colaría al cobro de B3.
ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_precios_no_negativos_check;
ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_precios_no_negativos_check
  CHECK (precio_inscripcion >= 0 AND precio_mensualidad >= 0);


-- ════════════════════════════════════════════════════════════════════════════
-- LOCK-4 — Folio consecutivo de constancia
-- ════════════════════════════════════════════════════════════════════════════
-- Hoy el folio de la constancia se genera con Math.random() EN EL NAVEGADOR y
-- no se persiste: cambia en cada recarga, dos alumnos pueden colisionar y el
-- documento dice "para verificar su autenticidad contacte a administración"
-- cuando administración no tiene contra qué verificar. Esto lo reemplaza.
CREATE SEQUENCE IF NOT EXISTS public.curso_folio_seq;

CREATE TABLE IF NOT EXISTS public.curso_constancias (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_id  UUID          NOT NULL REFERENCES public.curso_inscripciones(id) ON DELETE CASCADE,
  folio           TEXT          NOT NULL UNIQUE,
  emitido_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  horas           INTEGER,
  -- SNAPSHOTS: el diploma no puede cambiar si el alumno se cambia el nombre o
  -- el curso se renombra después de emitirlo. Por eso son columnas propias y no
  -- un JOIN a alumnos/cursos.
  alumno_nombre   TEXT          NOT NULL,
  curso_nombre    TEXT          NOT NULL,
  calificacion    NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS idx_curso_constancias_inscripcion
  ON public.curso_constancias (inscripcion_id);

-- Folio atómico y consecutivo. nextval() es seguro bajo concurrencia; dos
-- emisiones simultáneas nunca comparten número.
-- VOLATILE (implícito) porque avanza la secuencia: marcarla STABLE haría que el
-- planner pudiera cachear el resultado dentro de una misma consulta.
CREATE OR REPLACE FUNCTION public.generar_folio_constancia(prefijo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF prefijo IS NULL OR btrim(prefijo) = '' THEN
    RAISE EXCEPTION 'El prefijo del folio no puede ir vacío.';
  END IF;
  RETURN btrim(prefijo) || '-' || lpad(nextval('public.curso_folio_seq')::text, 5, '0');
END;
$$;

-- La función quema números de la secuencia, así que NO puede quedar expuesta a
-- cualquier autenticado: un alumno llamándola en bucle dejaría huecos en la
-- numeración de los diplomas. B4 la invoca desde el servidor con el cliente
-- admin. Es SECURITY DEFINER para que el rol llamante no necesite USAGE sobre
-- la secuencia, y el acceso se cierra por GRANT.
REVOKE ALL ON FUNCTION public.generar_folio_constancia(TEXT) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.generar_folio_constancia(TEXT) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.generar_folio_constancia(TEXT) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.generar_folio_constancia(TEXT) TO service_role';
    EXECUTE 'GRANT USAGE ON SEQUENCE public.curso_folio_seq TO service_role';
  END IF;
END
$grants$;


-- ── RLS de curso_constancias ────────────────────────────────────────────────
-- Mismo patrón que el resto de las tablas curso_*: el USING salta a la tabla
-- padre (curso_inscripciones) y NUNCA hace un SELECT a su propia tabla, que es
-- la regla anti-recursión del Bug 16. Las referencias forman un DAG:
--   curso_constancias -> curso_inscripciones -> (nada)
ALTER TABLE public.curso_constancias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curso_constancias: select propias o admin" ON public.curso_constancias;
CREATE POLICY "curso_constancias: select propias o admin" ON public.curso_constancias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.curso_inscripciones ci
      WHERE ci.id = curso_constancias.inscripcion_id
        AND ci.alumno_id = auth.uid()
    )
    OR public.es_admin()
  );

-- Escrituras solo admin: la constancia la emite el servidor con el cliente
-- admin. Si el alumno pudiera insertar, se fabricaría su propio diploma —
-- exactamente el patrón que ya se cerró en curso_examen_resultados.
DROP POLICY IF EXISTS "curso_constancias: admin all" ON public.curso_constancias;
CREATE POLICY "curso_constancias: admin all" ON public.curso_constancias
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Grants: la RLS decide las filas, pero sin GRANT PostgREST responde 401 antes
-- de evaluar las políticas. Mismo criterio que el resto del módulo.
DO $grants_tabla$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.curso_constancias TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.curso_constancias TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.curso_constancias FROM anon';
  END IF;
END
$grants_tabla$;


-- ════════════════════════════════════════════════════════════════════════════
-- WIRING DE PAGO — solo la columna; la lógica es de B3
-- ════════════════════════════════════════════════════════════════════════════
-- Hoy un pago solo puede apuntar a un mes del programa académico: no hay forma
-- de facturar un diplomado por separado. Esta columna lo habilita.
--
-- ON DELETE SET NULL a propósito, no CASCADE ni NO ACTION: el historial
-- financiero tiene que sobrevivir a que un admin borre la inscripción (que es
-- como se "desinscribe" a un alumno hoy). CASCADE borraría el pago; NO ACTION
-- bloquearía la desinscripción. SET NULL conserva el pago y solo pierde el
-- vínculo.
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS curso_inscripcion_id UUID
  REFERENCES public.curso_inscripciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_curso_inscripcion
  ON public.pagos (curso_inscripcion_id)
  WHERE curso_inscripcion_id IS NOT NULL;

COMMIT;


-- ── Verificación manual (no altera nada) ────────────────────────────────────
-- 1) Columnas nuevas con tipo y default:
--   SELECT table_name, column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema='public'
--      AND (table_name, column_name) IN (
--            ('curso_inscripciones','meses_desbloqueados'),
--            ('curso_inscripciones','estado'),
--            ('curso_inscripciones','fecha_vencimiento'),
--            ('curso_inscripciones','fecha_inscripcion'),
--            ('cursos','precio_inscripcion'), ('cursos','precio_mensualidad'),
--            ('cursos','horas'), ('cursos','duracion_meses'),
--            ('cursos','modulos_por_mes'), ('cursos','intentos_permitidos'),
--            ('pagos','curso_inscripcion_id'))
--    ORDER BY table_name, column_name;
--
-- 2) El CHECK de nivel ya admite diplomado:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname = 'alumnos_nivel_check';
--
-- 3) Folio consecutivo:
--   SELECT public.generar_folio_constancia('FOR');  -- FOR-00001
--   SELECT public.generar_folio_constancia('FOR');  -- FOR-00002
--
-- 4) Ninguna tabla con RLS y 0 políticas SELECT:
--   SELECT c.relname
--     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname='public' AND c.relrowsecurity
--      AND NOT EXISTS (SELECT 1 FROM pg_policy p
--                       WHERE p.polrelid = c.oid AND p.polcmd IN ('r','*'))
--    ORDER BY 1;
