-- ============================================================================
-- F2 — Materiales (PDF) por semana
-- ============================================================================
-- El admin puede subir varios PDF por semana (guía, ejercicios, lectura) y el
-- alumno los descarga desde su materia.
--
-- TABLA, no columna: el módulo Cursos guarda UN material por lección en
--   curso_lecciones.material_path. Con una columna, subir el segundo archivo
--   borra el primero sin avisar. Una clase suele repartir varios.
--
-- BUCKET ADMIN-ONLY, a propósito. El bucket 'cursos' SÍ tiene una política que
--   reproduce en SQL la regla de "quién puede ver esto", y esa duplicación ya
--   costó un bug: las portadas salían en blanco solo para el ALUMNO —invisible
--   en cualquier QA hecho con cuenta de admin— porque la política y el path que
--   escribía el código no coincidían (ver
--   20260729122000_fix_portadas_storage_policy.sql).
--
--   Aquí el alumno NUNCA lee del bucket. Pide GET /api/material/[id], que reusa
--   tieneAccesoSemana() —la misma funcion que ya gatea el quiz— y firma la URL
--   con service role. La regla vive en un solo sitio y tiene pruebas.
--
-- IDEMPOTENTE: IF NOT EXISTS + DROP POLICY IF EXISTS. Re-ejecutable.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543). Si el DDL
-- sobre storage.objects falla con "must be owner of table objects", crear las
-- políticas desde la UI del Dashboard (Storage → Policies) con el mismo USING
-- — es la misma limitación de ownership que documenta el módulo de Cursos.
-- ============================================================================

-- ── Tabla ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semana_materiales (
    id            uuid DEFAULT gen_random_uuid() NOT NULL,
    semana_id     uuid NOT NULL,
    -- Nombre visible para el alumno. NO es el nombre en storage: ese va
    -- saneado y con timestamp para evitar colisiones y caracteres raros.
    nombre        text NOT NULL,
    path          text NOT NULL,
    tamano_bytes  bigint,
    orden         integer,
    created_at    timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT semana_materiales_pkey PRIMARY KEY (id),
    CONSTRAINT semana_materiales_semana_id_fkey
      FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_semana_materiales_semana
  ON public.semana_materiales (semana_id);

-- ── RLS: el mismo par que materias / meses_contenido / semanas / quiz_semana ─
ALTER TABLE public.semana_materiales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "semana_materiales: admin gestiona" ON public.semana_materiales;
CREATE POLICY "semana_materiales: admin gestiona"
  ON public.semana_materiales USING (public.es_admin());

-- Lectura de METADATOS (nombre, tamaño) para authenticated, igual que semanas.
-- El ARCHIVO no se abre con esto: vive en un bucket privado admin-only.
DROP POLICY IF EXISTS "semana_materiales: lectura autenticados" ON public.semana_materiales;
CREATE POLICY "semana_materiales: lectura autenticados"
  ON public.semana_materiales FOR SELECT
  USING ((auth.role() = 'authenticated'::text));

-- ── Bucket privado, 10 MB (mismo tope que 'cursos') ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('materias', 'materias', false, 10485760)
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 10485760;

-- ── Políticas de storage: SOLO admin, en las cuatro operaciones ─────────────
-- Deliberadamente NO hay política para el alumno. Ver el encabezado.
DROP POLICY IF EXISTS "materias: solo admin lee"     ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin escribe" ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin borra"   ON storage.objects;
DROP POLICY IF EXISTS "materias: solo admin actualiza" ON storage.objects;

CREATE POLICY "materias: solo admin lee" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin escribe" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin actualiza" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

CREATE POLICY "materias: solo admin borra" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materias' AND public.es_admin());

-- ── Verificación manual (no altera nada) ────────────────────────────────────
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'materias';
--   SELECT polname FROM pg_policy
--    WHERE polrelid = 'storage.objects'::regclass AND polname LIKE 'materias:%';
