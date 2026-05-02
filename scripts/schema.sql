-- ============================================================================
-- SCHEMA CANÓNICO PLANTILLA MAESTRA MEV - PLATAFORMA VIRTUAL
-- ============================================================================
-- Generado a partir de IVS Virtual (schema base más maduro de la plantilla)
-- 
-- USO:
--   1. Crear proyecto Supabase nuevo
--   2. Ir a SQL Editor
--   3. Pegar este archivo completo
--   4. Ejecutar (tarda ~10-30 segundos)
--   5. Después ejecutar scripts/setup.sql para datos seed
--
-- ESTE ARCHIVO ES IDEMPOTENTE: puede re-ejecutarse sin romper.
-- 
-- Tablas creadas: 18
-- Constraints: 72
-- Políticas RLS: 46
-- Triggers: 2
-- ============================================================================

--
--

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;

--
-- Name: actualizar_racha(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_racha() RETURNS trigger
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
        -- Misma d├¡a, no sumar
        NULL;
      ELSIF ult_act = hoy - INTERVAL '1 day' THEN
        -- D├¡a consecutivo
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

--
-- Name: es_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
     WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

--
-- Name: generar_matricula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_matricula() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  anio     TEXT := TO_CHAR(NOW(), 'YYYY');
  contador INTEGER;
  nueva    TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO contador FROM public.alumnos;
  nueva := 'IVS-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  -- evitar colisiones en caso de concurrencia
  WHILE EXISTS (SELECT 1 FROM public.alumnos WHERE matricula = nueva) LOOP
    contador := contador + 1;
    nueva := 'IVS-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  END LOOP;
  RETURN nueva;
END;
$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

--
-- Name: trigger_asignar_matricula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_asignar_matricula() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.matricula IS NULL OR NEW.matricula = '' THEN
    NEW.matricula := public.generar_matricula();
  END IF;
  RETURN NEW;
END;
$$;

--
-- Name: alumnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumnos (
    id uuid NOT NULL,
    matricula text,
    nivel text,
    modalidad text,
    es_sindicalizado boolean DEFAULT false NOT NULL,
    sindicato text,
    inscripcion_pagada boolean DEFAULT false NOT NULL,
    meses_desbloqueados integer DEFAULT 0 NOT NULL,
    duracion_meses integer GENERATED ALWAYS AS (
CASE modalidad
    WHEN '3_meses'::text THEN 3
    ELSE 6
END) STORED,
    fecha_inscripcion timestamp with time zone,
    fecha_inicio timestamp with time zone,
    activo boolean DEFAULT true NOT NULL,
    notas_admin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contactado_whatsapp boolean DEFAULT false NOT NULL,
    CONSTRAINT alumnos_modalidad_check CHECK ((modalidad = ANY (ARRAY['6_meses'::text, '3_meses'::text]))),
    CONSTRAINT alumnos_nivel_check CHECK ((nivel = ANY (ARRAY['secundaria'::text, 'preparatoria'::text])))
);

--
-- Name: calificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calificaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    materia_id uuid NOT NULL,
    evaluacion_id uuid,
    acreditado boolean DEFAULT false NOT NULL,
    fecha_acreditacion timestamp with time zone,
    folio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: constancias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constancias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    folio text NOT NULL,
    fecha_emision timestamp with time zone DEFAULT now() NOT NULL,
    url_pdf text,
    materia_id uuid
);

--
-- Name: documentos_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_alumno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    tipo_documento text NOT NULL,
    nombre_archivo text,
    url_archivo text,
    verificado boolean DEFAULT false NOT NULL,
    fecha_subida timestamp with time zone DEFAULT now() NOT NULL,
    verificado_por uuid,
    fecha_verificacion timestamp with time zone,
    notas text
);

--
-- Name: evaluaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    materia_id uuid,
    mes_id uuid,
    titulo text NOT NULL,
    descripcion text,
    tiempo_limite_minutos integer DEFAULT 60 NOT NULL,
    intentos_permitidos integer DEFAULT 3 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: glosario_materia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glosario_materia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    materia_id uuid NOT NULL,
    termino text NOT NULL,
    definicion text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: intentos_evaluacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intentos_evaluacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    evaluacion_id uuid NOT NULL,
    numero_intento integer DEFAULT 1 NOT NULL,
    puntaje integer,
    acreditado boolean DEFAULT false NOT NULL,
    fecha_intento timestamp with time zone DEFAULT now() NOT NULL,
    respuestas jsonb
);

--
-- Name: logros_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logros_alumno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    tipo_logro text NOT NULL,
    fecha_obtenido timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: materias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    nivel text,
    orden integer,
    icono text,
    color text,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT materias_nivel_check CHECK ((nivel = ANY (ARRAY['secundaria'::text, 'preparatoria'::text, 'demo'::text])))
);

--
-- Name: meses_contenido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meses_contenido (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    materia_id uuid,
    numero_mes integer NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notas_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_alumno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    semana_id uuid NOT NULL,
    contenido text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: preguntas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preguntas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluacion_id uuid NOT NULL,
    pregunta text NOT NULL,
    opcion_a text NOT NULL,
    opcion_b text NOT NULL,
    opcion_c text NOT NULL,
    opcion_d text NOT NULL,
    respuesta_correcta text NOT NULL,
    orden integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preguntas_respuesta_correcta_check CHECK ((respuesta_correcta = ANY (ARRAY['a'::text, 'b'::text, 'c'::text, 'd'::text])))
);

--
-- Name: progreso_semanas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progreso_semanas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    semana_id uuid NOT NULL,
    completada boolean DEFAULT false NOT NULL,
    fecha_completada timestamp with time zone,
    tiempo_visto_minutos integer DEFAULT 0 NOT NULL
);

--
-- Name: quiz_respuestas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_respuestas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    quiz_id uuid NOT NULL,
    respuesta text,
    correcta boolean,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: quiz_semana; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_semana (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    semana_id uuid NOT NULL,
    pregunta text NOT NULL,
    opcion_a text NOT NULL,
    opcion_b text NOT NULL,
    opcion_c text NOT NULL,
    opcion_d text,
    respuesta_correcta text NOT NULL,
    orden integer,
    explicacion text,
    CONSTRAINT quiz_semana_respuesta_correcta_check CHECK ((respuesta_correcta = ANY (ARRAY['a'::text, 'b'::text, 'c'::text, 'd'::text])))
);

--
-- Name: racha_actividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.racha_actividad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alumno_id uuid NOT NULL,
    racha_actual integer DEFAULT 0 NOT NULL,
    racha_maxima integer DEFAULT 0 NOT NULL,
    ultima_actividad date,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: semanas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semanas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mes_id uuid,
    numero_semana integer NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    video_url text,
    tiempo_estimado_minutos integer DEFAULT 60 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contenido text,
    video_url_2 text,
    video_url_3 text
);

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    email text NOT NULL,
    nombre text,
    apellidos text,
    telefono text,
    foto_url text,
    rol text DEFAULT 'alumno'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usuarios_rol_check CHECK ((rol = ANY (ARRAY['alumno'::text, 'admin'::text])))
);

--
-- Name: alumnos alumnos_matricula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_matricula_key UNIQUE (matricula);

--
-- Name: alumnos alumnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_pkey PRIMARY KEY (id);

--
-- Name: calificaciones calificaciones_alumno_id_materia_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_alumno_id_materia_id_key UNIQUE (alumno_id, materia_id);

--
-- Name: calificaciones calificaciones_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_folio_key UNIQUE (folio);

--
-- Name: calificaciones calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id);

--
-- Name: constancias constancias_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias
    ADD CONSTRAINT constancias_folio_key UNIQUE (folio);

--
-- Name: constancias constancias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias
    ADD CONSTRAINT constancias_pkey PRIMARY KEY (id);

--
-- Name: documentos_alumno documentos_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_alumno
    ADD CONSTRAINT documentos_alumno_pkey PRIMARY KEY (id);

--
-- Name: evaluaciones evaluaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_pkey PRIMARY KEY (id);

--
-- Name: glosario_materia glosario_materia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glosario_materia
    ADD CONSTRAINT glosario_materia_pkey PRIMARY KEY (id);

--
-- Name: intentos_evaluacion intentos_evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_pkey PRIMARY KEY (id);

--
-- Name: logros_alumno logros_alumno_alumno_id_tipo_logro_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logros_alumno
    ADD CONSTRAINT logros_alumno_alumno_id_tipo_logro_key UNIQUE (alumno_id, tipo_logro);

--
-- Name: logros_alumno logros_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logros_alumno
    ADD CONSTRAINT logros_alumno_pkey PRIMARY KEY (id);

--
-- Name: materias materias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materias
    ADD CONSTRAINT materias_pkey PRIMARY KEY (id);

--
-- Name: meses_contenido meses_contenido_materia_id_numero_mes_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meses_contenido
    ADD CONSTRAINT meses_contenido_materia_id_numero_mes_key UNIQUE (materia_id, numero_mes);

--
-- Name: meses_contenido meses_contenido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meses_contenido
    ADD CONSTRAINT meses_contenido_pkey PRIMARY KEY (id);

--
-- Name: notas_alumno notas_alumno_alumno_id_semana_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_alumno
    ADD CONSTRAINT notas_alumno_alumno_id_semana_id_key UNIQUE (alumno_id, semana_id);

--
-- Name: notas_alumno notas_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_alumno
    ADD CONSTRAINT notas_alumno_pkey PRIMARY KEY (id);

--
-- Name: preguntas preguntas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_pkey PRIMARY KEY (id);

--
-- Name: progreso_semanas progreso_semanas_alumno_id_semana_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progreso_semanas
    ADD CONSTRAINT progreso_semanas_alumno_id_semana_id_key UNIQUE (alumno_id, semana_id);

--
-- Name: progreso_semanas progreso_semanas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progreso_semanas
    ADD CONSTRAINT progreso_semanas_pkey PRIMARY KEY (id);

--
-- Name: quiz_respuestas quiz_respuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_respuestas
    ADD CONSTRAINT quiz_respuestas_pkey PRIMARY KEY (id);

--
-- Name: quiz_semana quiz_semana_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_semana
    ADD CONSTRAINT quiz_semana_pkey PRIMARY KEY (id);

--
-- Name: racha_actividad racha_actividad_alumno_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.racha_actividad
    ADD CONSTRAINT racha_actividad_alumno_id_key UNIQUE (alumno_id);

--
-- Name: racha_actividad racha_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.racha_actividad
    ADD CONSTRAINT racha_actividad_pkey PRIMARY KEY (id);

--
-- Name: semanas semanas_mes_id_numero_semana_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semanas
    ADD CONSTRAINT semanas_mes_id_numero_semana_key UNIQUE (mes_id, numero_semana);

--
-- Name: semanas semanas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semanas
    ADD CONSTRAINT semanas_pkey PRIMARY KEY (id);

--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

--
-- Name: idx_alumnos_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumnos_matricula ON public.alumnos USING btree (matricula);

--
-- Name: idx_alumnos_nivel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumnos_nivel ON public.alumnos USING btree (nivel);

--
-- Name: idx_calificaciones_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calificaciones_alumno ON public.calificaciones USING btree (alumno_id);

--
-- Name: idx_documentos_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_alumno ON public.documentos_alumno USING btree (alumno_id);

--
-- Name: idx_intentos_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intentos_alumno ON public.intentos_evaluacion USING btree (alumno_id);

--
-- Name: idx_intentos_evaluacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intentos_evaluacion ON public.intentos_evaluacion USING btree (evaluacion_id);

--
-- Name: idx_meses_materia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meses_materia ON public.meses_contenido USING btree (materia_id);

--
-- Name: idx_notas_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_alumno ON public.notas_alumno USING btree (alumno_id);

--
-- Name: idx_progreso_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progreso_alumno ON public.progreso_semanas USING btree (alumno_id);

--
-- Name: idx_progreso_semana; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progreso_semana ON public.progreso_semanas USING btree (semana_id);

--
-- Name: idx_quiz_semana; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_semana ON public.quiz_semana USING btree (semana_id);

--
-- Name: idx_semanas_mes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_semanas_mes ON public.semanas USING btree (mes_id);

--
-- Name: progreso_semanas trg_actualizar_racha; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_racha AFTER INSERT OR UPDATE ON public.progreso_semanas FOR EACH ROW EXECUTE FUNCTION public.actualizar_racha();

--
-- Name: alumnos trg_asignar_matricula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_asignar_matricula BEFORE INSERT ON public.alumnos FOR EACH ROW EXECUTE FUNCTION public.trigger_asignar_matricula();

--
-- Name: alumnos alumnos_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumnos
    ADD CONSTRAINT alumnos_id_fkey FOREIGN KEY (id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

--
-- Name: calificaciones calificaciones_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: calificaciones calificaciones_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE SET NULL;

--
-- Name: calificaciones calificaciones_materia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id) ON DELETE CASCADE;

--
-- Name: constancias constancias_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias
    ADD CONSTRAINT constancias_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: constancias constancias_materia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constancias
    ADD CONSTRAINT constancias_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id) ON DELETE SET NULL;

--
-- Name: documentos_alumno documentos_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_alumno
    ADD CONSTRAINT documentos_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: documentos_alumno documentos_alumno_verificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_alumno
    ADD CONSTRAINT documentos_alumno_verificado_por_fkey FOREIGN KEY (verificado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

--
-- Name: evaluaciones evaluaciones_materia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id) ON DELETE CASCADE;

--
-- Name: evaluaciones evaluaciones_mes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT evaluaciones_mes_id_fkey FOREIGN KEY (mes_id) REFERENCES public.meses_contenido(id) ON DELETE SET NULL;

--
-- Name: glosario_materia glosario_materia_materia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glosario_materia
    ADD CONSTRAINT glosario_materia_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id) ON DELETE CASCADE;

--
-- Name: intentos_evaluacion intentos_evaluacion_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: intentos_evaluacion intentos_evaluacion_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intentos_evaluacion
    ADD CONSTRAINT intentos_evaluacion_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;

--
-- Name: logros_alumno logros_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logros_alumno
    ADD CONSTRAINT logros_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: meses_contenido meses_contenido_materia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meses_contenido
    ADD CONSTRAINT meses_contenido_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id) ON DELETE CASCADE;

--
-- Name: notas_alumno notas_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_alumno
    ADD CONSTRAINT notas_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: notas_alumno notas_alumno_semana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_alumno
    ADD CONSTRAINT notas_alumno_semana_id_fkey FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE;

--
-- Name: preguntas preguntas_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES public.evaluaciones(id) ON DELETE CASCADE;

--
-- Name: progreso_semanas progreso_semanas_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progreso_semanas
    ADD CONSTRAINT progreso_semanas_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: progreso_semanas progreso_semanas_semana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progreso_semanas
    ADD CONSTRAINT progreso_semanas_semana_id_fkey FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE;

--
-- Name: quiz_respuestas quiz_respuestas_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_respuestas
    ADD CONSTRAINT quiz_respuestas_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: quiz_respuestas quiz_respuestas_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_respuestas
    ADD CONSTRAINT quiz_respuestas_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz_semana(id) ON DELETE CASCADE;

--
-- Name: quiz_semana quiz_semana_semana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_semana
    ADD CONSTRAINT quiz_semana_semana_id_fkey FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE;

--
-- Name: racha_actividad racha_actividad_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.racha_actividad
    ADD CONSTRAINT racha_actividad_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.alumnos(id) ON DELETE CASCADE;

--
-- Name: semanas semanas_mes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semanas
    ADD CONSTRAINT semanas_mes_id_fkey FOREIGN KEY (mes_id) REFERENCES public.meses_contenido(id) ON DELETE CASCADE;

--
-- Name: usuarios usuarios_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: alumnos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

--
-- Name: alumnos alumnos: admin puede actualizar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumnos: admin puede actualizar" ON public.alumnos FOR UPDATE USING (public.es_admin());

--
-- Name: alumnos alumnos: admin puede eliminar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumnos: admin puede eliminar" ON public.alumnos FOR DELETE USING (public.es_admin());

--
-- Name: alumnos alumnos: admin puede insertar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumnos: admin puede insertar" ON public.alumnos FOR INSERT WITH CHECK (public.es_admin());

--
-- Name: alumnos alumnos: ver propio registro; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumnos: ver propio registro" ON public.alumnos FOR SELECT USING (((id = auth.uid()) OR public.es_admin()));

--
-- Name: calificaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: calificaciones calificaciones: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "calificaciones: admin gestiona" ON public.calificaciones USING (public.es_admin());

--
-- Name: calificaciones calificaciones: ver propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "calificaciones: ver propias" ON public.calificaciones FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: constancias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constancias ENABLE ROW LEVEL SECURITY;

--
-- Name: constancias constancias: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "constancias: admin gestiona" ON public.constancias USING (public.es_admin());

--
-- Name: constancias constancias: ver propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "constancias: ver propias" ON public.constancias FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: documentos_alumno documentos: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "documentos: admin gestiona" ON public.documentos_alumno USING (public.es_admin());

--
-- Name: documentos_alumno documentos: subir propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "documentos: subir propios" ON public.documentos_alumno FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: documentos_alumno documentos: ver propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "documentos: ver propios" ON public.documentos_alumno FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: documentos_alumno; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos_alumno ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluaciones evaluaciones: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evaluaciones: admin gestiona" ON public.evaluaciones USING (public.es_admin());

--
-- Name: evaluaciones evaluaciones: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evaluaciones: lectura autenticados" ON public.evaluaciones FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: glosario_materia glosario: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "glosario: admin gestiona" ON public.glosario_materia USING (public.es_admin());

--
-- Name: glosario_materia glosario: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "glosario: lectura autenticados" ON public.glosario_materia FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: glosario_materia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.glosario_materia ENABLE ROW LEVEL SECURITY;

--
-- Name: intentos_evaluacion intentos: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "intentos: admin gestiona" ON public.intentos_evaluacion USING (public.es_admin());

--
-- Name: intentos_evaluacion intentos: registrar propio intento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "intentos: registrar propio intento" ON public.intentos_evaluacion FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: intentos_evaluacion intentos: ver propios intentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "intentos: ver propios intentos" ON public.intentos_evaluacion FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: intentos_evaluacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;

--
-- Name: logros_alumno logros: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logros: admin gestiona" ON public.logros_alumno USING (public.es_admin());

--
-- Name: logros_alumno logros: insertar propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logros: insertar propios" ON public.logros_alumno FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: logros_alumno logros: ver propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logros: ver propios" ON public.logros_alumno FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: logros_alumno; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logros_alumno ENABLE ROW LEVEL SECURITY;

--
-- Name: materias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;

--
-- Name: materias materias: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "materias: admin gestiona" ON public.materias USING (public.es_admin());

--
-- Name: materias materias: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "materias: lectura autenticados" ON public.materias FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: meses_contenido; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meses_contenido ENABLE ROW LEVEL SECURITY;

--
-- Name: meses_contenido meses_contenido: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meses_contenido: admin gestiona" ON public.meses_contenido USING (public.es_admin());

--
-- Name: meses_contenido meses_contenido: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "meses_contenido: lectura autenticados" ON public.meses_contenido FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: notas_alumno notas: actualizar propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notas: actualizar propias" ON public.notas_alumno FOR UPDATE USING ((alumno_id = auth.uid()));

--
-- Name: notas_alumno notas: gestionar propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notas: gestionar propias" ON public.notas_alumno FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: notas_alumno notas: ver propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notas: ver propias" ON public.notas_alumno FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: notas_alumno; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notas_alumno ENABLE ROW LEVEL SECURITY;

--
-- Name: preguntas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

--
-- Name: preguntas preguntas: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "preguntas: admin gestiona" ON public.preguntas USING (public.es_admin());

--
-- Name: preguntas preguntas: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "preguntas: lectura autenticados" ON public.preguntas FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: progreso_semanas progreso: actualizar propio progreso; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "progreso: actualizar propio progreso" ON public.progreso_semanas FOR UPDATE USING ((alumno_id = auth.uid()));

--
-- Name: progreso_semanas progreso: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "progreso: admin gestiona" ON public.progreso_semanas USING (public.es_admin());

--
-- Name: progreso_semanas progreso: registrar propio progreso; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "progreso: registrar propio progreso" ON public.progreso_semanas FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: progreso_semanas progreso: ver propio progreso; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "progreso: ver propio progreso" ON public.progreso_semanas FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: progreso_semanas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.progreso_semanas ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_respuestas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_respuestas ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_respuestas quiz_respuestas: registrar propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "quiz_respuestas: registrar propia" ON public.quiz_respuestas FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: quiz_respuestas quiz_respuestas: ver propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "quiz_respuestas: ver propias" ON public.quiz_respuestas FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: quiz_semana; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_semana ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_semana quiz_semana: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "quiz_semana: admin gestiona" ON public.quiz_semana USING (public.es_admin());

--
-- Name: quiz_semana quiz_semana: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "quiz_semana: lectura autenticados" ON public.quiz_semana FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: racha_actividad racha: actualizar propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "racha: actualizar propia" ON public.racha_actividad FOR UPDATE USING ((alumno_id = auth.uid()));

--
-- Name: racha_actividad racha: insertar propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "racha: insertar propia" ON public.racha_actividad FOR INSERT WITH CHECK ((alumno_id = auth.uid()));

--
-- Name: racha_actividad racha: ver propia; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "racha: ver propia" ON public.racha_actividad FOR SELECT USING (((alumno_id = auth.uid()) OR public.es_admin()));

--
-- Name: racha_actividad; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.racha_actividad ENABLE ROW LEVEL SECURITY;

--
-- Name: semanas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.semanas ENABLE ROW LEVEL SECURITY;

--
-- Name: semanas semanas: admin gestiona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "semanas: admin gestiona" ON public.semanas USING (public.es_admin());

--
-- Name: semanas semanas: lectura autenticados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "semanas: lectura autenticados" ON public.semanas FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios usuarios: actualizar propio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "usuarios: actualizar propio perfil" ON public.usuarios FOR UPDATE USING ((id = auth.uid()));

--
-- Name: usuarios usuarios: admin puede insertar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "usuarios: admin puede insertar" ON public.usuarios FOR INSERT WITH CHECK ((public.es_admin() OR (id = auth.uid())));

--
-- Name: usuarios usuarios: ver propio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "usuarios: ver propio perfil" ON public.usuarios FOR SELECT USING (((id = auth.uid()) OR public.es_admin()));

--
--

