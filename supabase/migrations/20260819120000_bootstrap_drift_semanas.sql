-- ============================================================================
-- 20260819120000_bootstrap_drift_semanas.sql
--
-- Alinea el bootstrap `supabase/schema.sql` con el instalador canónico
-- `scripts/schema.sql`. Tres columnas de `semanas` vivían SOLO en el segundo.
--
-- CONTEXTO (Bug 99 del PLAYBOOK, hallazgo lateral)
-- ─────────────────────────────────────────────────
-- La plantilla tiene DOS instaladores de esquema y no eran equivalentes:
--
--   · `scripts/schema.sql`  → línea tradicional. Lo aplica `mev-onboarding.py`
--     (TAREA 3, paso 1), `SETUP.md`, `INSTRUCCIONES-NUEVO-CLIENTE.md` y
--     `scripts/README.md`. Se mantiene A MANO.
--   · `supabase/schema.sql` → línea Solo-Cursos (`INSTRUCCIONES-SOLO-CURSOS.md`)
--     y desarrollo local con la cadena de migraciones.
--
-- El segundo NO declaraba `semanas.contenido`, `semanas.video_url_2` ni
-- `semanas.video_url_3`, aunque el código de la app SÍ las lee:
--   · `src/app/api/alumno/materia/[id]/route.ts:61` hace SELECT de las tres de `semanas`
--   · `src/app/(dashboard)/admin/contenido/[id]/page.tsx` edita video_url_2/3
--
-- Ningún cliente de producción quedó roto: el onboarding siempre usó
-- `scripts/schema.sql`. La exposición era (a) desarrollo local y (b) un cliente
-- Solo-Cursos que después encendiera el programa tradicional o licenciaturas.
--
-- Esta migración cubre las bases YA instaladas por la ruta `supabase/`; el
-- bootstrap se corrigió en el mismo PR para que una instalación desde cero
-- nazca alineada sin depender de ella.
--
-- Todo es ADD COLUMN IF NOT EXISTS: en una base al día no cambia nada, y es
-- re-ejecutable. No toca RLS — las políticas de `semanas` son agnósticas de
-- columna: `auth.role()='authenticated'` para SELECT y `es_admin()` para ALL.
-- ============================================================================

-- ── semanas ─────────────────────────────────────────────────────────────────
-- `contenido` es el cuerpo de la lección. Vive aquí, NO en `materias`: el
-- lector cae a `descripcion` si viene NULL (route.ts:90).
ALTER TABLE public.semanas ADD COLUMN IF NOT EXISTS contenido   TEXT;

-- Videos 2 y 3: el panel de contenido del admin los edita, y
-- `scripts/seed-contenido-ivs.sql` los escribe. Sin ellas ese seed muere con
-- `column "video_url_2" does not exist`.
ALTER TABLE public.semanas ADD COLUMN IF NOT EXISTS video_url_2 TEXT;
ALTER TABLE public.semanas ADD COLUMN IF NOT EXISTS video_url_3 TEXT;

COMMENT ON COLUMN public.semanas.contenido IS
  'Cuerpo de la lección en markdown. El lector cae a `descripcion` si es NULL.';
COMMENT ON COLUMN public.semanas.video_url_2 IS
  'Video de apoyo adicional. Opcional; lo edita el panel de contenido del admin.';
COMMENT ON COLUMN public.semanas.video_url_3 IS
  'Tercer video de apoyo. Opcional; lo edita el panel de contenido del admin.';

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN tras aplicar
-- ============================================================================
--   SELECT table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND (table_name, column_name) IN (
--       ('semanas','contenido'), ('semanas','video_url_2'),
--       ('semanas','video_url_3'))
--   ORDER BY 1, 2;
--   -- Deben salir las 3 filas.
-- ============================================================================
