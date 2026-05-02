-- =============================================================
-- SEED: Crear filas en public.evaluaciones (1 por materia)
-- =============================================================
--
-- PROPÓSITO:
-- seed-evaluaciones-y-quiz.sql asume que cada materia tiene una
-- fila en public.evaluaciones (busca e.id por materia_id). Si no
-- existe, las preguntas no se asocian a ninguna evaluación.
--
-- Este seed crea 1 evaluación tipo "examen final" por cada materia
-- activa. Idempotente: si una evaluación ya existe para la materia,
-- el INSERT se salta gracias al guard previo.
--
-- ORDEN DE EJECUCIÓN:
--   ANTES de seed-evaluaciones-y-quiz.sql
--   DESPUÉS de seed-materias-ejemplo.sql / seed-contenido-*
--
-- Cierra Bug 21.
-- =============================================================

BEGIN;

DO $$
DECLARE
  v_materia    RECORD;
  v_creadas    INT := 0;
  v_existentes INT := 0;
BEGIN
  FOR v_materia IN
    SELECT id, nombre, nivel
    FROM public.materias
    WHERE activa = true
    ORDER BY nivel, nombre
  LOOP
    -- Saltar si la materia ya tiene al menos 1 evaluación
    IF EXISTS (
      SELECT 1 FROM public.evaluaciones e
      WHERE e.materia_id = v_materia.id
    ) THEN
      v_existentes := v_existentes + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.evaluaciones (
      materia_id,
      titulo,
      descripcion,
      tiempo_limite_minutos,
      intentos_permitidos,
      activa
    ) VALUES (
      v_materia.id,
      'Examen Final — ' || v_materia.nombre,
      'Examen final de la materia ' || v_materia.nombre ||
        '. Tienes 60 minutos y 3 intentos para aprobar.',
      60,
      3,
      true
    );

    v_creadas := v_creadas + 1;
  END LOOP;

  RAISE NOTICE 'Evaluaciones creadas: %  | Ya existían: %', v_creadas, v_existentes;
END $$;

COMMIT;

-- =============================================================
-- VERIFICACIÓN POST-EJECUCIÓN (opcional)
-- =============================================================
-- SELECT m.nombre, m.nivel, COUNT(e.id) AS evaluaciones
-- FROM public.materias m
-- LEFT JOIN public.evaluaciones e ON e.materia_id = m.id
-- WHERE m.activa = true
-- GROUP BY m.nombre, m.nivel
-- HAVING COUNT(e.id) = 0;
--
-- Resultado esperado: 0 filas (todas las materias activas tienen evaluación)
-- =============================================================
