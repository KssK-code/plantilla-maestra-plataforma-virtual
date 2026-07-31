-- ============================================================================
-- B4 — DIPLOMA POR CURSO + EVENTOS DE AUDITORÍA (línea Solo-Cursos)
-- ============================================================================
-- En un diplomado el diploma ES el producto. Todo lo anterior — el gate, Abrir
-- Mes, el examen sanitizado — existe para que este documento valga algo.
--
-- Lo que esta migración mata: el folio de la constancia se generaba con
-- Math.random() EN EL NAVEGADOR y no se persistía. Cambiaba en cada recarga, dos
-- alumnos podían colisionar, y el propio documento decía "para verificar su
-- autenticidad contacte a administración" cuando administración no tenía contra
-- qué verificar.
--
-- IDEMPOTENTE Y RE-EJECUTABLE. No reescribe la migración de B3.
-- ============================================================================

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.curso_constancias') IS NULL THEN
    RAISE EXCEPTION 'Falta public.curso_constancias. Corre antes B1.';
  END IF;
  IF to_regproc('public.curso_abrir_mes') IS NULL THEN
    RAISE EXCEPTION 'Falta public.curso_abrir_mes(). Corre antes B3.';
  END IF;
END
$preflight$;


-- ════════════════════════════════════════════════════════════════════════════
-- T0 — La constancia deja de evaporarse: CASCADE → RESTRICT
-- ════════════════════════════════════════════════════════════════════════════
-- El registro de folios es el LIBRO CONTABLE DE DIPLOMAS de la institución. Con
-- CASCADE, un clic en "Quitar alumno" borraba la constancia emitida junto con su
-- folio consecutivo — justo el folio que B1 creó para que administración pudiera
-- verificar un diploma impreso que el egresado tiene en la mano.
--
-- Asimetría que había quedado: pagos.curso_inscripcion_id es ON DELETE SET NULL
-- (el dinero sobrevive) mientras la constancia se iba con CASCADE. Se protegía
-- el dinero y se dejaba desprotegido el documento.
--
-- A partir de aquí: una inscripción CON diploma emitido no se borra, se CANCELA
-- (estado = 'cancelada'). Sin constancia, se borra igual que siempre.
--
-- También se aplica en la migración de B1 para que un cliente nuevo nazca ya con
-- RESTRICT; esto de aquí es para los árboles donde B1 ya corrió (el CREATE TABLE
-- IF NOT EXISTS de allá no lo cambiaría).
ALTER TABLE public.curso_constancias
  DROP CONSTRAINT IF EXISTS curso_constancias_inscripcion_id_fkey;
ALTER TABLE public.curso_constancias
  ADD CONSTRAINT curso_constancias_inscripcion_id_fkey
  FOREIGN KEY (inscripcion_id) REFERENCES public.curso_inscripciones(id)
  ON DELETE RESTRICT;

-- UNA constancia por inscripción. Es lo que hace la emisión IDEMPOTENTE: un
-- reintento del examen, o dos envíos aprobatorios simultáneos, no pueden crear
-- dos diplomas ni quemar dos folios de la secuencia.
ALTER TABLE public.curso_constancias
  DROP CONSTRAINT IF EXISTS curso_constancias_inscripcion_unica;
ALTER TABLE public.curso_constancias
  ADD CONSTRAINT curso_constancias_inscripcion_unica UNIQUE (inscripcion_id);


-- ════════════════════════════════════════════════════════════════════════════
-- Umbral de aprobación — no existía
-- ════════════════════════════════════════════════════════════════════════════
-- El examen calculaba el porcentaje y lo mostraba, pero NUNCA dictaminaba
-- aprobado/no aprobado (la auditoría lo marcó como PARCIAL). Sin umbral no hay
-- criterio de emisión, así que el diploma no podría existir.
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS calificacion_minima NUMERIC(5,2) NOT NULL DEFAULT 70;

ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_calificacion_minima_check;
ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_calificacion_minima_check
  CHECK (calificacion_minima > 0 AND calificacion_minima <= 100);

COMMENT ON COLUMN public.cursos.calificacion_minima IS
  'Porcentaje mínimo del examen final para aprobar y emitir constancia. '
  'Default 70. Es la CONDICIÓN de emisión del diploma: el avance de lecciones '
  'es informativo, aprobar el examen es lo que certifica.';


-- ════════════════════════════════════════════════════════════════════════════
-- T1 — Bitácora de la inscripción
-- ════════════════════════════════════════════════════════════════════════════
-- Nace de un hueco de B3: abrir un mes CON pago deja rastro en `pagos`, pero
-- abrirlo sin pago (beca, cortesía, corrección) no dejaba ninguno — y
-- pagos.monto tiene CHECK > 0, así que no cabía un registro de importe cero.
--
-- CASCADE aquí SÍ es correcto, al revés que en curso_constancias: si una
-- inscripción sin diploma se borra, su bitácora se va con ella. La constancia es
-- la que ancla con RESTRICT, y mientras exista, la inscripción no se puede
-- borrar — así que la bitácora de una inscripción con diploma tampoco se pierde.
CREATE TABLE IF NOT EXISTS public.curso_inscripcion_eventos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_id  UUID        NOT NULL REFERENCES public.curso_inscripciones(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL,
  meses_antes     INTEGER,
  meses_despues   INTEGER,
  detalle         JSONB,
  actor           UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.curso_inscripcion_eventos
  DROP CONSTRAINT IF EXISTS curso_inscripcion_eventos_tipo_check;
ALTER TABLE public.curso_inscripcion_eventos
  ADD CONSTRAINT curso_inscripcion_eventos_tipo_check
  CHECK (tipo IN ('abrir_mes', 'cerrar_mes', 'cambio_estado', 'constancia_emitida'));

CREATE INDEX IF NOT EXISTS idx_curso_eventos_inscripcion
  ON public.curso_inscripcion_eventos (inscripcion_id, created_at DESC);

-- RLS: SOLO ADMIN LEE. El alumno no ve esta tabla — es la bitácora
-- administrativa, no su expediente. Nadie escribe directo: los INSERT ocurren
-- dentro de las funciones SECURITY DEFINER, que se saltan la RLS por diseño.
ALTER TABLE public.curso_inscripcion_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curso_inscripcion_eventos: solo admin lee" ON public.curso_inscripcion_eventos;
CREATE POLICY "curso_inscripcion_eventos: solo admin lee" ON public.curso_inscripcion_eventos
  FOR SELECT TO authenticated
  USING (public.es_admin());

DO $g$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    -- Solo SELECT: no hay política de INSERT/UPDATE/DELETE, así que ni el admin
    -- puede fabricar eventos a mano por PostgREST. La bitácora la escribe el
    -- servidor o nadie.
    EXECUTE 'GRANT SELECT ON public.curso_inscripcion_eventos TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.curso_inscripcion_eventos TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.curso_inscripcion_eventos FROM anon';
  END IF;
END
$g$;


-- ════════════════════════════════════════════════════════════════════════════
-- T1 — Las funciones de mes ahora dejan rastro
-- ════════════════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE sobre las de B3, sin reescribir aquella migración. El INSERT
-- del evento va DENTRO de la función a propósito: si lo hicieran las rutas,
-- cualquier camino futuro (un script, otra ruta, una llamada por RPC) movería el
-- contador sin dejar rastro. Aquí no hay forma de mover meses sin registrarlo.
CREATE OR REPLACE FUNCTION public.curso_abrir_mes(
  p_inscripcion_id  UUID,
  p_meses_esperados INTEGER DEFAULT NULL
)
RETURNS TABLE (meses_desbloqueados INTEGER, tope INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curso   UUID;
  v_actual  INTEGER;
  v_estado  TEXT;
  v_tope    INTEGER;
  v_nuevo   INTEGER;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede abrir meses.' USING ERRCODE = '42501';
  END IF;

  SELECT ci.curso_id, ci.meses_desbloqueados, ci.estado
    INTO v_curso, v_actual, v_estado
    FROM public.curso_inscripciones ci
   WHERE ci.id = p_inscripcion_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF v_estado <> 'activa' THEN
    RAISE EXCEPTION
      'No se pueden abrir meses en una inscripción %. Reactívala primero (estado = activa).',
      v_estado USING ERRCODE = '22023';
  END IF;

  IF p_meses_esperados IS NOT NULL AND p_meses_esperados <> v_actual THEN
    RAISE EXCEPTION
      'La inscripción ya tiene % meses abiertos (esperabas %). Recarga la pantalla: alguien más la movió o el botón se pulsó dos veces.',
      v_actual, p_meses_esperados USING ERRCODE = '40001';
  END IF;

  v_tope := public.curso_tope_meses(v_curso);

  IF v_actual >= v_tope THEN
    RAISE EXCEPTION
      'Este curso llega hasta % meses y la inscripción ya los tiene todos abiertos. No hay más contenido que liberar.',
      v_tope USING ERRCODE = '22023';
  END IF;

  v_nuevo := v_actual + 1;

  UPDATE public.curso_inscripciones ci
     SET meses_desbloqueados = v_nuevo
   WHERE ci.id = p_inscripcion_id;

  INSERT INTO public.curso_inscripcion_eventos
    (inscripcion_id, tipo, meses_antes, meses_despues, actor)
  VALUES (p_inscripcion_id, 'abrir_mes', v_actual, v_nuevo, auth.uid());

  RETURN QUERY SELECT v_nuevo, v_tope;
END;
$$;

CREATE OR REPLACE FUNCTION public.curso_cerrar_mes(
  p_inscripcion_id  UUID,
  p_meses_esperados INTEGER DEFAULT NULL
)
RETURNS TABLE (meses_desbloqueados INTEGER, tope INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curso  UUID;
  v_actual INTEGER;
  v_nuevo  INTEGER;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cerrar meses.' USING ERRCODE = '42501';
  END IF;

  SELECT ci.curso_id, ci.meses_desbloqueados
    INTO v_curso, v_actual
    FROM public.curso_inscripciones ci
   WHERE ci.id = p_inscripcion_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF p_meses_esperados IS NOT NULL AND p_meses_esperados <> v_actual THEN
    RAISE EXCEPTION
      'La inscripción ya tiene % meses abiertos (esperabas %). Recarga la pantalla.',
      v_actual, p_meses_esperados USING ERRCODE = '40001';
  END IF;

  IF v_actual <= 0 THEN
    RAISE EXCEPTION 'La inscripción no tiene meses abiertos: no hay nada que cerrar.'
      USING ERRCODE = '22023';
  END IF;

  v_nuevo := v_actual - 1;

  UPDATE public.curso_inscripciones ci
     SET meses_desbloqueados = v_nuevo
   WHERE ci.id = p_inscripcion_id;

  INSERT INTO public.curso_inscripcion_eventos
    (inscripcion_id, tipo, meses_antes, meses_despues, actor)
  VALUES (p_inscripcion_id, 'cerrar_mes', v_actual, v_nuevo, auth.uid());

  RETURN QUERY SELECT v_nuevo, public.curso_tope_meses(v_curso);
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- T1 — Cambio de estado con rastro
-- ════════════════════════════════════════════════════════════════════════════
-- Es la protección de la decisión sobre reinscripción: cancelar NO resetea
-- meses_desbloqueados y reactivar los recupera — deliberado, porque esos meses
-- ya se pagaron y resetear cobraría dos veces. Lo que protege ese
-- comportamiento no es un candado, es el RASTRO: quién reactivó y cuándo, más el
-- hecho de que solo un admin puede hacerlo.
CREATE OR REPLACE FUNCTION public.curso_cambiar_estado(
  p_inscripcion_id UUID,
  p_estado         TEXT,
  p_motivo         TEXT DEFAULT NULL
)
RETURNS TABLE (estado TEXT, meses_desbloqueados INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antes TEXT;
  v_meses INTEGER;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de una inscripción.'
      USING ERRCODE = '42501';
  END IF;

  IF p_estado NOT IN ('activa', 'suspendida', 'completada', 'cancelada') THEN
    RAISE EXCEPTION 'Estado inválido: %. Usa activa, suspendida, completada o cancelada.', p_estado
      USING ERRCODE = '22023';
  END IF;

  SELECT ci.estado, ci.meses_desbloqueados INTO v_antes, v_meses
    FROM public.curso_inscripciones ci WHERE ci.id = p_inscripcion_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF v_antes = p_estado THEN
    RETURN QUERY SELECT v_antes, v_meses;  -- sin cambio, sin evento
    RETURN;
  END IF;

  UPDATE public.curso_inscripciones ci SET estado = p_estado WHERE ci.id = p_inscripcion_id;

  INSERT INTO public.curso_inscripcion_eventos
    (inscripcion_id, tipo, meses_antes, meses_despues, detalle, actor)
  VALUES (
    p_inscripcion_id, 'cambio_estado', v_meses, v_meses,
    jsonb_build_object('de', v_antes, 'a', p_estado, 'motivo', p_motivo),
    auth.uid()
  );

  RETURN QUERY SELECT p_estado, v_meses;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- T2 — Emisión de la constancia
-- ════════════════════════════════════════════════════════════════════════════
-- IDEMPOTENTE por construcción: si ya hay constancia para esa inscripción, la
-- devuelve tal cual y NO quema folio. Dos envíos aprobatorios simultáneos chocan
-- contra el UNIQUE y el bloque EXCEPTION devuelve la que ganó — sin 500 y sin
-- diploma duplicado.
--
-- ⚠️ NO comprueba es_admin(): la llama el flujo de calificación, donde quien
-- está en sesión es EL ALUMNO que acaba de aprobar. El acceso se cierra por
-- GRANT — solo service_role puede ejecutarla, o sea solo el servidor.
CREATE OR REPLACE FUNCTION public.curso_emitir_constancia(
  p_inscripcion_id UUID,
  p_prefijo        TEXT,
  p_calificacion   NUMERIC DEFAULT NULL
)
RETURNS TABLE (id UUID, folio TEXT, emitido_en TIMESTAMPTZ, ya_existia BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existente RECORD;
  v_alumno    UUID;
  v_curso     UUID;
  v_nombre    TEXT;
  v_curso_nom TEXT;
  v_horas     INTEGER;
  v_folio     TEXT;
  v_id        UUID;
  v_emitido   TIMESTAMPTZ;
BEGIN
  SELECT c.id, c.folio, c.emitido_en INTO v_existente
    FROM public.curso_constancias c WHERE c.inscripcion_id = p_inscripcion_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_existente.id, v_existente.folio, v_existente.emitido_en, TRUE;
    RETURN;
  END IF;

  SELECT ci.alumno_id, ci.curso_id INTO v_alumno, v_curso
    FROM public.curso_inscripciones ci WHERE ci.id = p_inscripcion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.email, 'Alumno')
    INTO v_nombre FROM public.usuarios u WHERE u.id = v_alumno;

  SELECT c.nombre, c.horas INTO v_curso_nom, v_horas
    FROM public.cursos c WHERE c.id = v_curso;

  v_folio := public.generar_folio_constancia(p_prefijo);

  BEGIN
    INSERT INTO public.curso_constancias
      (inscripcion_id, folio, horas, alumno_nombre, curso_nombre, calificacion)
    VALUES (p_inscripcion_id, v_folio, v_horas, v_nombre, v_curso_nom, p_calificacion)
    RETURNING curso_constancias.id, curso_constancias.emitido_en INTO v_id, v_emitido;
  EXCEPTION WHEN unique_violation THEN
    -- Carrera: otro envío aprobatorio la emitió entre el SELECT y el INSERT.
    -- Se devuelve la suya. El folio que acabamos de sacar de la secuencia se
    -- pierde (hueco en la numeración), que es infinitamente preferible a dos
    -- diplomas para la misma inscripción.
    SELECT c.id, c.folio, c.emitido_en INTO v_existente
      FROM public.curso_constancias c WHERE c.inscripcion_id = p_inscripcion_id;
    RETURN QUERY SELECT v_existente.id, v_existente.folio, v_existente.emitido_en, TRUE;
    RETURN;
  END;

  INSERT INTO public.curso_inscripcion_eventos
    (inscripcion_id, tipo, detalle, actor)
  VALUES (
    p_inscripcion_id, 'constancia_emitida',
    jsonb_build_object('folio', v_folio, 'calificacion', p_calificacion),
    auth.uid()
  );

  RETURN QUERY SELECT v_id, v_folio, v_emitido, FALSE;
END;
$$;

-- Solo el servidor emite diplomas.
REVOKE ALL ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) FROM PUBLIC;

DO $g2$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_cambiar_estado(UUID, TEXT, TEXT) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_cambiar_estado(UUID, TEXT, TEXT) TO service_role';
  END IF;
END
$g2$;

COMMIT;
