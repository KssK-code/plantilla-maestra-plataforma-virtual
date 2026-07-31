-- B8.2 — La emisión de constancias es MANUAL, del admin, y con su firma.
--
-- DECISIÓN DE PRODUCTO (supersede a B4): la constancia NO se emite sola al
-- aprobar el examen. La emite el administrador, deliberadamente, desde el panel.
-- Tres razones:
--   1. El folio es permanente e irrepetible: un humano verificando los datos
--      ANTES de congelar el snapshot es feature, no fricción (lección Bug 78 —
--      un dato malo en el snapshot es un folio quemado para siempre).
--   2. Un instituto quiere emitir sus diplomas a conciencia, no por gatillo.
--   3. El invariante que importa se conserva ÍNTEGRO aquí dentro: jamás se
--      emite sin aprobación (guard de abajo).
--
-- TRES CAMBIOS EN LA FUNCIÓN, misma firma (CREATE OR REPLACE — el replay de la
-- cadena sigue limpio, no hay DROP):
--
-- (1) GUARD DE PERMISO: es_admin(). La función pasa a ser invocable con la
--     SESIÓN del administrador (GRANT a authenticated, abajo), y el guard es lo
--     que impide que cualquier alumno autenticado la llame por PostgREST — es
--     SECURITY DEFINER y sin esto emitiría saltándose la RLS. Mismo patrón que
--     las funciones de B3.
--
--     Consecuencia DELIBERADA: una llamada con service_role (auth.uid() NULL)
--     ahora FALLA con 42501. Era exactamente el bug: el endpoint llamaba con
--     service_role y el evento quedaba con actor NULL — la trampa que B3 ya
--     documentaba. Si alguien "arregla" el endpoint de vuelta a service_role,
--     revienta a la primera en vez de degradar en silencio.
--
-- (2) GUARD DE APROBACIÓN: emitir sobre una inscripción cuyo examen no está
--     aprobado se rechaza AQUÍ, en la función — es la línea que separa
--     "diploma" de "papel". Hasta hoy ese guard vivía solo en el camino de
--     auto-emisión del código (que B8.2 elimina); el endpoint de admin emitía
--     sin comprobar nada: un diploma para alguien que jamás presentó el examen
--     estaba a un POST de distancia.
--
-- (3) LA CALIFICACIÓN DEL SNAPSHOT SE CALCULA AQUÍ, no se confía del caller.
--     `p_calificacion` se conserva en la firma por compatibilidad pero SE
--     IGNORA: el snapshot congela el mejor porcentaje REAL del alumno, que la
--     función acaba de verificar contra el umbral. Bug 78: lo que se congela se
--     valida antes — y la mejor validación es no aceptar el dato de fuera.
--
-- IDEMPOTENTE Y RE-EJECUTABLE.

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
  v_mejor     NUMERIC;
  v_minima    NUMERIC;
  v_folio     TEXT;
  v_id        UUID;
  v_emitido   TIMESTAMPTZ;
BEGIN
  -- (1) Permiso primero: nadie sin rol admin toca nada de lo que sigue.
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede emitir constancias.'
      USING ERRCODE = '42501';
  END IF;

  -- Idempotencia: si ya existe, se devuelve la existente. No quema folio.
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

  -- (2) y (3): el mejor resultado REAL contra el umbral REAL del curso.
  SELECT MAX(r.porcentaje) INTO v_mejor
    FROM public.curso_examen_resultados r
   WHERE r.curso_id = v_curso AND r.alumno_id = v_alumno;

  SELECT COALESCE(NULLIF(c.calificacion_minima, 0), 70) INTO v_minima
    FROM public.cursos c WHERE c.id = v_curso;

  IF v_mejor IS NULL THEN
    RAISE EXCEPTION 'El alumno no ha presentado el examen final: no hay nada que certificar.'
      USING ERRCODE = '22023';
  END IF;
  IF v_mejor < v_minima THEN
    RAISE EXCEPTION 'El alumno no ha aprobado el examen (mejor resultado: %, mínimo: %). No se emite constancia sin aprobación.',
      v_mejor, v_minima
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.email, 'Alumno')
    INTO v_nombre FROM public.usuarios u WHERE u.id = v_alumno;

  SELECT c.nombre, c.horas INTO v_curso_nom, v_horas
    FROM public.cursos c WHERE c.id = v_curso;

  v_folio := public.generar_folio_constancia(p_prefijo);

  BEGIN
    INSERT INTO public.curso_constancias
      (inscripcion_id, folio, horas, alumno_nombre, curso_nombre, calificacion)
    VALUES (p_inscripcion_id, v_folio, v_horas, v_nombre, v_curso_nom, v_mejor)
    RETURNING curso_constancias.id, curso_constancias.emitido_en INTO v_id, v_emitido;
  EXCEPTION WHEN unique_violation THEN
    -- Carrera: dos admins emitieron a la vez. Se devuelve la que ganó; el folio
    -- recién sacado de la secuencia se pierde (hueco), que es infinitamente
    -- preferible a dos diplomas para la misma inscripción.
    SELECT c.id, c.folio, c.emitido_en INTO v_existente
      FROM public.curso_constancias c WHERE c.inscripcion_id = p_inscripcion_id;
    RETURN QUERY SELECT v_existente.id, v_existente.folio, v_existente.emitido_en, TRUE;
    RETURN;
  END;

  -- Con la llamada por sesión, auth.uid() es el admin que emitió — el evento
  -- más consecuente de la bitácora por fin dice quién lo hizo.
  INSERT INTO public.curso_inscripcion_eventos
    (inscripcion_id, tipo, detalle, actor)
  VALUES (
    p_inscripcion_id, 'constancia_emitida',
    jsonb_build_object('folio', v_folio, 'calificacion', v_mejor),
    auth.uid()
  );

  RETURN QUERY SELECT v_id, v_folio, v_emitido, FALSE;
END;
$$;

-- ── GRANTS (Bug 77: explícitos y verificados, aunque la firma no cambió) ─────
-- `authenticated` ENTRA: es lo que permite llamar con la sesión del admin. El
-- guard es_admin() de adentro es quien decide — un alumno autenticado que la
-- invoque por PostgREST recibe 42501 antes de que pase nada.
REVOKE ALL ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_emitir_constancia(UUID, TEXT, NUMERIC) TO service_role';
  END IF;
END
$$;
