-- ============================================================================
-- B2 — GATE DE ACCESO POR INSCRIPCIÓN (la ventana de pago de Solo-Cursos)
-- ============================================================================
-- REGLA DE NEGOCIO:
--   módulos visibles = curso_inscripciones.meses_desbloqueados
--                    × cursos.modulos_por_mes
--   aplicado como TECHO ABSOLUTO sobre curso_modulos.orden.
--
-- POR QUÉ ESTO VIVE EN LA RLS Y NO SOLO EN LA APP:
--   El navegador tiene la anon key. Un gate que solo viva en las rutas de Next
--   es teatro: el alumno abre la consola y consulta PostgREST directo. La RLS es
--   la defensa REAL; el helper de TypeScript (src/lib/cursos/acceso.ts) es
--   defensa en profundidad y buena UX, no el candado.
--
-- LOS TRES MODOS DE FALLA QUE ESTE DISEÑO EVITA POR CONSTRUCCIÓN:
--
--   1. EL RATCHET (Bug 61). En el módulo de materias, los ítems ya acreditados
--      no consumían lugar en la ventana, así que cada acreditación revelaba el
--      siguiente y con 1 mes pagado se abría el programa entero. Aquí el límite
--      es un TECHO sobre `orden`: un módulo completado SIGUE OCUPANDO su
--      posición. Nada en estas funciones mira curso_progreso — y no es un
--      olvido, es la garantía. Si alguien añade un JOIN a progreso aquí, está
--      reintroduciendo el Bug 61.
--
--   2. DIVERGENCIA DE DESEMPATE. En materias el listado usaba `orden ?? 0` y el
--      gate `orden ?? 9999`, así que un `orden` NULL se listaba Y se bloqueaba a
--      la vez; en 142 clientes eso regaló una materia. Aquí: `orden` pasa a ser
--      NOT NULL (ver más abajo) y, como cinturón y tirantes, el fallback de NULL
--      es 2147483647 (max int4) — el análogo SQL de ORDEN_SIN_DEFINIR en
--      src/lib/acceso-materias.ts. NULL va al FINAL, o sea BLOQUEADO. Nunca 0,
--      que lo pondría primero y lo abriría.
--
--   3. GATES PARCIALES. Cerrar el listado y dejar abiertas quiz/material/
--      progreso deja el contenido saliendo por la puerta de atrás. Por eso la
--      ventana se mete en las políticas de curso_modulos, curso_lecciones y
--      storage.objects: todo lo que lee con la sesión del alumno queda cubierto
--      de una vez. Las rutas que usan service_role (los 3 endpoints de examen)
--      son invisibles a la RLS y llevan el gate en su código.
--
-- CONVENCIÓN DE `orden`: **0-BASED**, verificado en el código que lo escribe —
--   POST /api/admin/cursos/[id]/modulos asigna `(max(orden) ?? -1) + 1`, así que
--   el primer módulo es 0; y src/lib/cursos/reorder.ts renumera `orden = i` para
--   i en 0..n-1. Por eso la comparación es ESTRICTA (`<`):
--     1 mes × 2 módulos/mes = límite 2 → orden 0 y 1 visibles, orden 2 bloqueado.
--
-- IDEMPOTENTE Y RE-EJECUTABLE. No edita ninguna migración previa.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543).
-- ============================================================================

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.curso_modulos') IS NULL
     OR to_regclass('public.curso_inscripciones') IS NULL THEN
    RAISE EXCEPTION 'Falta el módulo de cursos. Corre antes scripts/migracion-cursos-diplomados.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='curso_inscripciones'
       AND column_name='meses_desbloqueados'
  ) THEN
    RAISE EXCEPTION 'Falta curso_inscripciones.meses_desbloqueados. Corre antes la migración B1.';
  END IF;
END
$preflight$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1) curso_modulos.orden pasa a NOT NULL
-- ════════════════════════════════════════════════════════════════════════════
-- Elimina en el origen la clase de bug del punto 2. El backfill NO usa 0:
-- poner 0 a un módulo sin orden lo mandaría al PRINCIPIO y lo ABRIRÍA. Se manda
-- al FINAL (max+1 dentro de su curso), que es la misma semántica que
-- ORDEN_SIN_DEFINIR y la dirección segura: si hay que equivocarse, que sea
-- dejándolo cerrado.
UPDATE public.curso_modulos m
   SET orden = sub.nuevo
  FROM (
    SELECT id,
           COALESCE(
             (SELECT MAX(m2.orden) FROM public.curso_modulos m2
               WHERE m2.curso_id = m3.curso_id AND m2.orden IS NOT NULL),
             -1
           ) + ROW_NUMBER() OVER (PARTITION BY m3.curso_id ORDER BY m3.id) AS nuevo
      FROM public.curso_modulos m3
     WHERE m3.orden IS NULL
  ) sub
 WHERE m.id = sub.id;

ALTER TABLE public.curso_modulos ALTER COLUMN orden SET NOT NULL;
ALTER TABLE public.curso_modulos ALTER COLUMN orden SET DEFAULT 0;

COMMENT ON COLUMN public.curso_modulos.orden IS
  'Posición 0-BASED del módulo dentro del curso. Es el eje de la ventana de '
  'pago: visible si orden < meses_desbloqueados × modulos_por_mes. NOT NULL a '
  'propósito — un NULL aquí fue lo que en el módulo de materias regaló una '
  'unidad extra en 142 clientes (divergencia ?? 0 vs ?? 9999).';


-- ════════════════════════════════════════════════════════════════════════════
-- 2) Funciones de la ventana
-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER + STABLE + SET search_path, el patrón ya endurecido de
-- es_admin() (Bug 38/43). SECURITY DEFINER es además lo que evita la recursión
-- del Bug 16: al correr como el dueño, las consultas internas NO vuelven a
-- disparar las políticas de las tablas que leen.

-- Techo de la ventana para (curso, alumno). 0 = sin acceso a nada.
-- FALLA CERRADO: si no hay inscripción, si el curso no está publicado, si la
-- inscripción no está vigente o si algún dato falta, COALESCE devuelve 0.
-- Nunca "sin dato = pase libre".
CREATE OR REPLACE FUNCTION public.curso_ventana_limite(p_curso_id UUID, p_alumno UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT ci.meses_desbloqueados * c.modulos_por_mes
      FROM public.curso_inscripciones ci
      JOIN public.cursos c ON c.id = ci.curso_id
     WHERE ci.curso_id  = p_curso_id
       AND ci.alumno_id = p_alumno
       -- 'activa' concede. 'completada' CONSERVA lo ya liberado y no abre más:
       -- meses_desbloqueados deja de moverse, así que el techo queda congelado.
       -- 'suspendida' y 'cancelada' NO conceden.
       AND ci.estado IN ('activa', 'completada')
       -- NULL = sin vencimiento. Fecha pasada = sin acceso.
       AND (ci.fecha_vencimiento IS NULL OR ci.fecha_vencimiento >= CURRENT_DATE)
       AND c.estado = 'publicado'
     LIMIT 1
  ), 0);
$$;

-- ¿El módulo cae dentro de la ventana del usuario en sesión?
-- 2147483647 = max int4, análogo SQL de ORDEN_SIN_DEFINIR: un orden NULL queda
-- AL FINAL y por tanto BLOQUEADO. (Tras el paso 1 ya no debería haber NULLs;
-- el COALESCE es el cinturón por si un cliente inserta a mano.)
--
-- ⚠️ NO MIRA curso_progreso, y eso es deliberado: el techo es sobre `orden`,
-- jamás un contador de pendientes. Ver el punto 1 del encabezado (Bug 61).
CREATE OR REPLACE FUNCTION public.curso_modulo_en_ventana(p_modulo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.curso_modulos m
     WHERE m.id = p_modulo_id
       AND COALESCE(m.orden, 2147483647)
           < public.curso_ventana_limite(m.curso_id, auth.uid())
  );
$$;

-- Igual, para una lección (cuelga de su módulo).
CREATE OR REPLACE FUNCTION public.curso_leccion_en_ventana(p_leccion_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.curso_lecciones l
     WHERE l.id = p_leccion_id
       AND public.curso_modulo_en_ventana(l.modulo_id)
  );
$$;

-- Variante por TEXTO para las políticas de Storage: el path puede venir
-- malformado y un cast a uuid lo tumbaría con un error. Comparando id::text un
-- path basura simplemente no matchea. Mismo criterio que la política original
-- del bucket.
CREATE OR REPLACE FUNCTION public.curso_leccion_en_ventana_txt(p_leccion_txt TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.curso_lecciones l
     WHERE l.id::text = p_leccion_txt
       AND public.curso_modulo_en_ventana(l.modulo_id)
  );
$$;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_ventana_limite(UUID, UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_modulo_en_ventana(UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_leccion_en_ventana(UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_leccion_en_ventana_txt(TEXT) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_ventana_limite(UUID, UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_modulo_en_ventana(UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_leccion_en_ventana(UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_leccion_en_ventana_txt(TEXT) TO service_role';
  END IF;
END
$grants$;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) Políticas con la ventana
-- ════════════════════════════════════════════════════════════════════════════
-- Antes: publicado + inscrito → TODOS los módulos. Ahora: además, dentro de la
-- ventana. La comprobación de publicado/inscrito no se pierde — vive dentro de
-- curso_ventana_limite(), que devuelve 0 si falta cualquiera de las dos.

DROP POLICY IF EXISTS "curso_modulos: select curso accesible o admin" ON public.curso_modulos;
DROP POLICY IF EXISTS "curso_modulos: select en ventana o admin"       ON public.curso_modulos;
CREATE POLICY "curso_modulos: select en ventana o admin" ON public.curso_modulos
  FOR SELECT TO authenticated
  USING (public.curso_modulo_en_ventana(id) OR public.es_admin());

DROP POLICY IF EXISTS "curso_lecciones: select curso accesible o admin" ON public.curso_lecciones;
DROP POLICY IF EXISTS "curso_lecciones: select en ventana o admin"      ON public.curso_lecciones;
CREATE POLICY "curso_lecciones: select en ventana o admin" ON public.curso_lecciones
  FOR SELECT TO authenticated
  USING (public.curso_modulo_en_ventana(modulo_id) OR public.es_admin());

-- curso_progreso: el alumno solo puede marcar progreso de lecciones que puede
-- ver. Sin esto, un alumno podría fabricar progreso de módulos no liberados
-- llamando PostgREST directo — no revela contenido, pero ensucia el avance y
-- el día que B4 emita diploma por porcentaje sería una vía para inflarlo.
DROP POLICY IF EXISTS "curso_progreso: insert propio"          ON public.curso_progreso;
DROP POLICY IF EXISTS "curso_progreso: insert propio en ventana" ON public.curso_progreso;
CREATE POLICY "curso_progreso: insert propio en ventana" ON public.curso_progreso
  FOR INSERT TO authenticated
  WITH CHECK (
    alumno_id = auth.uid()
    AND public.curso_leccion_en_ventana(leccion_id)
  );

DROP POLICY IF EXISTS "curso_progreso: update propio"           ON public.curso_progreso;
DROP POLICY IF EXISTS "curso_progreso: update propio en ventana" ON public.curso_progreso;
CREATE POLICY "curso_progreso: update propio en ventana" ON public.curso_progreso
  FOR UPDATE TO authenticated
  USING (alumno_id = auth.uid())
  WITH CHECK (
    alumno_id = auth.uid()
    AND public.curso_leccion_en_ventana(leccion_id)
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 4) Storage — el material PDF también respeta la ventana
-- ════════════════════════════════════════════════════════════════════════════
-- DECISIÓN: se enforcea por RLS de storage.objects, NO por una ruta server.
-- Motivo: las URLs firmadas ya se generan con la SESIÓN DEL ALUMNO
-- (src/lib/cursos/alumno-data.ts:11-15 usa el cliente de sesión, no el admin),
-- así que la política de storage.objects es el gate real y no hace falta mover
-- la firma a un endpoint. Sin esto, el agujero clásico: se gatea la UI y el
-- servidor sigue firmando la URL del PDF del módulo 3 — que además hoy se
-- entregan TODAS de golpe en una sola respuesta del detalle.
--
-- La PORTADA se queda gateada solo por inscripción, sin ventana: es la imagen
-- de tapa que el catálogo muestra del curso al que ya estás inscrito, no
-- contenido mensualizado. Bloquearla dejaría el catálogo en blanco.

DROP POLICY IF EXISTS "cursos: ver si inscrito o admin" ON storage.objects;
CREATE POLICY "cursos: ver si inscrito o admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cursos' AND (
      public.es_admin()
      -- Material de lección: {curso_id}/{leccion_id}/{archivo} — CON ventana.
      OR (
        (storage.foldername(name))[1] <> 'portadas'
        AND public.curso_leccion_en_ventana_txt((storage.foldername(name))[2])
      )
      -- Portada: portadas/{curso_id}/{archivo} — solo inscripción.
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

COMMIT;

-- ── Verificación manual (no altera nada) ────────────────────────────────────
-- 1) Techo de un alumno en un curso:
--   SELECT public.curso_ventana_limite('<curso>','<alumno>');
-- 2) Módulos que ese alumno debería ver:
--   SELECT nombre, orden FROM public.curso_modulos
--    WHERE curso_id='<curso>' AND orden < public.curso_ventana_limite('<curso>','<alumno>')
--    ORDER BY orden;
-- 3) Sin recursión (Bug 16) — debe salir vacío:
--   SELECT c.relname, p.polname FROM pg_policy p
--     JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
--    WHERE n.nspname='public' AND pg_get_expr(p.polqual,p.polrelid) ~* ('FROM\s+'||c.relname||'\M');
