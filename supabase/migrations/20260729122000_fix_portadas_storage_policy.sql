-- ============================================================================
-- T3 — La portada de un curso no se ve para el alumno (policy vs path)
-- ============================================================================
-- SÍNTOMA: en el catálogo y en la ficha del curso, la portada sale en blanco
--   para el ALUMNO. Para el admin se ve perfectamente, así que el defecto es
--   invisible en cualquier QA hecho con cuenta de administrador.
--
-- CAUSA: desajuste literal entre el path que escribe el código y el que exige
--   la política de Storage.
--
--   · La política "cursos: ver si inscrito o admin"
--     (scripts/migracion-cursos-diplomados.sql:253-264) exige que el PRIMER
--     segmento del path sea un curso_id:
--         ci.curso_id::text = (storage.foldername(name))[1]
--
--   · Pero las portadas se guardan en:
--         portadas/{cursoId}/{timestamp}-{archivo}
--     (src/lib/cursos/archivos.ts:65-68 y
--      src/app/api/admin/cursos/[id]/portada/route.ts:39)
--
--     con lo que (storage.foldername(name))[1] = 'portadas', la cadena
--     literal, que jamás va a igualar un UUID de curso. La RLS niega, y
--     createSignedUrl() devuelve null → portadaUrl null → sin imagen.
--
--   · El material de lección SÍ cumple el patrón esperado
--     ({cursoId}/{leccionId}/archivo — material/route.ts:53), por eso los PDF
--     sí funcionan y solo fallan las portadas.
--
-- DECISIÓN — se ajusta la POLÍTICA al path, no el path a la política:
--   Cambiar el código para escribir en {cursoId}/portada/... sería el arreglo
--   "más limpio" en abstracto, pero es el de MAYOR riesgo: la ruta ya está
--   persistida en cursos.portada_path de cada cliente que ya aplicó el módulo.
--   Cambiar el código dejaría huérfana toda portada existente y exigiría una
--   migración de datos + un movimiento de objetos en Storage, coordinado con
--   cada cliente. Ajustar la política es retrocompatible, no toca ningún dato,
--   y no requiere reubicar un solo objeto. Menor riesgo gana.
--
-- ALCANCE DEL ACCESO: la portada queda visible exactamente para quien ya podía
--   ver el curso — alumnos inscritos y admin. No se abre a todo authenticated.
--   Es coherente con el catálogo del alumno, que por RLS solo lista los cursos
--   en los que está inscrito.
--
-- EL BUCKET SIGUE SIENDO PRIVADO: esta migración no toca storage.buckets. El
--   bucket 'cursos' permanece public=false con límite de 10 MB
--   (scripts/migracion-cursos-diplomados.sql:241-244) y todo el consumo sigue
--   siendo por createSignedUrl() (src/lib/cursos/alumno-data.ts:13). No se
--   introduce ni un solo getPublicUrl.
--
-- IDEMPOTENTE: DROP POLICY IF EXISTS + CREATE POLICY, re-ejecutable.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543). Si falla
-- con "must be owner of table objects", crear la política desde la UI del
-- Dashboard (Storage → Policies) con el mismo USING de abajo — es la misma
-- limitación de ownership que documenta la migración original del módulo.
-- ============================================================================

-- SIN transacción, a propósito: mismo criterio que la migración original del
-- módulo. Si el DDL sobre storage.objects falla por ownership, no arrastra
-- nada más al rollback.

DROP POLICY IF EXISTS "cursos: ver si inscrito o admin" ON storage.objects;

CREATE POLICY "cursos: ver si inscrito o admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cursos' AND (
      public.es_admin()
      -- Material de lección:  {curso_id}/{leccion_id}/{archivo}
      OR EXISTS (
        SELECT 1 FROM public.curso_inscripciones ci
        WHERE ci.alumno_id = auth.uid()
          AND ci.curso_id::text = (storage.foldername(name))[1]
      )
      -- Portada del curso:    portadas/{curso_id}/{archivo}
      -- El curso_id es el SEGUNDO segmento en este caso.
      OR (
        (storage.foldername(name))[1] = 'portadas'
        AND EXISTS (
          SELECT 1 FROM public.curso_inscripciones ci
          WHERE ci.alumno_id = auth.uid()
            AND ci.curso_id::text = (storage.foldername(name))[2]
        )
      )
    )
  );

-- Se comparan textos, nunca se castea el path a uuid: un path malformado
-- simplemente no matchea, en vez de tumbar la query con un error de cast.
-- (Mismo criterio que la política original.)

-- Las políticas de INSERT/UPDATE/DELETE del bucket NO se tocan: ya son
-- solo-admin y cubren ambas formas de path sin distinción
-- (scripts/migracion-cursos-diplomados.sql:266-280).

-- ── Verificación manual (no altera nada) ────────────────────────────────────
--   SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
--     FROM pg_policy
--    WHERE polrelid = 'storage.objects'::regclass
--      AND polname = 'cursos: ver si inscrito o admin';
--
-- Comprobación funcional (como alumno inscrito, desde la app): la portada del
-- curso debe renderizar en /alumno/cursos y en /cursos/[id]. Antes de este fix
-- salía en blanco solo para el alumno.
