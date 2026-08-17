-- ============================================================================
-- MIGRACIÓN: corregir plan de estudio (nivel / carrera / modalidad)
-- ============================================================================
-- El alta captura nivel, carrera y modalidad una sola vez y no había pantalla
-- ni endpoint para corregirlos: un alumno registrado con el nivel equivocado
-- obligaba a desactivarlo y darlo de alta otra vez con otro correo. Esto
-- habilita la corrección de CAPTURA — no un cambio de carrera — y por eso solo
-- procede si el alumno no ha comenzado, medido por SEIS candados:
--
--   ① cero filas en pagos Y inscripcion_pagada = false
--   ② meses_desbloqueados = 0
--   ③ cero calificaciones          (excluyendo materias TUTORIAL)
--   ④ cero progreso_semanas        (excluyendo materias TUTORIAL)
--   ⑤ cero intentos_evaluacion     (excluyendo materias TUTORIAL)
--   ⑥ cero quiz_respuestas         (excluyendo materias TUTORIAL)
--
-- TUTORIAL = nivel='demo' O nombre contiene 'tutor' — es_materia_tutorial(),
-- el espejo SQL de esTutorial() (src/lib/acceso-materias.ts:95-97). La razón
-- de la simetría: el gate de acceso (tieneAccesoMateria, acceso-materias.ts:186)
-- abre las materias tutorial SIN pago y SIN meses, así que el seed estándar
-- deja a un alumno recién registrado avanzar tanto la materia demo como la
-- «Tutoría de ingreso I» de preparatoria (nivel real, tutorial por nombre).
-- Los candados excluyen EXACTAMENTE lo que el sistema regala sin pago: ese
-- avance nunca es evidencia de que el alumno inició su plan. Los candados de
-- dinero (①②) NO tienen excepción de tutorial.
--
-- La matrícula NO se regenera: el alumno nunca la usó para nada y el formato
-- (prefijo-año-consecutivo, ver 20260811120000) no codifica el nivel.
--
-- notas_alumno NO es candado (escribir una nota no es iniciar el plan), pero
-- las notas SÍ se borran en la misma transacción y su conteo queda en la
-- bitácora alumno_plan_eventos.
--
-- Idempotente. Conexión DIRECTA puerto 5432, NUNCA el pooler 6543.
-- ============================================================================

-- ── BITÁCORA: alumno_plan_eventos ───────────────────────────────────────────
-- Mismo patrón que curso_inscripcion_eventos (B4): solo admin lee, nadie
-- escribe por PostgREST — los INSERT ocurren dentro de la función SECURITY
-- DEFINER, que se salta la RLS por diseño.
CREATE TABLE IF NOT EXISTS public.alumno_plan_eventos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id          UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  tipo               TEXT        NOT NULL DEFAULT 'correccion_plan',
  nivel_antes        TEXT,
  carrera_antes      TEXT,
  modalidad_antes    TEXT,
  nivel_despues      TEXT,
  carrera_despues    TEXT,
  modalidad_despues  TEXT,
  notas_borradas     INTEGER     NOT NULL DEFAULT 0,
  detalle            JSONB,
  -- Quién lo hizo. Va como PARÁMETRO desde el servidor, no auth.uid(): la
  -- función se invoca con service_role, donde auth.uid() es NULL (Bug 83).
  actor              UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alumno_plan_eventos
  DROP CONSTRAINT IF EXISTS alumno_plan_eventos_tipo_check;
ALTER TABLE public.alumno_plan_eventos
  ADD CONSTRAINT alumno_plan_eventos_tipo_check
  CHECK (tipo IN ('correccion_plan'));

CREATE INDEX IF NOT EXISTS idx_alumno_plan_eventos_alumno
  ON public.alumno_plan_eventos (alumno_id, created_at DESC);

ALTER TABLE public.alumno_plan_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumno_plan_eventos: solo admin lee" ON public.alumno_plan_eventos;
CREATE POLICY "alumno_plan_eventos: solo admin lee" ON public.alumno_plan_eventos
  FOR SELECT TO authenticated
  USING (public.es_admin());

DO $g$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    -- Solo SELECT: sin política de INSERT/UPDATE/DELETE ni el admin puede
    -- fabricar eventos a mano por PostgREST. La bitácora la escribe el
    -- servidor o nadie.
    EXECUTE 'GRANT SELECT ON public.alumno_plan_eventos TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.alumno_plan_eventos TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.alumno_plan_eventos FROM anon';
  END IF;
END
$g$;

-- ── PREDICADO: es_materia_tutorial(nivel, nombre) ───────────────────────────
-- ⚠️ Debe mantenerse en sincronía con esTutorial() (acceso-materias.ts:95-97)
-- — si cambia uno, cambia el otro. Un spec vigila la pareja
-- (tests/unit/corregir-plan.spec.ts). El criterio vive UNA vez por lado:
-- aquí para todo el SQL, allá para todo el TypeScript.
--
-- COALESCE a false: ante NULL (encadenamiento roto a materias en un LEFT
-- JOIN) la materia NO se da por tutorial y la fila bloquea — fallar en la
-- dirección segura.
CREATE OR REPLACE FUNCTION public.es_materia_tutorial(p_nivel TEXT, p_nombre TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_nivel = 'demo', false)
      OR COALESCE(p_nombre ILIKE '%tutor%', false);
$$;

-- ── CANDADOS: candado_corregir_plan(alumno) ─────────────────────────────────
-- Devuelve NULL si los seis candados están en cero, o el código del PRIMER
-- candado que bloquea. Es la única fuente de verdad: la lee el GET de la ficha
-- (para decidir si pintar el botón) y la re-ejecuta corregir_plan_estudio()
-- dentro de su transacción (para no confiar en que la UI escondió el botón).
CREATE OR REPLACE FUNCTION public.candado_corregir_plan(p_alumno UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meses INTEGER;
  v_inscripcion BOOLEAN;
BEGIN
  SELECT meses_desbloqueados, inscripcion_pagada
    INTO v_meses, v_inscripcion
    FROM public.alumnos WHERE id = p_alumno;
  IF NOT FOUND THEN
    RETURN 'no_existe';
  END IF;

  -- ① pagos registrados o inscripción marcada como pagada
  IF COALESCE(v_inscripcion, false)
     OR EXISTS (SELECT 1 FROM public.pagos WHERE alumno_id = p_alumno) THEN
    RETURN 'pagos';
  END IF;

  -- ② meses desbloqueados
  IF COALESCE(v_meses, 0) <> 0 THEN
    RETURN 'meses_desbloqueados';
  END IF;

  -- ③ calificaciones (excluyendo tutoriales)
  IF EXISTS (
    SELECT 1
      FROM public.calificaciones c
      LEFT JOIN public.materias m ON m.id = c.materia_id
     WHERE c.alumno_id = p_alumno
       AND NOT public.es_materia_tutorial(m.nivel, m.nombre)
  ) THEN
    RETURN 'calificaciones';
  END IF;

  -- ④ progreso de semanas (excluyendo tutoriales)
  IF EXISTS (
    SELECT 1
      FROM public.progreso_semanas ps
      LEFT JOIN public.semanas         s  ON s.id  = ps.semana_id
      LEFT JOIN public.meses_contenido mc ON mc.id = s.mes_id
      LEFT JOIN public.materias        m  ON m.id  = mc.materia_id
     WHERE ps.alumno_id = p_alumno
       AND NOT public.es_materia_tutorial(m.nivel, m.nombre)
  ) THEN
    RETURN 'progreso';
  END IF;

  -- ⑤ intentos de evaluación (excluyendo tutoriales). Un intento reprobado no
  -- deja calificación ni progreso: sin este candado pasaría los 4 originales.
  IF EXISTS (
    SELECT 1
      FROM public.intentos_evaluacion ie
      LEFT JOIN public.evaluaciones e ON e.id = ie.evaluacion_id
      LEFT JOIN public.materias     m ON m.id = e.materia_id
     WHERE ie.alumno_id = p_alumno
       AND NOT public.es_materia_tutorial(m.nivel, m.nombre)
  ) THEN
    RETURN 'intentos';
  END IF;

  -- ⑥ respuestas de quiz (excluyendo tutoriales)
  IF EXISTS (
    SELECT 1
      FROM public.quiz_respuestas qr
      LEFT JOIN public.quiz_semana     qs ON qs.id = qr.quiz_id
      LEFT JOIN public.semanas         s  ON s.id  = qs.semana_id
      LEFT JOIN public.meses_contenido mc ON mc.id = s.mes_id
      LEFT JOIN public.materias        m  ON m.id  = mc.materia_id
     WHERE qr.alumno_id = p_alumno
       AND NOT public.es_materia_tutorial(m.nivel, m.nombre)
  ) THEN
    RETURN 'quiz';
  END IF;

  RETURN NULL;
END;
$$;

-- ── CORRECCIÓN: corregir_plan_estudio(...) ──────────────────────────────────
-- Todo o nada, en UNA transacción: candados → borrar notas → UPDATE del plan →
-- evento de bitácora. Si un candado bloquea, devuelve {ok:false, candado} sin
-- haber escrito nada. El actor llega como parámetro (Bug 83).
CREATE OR REPLACE FUNCTION public.corregir_plan_estudio(
  p_alumno    UUID,
  p_nivel     TEXT,
  p_carrera   TEXT,
  p_modalidad TEXT,
  p_actor     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_antes   RECORD;
  v_candado TEXT;
  v_notas   INTEGER := 0;
BEGIN
  -- Candar la fila primero: los candados se evalúan sobre un alumno que nadie
  -- más está moviendo en paralelo dentro de esta transacción.
  SELECT id, matricula, nivel, carrera, modalidad
    INTO v_antes
    FROM public.alumnos
   WHERE id = p_alumno
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'candado', 'no_existe');
  END IF;

  v_candado := public.candado_corregir_plan(p_alumno);
  IF v_candado IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'candado', v_candado);
  END IF;

  -- Notas del alumno: no son candado, pero apuntan a semanas del plan viejo.
  -- Se borran aquí y el conteo queda en la bitácora.
  WITH borradas AS (
    DELETE FROM public.notas_alumno WHERE alumno_id = p_alumno RETURNING id
  )
  SELECT COUNT(*) INTO v_notas FROM borradas;

  -- La matrícula NO se toca: es corrección de captura, no alta nueva.
  UPDATE public.alumnos
     SET nivel     = p_nivel,
         carrera   = p_carrera,
         modalidad = p_modalidad
   WHERE id = p_alumno;

  INSERT INTO public.alumno_plan_eventos
    (alumno_id, tipo, nivel_antes, carrera_antes, modalidad_antes,
     nivel_despues, carrera_despues, modalidad_despues, notas_borradas, actor)
  VALUES
    (p_alumno, 'correccion_plan', v_antes.nivel, v_antes.carrera, v_antes.modalidad,
     p_nivel, p_carrera, p_modalidad, v_notas, p_actor);

  RETURN jsonb_build_object(
    'ok', true,
    'matricula', v_antes.matricula,
    'notas_borradas', v_notas,
    'antes',   jsonb_build_object('nivel', v_antes.nivel, 'carrera', v_antes.carrera, 'modalidad', v_antes.modalidad),
    'despues', jsonb_build_object('nivel', p_nivel, 'carrera', p_carrera, 'modalidad', p_modalidad)
  );
END;
$$;

-- ── EXECUTE solo para el servidor ───────────────────────────────────────────
-- SECURITY DEFINER + EXECUTE abierto sería fuga inmediata (ver el bloque de
-- REVOKE de schema.sql y Bug 77: en Supabase el EXECUTE llega DIRECTO a anon/
-- authenticated vía ALTER DEFAULT PRIVILEGES, así que hay que nombrar los tres).
REVOKE EXECUTE ON FUNCTION public.candado_corregir_plan(uuid)                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.corregir_plan_estudio(uuid, text, text, text, uuid)  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.candado_corregir_plan(uuid)                          TO service_role;
GRANT  EXECUTE ON FUNCTION public.corregir_plan_estudio(uuid, text, text, text, uuid)  TO service_role;

NOTIFY pgrst, 'reload schema';
