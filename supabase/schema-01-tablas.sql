-- ============================================================
--  CEEVA — PARTE 1: EXTENSIONES + TABLAS BASE
--  Ejecutar primero en Supabase SQL Editor
-- ============================================================

-- ── EXTENSIONES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id     UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  folio         TEXT        UNIQUE NOT NULL,
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url_pdf       TEXT,
  materia_id    UUID        REFERENCES public.materias(id) ON DELETE SET NULL
);
