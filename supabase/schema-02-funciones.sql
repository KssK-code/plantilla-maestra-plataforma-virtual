-- ============================================================
--  CEEVA — PARTE 2: FUNCIONES Y TRIGGERS
--  Ejecutar después de schema-01-tablas.sql
-- ============================================================

-- ── FUNCIÓN: GENERAR MATRÍCULA ───────────────────────────────
CREATE OR REPLACE FUNCTION public.generar_matricula()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  anio     TEXT := TO_CHAR(NOW(), 'YYYY');
  contador INTEGER;
  nueva    TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO contador FROM public.alumnos;
  nueva := 'CEEVA-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  -- evitar colisiones en caso de concurrencia
  WHILE EXISTS (SELECT 1 FROM public.alumnos WHERE matricula = nueva) LOOP
    contador := contador + 1;
    nueva := 'CEEVA-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  END LOOP;
  RETURN nueva;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_asignar_matricula()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.matricula IS NULL OR NEW.matricula = '' THEN
    NEW.matricula := public.generar_matricula();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_matricula ON public.alumnos;
CREATE TRIGGER trg_asignar_matricula
  BEFORE INSERT ON public.alumnos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_asignar_matricula();


-- ── FUNCIÓN: ACTUALIZAR RACHA ────────────────────────────────
CREATE OR REPLACE FUNCTION public.actualizar_racha()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  hoy        DATE := CURRENT_DATE;
  ult_act    DATE;
  racha_cur  INTEGER;
  racha_max  INTEGER;
BEGIN
  -- Solo actuar cuando se completa una semana
  IF NEW.completada = true AND (OLD.completada IS DISTINCT FROM true) THEN

    SELECT ultima_actividad, racha_actual, racha_maxima
      INTO ult_act, racha_cur, racha_max
      FROM public.racha_actividad
     WHERE alumno_id = NEW.alumno_id;

    IF NOT FOUND THEN
      -- Primera actividad
      INSERT INTO public.racha_actividad (alumno_id, racha_actual, racha_maxima, ultima_actividad)
        VALUES (NEW.alumno_id, 1, 1, hoy);
    ELSE
      IF ult_act = hoy THEN
        -- Mismo día, no sumar
        NULL;
      ELSIF ult_act = hoy - INTERVAL '1 day' THEN
        -- Día consecutivo
        racha_cur := racha_cur + 1;
        racha_max := GREATEST(racha_max, racha_cur);
        UPDATE public.racha_actividad
           SET racha_actual = racha_cur,
               racha_maxima = racha_max,
               ultima_actividad = hoy,
               updated_at = NOW()
         WHERE alumno_id = NEW.alumno_id;
      ELSE
        -- Racha rota
        UPDATE public.racha_actividad
           SET racha_actual = 1,
               ultima_actividad = hoy,
               updated_at = NOW()
         WHERE alumno_id = NEW.alumno_id;
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_racha ON public.progreso_semanas;
CREATE TRIGGER trg_actualizar_racha
  AFTER INSERT OR UPDATE ON public.progreso_semanas
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_racha();


-- ── FUNCIÓN: CREAR PERFIL AL REGISTRARSE ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'alumno')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
