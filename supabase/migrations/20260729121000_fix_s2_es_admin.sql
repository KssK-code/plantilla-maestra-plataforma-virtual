-- ============================================================================
-- S2 — es_admin() / es_staff(): cumplir Bug 43 de verdad
-- ============================================================================
-- SÍNTOMA: si el administrador tiene el rol guardado en mayúsculas
--   (usuarios.rol = 'ADMIN'), TODAS las políticas "admin all" del módulo
--   Cursos y Diplomados evalúan false y el panel de administración de cursos
--   queda muerto: no se pueden crear cursos, ni módulos, ni lecciones, ni
--   inscribir alumnos. El síntoma se ve como "no tengo permisos" sin más.
--
-- CAUSA: public.es_admin() compara el rol de forma EXACTA y sensible a
--   mayúsculas: WHERE rol = 'admin'. El patrón rol='ADMIN' es real en la flota
--   (ver EDVEX-SUPABASE-SETUP.sql:260, que compara contra 'ADMIN'), y del lado
--   de la app conviven tres normalizaciones distintas del mismo concepto:
--     · src/lib/supabase/verify-admin.ts:18   →  toUpperCase() === 'ADMIN'
--     · src/app/api/alumno/cursos/[id]/route.ts:36 →  toLowerCase() === 'admin'
--     · la RLS                                →  rol = 'admin' exacto
--   Con rol='ADMIN', las dos primeras dejan pasar y la tercera no: la app cree
--   que eres admin y la base de datos cree que no.
--
-- COMENTARIO MENTIROSO QUE ORIGINÓ ESTO: scripts/migracion-cursos-diplomados.sql
--   (líneas 21-22 y 44-48) afirma por escrito que "es_admin() YA es plpgsql
--   SECURITY DEFINER STABLE con LOWER(rol)" y por eso decide NO tocarla. Esa
--   afirmación venía de una auditoría de UNA base de producción (2026-07-13) y
--   NO es cierta para la plantilla: aquí es LANGUAGE sql, sin LOWER() y sin
--   SET search_path (supabase/schema.sql:411-421). Un cliente nuevo sembrado
--   desde este repo nace con la versión frágil. El comentario se corrige en el
--   mismo PR para que no vuelva a inducir a error.
--
-- FIX: redefinir ambas funciones al patrón endurecido:
--     LANGUAGE plpgsql · STABLE · SECURITY DEFINER · SET search_path = public
--     y comparar con LOWER(rol).
--
-- POR QUÉ ES SEGURO: añadir LOWER() es ESTRICTAMENTE PERMISIVO. Todo usuario
--   que hoy matchea rol = 'admin' sigue matcheando LOWER(rol) = 'admin'. Nadie
--   pierde acceso; solo dejan de perderlo quienes lo tenían escrito en otra
--   caja. No hay que revisar ninguna política una por una: el conjunto de
--   filas que devuelven las políticas solo puede crecer, nunca encogerse.
--
-- SE INCLUYE es_staff() aunque S2 hablaba solo de es_admin(): tiene el defecto
--   idéntico (rol IN ('admin','secretario') exacto, y en supabase/schema.sql:426
--   además LANGUAGE sql sin search_path) y es la función que gobierna al rol
--   SECRETARIO. Arreglar una y dejar la otra reproduce exactamente la
--   inconsistencia de endurecimiento que este PR viene a cerrar.
--
-- NO SE TOCA is_admin(): ya cumple (LANGUAGE sql, SECURITY DEFINER, STABLE,
--   SET search_path = public — supabase/schema.sql:778-786) y es un simple
--   wrapper que delega en es_admin(), así que hereda el fix automáticamente.
--   Las 7 tablas curso_* usan las dos: la base llama es_admin() y la del examen
--   llama is_admin(). Ambas quedan cubiertas por esta migración.
--
-- IDEMPOTENTE: CREATE OR REPLACE conserva el OID; las políticas que ya
--   referencian estas funciones siguen apuntando a ellas sin recrearse.
--   Cambiar LANGUAGE sql → plpgsql está permitido en CREATE OR REPLACE
--   (no cambia el tipo de retorno ni la firma).
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543):
--   psql "postgresql://postgres:<PASS>@db.<REF>.supabase.co:5432/postgres" \
--        -v ON_ERROR_STOP=1 -f supabase/migrations/20260729121000_fix_s2_es_admin.sql
-- ============================================================================

BEGIN;

-- ── es_admin() ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
     WHERE id = auth.uid()
       AND LOWER(rol) = 'admin'
  );
END;
$$;

-- ── es_staff() ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
     WHERE id = auth.uid()
       AND LOWER(rol) IN ('admin', 'secretario')
  );
END;
$$;

-- Los GRANT de EXECUTE ya existen para estas funciones desde el schema base;
-- se re-otorgan por si un cliente los perdió. Idempotente.
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_staff() TO anon, authenticated;

COMMIT;

-- ── Verificación manual (no altera nada) ────────────────────────────────────
-- 1) Las dos funciones deben salir plpgsql / STABLE / SECURITY DEFINER, y su
--    prosrc debe contener LOWER:
--   SELECT p.proname, l.lanname, p.provolatile, p.prosecdef,
--          p.proconfig, position('LOWER' in upper(p.prosrc)) > 0 AS usa_lower
--     FROM pg_proc p
--     JOIN pg_language l ON l.oid = p.prolang
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname IN ('es_admin','es_staff','is_admin');
--
-- 2) Quién queda cubierto por el fix (roles escritos en otra caja):
--   SELECT id, email, rol FROM public.usuarios WHERE rol <> LOWER(rol);
