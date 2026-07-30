-- ============================================================================
-- MIGRACIÓN: Módulo "Cursos y Diplomados" (plantilla maestra MEV)
-- ============================================================================
-- ORDEN: correr DESPUÉS de supabase/schema.sql (y del setup base). Idempotente.
-- Crea 5 tablas nuevas (curso_*) + el bucket privado 'cursos' (10MB). Cero ALTER
-- a tablas existentes. Ver e2e/README-QA.md para el smoke opcional de un curso demo.
--
-- Aplicar por el SQL Editor del Dashboard, o por conexión directa (puerto 5432,
-- NUNCA el pooler 6543):
--   psql "postgresql://postgres:<DB_PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
--        -v ON_ERROR_STOP=1 -f scripts/migracion-cursos-diplomados.sql
--
-- Diseño:
--   * 5 tablas NUEVAS, cero ALTER a tablas existentes.
--   * FK de alumno → public.alumnos(id); alumnos.id = usuarios.id =
--     auth.users.id, por lo que alumno_id se compara directo con auth.uid().
--     (Confirmar con la auditoría previa del runbook antes de aplicar.)
--   * RLS habilitado en las 5 tablas. Ninguna política referencia su propia
--     tabla (regla anti-recursión); las referencias cruzadas forman un DAG:
--     lecciones → modulos → cursos → inscripciones → (nada).
--   * es_admin(): NO se modifica AQUÍ. ⚠️ El comentario original de este
--     archivo afirmaba que ya cumplía Bug 43 (plpgsql + LOWER(rol)); eso era
--     cierto en UNA base de producción auditada el 2026-07-13, pero NO en la
--     plantilla, donde es LANGUAGE sql, sin LOWER() y sin search_path.
--     Lo corrige supabase/migrations/20260729121000_fix_s2_es_admin.sql (S2).
--   * FKs alumno_id con ON DELETE CASCADE: la spec no lo pide explícito, pero
--     es el patrón de todo el esquema existente (progreso_semanas,
--     calificaciones, etc. cascadan al borrar el alumno).
--   * TX1 (una transacción) = esquema + RLS + grants. La sección Storage va
--     DESPUÉS en autocommit (sin BEGIN): así el INSERT del bucket queda
--     commiteado aunque las CREATE POLICY sobre storage.objects fallen con
--     "must be owner of table objects" (en proyectos Supabase recientes
--     storage.objects pertenece a supabase_storage_admin y postgres no puede
--     hacer DDL ahí; el SQL Editor del Dashboard corre como postgres y
--     tampoco sirve — usar la UI: Storage → Policies).
--   * (Obsoleto — se deja el rastro a propósito.) Este bloque advertía que la
--     política SELECT de storage sería para TODO authenticated y que un alumno
--     no inscrito podría bajar materiales. Ya NO aplica: la política que este
--     archivo crea más abajo restringe por inscripción usando el primer
--     segmento del path. Además, desde 2026-07-29 esa política la REEMPLAZA
--     supabase/migrations/20260729122000_fix_portadas_storage_policy.sql, que
--     añade el caso de las portadas (portadas/{curso_id}/…) sin abrir el
--     acceso a nadie más. Corre esa migración DESPUÉS de este archivo.
-- ============================================================================

-- ══════════ TX1: función admin + tablas + índices + RLS + grants ══════════
BEGIN;

-- ── es_admin(): NO se toca AQUÍ ──
-- ⚠️ CORRECCIÓN (2026-07-29). El texto que estaba aquí afirmaba que es_admin()
-- ya era plpgsql SECURITY DEFINER STABLE con LOWER(rol) y que por eso no hacía
-- falta recrearla. Esa afirmación venía de auditar UNA base de producción
-- (2026-07-13) y NO es cierta para la plantilla: en supabase/schema.sql:411-421
-- es LANGUAGE sql, compara rol = 'admin' de forma exacta y no fija search_path.
-- Consecuencia real: un cliente nuevo sembrado desde este repo cuyo admin tenga
-- rol='ADMIN' en mayúsculas ve morir TODAS las políticas "admin all" de abajo.
-- El endurecimiento correcto (plpgsql + LOWER + search_path, también para
-- es_staff()) vive en supabase/migrations/20260729121000_fix_s2_es_admin.sql y
-- debe correrse junto con este archivo. Sigue sin recrearse aquí para no tener
-- dos fuentes de verdad de la misma función.

-- ── Tablas ──
CREATE TABLE IF NOT EXISTS public.cursos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT        NOT NULL,
  descripcion  TEXT,
  tipo         TEXT        NOT NULL CHECK (tipo IN ('curso', 'diplomado')),
  portada_path TEXT,
  estado       TEXT        NOT NULL DEFAULT 'borrador'
                           CHECK (estado IN ('borrador', 'publicado')),
  orden        INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.curso_modulos (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID    NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  nombre   TEXT    NOT NULL,
  orden    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.curso_lecciones (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id       UUID    NOT NULL REFERENCES public.curso_modulos(id) ON DELETE CASCADE,
  titulo          TEXT    NOT NULL,
  video_url       TEXT,
  contenido_texto TEXT,
  material_path   TEXT,
  orden           INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.curso_inscripciones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id   UUID        NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  alumno_id  UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (curso_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS public.curso_progreso (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  leccion_id    UUID        NOT NULL REFERENCES public.curso_lecciones(id) ON DELETE CASCADE,
  alumno_id     UUID        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  completada    BOOLEAN     NOT NULL DEFAULT true,
  completada_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (leccion_id, alumno_id)
);

-- ── Índices en FKs ──
-- curso_inscripciones.curso_id y curso_progreso.leccion_id ya quedan
-- cubiertos por el índice de sus UNIQUE (columna líder).
CREATE INDEX IF NOT EXISTS idx_curso_modulos_curso_id
  ON public.curso_modulos (curso_id);
CREATE INDEX IF NOT EXISTS idx_curso_lecciones_modulo_id
  ON public.curso_lecciones (modulo_id);
CREATE INDEX IF NOT EXISTS idx_curso_inscripciones_alumno_id
  ON public.curso_inscripciones (alumno_id);
CREATE INDEX IF NOT EXISTS idx_curso_progreso_alumno_id
  ON public.curso_progreso (alumno_id);

-- ── RLS ──
ALTER TABLE public.cursos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_modulos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_lecciones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_progreso      ENABLE ROW LEVEL SECURITY;

-- cursos: alumnos inscritos ven solo publicados; admin ve/gestiona todo
DROP POLICY IF EXISTS "cursos: select inscritos o admin" ON public.cursos;
CREATE POLICY "cursos: select inscritos o admin" ON public.cursos
  FOR SELECT TO authenticated
  USING (
    (
      estado = 'publicado'
      AND EXISTS (
        SELECT 1 FROM public.curso_inscripciones ci
        WHERE ci.curso_id = cursos.id AND ci.alumno_id = auth.uid()
      )
    )
    OR public.es_admin()
  );

DROP POLICY IF EXISTS "cursos: admin all" ON public.cursos;
CREATE POLICY "cursos: admin all" ON public.cursos
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- curso_modulos: visibles si el curso padre es accesible
DROP POLICY IF EXISTS "curso_modulos: select curso accesible o admin" ON public.curso_modulos;
CREATE POLICY "curso_modulos: select curso accesible o admin" ON public.curso_modulos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_modulos.curso_id
        AND c.estado = 'publicado'
        AND EXISTS (
          SELECT 1 FROM public.curso_inscripciones ci
          WHERE ci.curso_id = c.id AND ci.alumno_id = auth.uid()
        )
    )
    OR public.es_admin()
  );

DROP POLICY IF EXISTS "curso_modulos: admin all" ON public.curso_modulos;
CREATE POLICY "curso_modulos: admin all" ON public.curso_modulos
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- curso_lecciones: visibles si el curso del módulo padre es accesible
DROP POLICY IF EXISTS "curso_lecciones: select curso accesible o admin" ON public.curso_lecciones;
CREATE POLICY "curso_lecciones: select curso accesible o admin" ON public.curso_lecciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.curso_modulos m
      JOIN public.cursos c ON c.id = m.curso_id
      WHERE m.id = curso_lecciones.modulo_id
        AND c.estado = 'publicado'
        AND EXISTS (
          SELECT 1 FROM public.curso_inscripciones ci
          WHERE ci.curso_id = c.id AND ci.alumno_id = auth.uid()
        )
    )
    OR public.es_admin()
  );

DROP POLICY IF EXISTS "curso_lecciones: admin all" ON public.curso_lecciones;
CREATE POLICY "curso_lecciones: admin all" ON public.curso_lecciones
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- curso_inscripciones: cada alumno ve las suyas; admin gestiona todas
DROP POLICY IF EXISTS "curso_inscripciones: select propio o admin" ON public.curso_inscripciones;
CREATE POLICY "curso_inscripciones: select propio o admin" ON public.curso_inscripciones
  FOR SELECT TO authenticated
  USING (alumno_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "curso_inscripciones: admin all" ON public.curso_inscripciones;
CREATE POLICY "curso_inscripciones: admin all" ON public.curso_inscripciones
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- curso_progreso: el alumno gestiona su propio progreso; admin solo lee
DROP POLICY IF EXISTS "curso_progreso: select propio o admin" ON public.curso_progreso;
CREATE POLICY "curso_progreso: select propio o admin" ON public.curso_progreso
  FOR SELECT TO authenticated
  USING (alumno_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "curso_progreso: insert propio" ON public.curso_progreso;
CREATE POLICY "curso_progreso: insert propio" ON public.curso_progreso
  FOR INSERT TO authenticated
  WITH CHECK (alumno_id = auth.uid());

DROP POLICY IF EXISTS "curso_progreso: update propio" ON public.curso_progreso;
CREATE POLICY "curso_progreso: update propio" ON public.curso_progreso
  FOR UPDATE TO authenticated
  USING (alumno_id = auth.uid())
  WITH CHECK (alumno_id = auth.uid());

-- ── Grants (RLS decide las filas) ──
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.cursos, public.curso_modulos, public.curso_lecciones,
     public.curso_inscripciones, public.curso_progreso
  TO authenticated;

GRANT ALL
  ON public.cursos, public.curso_modulos, public.curso_lecciones,
     public.curso_inscripciones, public.curso_progreso
  TO service_role;

-- Supabase otorga grants a anon automáticamente vía ALTER DEFAULT PRIVILEGES;
-- se revocan explícitos (defensa en profundidad — RLS ya le niega toda fila).
REVOKE ALL
  ON public.cursos, public.curso_modulos, public.curso_lecciones,
     public.curso_inscripciones, public.curso_progreso
  FROM anon;

COMMIT;

-- ══════════ Storage — bucket privado 'cursos' (límite 10 MB) ══════════
-- SIN transacción (autocommit) a propósito: si las políticas fallan por
-- ownership de storage.objects, el bucket ya quedó creado y solo restaría
-- crear las 4 políticas desde la UI del Dashboard (Storage → Policies).
-- El front debe usar createSignedUrl (bucket privado), nunca getPublicUrl.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('cursos', 'cursos', false, 10485760)
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 10485760;

-- SELECT restringido a inscritos (o admin): el path es
-- cursos/{curso_id}/{leccion_id}/{archivo}, así que el curso_id es el primer
-- segmento (storage.foldername(name))[1]. Se compara curso_id::text contra ese
-- segmento (ambos text) en vez de castear el path a uuid: un path malformado
-- simplemente no matchea, en vez de tumbar la query con un error de cast.
DROP POLICY IF EXISTS "cursos storage: select authenticated" ON storage.objects;
DROP POLICY IF EXISTS "cursos: ver si inscrito o admin" ON storage.objects;
CREATE POLICY "cursos: ver si inscrito o admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cursos' AND (
      public.es_admin() OR
      EXISTS (
        SELECT 1 FROM public.curso_inscripciones ci
        WHERE ci.alumno_id = auth.uid()
          AND ci.curso_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "cursos storage: insert admin" ON storage.objects;
CREATE POLICY "cursos storage: insert admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cursos' AND public.es_admin());

DROP POLICY IF EXISTS "cursos storage: update admin" ON storage.objects;
CREATE POLICY "cursos storage: update admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cursos' AND public.es_admin())
  WITH CHECK (bucket_id = 'cursos' AND public.es_admin());

DROP POLICY IF EXISTS "cursos storage: delete admin" ON storage.objects;
CREATE POLICY "cursos storage: delete admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cursos' AND public.es_admin());
