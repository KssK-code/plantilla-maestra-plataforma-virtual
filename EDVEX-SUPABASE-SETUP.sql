-- ============================================================
--  EDVEX Academy — Script de configuración de Supabase
--  Dominio: edvexacademy.online
--  Ejecutar en: Supabase SQL Editor (como superuser / postgres)
-- ============================================================
--
--  TABLAS DE SUPABASE AUTH (automáticas, NO tocar):
--    auth.users           → credenciales de login (email + password hash)
--    auth.sessions        → sesiones activas
--    auth.refresh_tokens  → tokens de refresco
--    auth.identities      → proveedores OAuth
--
--  TABLAS PROPIAS (public.*) creadas por este script:
--    usuarios             → perfil extendido vinculado a auth.users
--    planes_estudio       → planes de pago (Preparatoria 6 meses, etc.)
--    alumnos              → datos académicos del estudiante
--    meses_contenido      → estructura de meses del plan
--    materias             → materias dentro de cada mes
--    semanas              → semanas dentro de cada materia
--    evaluaciones         → exámenes de cada materia
--    preguntas            → preguntas de cada evaluación
--    intentos_evaluacion  → intentos de examen del alumno
--    calificaciones       → calificación final por materia y alumno
--    pagos                → registro de pagos por mes desbloqueado
-- ============================================================


-- ============================================================
-- 0. LIMPIEZA (ejecutar solo si se recrea desde cero)
-- ============================================================
-- DROP FUNCTION IF EXISTS recalcular_calificacion(UUID, UUID) CASCADE;
-- DROP FUNCTION IF EXISTS is_admin() CASCADE;
-- DROP TABLE IF EXISTS pagos                CASCADE;
-- DROP TABLE IF EXISTS calificaciones       CASCADE;
-- DROP TABLE IF EXISTS intentos_evaluacion  CASCADE;
-- DROP TABLE IF EXISTS preguntas            CASCADE;
-- DROP TABLE IF EXISTS evaluaciones         CASCADE;
-- DROP TABLE IF EXISTS semanas              CASCADE;
-- DROP TABLE IF EXISTS materias             CASCADE;
-- DROP TABLE IF EXISTS meses_contenido      CASCADE;
-- DROP TABLE IF EXISTS alumnos              CASCADE;
-- DROP TABLE IF EXISTS planes_estudio       CASCADE;
-- DROP TABLE IF EXISTS usuarios             CASCADE;


-- ============================================================
-- 1. TABLA: usuarios
--    Extiende auth.users con datos del perfil y rol.
--    El id DEBE coincidir con auth.users.id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL,
  nombre_completo  TEXT        NOT NULL,
  rol              TEXT        NOT NULL CHECK (rol IN ('ADMIN','ALUMNO')),
  activo           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol    ON public.usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_email  ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios (activo);


-- ============================================================
-- 2. TABLA: planes_estudio
--    Catálogo de planes académicos disponibles.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.planes_estudio (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT        NOT NULL,
  duracion_meses   INTEGER     NOT NULL CHECK (duracion_meses > 0),
  precio_mensual   NUMERIC(10,2) NOT NULL CHECK (precio_mensual >= 0),
  activo           BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_planes_activo ON public.planes_estudio (activo);


-- ============================================================
-- 3. TABLA: alumnos
--    Datos académicos y de avance del estudiante.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alumnos (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID        NOT NULL UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
  matricula             TEXT        NOT NULL UNIQUE,
  plan_estudio_id       UUID        NOT NULL REFERENCES public.planes_estudio(id),
  meses_desbloqueados   INTEGER     NOT NULL DEFAULT 0 CHECK (meses_desbloqueados >= 0),
  calificacion_promedio NUMERIC(5,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumnos_usuario_id      ON public.alumnos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_plan_estudio_id ON public.alumnos (plan_estudio_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_matricula       ON public.alumnos (matricula);


-- ============================================================
-- 4. TABLA: meses_contenido
--    Cada fila es un mes del plan (Mes 1, Mes 2, …).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meses_contenido (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  numero  INTEGER NOT NULL UNIQUE CHECK (numero > 0),
  titulo  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meses_numero ON public.meses_contenido (numero);


-- ============================================================
-- 5. TABLA: materias
--    Cada mes puede tener varias materias.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materias (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_contenido_id UUID    NOT NULL REFERENCES public.meses_contenido(id) ON DELETE CASCADE,
  codigo           TEXT    NOT NULL UNIQUE,  -- e.g. "MAT-101"
  nombre           TEXT    NOT NULL,
  color_hex        TEXT    NOT NULL DEFAULT '#0055ff',
  descripcion      TEXT    NOT NULL DEFAULT '',
  objetivo         TEXT    NOT NULL DEFAULT '',
  temario          TEXT[]  NOT NULL DEFAULT '{}',
  bibliografia     JSONB   NOT NULL DEFAULT '[]'  -- [{titulo, url}, …]
);

CREATE INDEX IF NOT EXISTS idx_materias_mes_contenido_id ON public.materias (mes_contenido_id);
CREATE INDEX IF NOT EXISTS idx_materias_codigo           ON public.materias (codigo);


-- ============================================================
-- 6. TABLA: semanas
--    Cada materia se divide en semanas con contenido y videos.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.semanas (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id  UUID    NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL CHECK (numero > 0),
  titulo      TEXT    NOT NULL,
  contenido   TEXT    NOT NULL DEFAULT '',  -- HTML / Markdown
  videos      JSONB   NOT NULL DEFAULT '[]' -- [{titulo, url, duracion}, …]
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_semanas_materia_numero ON public.semanas (materia_id, numero);
CREATE        INDEX IF NOT EXISTS idx_semanas_materia_id     ON public.semanas (materia_id);


-- ============================================================
-- 7. TABLA: evaluaciones
--    Examen(es) de cada materia.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id   UUID    NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  titulo       TEXT    NOT NULL,
  tipo         TEXT    NOT NULL DEFAULT 'FINAL' CHECK (tipo IN ('FINAL','PARCIAL','PRACTICA')),
  porcentaje   NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (porcentaje > 0 AND porcentaje <= 100),
  intentos_max INTEGER NOT NULL DEFAULT 3 CHECK (intentos_max > 0),
  activa       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_materia_id ON public.evaluaciones (materia_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_activa     ON public.evaluaciones (activa);


-- ============================================================
-- 8. TABLA: preguntas
--    Banco de preguntas de cada evaluación.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.preguntas (
  id                 UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id      UUID     NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  numero             INTEGER  NOT NULL CHECK (numero > 0),
  texto              TEXT     NOT NULL,
  tipo               TEXT     NOT NULL CHECK (tipo IN ('OPCION_MULTIPLE','VERDADERO_FALSO')),
  opciones           TEXT[]   NOT NULL,           -- ["opción A","opción B",…]
  respuesta_correcta INTEGER  NOT NULL,           -- índice base-0 de la opción correcta
  retroalimentacion  TEXT     NOT NULL DEFAULT '',
  puntos             NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (puntos > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_preguntas_evaluacion_numero ON public.preguntas (evaluacion_id, numero);
CREATE        INDEX IF NOT EXISTS idx_preguntas_evaluacion_id     ON public.preguntas (evaluacion_id);


-- ============================================================
-- 9. TABLA: intentos_evaluacion
--    Registro de cada intento de examen del alumno.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intentos_evaluacion (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id       UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  evaluacion_id   UUID        NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  respuestas      JSONB       NOT NULL DEFAULT '{}',  -- {pregunta_id: indice_respuesta}
  calificacion    NUMERIC(5,2) NOT NULL DEFAULT 0,
  aprobado        BOOLEAN     NOT NULL DEFAULT FALSE,
  tiempo_segundos INTEGER     NOT NULL DEFAULT 0,
  intento_numero  INTEGER     NOT NULL CHECK (intento_numero > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intentos_alumno_id     ON public.intentos_evaluacion (alumno_id);
CREATE INDEX IF NOT EXISTS idx_intentos_evaluacion_id ON public.intentos_evaluacion (evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_intentos_alumno_eval   ON public.intentos_evaluacion (alumno_id, evaluacion_id);


-- ============================================================
-- 10. TABLA: calificaciones
--     Calificación final consolidada por materia y alumno.
--     Se actualiza automáticamente vía la función recalcular_calificacion().
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calificaciones (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id         UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  materia_id        UUID        NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  calificacion_final NUMERIC(5,2) NOT NULL DEFAULT 0,
  aprobada          BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (alumno_id, materia_id)  -- requerida para el ON CONFLICT del UPSERT
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_alumno_id  ON public.calificaciones (alumno_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_materia_id ON public.calificaciones (materia_id);


-- ============================================================
-- 11. TABLA: pagos
--     Registro de cada pago por mes desbloqueado.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pagos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  monto            NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  mes_desbloqueado INTEGER     NOT NULL CHECK (mes_desbloqueado > 0),
  metodo_pago      TEXT        NOT NULL,  -- 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA', etc.
  referencia       TEXT,                  -- número de referencia / folio (nullable)
  registrado_por   UUID        NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_alumno_id  ON public.pagos (alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_created_at ON public.pagos (created_at DESC);


-- ============================================================
-- 12. FUNCIÓN AUXILIAR: is_admin()
--     Verifica si el usuario autenticado tiene rol ADMIN.
--     Se usa en las políticas RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.usuarios
    WHERE  id  = auth.uid()
      AND  rol = 'ADMIN'
  );
$$;


-- ============================================================
-- 13. FUNCIÓN: recalcular_calificacion(alumno_id, materia_id)
--     Llamada desde la API tras cada envío de evaluación.
--     Toma el mejor intento, hace upsert en calificaciones y
--     actualiza el promedio general del alumno.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_calificacion(
  p_alumno_id  UUID,
  p_materia_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mejor_calificacion NUMERIC(5,2);
  v_aprobada           BOOLEAN;
BEGIN
  -- Mejor calificación entre todos los intentos de evaluaciones de esta materia
  SELECT COALESCE(MAX(ie.calificacion), 0)
  INTO   v_mejor_calificacion
  FROM   public.intentos_evaluacion ie
  JOIN   public.evaluaciones ev ON ev.id = ie.evaluacion_id
  WHERE  ie.alumno_id  = p_alumno_id
    AND  ev.materia_id = p_materia_id;

  v_aprobada := v_mejor_calificacion >= 6.0;

  -- Upsert en calificaciones
  INSERT INTO public.calificaciones (alumno_id, materia_id, calificacion_final, aprobada)
  VALUES (p_alumno_id, p_materia_id, v_mejor_calificacion, v_aprobada)
  ON CONFLICT (alumno_id, materia_id) DO UPDATE SET
    calificacion_final = EXCLUDED.calificacion_final,
    aprobada           = EXCLUDED.aprobada;

  -- Actualizar promedio general del alumno
  UPDATE public.alumnos
  SET    calificacion_promedio = (
    SELECT ROUND(AVG(calificacion_final)::NUMERIC, 2)
    FROM   public.calificaciones
    WHERE  alumno_id = p_alumno_id
  )
  WHERE  id = p_alumno_id;
END;
$$;


-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
--     Service role key siempre omite RLS.
--     Las políticas cubren el cliente normal (authenticated users).
-- ============================================================

-- Habilitar RLS en todas las tablas públicas
ALTER TABLE public.usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_estudio      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_contenido     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semanas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos               ENABLE ROW LEVEL SECURITY;


-- ── usuarios ──────────────────────────────────────────────────────────────────
-- Cada usuario lee/actualiza su propio perfil.
-- Los admins leen cualquier perfil (operaciones de gestión usan service role,
-- pero algunos checks de autenticación usan el cliente normal).
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
CREATE POLICY usuarios_update ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- INSERT y DELETE solo vía service role (no se necesitan políticas)


-- ── planes_estudio ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS planes_select ON public.planes_estudio;
CREATE POLICY planes_select ON public.planes_estudio
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS planes_insert ON public.planes_estudio;
CREATE POLICY planes_insert ON public.planes_estudio
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS planes_update ON public.planes_estudio;
CREATE POLICY planes_update ON public.planes_estudio
  FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS planes_delete ON public.planes_estudio;
CREATE POLICY planes_delete ON public.planes_estudio
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- ── alumnos ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS alumnos_select ON public.alumnos;
CREATE POLICY alumnos_select ON public.alumnos
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS alumnos_update ON public.alumnos;
CREATE POLICY alumnos_update ON public.alumnos
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- INSERT solo vía service role


-- ── meses_contenido ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS meses_select ON public.meses_contenido;
CREATE POLICY meses_select ON public.meses_contenido
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS meses_write ON public.meses_contenido;
CREATE POLICY meses_write ON public.meses_contenido
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── materias ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS materias_select ON public.materias;
CREATE POLICY materias_select ON public.materias
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS materias_write ON public.materias;
CREATE POLICY materias_write ON public.materias
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── semanas ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS semanas_select ON public.semanas;
CREATE POLICY semanas_select ON public.semanas
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS semanas_write ON public.semanas;
CREATE POLICY semanas_write ON public.semanas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── evaluaciones ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS evaluaciones_select ON public.evaluaciones;
CREATE POLICY evaluaciones_select ON public.evaluaciones
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS evaluaciones_write ON public.evaluaciones;
CREATE POLICY evaluaciones_write ON public.evaluaciones
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── preguntas ─────────────────────────────────────────────────────────────────
-- Todos los usuarios autenticados pueden leer preguntas.
-- IMPORTANTE: Las columnas respuesta_correcta y retroalimentacion se filtran
-- en la API (no se exponen al cliente cuando es un alumno tomando el examen).
DROP POLICY IF EXISTS preguntas_select ON public.preguntas;
CREATE POLICY preguntas_select ON public.preguntas
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS preguntas_write ON public.preguntas;
CREATE POLICY preguntas_write ON public.preguntas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── intentos_evaluacion ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS intentos_select ON public.intentos_evaluacion;
CREATE POLICY intentos_select ON public.intentos_evaluacion
  FOR SELECT TO authenticated
  USING (
    alumno_id = (SELECT id FROM public.alumnos WHERE usuario_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS intentos_insert ON public.intentos_evaluacion;
CREATE POLICY intentos_insert ON public.intentos_evaluacion
  FOR INSERT TO authenticated
  WITH CHECK (
    alumno_id = (SELECT id FROM public.alumnos WHERE usuario_id = auth.uid())
  );


-- ── calificaciones ────────────────────────────────────────────────────────────
-- INSERT/UPDATE se hace vía recalcular_calificacion() (SECURITY DEFINER), no por el cliente.
DROP POLICY IF EXISTS calificaciones_select ON public.calificaciones;
CREATE POLICY calificaciones_select ON public.calificaciones
  FOR SELECT TO authenticated
  USING (
    alumno_id = (SELECT id FROM public.alumnos WHERE usuario_id = auth.uid())
    OR public.is_admin()
  );


-- ── pagos ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pagos_select ON public.pagos;
CREATE POLICY pagos_select ON public.pagos
  FOR SELECT TO authenticated
  USING (
    alumno_id = (SELECT id FROM public.alumnos WHERE usuario_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS pagos_insert ON public.pagos;
CREATE POLICY pagos_insert ON public.pagos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());


-- ============================================================
-- 15. DATOS INICIALES: planes_estudio
-- ============================================================
INSERT INTO public.planes_estudio (nombre, duracion_meses, precio_mensual, activo) VALUES
  ('Preparatoria',  6,  1200.00, TRUE),
  ('Secundaria',    3,   900.00, TRUE),
  ('Diplomado Pro', 2,  1500.00, TRUE),
  ('Diplomado Básico', 1, 800.00, TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 16. DATOS INICIALES: estructura de contenido (6 meses)
--     Ajusta los títulos según los programas reales de EDVEX.
-- ============================================================
INSERT INTO public.meses_contenido (numero, titulo) VALUES
  (1, 'Mes 1 — Fundamentos'),
  (2, 'Mes 2 — Desarrollo'),
  (3, 'Mes 3 — Profundización'),
  (4, 'Mes 4 — Aplicación'),
  (5, 'Mes 5 — Integración'),
  (6, 'Mes 6 — Certificación')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 17. CÓMO CREAR EL PRIMER USUARIO ADMINISTRADOR
-- ============================================================
--
-- PASO 1: En Supabase Dashboard → Authentication → Users
--         Crea el usuario con email y contraseña.
--         Copia el UUID que genera (lo llamamos <ADMIN_UUID>).
--
-- PASO 2: Ejecuta el siguiente INSERT reemplazando los valores:
--
--   INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo)
--   VALUES (
--     '<ADMIN_UUID>',          -- UUID de auth.users
--     'admin@edvexacademy.online',
--     'Administrador EDVEX',
--     'ADMIN',
--     TRUE
--   );
--
-- PASO 3: Confirma que puedes iniciar sesión con ese email/contraseña
--         en la plataforma. El sistema detectará el rol ADMIN y
--         redirigirá al panel de administración (/admin).
--
-- NOTA: También puedes crear el admin vía la API de servicio:
--
--   const { data } = await supabaseAdmin.auth.admin.createUser({
--     email: 'admin@edvexacademy.online',
--     password: 'TuContraseñaSegura123!',
--     email_confirm: true,
--   })
--   await supabaseAdmin.from('usuarios').insert({
--     id: data.user.id,
--     email: 'admin@edvexacademy.online',
--     nombre_completo: 'Administrador EDVEX',
--     rol: 'ADMIN',
--     activo: true,
--   })
--


-- ============================================================
-- 18. VARIABLES DE ENTORNO REQUERIDAS en .env.local
-- ============================================================
--
--   NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
--   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   ← solo en servidor
--
-- La service role key se obtiene en:
--   Supabase Dashboard → Settings → API → service_role key
-- NUNCA expongas esta clave en el frontend.
--


-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
