-- ============================================================================
-- B3 — "ABRIR MES" + PAGOS POR INSCRIPCIÓN (línea Solo-Cursos)
-- ============================================================================
-- B2 dejó el gate cerrado: el alumno ve
--   curso_inscripciones.meses_desbloqueados × cursos.modulos_por_mes
-- módulos, como techo sobre curso_modulos.orden. B3 construye la palanca que
-- mueve ese número. EL GATE NO SE TOCA — reacciona solo en cuanto el contador
-- cambia, tanto en RLS como en el helper de TypeScript.
--
-- POR QUÉ ESTO SON FUNCIONES DE POSTGRES Y NO CÓDIGO DE LA RUTA:
--   1. ATOMICIDAD. "Registrar el pago y abrir el mes" tiene que ser todo o nada,
--      y son dos tablas. El cliente de Supabase no expone transacciones
--      multi-sentencia, así que hacerlo desde la ruta dejaría la puerta abierta
--      a cobrar sin abrir, o a abrir sin cobrar, si algo falla en medio.
--   2. DOBLE CLIC. El "Abrir Mes" del flujo tradicional
--      (api/admin/alumnos/[id]/desbloquear-mes) hace leer-y-luego-escribir: dos
--      peticiones concurrentes leen el mismo valor y ambas escriben N+1. Ahí
--      queda en N+1 por casualidad, no por diseño. Aquí se usa
--      COMPARE-AND-SWAP: el UPDATE exige el valor esperado en su propio WHERE,
--      así que es una única sentencia atómica y el segundo clic no encuentra
--      fila que actualizar.
--
-- Todas son SECURITY DEFINER + SET search_path (patrón endurecido de es_admin(),
-- Bugs 38/43) y COMPRUEBAN EL ROL ADENTRO: al ser DEFINER se saltan la RLS, así
-- que si no validaran quién llama, un alumno podría abrirse los meses solo.
--
-- IDEMPOTENTE Y RE-EJECUTABLE. No edita ninguna migración previa.
-- ============================================================================

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.curso_inscripciones') IS NULL THEN
    RAISE EXCEPTION 'Falta public.curso_inscripciones. Corre antes las migraciones del módulo de cursos.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='curso_inscripciones'
       AND column_name='meses_desbloqueados'
  ) THEN
    RAISE EXCEPTION 'Falta curso_inscripciones.meses_desbloqueados. Corre antes B1.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='pagos' AND column_name='curso_inscripcion_id'
  ) THEN
    RAISE EXCEPTION 'Falta pagos.curso_inscripcion_id. Corre antes B1.';
  END IF;
END
$preflight$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1) Tope de meses de un curso
-- ════════════════════════════════════════════════════════════════════════════
-- Si cursos.duracion_meses está definida, manda ella. Si es NULL, el tope sale
-- del contenido: ceil(total_módulos / modulos_por_mes) — abrir más meses que
-- eso no revelaría nada, así que se rechaza en vez de dejar crecer un contador
-- que ya no significa nada.
CREATE OR REPLACE FUNCTION public.curso_tope_meses(p_curso_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(
      c.duracion_meses,
      CEIL(
        (SELECT COUNT(*) FROM public.curso_modulos m WHERE m.curso_id = c.id)::numeric
        / NULLIF(c.modulos_por_mes, 0)
      )::integer
    ),
    0
  )
  FROM public.cursos c
  WHERE c.id = p_curso_id;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) Abrir mes — compare-and-swap
-- ════════════════════════════════════════════════════════════════════════════
-- p_meses_esperados es el valor que el admin TENÍA a la vista al pulsar. Si
-- alguien ya lo movió (doble clic, dos pestañas, dos secretarias), el UPDATE no
-- encuentra fila y se devuelve un error explícito en vez de incrementar dos
-- veces. Pasar NULL desactiva la comprobación (para llamadas programáticas que
-- no vienen de un botón).
CREATE OR REPLACE FUNCTION public.curso_abrir_mes(
  p_inscripcion_id  UUID,
  p_meses_esperados INTEGER DEFAULT NULL
)
RETURNS TABLE (meses_desbloqueados INTEGER, tope INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curso   UUID;
  v_actual  INTEGER;
  v_estado  TEXT;
  v_tope    INTEGER;
  v_nuevo   INTEGER;
BEGIN
  -- La función es SECURITY DEFINER: sin esto, cualquiera podría abrirse meses.
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede abrir meses.'
      USING ERRCODE = '42501';
  END IF;

  SELECT ci.curso_id, ci.meses_desbloqueados, ci.estado
    INTO v_curso, v_actual, v_estado
    FROM public.curso_inscripciones ci
   WHERE ci.id = p_inscripcion_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF v_estado <> 'activa' THEN
    RAISE EXCEPTION
      'No se pueden abrir meses en una inscripción %. Reactívala primero (estado = activa).',
      v_estado
      USING ERRCODE = '22023';
  END IF;

  IF p_meses_esperados IS NOT NULL AND p_meses_esperados <> v_actual THEN
    RAISE EXCEPTION
      'La inscripción ya tiene % meses abiertos (esperabas %). Recarga la pantalla: alguien más la movió o el botón se pulsó dos veces.',
      v_actual, p_meses_esperados
      USING ERRCODE = '40001';
  END IF;

  v_tope := public.curso_tope_meses(v_curso);

  IF v_actual >= v_tope THEN
    RAISE EXCEPTION
      'Este curso llega hasta % meses y la inscripción ya los tiene todos abiertos. No hay más contenido que liberar.',
      v_tope
      USING ERRCODE = '22023';
  END IF;

  v_nuevo := v_actual + 1;

  UPDATE public.curso_inscripciones ci
     SET meses_desbloqueados = v_nuevo
   WHERE ci.id = p_inscripcion_id;

  RETURN QUERY SELECT v_nuevo, v_tope;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) Cerrar mes — para corregir errores
-- ════════════════════════════════════════════════════════════════════════════
-- REVOCA acceso que el alumno ya tenía. La UI debe pedir confirmación explícita;
-- aquí solo se garantiza que nunca baje de 0.
CREATE OR REPLACE FUNCTION public.curso_cerrar_mes(
  p_inscripcion_id  UUID,
  p_meses_esperados INTEGER DEFAULT NULL
)
RETURNS TABLE (meses_desbloqueados INTEGER, tope INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curso  UUID;
  v_actual INTEGER;
  v_nuevo  INTEGER;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cerrar meses.' USING ERRCODE = '42501';
  END IF;

  SELECT ci.curso_id, ci.meses_desbloqueados
    INTO v_curso, v_actual
    FROM public.curso_inscripciones ci
   WHERE ci.id = p_inscripcion_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF p_meses_esperados IS NOT NULL AND p_meses_esperados <> v_actual THEN
    RAISE EXCEPTION
      'La inscripción ya tiene % meses abiertos (esperabas %). Recarga la pantalla.',
      v_actual, p_meses_esperados
      USING ERRCODE = '40001';
  END IF;

  IF v_actual <= 0 THEN
    RAISE EXCEPTION 'La inscripción no tiene meses abiertos: no hay nada que cerrar.'
      USING ERRCODE = '22023';
  END IF;

  v_nuevo := v_actual - 1;

  UPDATE public.curso_inscripciones ci
     SET meses_desbloqueados = v_nuevo
   WHERE ci.id = p_inscripcion_id;

  RETURN QUERY SELECT v_nuevo, public.curso_tope_meses(v_curso);
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4) Registrar pago Y abrir mes — atómico
-- ════════════════════════════════════════════════════════════════════════════
-- El caso real: el alumno pagó y el admin hace las dos cosas. Si una falla,
-- ninguna se aplica — dentro de una función plpgsql todo corre en la misma
-- transacción, así que una excepción en cualquier punto revierte ambas.
--
-- ⚠️ CONCEPTO SEPARADO, y no es cosmético. La vista estado_cuenta_alumnos
-- (20260716160000) cuenta los meses pagados del PROGRAMA con
--   WHERE p.concepto = 'mensualidad' ... COUNT(DISTINCT p.mes_desbloqueado)
-- Si un pago de diplomado usara ese mismo concepto, el alumno aparecería al
-- corriente del programa tradicional por haber pagado un curso. Por eso los
-- pagos de curso usan 'curso_mensualidad' / 'curso_inscripcion'. Gracias a eso,
-- mes_desbloqueado se puede reutilizar aquí con el significado "mes DEL CURSO
-- que cubre este pago" sin contaminar ese conteo.
--
-- ⚠️ PERO EL BLINDAJE NO ES TOTAL, y conviene no creerse más de lo que es: esa
-- misma vista tiene una SEGUNDA subconsulta, fecha_ultimo_pago, que hace
-- MAX(created_at) sobre TODOS los pagos del alumno SIN filtrar por concepto
-- (20260716160000_estado_cuenta.sql:47-51). Un alumno del programa que pague un
-- diplomado aparecerá con "Último pago: hoy" en la misma fila cuyo badge sigue
-- diciendo "N meses sin pago registrado". Lo que queda protegido es el CONTEO
-- de meses, no la fecha.
CREATE OR REPLACE FUNCTION public.curso_registrar_pago(
  p_inscripcion_id UUID,
  p_monto          NUMERIC,
  p_metodo_pago    TEXT,
  p_concepto       TEXT DEFAULT 'curso_mensualidad',
  p_referencia     TEXT DEFAULT NULL,
  p_fecha_pago     DATE DEFAULT NULL,
  p_abrir_mes      BOOLEAN DEFAULT TRUE,
  p_meses_esperados INTEGER DEFAULT NULL
)
RETURNS TABLE (pago_id UUID, meses_desbloqueados INTEGER, tope INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alumno UUID;
  v_curso  UUID;
  v_meses  INTEGER;
  v_tope   INTEGER;
  v_pago   UUID;
BEGIN
  -- es_staff() ya incluye a admin. El secretario PUEDE registrar pagos, igual
  -- que en el módulo tradicional (POST /api/admin/pagos usa verifyStaff).
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Solo el personal puede registrar pagos.' USING ERRCODE = '42501';
  END IF;

  -- ⚠️ Pero ABRIR MES es admin-only, igual que desbloquear-mes del flujo
  -- tradicional. Sin esta comprobación explícita, un secretario entraba aquí,
  -- pasaba el filtro de arriba y reventaba doce líneas después contra el
  -- es_admin() de curso_abrir_mes — con un 403 que hablaba de abrir meses
  -- cuando lo que pidió fue registrar un pago. El resultado práctico era que el
  -- secretario no podía cobrar en absoluto.
  IF p_abrir_mes AND NOT public.es_admin() THEN
    RAISE EXCEPTION
      'Puedes registrar el pago, pero abrir el mes es cosa de un administrador. Regístralo sin abrir mes y pide que lo abran.'
      USING ERRCODE = '42501';
  END IF;

  IF p_concepto NOT IN ('curso_mensualidad', 'curso_inscripcion', 'curso_otro') THEN
    RAISE EXCEPTION 'Concepto de pago de curso inválido: %. Usa curso_mensualidad, curso_inscripcion u curso_otro.', p_concepto
      USING ERRCODE = '22023';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0.' USING ERRCODE = '22023';
  END IF;

  SELECT ci.alumno_id, ci.curso_id INTO v_alumno, v_curso
    FROM public.curso_inscripciones ci
   WHERE ci.id = p_inscripcion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La inscripción no existe.' USING ERRCODE = 'P0002';
  END IF;

  -- Abrir el mes PRIMERO: si el tope o el estado lo rechazan, la excepción
  -- revierte también el pago. Al revés se cobraría y luego se fallaría.
  --
  -- ⚠️ SOLO la mensualidad libera contenido. La cuota de INSCRIPCIÓN no abre
  -- mes: es el cargo por darse de alta, no por un mes de curso. Antes esta
  -- condición miraba únicamente p_abrir_mes (que viene TRUE por defecto), así
  -- que cobrar la inscripción regalaba un mes de contenido — y encima guardaba
  -- mes_desbloqueado = NULL, dejando el regalo sin rastro en la bitácora.
  IF p_abrir_mes AND p_concepto = 'curso_mensualidad' THEN
    SELECT a.meses_desbloqueados, a.tope INTO v_meses, v_tope
      FROM public.curso_abrir_mes(p_inscripcion_id, p_meses_esperados) a;
  ELSE
    SELECT ci.meses_desbloqueados INTO v_meses
      FROM public.curso_inscripciones ci WHERE ci.id = p_inscripcion_id;
    v_tope := public.curso_tope_meses(v_curso);
  END IF;

  INSERT INTO public.pagos (
    alumno_id, monto, concepto, mes_desbloqueado, metodo_pago, referencia,
    registrado_por, curso_inscripcion_id, fecha_pago
  ) VALUES (
    v_alumno,
    p_monto,
    p_concepto,
    -- Para una mensualidad de curso guarda QUÉ MES cubre; para inscripción/otro
    -- no aplica.
    -- Qué mes del curso cubre este pago. Solo tiene sentido si se abrió mes,
    -- y abrir mes ya implica concepto = 'curso_mensualidad' (ver arriba).
    CASE WHEN p_abrir_mes AND p_concepto = 'curso_mensualidad' THEN v_meses ELSE NULL END,
    UPPER(p_metodo_pago),
    NULLIF(BTRIM(COALESCE(p_referencia, '')), ''),
    auth.uid(),
    p_inscripcion_id,
    COALESCE(p_fecha_pago, CURRENT_DATE)
  )
  RETURNING id INTO v_pago;

  RETURN QUERY SELECT v_pago, v_meses, v_tope;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 5) Borrar módulo compactando `orden` — atómico
-- ════════════════════════════════════════════════════════════════════════════
-- Hoy borrar un módulo deja un hueco en `orden`, y el hueco corre el mes de
-- liberación: con modulos_por_mes = 2 y órdenes 0,1,3,4, un alumno de 1 mes ve
-- los órdenes 0 y 1 (bien), pero si se borra el de orden 1 quedan 0,2,3 y solo
-- ve el 0 — UN módulo en vez de dos. El error va EN CONTRA del alumno, que es
-- la peor dirección posible para equivocarse en un candado de pago.
--
-- Borra y renumera en la misma transacción. `orden` es solo posición: nada lo
-- referencia. curso_progreso, curso_lecciones y el material de Storage cuelgan
-- de IDs, así que compactar no los toca (las lecciones del módulo borrado sí se
-- van, por el ON DELETE CASCADE que ya existía).
CREATE OR REPLACE FUNCTION public.curso_borrar_modulo(p_modulo_id UUID)
RETURNS TABLE (curso_id UUID, modulos_restantes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curso UUID;
  v_n     INTEGER;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede borrar módulos.' USING ERRCODE = '42501';
  END IF;

  SELECT m.curso_id INTO v_curso FROM public.curso_modulos m WHERE m.id = p_modulo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El módulo no existe.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.curso_modulos WHERE id = p_modulo_id;

  -- Renumerado 0-based contiguo, respetando el orden actual y desempatando por
  -- id para que sea estable (mismo criterio que src/lib/cursos/reorder.ts).
  WITH ordenados AS (
    SELECT m.id, (ROW_NUMBER() OVER (ORDER BY m.orden, m.id) - 1)::integer AS nuevo
      FROM public.curso_modulos m
     WHERE m.curso_id = v_curso
  )
  UPDATE public.curso_modulos m
     SET orden = o.nuevo
    FROM ordenados o
   WHERE m.id = o.id AND m.orden <> o.nuevo;

  SELECT COUNT(*) INTO v_n FROM public.curso_modulos m WHERE m.curso_id = v_curso;

  RETURN QUERY SELECT v_curso, v_n;
END;
$$;


-- ── Grants ──────────────────────────────────────────────────────────────────
-- Estas funciones son SECURITY DEFINER y validan el rol adentro, así que dar
-- EXECUTE a authenticated no concede nada: un alumno que las llame recibe el
-- 42501. Se otorga porque el panel las invoca con la sesión del admin.
DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_tope_meses(UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_abrir_mes(UUID, INTEGER) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_cerrar_mes(UUID, INTEGER) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_registrar_pago(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE, BOOLEAN, INTEGER) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_borrar_modulo(UUID) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_tope_meses(UUID) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_abrir_mes(UUID, INTEGER) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_cerrar_mes(UUID, INTEGER) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_registrar_pago(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE, BOOLEAN, INTEGER) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.curso_borrar_modulo(UUID) TO service_role';
  END IF;
END
$grants$;

COMMIT;

-- ── Verificación manual ─────────────────────────────────────────────────────
--   SELECT public.curso_tope_meses('<curso>');
--   SELECT * FROM public.curso_abrir_mes('<inscripcion>', 0);   -- 0 -> 1
--   SELECT * FROM public.curso_abrir_mes('<inscripcion>', 0);   -- 40001: doble clic
