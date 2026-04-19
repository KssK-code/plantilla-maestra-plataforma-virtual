-- =============================================================================
-- IVS Virtual — Evaluaciones finales + quiz semanal (preparatoria / secundaria)
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- 1) Por cada materia activa con nivel preparatoria o secundaria SIN evaluación
--    previa: crea 1 evaluación activa y 10 preguntas de opción múltiple.
-- 2) Por cada semana de esas materias SIN filas en quiz_semana: inserta 3
--    preguntas de refuerzo (mini quiz en la app).
--
-- Requisitos: tablas evaluaciones, preguntas, quiz_semana, semanas, meses_contenido,
--             materias según supabase/schema.sql
-- =============================================================================

-- ── A) Evaluación + 10 preguntas por materia ─────────────────────────────────
DO $$
DECLARE
  mat RECORD;
  ev_id   UUID;
  i       INT;
  mn      TEXT;
  stem    TEXT;
  corr    TEXT;
BEGIN
  FOR mat IN
    SELECT id, nombre
    FROM public.materias
    WHERE nivel IN ('preparatoria', 'secundaria')
      AND (activa IS DISTINCT FROM false)
  LOOP
    IF EXISTS (SELECT 1 FROM public.evaluaciones e WHERE e.materia_id = mat.id) THEN
      CONTINUE;
    END IF;

    mn := mat.nombre;

    INSERT INTO public.evaluaciones (
      materia_id, titulo, descripcion, tiempo_limite_minutos, intentos_permitidos, activa
    )
    VALUES (
      mat.id,
      'Evaluación final — ' || mn,
      'Examen para acreditar conocimientos de ' || mn || '. Necesitas al menos 60% para acreditar.',
      60,
      3,
      true
    )
    RETURNING id INTO ev_id;

    FOR i IN 1..10 LOOP
      stem := CASE i
        WHEN 1 THEN
          'En el contexto de «' || mn || '», ¿qué describe mejor la utilidad de repasar los apuntes después de cada sesión?'
        WHEN 2 THEN
          'Al estudiar «' || mn || '», ¿cuál es una estrategia efectiva para fijar conceptos?'
        WHEN 3 THEN
          'Respecto a «' || mn || '», ¿qué indica que comprendes la idea central y no solo memorizas?'
        WHEN 4 THEN
          'En «' || mn || '», si un video y el texto del material discrepan levemente, ¿qué conviene hacer?'
        WHEN 5 THEN
          'Para preparar un examen de «' || mn || '», ¿qué práctica suele dar mejores resultados?'
        WHEN 6 THEN
          'En «' || mn || '», ¿qué papel tiene relacionar el tema con ejemplos de la vida cotidiana?'
        WHEN 7 THEN
          'Al resolver dudas en «' || mn || '», ¿cuál es el enfoque más productivo?'
        WHEN 8 THEN
          'En el estudio de «' || mn || '», ¿qué significa aprender de forma activa?'
        WHEN 9 THEN
          'Si te quedas atascado en un tema de «' || mn || '», ¿cuál es la mejor primera acción?'
        ELSE
          'Como cierre de «' || mn || '», ¿qué demuestra que estás listo para la evaluación final?'
      END;

      corr := CASE ((i + char_length(mn) - 1) % 4)
        WHEN 0 THEN 'a' WHEN 1 THEN 'b' WHEN 2 THEN 'c' ELSE 'd' END;

      INSERT INTO public.preguntas (
        evaluacion_id, pregunta,
        opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, orden
      )
      VALUES (
        ev_id,
        stem,
        'Aplicar lo visto a ejercicios o casos sencillos relacionados con el tema.',
        'Solo releer una vez sin volver a intentar recordar por tu cuenta.',
        'Copiar definiciones sin volver a explicarlas con tus propias palabras.',
        'Evitar el tema hasta el último día antes del examen.',
        corr,
        i
      );
    END LOOP;
  END LOOP;
END $$;

-- ── B) Mini quiz (quiz_semana): 3 preguntas por semana si no hay ninguna ─────
DO $$
DECLARE
  sr RECORD;
  k INT;
  resp TEXT;
BEGIN
  FOR sr IN
    SELECT s.id AS semana_id, s.numero_semana, m.nombre AS materia_nombre
    FROM public.semanas s
    INNER JOIN public.meses_contenido mc ON mc.id = s.mes_id
    INNER JOIN public.materias m ON m.id = mc.materia_id
    WHERE m.nivel IN ('preparatoria', 'secundaria')
      AND (m.activa IS DISTINCT FROM false)
  LOOP
    IF EXISTS (SELECT 1 FROM public.quiz_semana q WHERE q.semana_id = sr.semana_id) THEN
      CONTINUE;
    END IF;

    FOR k IN 1..3 LOOP
      resp := CASE (k + sr.numero_semana) % 3 WHEN 0 THEN 'a' WHEN 1 THEN 'b' ELSE 'c' END;

      INSERT INTO public.quiz_semana (
        semana_id, pregunta, opcion_a, opcion_b, opcion_c, respuesta_correcta, orden
      )
      VALUES (
        sr.semana_id,
        'Semana ' || sr.numero_semana || ' de «' || sr.materia_nombre
          || '»: tras ver el contenido, ¿cuál opción refleja mejor un aprendizaje útil?',
        'Relacionar lo visto con el objetivo de la semana y un ejemplo concreto.',
        'Ignorar los objetivos y solo avanzar de semana sin revisar.',
        'Asumir que entendiste sin poder explicar la idea en una frase.',
        resp,
        k
      );
    END LOOP;
  END LOOP;
END $$;
