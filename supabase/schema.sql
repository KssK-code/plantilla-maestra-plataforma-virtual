-- ============================================================
--  IVS VIRTUAL — SCHEMA COMPLETO
--  Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- ── EXTENSIONES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  1. TABLAS BASE
-- ============================================================

-- ── USUARIOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  nombre      TEXT,
  apellidos   TEXT,
  telefono    TEXT,
  foto_url    TEXT,
  rol         TEXT        NOT NULL DEFAULT 'alumno'
                          CHECK (rol IN ('alumno', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ALUMNOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alumnos (
  id                   UUID        PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  matricula            TEXT        UNIQUE,
  nivel                TEXT        CHECK (nivel IN ('secundaria', 'preparatoria')),
  modalidad            TEXT        CHECK (modalidad IN ('6_meses', '3_meses')),
  es_sindicalizado     BOOLEAN     NOT NULL DEFAULT false,
  sindicato            TEXT,
  inscripcion_pagada   BOOLEAN     NOT NULL DEFAULT false,
  meses_desbloqueados  INTEGER     NOT NULL DEFAULT 0,
  duracion_meses       INTEGER     GENERATED ALWAYS AS (
                          CASE modalidad WHEN '3_meses' THEN 3 ELSE 6 END
                        ) STORED,
  fecha_inscripcion    TIMESTAMPTZ,
  fecha_inicio         TIMESTAMPTZ,
  activo               BOOLEAN     NOT NULL DEFAULT true,
  notas_admin          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MATERIAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  descripcion TEXT,
  nivel       TEXT        CHECK (nivel IN ('secundaria', 'preparatoria', 'demo')),
  orden       INTEGER,
  icono       TEXT,
  color       TEXT,
  activa      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MESES_CONTENIDO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meses_contenido (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id    UUID        REFERENCES public.materias(id) ON DELETE CASCADE,
  numero_mes    INTEGER     NOT NULL,
  titulo        TEXT        NOT NULL,
  descripcion   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (materia_id, numero_mes)
);

-- ── SEMANAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semanas (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_id                   UUID        REFERENCES public.meses_contenido(id) ON DELETE CASCADE,
  numero_semana            INTEGER     NOT NULL,
  titulo                   TEXT        NOT NULL,
  descripcion              TEXT,
  video_url                TEXT,
  tiempo_estimado_minutos  INTEGER     NOT NULL DEFAULT 60,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mes_id, numero_semana)
);

-- ── PROGRESO_SEMANAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progreso_semanas (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id             UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  semana_id             UUID        NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
  completada            BOOLEAN     NOT NULL DEFAULT false,
  fecha_completada      TIMESTAMPTZ,
  tiempo_visto_minutos  INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (alumno_id, semana_id)
);

-- ── EVALUACIONES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id              UUID        REFERENCES public.materias(id) ON DELETE CASCADE,
  mes_id                  UUID        REFERENCES public.meses_contenido(id) ON DELETE SET NULL,
  titulo                  TEXT        NOT NULL,
  descripcion             TEXT,
  tiempo_limite_minutos   INTEGER     NOT NULL DEFAULT 60,
  intentos_permitidos     INTEGER     NOT NULL DEFAULT 3,
  activa                  BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PREGUNTAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.preguntas (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id       UUID  NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  pregunta            TEXT  NOT NULL,
  opcion_a            TEXT  NOT NULL,
  opcion_b            TEXT  NOT NULL,
  opcion_c            TEXT  NOT NULL,
  opcion_d            TEXT  NOT NULL,
  respuesta_correcta  TEXT  NOT NULL CHECK (respuesta_correcta IN ('a','b','c','d')),
  orden               INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INTENTOS_EVALUACION ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.intentos_evaluacion (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  evaluacion_id    UUID        NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  numero_intento   INTEGER     NOT NULL DEFAULT 1,
  puntaje          INTEGER,
  acreditado       BOOLEAN     NOT NULL DEFAULT false,
  fecha_intento    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respuestas       JSONB
);

-- ── CALIFICACIONES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calificaciones (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id           UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  materia_id          UUID        NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  evaluacion_id       UUID        REFERENCES public.evaluaciones(id) ON DELETE SET NULL,
  acreditado          BOOLEAN     NOT NULL DEFAULT false,
  fecha_acreditacion  TIMESTAMPTZ,
  folio               TEXT        UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, materia_id)
);

-- ── QUIZ_SEMANA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_semana (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id           UUID  NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
  pregunta            TEXT  NOT NULL,
  opcion_a            TEXT  NOT NULL,
  opcion_b            TEXT  NOT NULL,
  opcion_c            TEXT  NOT NULL,
  respuesta_correcta  TEXT  NOT NULL CHECK (respuesta_correcta IN ('a','b','c')),
  orden               INTEGER
);

-- ── QUIZ_RESPUESTAS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_respuestas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id  UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  quiz_id    UUID        NOT NULL REFERENCES public.quiz_semana(id) ON DELETE CASCADE,
  respuesta  TEXT,
  correcta   BOOLEAN,
  fecha      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTAS_ALUMNO ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notas_alumno (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  semana_id   UUID        NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
  contenido   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, semana_id)
);

-- ── LOGROS_ALUMNO ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logros_alumno (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  tipo_logro       TEXT        NOT NULL,
  fecha_obtenido   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, tipo_logro)
);

-- ── RACHA_ACTIVIDAD ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.racha_actividad (
  id               UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID   NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE UNIQUE,
  racha_actual     INTEGER NOT NULL DEFAULT 0,
  racha_maxima     INTEGER NOT NULL DEFAULT 0,
  ultima_actividad DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GLOSARIO_MATERIA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.glosario_materia (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id  UUID        NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  termino     TEXT        NOT NULL,
  definicion  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENTOS_ALUMNO ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documentos_alumno (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id            UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  tipo_documento       TEXT        NOT NULL,
  nombre_archivo       TEXT,
  url_archivo          TEXT,
  verificado           BOOLEAN     NOT NULL DEFAULT false,
  fecha_subida         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verificado_por       UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_verificacion   TIMESTAMPTZ,
  notas                TEXT
);

-- ── CONSTANCIAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.constancias (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id    UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  folio        TEXT        UNIQUE NOT NULL,
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url_pdf      TEXT,
  materia_id   UUID        REFERENCES public.materias(id) ON DELETE SET NULL
);


-- ============================================================
--  2. FUNCIÓN: GENERAR MATRÍCULA
-- ============================================================

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

-- Trigger: asignar matrícula automáticamente al insertar alumno
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


-- ============================================================
--  3. FUNCIÓN: ACTUALIZAR RACHA
-- ============================================================

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
        -- Misma día, no sumar
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


-- ============================================================
--  4. FUNCIÓN: CREAR PERFIL AL REGISTRARSE
-- ============================================================

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


-- ============================================================
--  5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_contenido       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semanas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso_semanas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentos_evaluacion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_semana           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_respuestas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_alumno          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logros_alumno         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racha_actividad       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosario_materia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_alumno     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constancias           ENABLE ROW LEVEL SECURITY;

-- Helper: detectar si el usuario autenticado es admin
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
     WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

-- ── POLÍTICAS: USUARIOS ──────────────────────────────────────
CREATE POLICY "usuarios: ver propio perfil"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid() OR public.es_admin());

CREATE POLICY "usuarios: actualizar propio perfil"
  ON public.usuarios FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "usuarios: admin puede insertar"
  ON public.usuarios FOR INSERT
  WITH CHECK (public.es_admin() OR id = auth.uid());

-- ── POLÍTICAS: ALUMNOS ───────────────────────────────────────
CREATE POLICY "alumnos: ver propio registro"
  ON public.alumnos FOR SELECT
  USING (id = auth.uid() OR public.es_admin());

CREATE POLICY "alumnos: admin puede insertar"
  ON public.alumnos FOR INSERT
  WITH CHECK (public.es_admin());

CREATE POLICY "alumnos: admin puede actualizar"
  ON public.alumnos FOR UPDATE
  USING (public.es_admin());

CREATE POLICY "alumnos: admin puede eliminar"
  ON public.alumnos FOR DELETE
  USING (public.es_admin());

-- ── POLÍTICAS: MATERIAS (lectura pública para alumnos activos) ─
CREATE POLICY "materias: lectura autenticados"
  ON public.materias FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "materias: admin gestiona"
  ON public.materias FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: MESES_CONTENIDO ───────────────────────────────
CREATE POLICY "meses_contenido: lectura autenticados"
  ON public.meses_contenido FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "meses_contenido: admin gestiona"
  ON public.meses_contenido FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: SEMANAS ───────────────────────────────────────
CREATE POLICY "semanas: lectura autenticados"
  ON public.semanas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "semanas: admin gestiona"
  ON public.semanas FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: PROGRESO_SEMANAS ──────────────────────────────
CREATE POLICY "progreso: ver propio progreso"
  ON public.progreso_semanas FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "progreso: registrar propio progreso"
  ON public.progreso_semanas FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "progreso: actualizar propio progreso"
  ON public.progreso_semanas FOR UPDATE
  USING (alumno_id = auth.uid());

CREATE POLICY "progreso: admin gestiona"
  ON public.progreso_semanas FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: EVALUACIONES ──────────────────────────────────
CREATE POLICY "evaluaciones: lectura autenticados"
  ON public.evaluaciones FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "evaluaciones: admin gestiona"
  ON public.evaluaciones FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: PREGUNTAS ─────────────────────────────────────
CREATE POLICY "preguntas: lectura autenticados"
  ON public.preguntas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "preguntas: admin gestiona"
  ON public.preguntas FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: INTENTOS_EVALUACION ──────────────────────────
CREATE POLICY "intentos: ver propios intentos"
  ON public.intentos_evaluacion FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "intentos: registrar propio intento"
  ON public.intentos_evaluacion FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "intentos: admin gestiona"
  ON public.intentos_evaluacion FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: CALIFICACIONES ────────────────────────────────
CREATE POLICY "calificaciones: ver propias"
  ON public.calificaciones FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "calificaciones: admin gestiona"
  ON public.calificaciones FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: QUIZ ──────────────────────────────────────────
CREATE POLICY "quiz_semana: lectura autenticados"
  ON public.quiz_semana FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "quiz_semana: admin gestiona"
  ON public.quiz_semana FOR ALL
  USING (public.es_admin());

CREATE POLICY "quiz_respuestas: ver propias"
  ON public.quiz_respuestas FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "quiz_respuestas: registrar propia"
  ON public.quiz_respuestas FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

-- ── POLÍTICAS: NOTAS_ALUMNO ──────────────────────────────────
CREATE POLICY "notas: ver propias"
  ON public.notas_alumno FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "notas: gestionar propias"
  ON public.notas_alumno FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "notas: actualizar propias"
  ON public.notas_alumno FOR UPDATE
  USING (alumno_id = auth.uid());

-- ── POLÍTICAS: LOGROS ────────────────────────────────────────
CREATE POLICY "logros: ver propios"
  ON public.logros_alumno FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "logros: admin gestiona"
  ON public.logros_alumno FOR ALL
  USING (public.es_admin());

-- El alumno puede registrar sus propios logros (p. ej. al completar semanas)
CREATE POLICY "logros: insertar propios"
  ON public.logros_alumno FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

-- ── POLÍTICAS: RACHA ─────────────────────────────────────────
CREATE POLICY "racha: ver propia"
  ON public.racha_actividad FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "racha: insertar propia"
  ON public.racha_actividad FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "racha: actualizar propia"
  ON public.racha_actividad FOR UPDATE
  USING (alumno_id = auth.uid());

-- ── POLÍTICAS: GLOSARIO ──────────────────────────────────────
CREATE POLICY "glosario: lectura autenticados"
  ON public.glosario_materia FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "glosario: admin gestiona"
  ON public.glosario_materia FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: DOCUMENTOS ────────────────────────────────────
CREATE POLICY "documentos: ver propios"
  ON public.documentos_alumno FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "documentos: subir propios"
  ON public.documentos_alumno FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "documentos: admin gestiona"
  ON public.documentos_alumno FOR ALL
  USING (public.es_admin());

-- ── POLÍTICAS: CONSTANCIAS ───────────────────────────────────
CREATE POLICY "constancias: ver propias"
  ON public.constancias FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "constancias: admin gestiona"
  ON public.constancias FOR ALL
  USING (public.es_admin());


-- ============================================================
--  6. ÍNDICES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_alumnos_matricula        ON public.alumnos (matricula);
CREATE INDEX IF NOT EXISTS idx_alumnos_nivel            ON public.alumnos (nivel);
CREATE INDEX IF NOT EXISTS idx_progreso_alumno          ON public.progreso_semanas (alumno_id);
CREATE INDEX IF NOT EXISTS idx_progreso_semana          ON public.progreso_semanas (semana_id);
CREATE INDEX IF NOT EXISTS idx_intentos_alumno          ON public.intentos_evaluacion (alumno_id);
CREATE INDEX IF NOT EXISTS idx_intentos_evaluacion      ON public.intentos_evaluacion (evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_alumno    ON public.calificaciones (alumno_id);
CREATE INDEX IF NOT EXISTS idx_documentos_alumno        ON public.documentos_alumno (alumno_id);
CREATE INDEX IF NOT EXISTS idx_notas_alumno             ON public.notas_alumno (alumno_id);
CREATE INDEX IF NOT EXISTS idx_semanas_mes              ON public.semanas (mes_id);
CREATE INDEX IF NOT EXISTS idx_meses_materia            ON public.meses_contenido (materia_id);
CREATE INDEX IF NOT EXISTS idx_quiz_semana              ON public.quiz_semana (semana_id);


-- ============================================================
--  7. STORAGE BUCKETS
--  (Ejecutar en SQL Editor de Supabase o desde el Dashboard)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatares',    'avatares',    true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('documentos',  'documentos',  false, 10485760,  ARRAY['image/jpeg','image/png','application/pdf']),
  ('constancias', 'constancias', false, 10485760,  ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
-- Avatares: lectura pública, escritura propia
CREATE POLICY "avatares: lectura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares');

CREATE POLICY "avatares: subir propio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatares' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "avatares: actualizar propio"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatares' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- Documentos: solo el dueño y admins
CREATE POLICY "documentos: ver propio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos' AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR public.es_admin()
    )
  );

CREATE POLICY "documentos: subir propio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- Constancias: solo el dueño y admins
CREATE POLICY "constancias: ver propio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'constancias' AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR public.es_admin()
    )
  );

CREATE POLICY "constancias: admin sube"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'constancias' AND public.es_admin());


-- ============================================================
--  8. DATOS INICIALES — MATERIA DEMO
-- ============================================================

INSERT INTO public.materias (nombre, descripcion, nivel, orden, icono, color)
VALUES
  ('Tutoría de Ingreso', 'Orientación inicial para nuevos alumnos', 'demo', 0, '🎓', '#3AAFA9')
ON CONFLICT DO NOTHING;


-- ============================================================
--  FIN DEL SCHEMA
-- ============================================================
-- Para verificar que todo quedó bien:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
