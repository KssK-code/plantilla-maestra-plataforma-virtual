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
                          CHECK (rol IN ('alumno', 'admin', 'secretario')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ALUMNOS ─────────────────────────────────────────────────
-- ── AJUSTES ─────────────────────────────────────────────────
-- Valores de config que la BD necesita por su cuenta, porque corren en
-- triggers y funciones sin acceso a src/lib/config.ts. Hoy solo el prefijo de
-- matrícula, que consume generar_matricula(). Lo siembra el servidor desde
-- CONFIG.prefijoMatricula al dar de alta un alumno (src/lib/matricula.ts).
-- RLS activo y SIN políticas: en Supabase toda tabla de `public` sale por
-- PostgREST, así que sin RLS quedaría legible por cualquier visitante.
CREATE TABLE IF NOT EXISTS public.ajustes (
  clave       TEXT        PRIMARY KEY,
  valor       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.alumnos (
  id                   UUID        PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  matricula            TEXT        UNIQUE,
  -- 'diplomado' habilita la línea Solo-Cursos (B1). Agregar un valor a este
  -- CHECK es estrictamente permisivo: ningún dato existente deja de ser válido.
  -- Debe coincidir con supabase/migrations/20260730120000_b1_fundacion_solo_cursos.sql
  nivel                TEXT        CHECK (nivel IN ('secundaria', 'preparatoria', 'licenciatura', 'diplomado')),
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
  -- Qué curso de ingreso pidió al registrarse. Guarda el id de la OFERTA
  -- (src/lib/cursos/oferta.ts), no un UUID de `cursos`: hay clientes que
  -- venden varios cursos como paquete único.
  curso_solicitado     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumnos_curso_solicitado
  ON public.alumnos (curso_solicitado)
  WHERE curso_solicitado IS NOT NULL;

-- ── MATERIAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  descripcion TEXT,
  nivel       TEXT        CHECK (nivel IN ('secundaria', 'preparatoria', 'demo', 'licenciatura')),
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
  -- Cuerpo de la leccion. El lector cae a `descripcion` si viene NULL.
  contenido                TEXT,
  -- Videos de apoyo opcionales; los edita el panel de contenido del admin.
  video_url_2              TEXT,
  video_url_3              TEXT,
  tiempo_estimado_minutos  INTEGER     NOT NULL DEFAULT 60,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mes_id, numero_semana)
);

-- ── SEMANA_MATERIALES ───────────────────────────────────────
-- Los PDF que el admin sube a cada semana (F2 del CMS de contenido). TABLA y
-- no una columna en `semanas`: una clase reparte varios archivos y con una
-- columna el segundo borraría al primero sin avisar.
-- `path` apunta al bucket privado 'materias'; el alumno NUNCA lo lee directo,
-- pasa por /api/material/[id]. Ver
-- supabase/migrations/20260819130000_cms_contenido_materiales.sql.
CREATE TABLE IF NOT EXISTS public.semana_materiales (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id     UUID        NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
  nombre        TEXT        NOT NULL,
  path          TEXT        NOT NULL,
  tamano_bytes  BIGINT,
  orden         INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  activa              BOOLEAN     NOT NULL DEFAULT true,
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
  opcion_d            TEXT,
  respuesta_correcta  TEXT  NOT NULL CHECK (respuesta_correcta IN ('a','b','c','d')),
  orden               INTEGER,
  explicacion         TEXT,
  activa              BOOLEAN     NOT NULL DEFAULT true
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

-- ── PAGOS ───────────────────────────────────────────────────
-- Registro manual de pagos por Control Escolar (admin).
CREATE TABLE IF NOT EXISTS public.pagos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  monto            NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  concepto         TEXT NOT NULL DEFAULT 'mensualidad',
    -- 'inscripcion' | 'mensualidad' | 'otro'
  mes_desbloqueado INTEGER CHECK (mes_desbloqueado IS NULL OR mes_desbloqueado > 0),
    -- NULL si concepto = 'inscripcion' u 'otro'
  metodo_pago      TEXT NOT NULL,
    -- 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO'
  referencia       TEXT,
  fecha_pago       DATE NOT NULL DEFAULT CURRENT_DATE,
    -- fecha real del pago (editable por el admin; puede ser retroactiva)
  registrado_por   UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  2. FUNCIÓN: GENERAR MATRÍCULA
-- ============================================================

-- SECURITY DEFINER porque public.ajustes tiene RLS sin políticas: sin esto
-- la lectura del prefijo devolvería vacío y todo saldría 'MEV-'.
CREATE OR REPLACE FUNCTION public.generar_matricula()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  anio     TEXT := TO_CHAR(NOW(), 'YYYY');
  prefijo  TEXT;
  contador INTEGER;
  nueva    TEXT;
BEGIN
  SELECT valor INTO prefijo FROM public.ajustes WHERE clave = 'prefijo_matricula';
  -- 'MEV' solo aplica mientras el servidor no haya sembrado el ajuste. Es
  -- neutro a proposito: si vuelve a aparecer el prefijo de otro cliente en una
  -- matricula, el culpable es un literal, no este default.
  prefijo := NULLIF(TRIM(COALESCE(prefijo, '')), '');
  IF prefijo IS NULL THEN
    prefijo := 'MEV';
  END IF;

  SELECT COUNT(*) + 1 INTO contador FROM public.alumnos;
  nueva := prefijo || '-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  -- evitar colisiones en caso de concurrencia
  WHILE EXISTS (SELECT 1 FROM public.alumnos WHERE matricula = nueva) LOOP
    contador := contador + 1;
    nueva := prefijo || '-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
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
ALTER TABLE public.semana_materiales     ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.pagos                 ENABLE ROW LEVEL SECURITY;

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

-- Helper: detectar si el usuario autenticado es staff (admin O secretario).
-- Para lectura básica de alumnos/usuarios y registro de pagos.
-- es_admin() se mantiene intacto para todo lo demás.
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
     WHERE id = auth.uid() AND rol IN ('admin', 'secretario')
  );
$$;

-- ── POLÍTICAS: USUARIOS ──────────────────────────────────────
CREATE POLICY "usuarios: ver propio perfil"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid() OR public.es_staff());

CREATE POLICY "usuarios: actualizar propio perfil"
  ON public.usuarios FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "usuarios: admin puede insertar"
  ON public.usuarios FOR INSERT
  WITH CHECK (public.es_admin() OR id = auth.uid());

-- ── POLÍTICAS: ALUMNOS ───────────────────────────────────────
-- SELECT directo de alumnos: SOLO es_admin(). El secretario lee alumnos
-- únicamente vía /api/admin/* (service role, filtra notas_admin) — RLS no
-- filtra columnas y esta tabla contiene notas_admin (sensible), así que
-- NO se abre a es_staff().
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

-- ── POLÍTICAS: SEMANA_MATERIALES ─────────────────────────────
-- Metadatos (nombre, tamaño) legibles por cualquier autenticado, igual que
-- `semanas`. El ARCHIVO no se abre con esto: el bucket 'materias' es privado
-- y admin-only, y el alumno lo pide por /api/material/[id].
CREATE POLICY "semana_materiales: lectura autenticados"
  ON public.semana_materiales FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "semana_materiales: admin gestiona"
  ON public.semana_materiales FOR ALL
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

-- ── POLÍTICAS: PAGOS ─────────────────────────────────────────
-- Alumno: solo SELECT de sus propios pagos (alumnos.id = auth.uid()).
-- Admin: gestiona todo. Los pagos SIEMPRE los registra el admin;
-- ningún INSERT/UPDATE/DELETE para alumno.
CREATE POLICY "pagos: ver propios"
  ON public.pagos FOR SELECT
  USING (alumno_id = auth.uid() OR public.es_admin());

CREATE POLICY "pagos: admin gestiona"
  ON public.pagos FOR ALL
  USING (public.es_admin())
  WITH CHECK (public.es_admin());


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
CREATE INDEX IF NOT EXISTS idx_quiz_semana_activa       ON public.quiz_semana (semana_id) WHERE activa;
CREATE INDEX IF NOT EXISTS idx_preguntas_activa         ON public.preguntas (evaluacion_id) WHERE activa;
CREATE INDEX IF NOT EXISTS idx_semana_materiales_semana ON public.semana_materiales (semana_id);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno             ON public.pagos (alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_created_at         ON public.pagos (created_at DESC);


-- ============================================================
--  7. STORAGE BUCKETS
--  (Ejecutar en SQL Editor de Supabase o desde el Dashboard)
-- ============================================================

-- NOTA CLIENTES NUEVOS: estos 5 buckets son necesarios desde el día 1.
-- ('cursos' NO está aquí a propósito: es del módulo opcional de Diplomados y
--  vive en scripts/migracion-cursos-diplomados.sql, que solo se aplica a los
--  clientes que lo contratan.)
-- 'recibos' guarda los PDF de recibo de pago (Fase 3 Panel Admin Unificado);
-- son archivos pequeños, de ahí el límite de 2MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatares',    'avatares',    true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('documentos',  'documentos',  false, 10485760,  ARRAY['image/jpeg','image/png','application/pdf']),
  ('constancias', 'constancias', false, 10485760,  ARRAY['application/pdf','image/jpeg','image/png']),
  ('recibos',     'recibos',     false, 2097152,   ARRAY['application/pdf']),
  -- F2: PDF de material por semana. Privado y SIN lectura para el alumno: se
  -- sirve por GET /api/material/[id], que comprueba el acceso en TypeScript.
  ('materias',    'materias',    false, 10485760,  ARRAY['application/pdf'])
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

-- Materias (F2): SOLO admin, en las cuatro operaciones.
-- El alumno NUNCA lee de este bucket. Pide GET /api/material/[id], que reusa
-- tieneAccesoSemana() y firma con service role. Reproducir aquí la regla de
-- acceso del alumno es exactamente lo que rompió las portadas de Cursos: la
-- política y el path divergieron y la imagen salía en blanco SOLO para él.
CREATE POLICY "materias: solo admin lee"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin escribe"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin actualiza"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin borra"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

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

-- Recibos de pago: el dueño (alumno) y el staff pueden verlos;
-- solo el staff los sube (en la práctica los genera el servidor con
-- service role; el alumno los recibe vía signed URL por WhatsApp).
CREATE POLICY "recibos: ver propio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recibos' AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR public.es_staff()
    )
  );

CREATE POLICY "recibos: staff sube"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recibos' AND public.es_staff());


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


-- =============================================================
-- FIX Issue #15 — is_admin() wrapper para compatibilidad smoke test
-- =============================================================
-- post-setup-check.sql busca is_admin(), schema histórico crea es_admin().
-- Wrapper mantiene compatibilidad con ambos nombres sin duplicar lógica.
-- SECURITY DEFINER + STABLE evita recursión infinita en RLS policies.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.es_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- =============================================================
-- KEEP-ALIVE HEARTBEAT (Bug 46)
-- =============================================================
-- Tabla mínima usada por .github/workflows/keep-alive.yml para
-- generar actividad REAL de DB. Los GET con anon responden 200
-- pero NO cuentan como actividad → Supabase free pausa a 7d aunque
-- el workflow esté verde. Un INSERT sí cuenta.
--
-- RLS: anon SOLO puede INSERT. Sin SELECT/UPDATE/DELETE.
-- Mínimo privilegio formal — la tabla no es legible desde el cliente.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.keep_alive_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now()
);

-- Columna `source`: quien mando el latido ("central-YYYY-MM-DD", "rescate-manual-...").
-- Va por ALTER idempotente y NO en el CREATE, porque los clientes ya desplegados
-- tienen la tabla sin ella. El keep-alive central manda {source} y reintenta con {}
-- si la columna no existe (PostgREST responde 400 PGRST204), asi que ambos esquemas
-- funcionan; con la columna presente se puede auditar quien latio y cuando.
-- Nullable a proposito: el INSERT `{}` del workflow per-repo legacy sigue siendo valido.
ALTER TABLE public.keep_alive_log ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.keep_alive_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.keep_alive_log FROM anon;

DROP POLICY IF EXISTS keep_alive_anon_insert ON public.keep_alive_log;
CREATE POLICY keep_alive_anon_insert ON public.keep_alive_log
  FOR INSERT TO anon WITH CHECK (true);

GRANT INSERT ON public.keep_alive_log TO anon;

-- =============================================================
-- ROL SECRETARIO — ajuste condicional de policies de pagos
-- =============================================================
-- Si el módulo de pagos (feature/panel-admin-pagos) está aplicado
-- en esta BD, separa la policy ALL de admin en policies por operación:
--   SELECT/INSERT → es_staff()   (secretario consulta y registra)
--   UPDATE/DELETE → es_admin()   (el secretario NO edita ni borra)
-- Idempotente y seguro en cualquier orden de merge.
-- =============================================================
DO $$
BEGIN
  IF to_regclass('public.pagos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "pagos: ver propios"     ON public.pagos;
    DROP POLICY IF EXISTS "pagos: admin gestiona"  ON public.pagos;
    DROP POLICY IF EXISTS "pagos: staff registra"  ON public.pagos;
    DROP POLICY IF EXISTS "pagos: admin actualiza" ON public.pagos;
    DROP POLICY IF EXISTS "pagos: admin elimina"   ON public.pagos;

    CREATE POLICY "pagos: ver propios" ON public.pagos
      FOR SELECT USING (alumno_id = auth.uid() OR public.es_staff());

    CREATE POLICY "pagos: staff registra" ON public.pagos
      FOR INSERT WITH CHECK (public.es_staff());

    CREATE POLICY "pagos: admin actualiza" ON public.pagos
      FOR UPDATE USING (public.es_admin()) WITH CHECK (public.es_admin());

    CREATE POLICY "pagos: admin elimina" ON public.pagos
      FOR DELETE USING (public.es_admin());
  END IF;
END $$;

-- =============================================================
-- ESTADO DE CUENTA — vista agregada de pagos por alumno (Fase 5)
-- =============================================================
-- Para /admin/estado-cuenta (staff). Reporta HECHOS, no conclusiones:
-- "meses_sin_pago_registrado" = meses desbloqueados sin pago de
-- mensualidad capturado (puede ser pago no capturado, cortesía o error).
-- inscripcion_pagada viene de la columna existente (fuente de verdad).
-- =============================================================

-- ⚠️ B6 REEMPLAZA ESTA FUNCIÓN cuando el cliente tiene el módulo de Cursos.
-- La versión de B6 (supabase/migrations/20260730160000_b6_reportes_por_vertical.sql)
-- filtra `fecha_ultimo_pago` a los pagos del PROGRAMA con
-- `WHERE p.curso_inscripcion_id IS NULL`, para que el estado de cuenta no diga
-- «Último pago: hoy» por un diplomado en la misma fila que dice «meses sin pago».
--
-- Esa versión NO puede vivir aquí: `pagos.curso_inscripcion_id` la crea B1, que
-- es parte del módulo opcional de Cursos (ver MÓDULOS OPCIONALES al final), y
-- este archivo "debe poder correrse solo". Postgres valida el cuerpo de una
-- función SQL al crearla, así que copiar la versión de B6 aquí aborta schema.sql
-- con "column p.curso_inscripcion_id does not exist" en todo cliente que no
-- contrate Cursos. Verificado sobre una base limpia, no supuesto.
--
-- Orden real en un cliente CON cursos: schema.sql (esta versión) →
-- migracion-cursos-diplomados.sql → B1 → … → B6 (la reemplaza). Sin cursos,
-- esta versión es la correcta y definitiva: no hay pagos de curso que separar.
CREATE OR REPLACE FUNCTION public.estado_cuenta_alumnos()
RETURNS TABLE (
  alumno_id uuid,
  nombre text,
  apellidos text,
  email text,
  matricula text,
  nivel text,
  modalidad text,
  meses_desbloqueados integer,
  meses_con_pago integer,
  meses_sin_pago_registrado integer,
  inscripcion_pagada boolean,
  fecha_ultimo_pago timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT a.id,
         u.nombre,
         u.apellidos,
         u.email,
         a.matricula,
         a.nivel,
         a.modalidad,
         a.meses_desbloqueados,
         COALESCE(mp.meses_con_pago, 0)::integer,
         GREATEST(a.meses_desbloqueados - COALESCE(mp.meses_con_pago, 0), 0)::integer,
         a.inscripcion_pagada,
         up.fecha_ultimo_pago
    FROM public.alumnos a
    JOIN public.usuarios u ON u.id = a.id
    LEFT JOIN (
      SELECT p.alumno_id, COUNT(DISTINCT p.mes_desbloqueado)::integer AS meses_con_pago
        FROM public.pagos p
       WHERE p.concepto = 'mensualidad'
       GROUP BY p.alumno_id
    ) mp ON mp.alumno_id = a.id
    LEFT JOIN (
      SELECT p.alumno_id, MAX(p.fecha_pago)::timestamptz AS fecha_ultimo_pago
        FROM public.pagos p
       GROUP BY p.alumno_id
    ) up ON up.alumno_id = a.id
   WHERE a.activo = true
     -- B7/T4: fuera los alumnos que solo cursan diplomados. No tienen
     -- obligaciones del PROGRAMA, así que salían con «Al corriente» y
     -- «Sin pagos registrados» — datos ciertos, fila que no debería existir.
     -- El alumno HÍBRIDO (nivel de programa + inscrito a un diplomado) SIGUE
     -- apareciendo: su fila del programa es legítima.
     --
     -- Este filtro SÍ vive en el schema base, a diferencia de los de B6:
     -- `alumnos.nivel` es una columna del base y su CHECK ya admite
     -- 'diplomado' (línea 33). No depende del módulo opcional de Cursos, así
     -- que este archivo sigue pudiendo correrse solo. Verificado sobre una
     -- base limpia.
     --
     -- `IS DISTINCT FROM` y no `<>`: `nivel` es nullable y con `<>` una fila
     -- con NULL daría NULL, el WHERE la tomaría como falsa y el alumno sin
     -- nivel DESAPARECERÍA del reporte — justo al que hay que ver para notar
     -- que le falta el dato.
     AND a.nivel IS DISTINCT FROM 'diplomado'
   ORDER BY u.nombre, u.apellidos;
$$;
-- REPORTES DE INGRESOS — agregación por semana y mes (Fase 4)
-- =============================================================
-- Para /admin/reportes (admin-only vía API). GROUP BY date_trunc en
-- America/Mexico_City, semana ISO (lunes), rellena periodos sin pagos
-- con 0. SECURITY INVOKER: con service role ve todo; un alumno directo
-- solo agregaría sus propios pagos (RLS).
-- =============================================================

-- ⚠️ B6 REEMPLAZA ESTAS DOS FUNCIONES cuando el cliente tiene Cursos: agrega
-- las columnas `programa` y `cursos` al RETURNS TABLE para desglosar el ingreso
-- por vertical. `total` se conserva idéntico, así que quien ya lo lee no se
-- entera. Igual que arriba, la versión de B6 depende de
-- `pagos.curso_inscripcion_id` (módulo opcional) y no puede vivir en el schema
-- base. Nota para quien migre: B6 usa DROP + CREATE, no CREATE OR REPLACE,
-- porque Postgres no deja cambiar el tipo de retorno de una función existente —
-- y el DROP se lleva los grants, que B6 re-aplica.
CREATE OR REPLACE FUNCTION public.reporte_ingresos_semanales(num_semanas integer DEFAULT 8)
RETURNS TABLE (semana_inicio date, total numeric)
LANGUAGE sql STABLE
AS $$
  WITH semanas AS (
    SELECT generate_series(
      date_trunc('week', (now() AT TIME ZONE 'America/Mexico_City')) - make_interval(weeks => num_semanas - 1),
      date_trunc('week', (now() AT TIME ZONE 'America/Mexico_City')),
      interval '1 week'
    ) AS inicio
  )
  SELECT s.inicio::date AS semana_inicio,
         COALESCE(SUM(p.monto), 0)::numeric AS total
    FROM semanas s
    LEFT JOIN public.pagos p
      ON date_trunc('week', p.fecha_pago) = s.inicio
   GROUP BY s.inicio
   ORDER BY s.inicio;
$$;

CREATE OR REPLACE FUNCTION public.reporte_ingresos_mensuales(num_meses integer DEFAULT 6)
RETURNS TABLE (mes text, total numeric)
LANGUAGE sql STABLE
AS $$
  WITH meses AS (
    SELECT generate_series(
      date_trunc('month', (now() AT TIME ZONE 'America/Mexico_City')) - make_interval(months => num_meses - 1),
      date_trunc('month', (now() AT TIME ZONE 'America/Mexico_City')),
      interval '1 month'
    ) AS inicio
  )
  SELECT to_char(m.inicio, 'YYYY-MM') AS mes,
         COALESCE(SUM(p.monto), 0)::numeric AS total
    FROM meses m
    LEFT JOIN public.pagos p
      ON date_trunc('month', p.fecha_pago) = m.inicio
   GROUP BY m.inicio
   ORDER BY m.inicio;
$$;
-- Bug 52 — Cerrar escalada de privilegios de rol (usuarios/alumnos)
-- =============================================================
-- SÍNTOMA: un alumno autenticado se vuelve admin desde el navegador:
--   supabase.from('usuarios').update({ rol: 'admin' }).eq('id', suId)
-- CAUSA: Supabase otorga UPDATE de TABLA a `authenticated` sobre las
--   tablas de public (default privileges) y la policy RLS de UPDATE de
--   usuarios ("actualizar propio perfil") solo exige USING (id = auth.uid())
--   SIN WITH CHECK ni restricción de columna → el usuario reescribe su
--   propio `rol`. Este fix opera a nivel de GRANT de columna (capa
--   ortogonal a RLS): sin privilegio sobre `rol`, el UPDATE falla con 42501.
-- SEGURO: ningún flujo legítimo escribe usuarios/alumnos con la sesión del
--   usuario — perfil (SELECT), avatar/registro y panel admin usan
--   service_role. Se re-otorga UPDATE solo sobre columnas de perfil.
-- Retrofit de clientes ya desplegados: scripts/fix-escalada-rol.sql.
-- =============================================================
REVOKE UPDATE ON public.usuarios FROM anon, authenticated;
REVOKE UPDATE (id, email, rol, created_at) ON public.usuarios FROM anon, authenticated;
GRANT  UPDATE (nombre, apellidos, telefono, foto_url) ON public.usuarios TO authenticated;
REVOKE UPDATE ON public.alumnos  FROM anon, authenticated;

-- =============================================================
-- REVOKE EXECUTE — funciones de reporte solo vía service_role (Fase 4/5 hardening)
-- =============================================================
-- reporte_ingresos_* y estado_cuenta_alumnos son SECURITY INVOKER y el default
-- de Postgres otorga EXECUTE a PUBLIC (anon+authenticated). La RLS ya impide que
-- un alumno vea datos ajenos al invocarlas, pero como TODO acceso legítimo pasa
-- por /api/admin/* con service_role, se cierra el vector de defensa en profundidad:
-- si alguna función pasara a SECURITY DEFINER, el EXECUTE abierto sería fuga
-- inmediata. En Supabase las funciones reciben EXECUTE DIRECTO a anon/
-- authenticated vía ALTER DEFAULT PRIVILEGES (no solo vía PUBLIC), así que el
-- REVOKE debe nombrar los tres; luego se re-otorga solo a service_role.
-- =============================================================
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.estado_cuenta_alumnos()             FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.estado_cuenta_alumnos()             TO service_role;

-- =============================================================
-- CORREGIR PLAN DE ESTUDIO — bitácora + candados + corrección
-- =============================================================
-- Corrección de CAPTURA del alta (nivel/carrera/modalidad), solo si el alumno
-- no ha comenzado: seis candados (pagos+inscripción, meses, calificaciones,
-- progreso, intentos, quiz — los cuatro de contenido excluyendo materias
-- TUTORIAL: nivel='demo' o nombre con 'tutor', es_materia_tutorial()). El gate
-- de acceso (tieneAccesoMateria, acceso-materias.ts:186) abre los tutoriales
-- sin pago, así que su avance nunca es evidencia de plan iniciado; los
-- candados de dinero NO tienen excepción. La matrícula no se regenera. Las
-- notas del alumno se borran en la misma transacción y su conteo queda en la
-- bitácora.
-- Espejo de supabase/migrations/20260817120000_corregir_plan_estudio.sql.

-- ⚠️ es_materia_tutorial() debe mantenerse en sincronía con esTutorial()
-- (acceso-materias.ts:95-97) — si cambia uno, cambia el otro. COALESCE a
-- false: ante NULL la materia NO se da por tutorial y la fila bloquea.
CREATE OR REPLACE FUNCTION public.es_materia_tutorial(p_nivel TEXT, p_nombre TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_nivel = 'demo', false)
      OR COALESCE(p_nombre ILIKE '%tutor%', false);
$$;

CREATE TABLE IF NOT EXISTS public.alumno_plan_eventos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id          UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  tipo               TEXT        NOT NULL DEFAULT 'correccion_plan'
                                 CHECK (tipo IN ('correccion_plan')),
  nivel_antes        TEXT,
  carrera_antes      TEXT,
  modalidad_antes    TEXT,
  nivel_despues      TEXT,
  carrera_despues    TEXT,
  modalidad_despues  TEXT,
  notas_borradas     INTEGER     NOT NULL DEFAULT 0,
  detalle            JSONB,
  -- Actor como PARÁMETRO desde el servidor, no auth.uid(): la función corre
  -- con service_role, donde auth.uid() es NULL (Bug 83).
  actor              UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumno_plan_eventos_alumno
  ON public.alumno_plan_eventos (alumno_id, created_at DESC);

-- Solo admin lee; nadie escribe por PostgREST (sin política de INSERT los
-- eventos solo los fabrica la función SECURITY DEFINER, que salta la RLS).
ALTER TABLE public.alumno_plan_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumno_plan_eventos: solo admin lee" ON public.alumno_plan_eventos;
CREATE POLICY "alumno_plan_eventos: solo admin lee" ON public.alumno_plan_eventos
  FOR SELECT TO authenticated
  USING (public.es_admin());

DO $g$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
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

-- Devuelve NULL si los seis candados están en cero, o el código del primero
-- que bloquea. Única fuente de verdad: la lee el GET de la ficha y la
-- re-ejecuta corregir_plan_estudio() dentro de su transacción. Los JOIN a
-- materias son LEFT: si el encadenamiento se rompe, es_materia_tutorial
-- recibe NULL, devuelve false y la fila bloquea (dirección segura).
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

  IF COALESCE(v_inscripcion, false)
     OR EXISTS (SELECT 1 FROM public.pagos WHERE alumno_id = p_alumno) THEN
    RETURN 'pagos';
  END IF;

  IF COALESCE(v_meses, 0) <> 0 THEN
    RETURN 'meses_desbloqueados';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.calificaciones c
      LEFT JOIN public.materias m ON m.id = c.materia_id
     WHERE c.alumno_id = p_alumno
       AND NOT public.es_materia_tutorial(m.nivel, m.nombre)
  ) THEN
    RETURN 'calificaciones';
  END IF;

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

  -- Un intento reprobado no deja calificación ni progreso: sin este candado
  -- pasaría los cuatro originales.
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

-- Todo o nada, en UNA transacción: candados → borrar notas → UPDATE del plan →
-- evento de bitácora. Si un candado bloquea devuelve {ok:false, candado} sin
-- haber escrito nada. La matrícula NO se toca.
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

  WITH borradas AS (
    DELETE FROM public.notas_alumno WHERE alumno_id = p_alumno RETURNING id
  )
  SELECT COUNT(*) INTO v_notas FROM borradas;

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

-- SECURITY DEFINER + EXECUTE abierto sería fuga inmediata (mismo racional del
-- bloque REVOKE de arriba y Bug 77: nombrar los tres roles).
REVOKE EXECUTE ON FUNCTION public.candado_corregir_plan(uuid)                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.corregir_plan_estudio(uuid, text, text, text, uuid)  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.candado_corregir_plan(uuid)                          TO service_role;
GRANT  EXECUTE ON FUNCTION public.corregir_plan_estudio(uuid, text, text, text, uuid)  TO service_role;

-- =============================================================
-- MÓDULOS OPCIONALES (no viven en este archivo)
-- =============================================================
-- schema.sql define el esquema BASE y debe poder correrse solo. Estos módulos
-- se aplican aparte, en este orden, y solo en los clientes que los contratan:
--
--   1. Cursos y Diplomados  → scripts/migracion-cursos-diplomados.sql
--      Crea cursos, curso_modulos, curso_lecciones, curso_inscripciones,
--      curso_progreso y el bucket privado 'cursos'.
--
--   2. Examen Final de Curso → supabase/migrations/20260728120000_examen_final_cursos.sql
--      Crea curso_examen_preguntas y curso_examen_resultados. Depende de (1)
--      porque ambas tienen FK a public.cursos, y por eso NO se declaran aquí:
--      hacerlo dejaría este archivo con una FK a una tabla que él no crea.
--      Requerido por la vertical "Cursos de Ingreso" (banco-cursos-ingreso).
-- =============================================================
