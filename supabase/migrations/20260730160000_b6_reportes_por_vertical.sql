-- B6 — Reportes con desglose por vertical.
--
-- Cierra las dos deudas de reporteo que dejó B3 y agrega los datos del vertical
-- de cursos, que hoy no aparecen en ningún reporte.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- LA FUENTE DE VERDAD PARA SEPARAR VERTICALES: pagos.curso_inscripcion_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Hay dos candidatos para decidir si un pago es "de curso": la FK
-- `curso_inscripcion_id` y el `concepto` ('curso_mensualidad' etc.). Se elige
-- la FK, y no es una preferencia estética:
--
--   1. `concepto` es TEXT sin CHECK en la base. Un typo ('curso_mensualdad'),
--      un cliente que escriba 'Curso_Mensualidad' o un INSERT hecho a mano
--      clasifican mal para siempre y en silencio. La FK no puede tener un typo:
--      o apunta a una inscripción que existe, o el INSERT falla.
--   2. La FK hace que el desglose CUADRE POR CONSTRUCCIÓN. Con
--      programa := (FK IS NULL) y cursos := (FK IS NOT NULL), las dos
--      particiones son complementarias y exhaustivas: programa + cursos = total
--      SIEMPRE, sin importar qué diga el concepto. Con `concepto` como criterio,
--      un valor no contemplado se caería de los dos lados y el total dejaría de
--      cuadrar sin que nadie lo notara.
--   3. B3 (`curso_registrar_pago`) es el ÚNICO escritor de pagos de curso y
--      siempre puebla la FK; el endpoint tradicional (/api/admin/pagos) nunca
--      la toca. La FK ya es, de hecho, el discriminante.
--
-- PERO no se confía a ciegas: `reporte_coherencia_pagos()` compara los dos
-- criterios y cuenta las filas donde se contradicen. Un pago con concepto
-- 'curso_*' y FK NULL se contaría como ingreso del programa — clasificación
-- silenciosamente equivocada. La función la vuelve VISIBLE en vez de dejarla
-- enterrada. Se reporta como dato, no se "corrige" sola: adivinar la intención
-- de una fila incoherente es justo lo que no debe hacer un reporte.
--
-- IDEMPOTENTE Y RE-EJECUTABLE.
--
-- ⚠️ POR QUÉ HAY DROP FUNCTION Y NO SOLO CREATE OR REPLACE: las dos funciones
-- de ingresos GANAN COLUMNAS en su RETURNS TABLE, y Postgres no permite cambiar
-- el tipo de retorno con CREATE OR REPLACE ("cannot change return type of
-- existing function"). Hay que soltarlas y recrearlas. El DROP se lleva los
-- grants, así que el bloque de REVOKE/GRANT del final NO es decorativo: sin él,
-- las funciones quedan ejecutables por PUBLIC.
-- `estado_cuenta_alumnos` NO cambia de firma (solo cambia el cuerpo), así que
-- para esa sí basta CREATE OR REPLACE.

-- ── PREFLIGHT ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='pagos' AND column_name='curso_inscripcion_id'
  ) THEN
    RAISE EXCEPTION 'Falta pagos.curso_inscripcion_id. Corre antes B1 (20260730120000).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='pagos' AND column_name='fecha_pago'
  ) THEN
    RAISE EXCEPTION 'Falta pagos.fecha_pago. Corre antes 20260717120000_pagos_fecha_pago.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='curso_constancias'
  ) THEN
    RAISE EXCEPTION 'Falta curso_constancias. Corre antes B1 (20260730120000).';
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- T1 — INGRESOS CON DESGLOSE POR VERTICAL
-- ═══════════════════════════════════════════════════════════════════════════
-- `total` se conserva con el mismo nombre y significado que antes: es la suma
-- de TODO. Quien ya lo lee no se entera del cambio. `programa` y `cursos` se
-- agregan.

DROP FUNCTION IF EXISTS public.reporte_ingresos_semanales(integer);

CREATE FUNCTION public.reporte_ingresos_semanales(num_semanas integer DEFAULT 8)
RETURNS TABLE (semana_inicio date, total numeric, programa numeric, cursos numeric)
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
         COALESCE(SUM(p.monto), 0)::numeric AS total,
         -- El `p.id IS NOT NULL` no sobra: en las semanas SIN pagos el LEFT JOIN
         -- deja p.* en NULL, y "p.curso_inscripcion_id IS NULL" sería TRUE para
         -- esa fila fantasma. Sin el guardia, una semana vacía entraría al
         -- FILTER de programa (suma NULL, no rompe el número, pero el predicado
         -- estaría mintiendo y el siguiente que lo edite se lleva la sorpresa).
         COALESCE(SUM(p.monto) FILTER (WHERE p.id IS NOT NULL AND p.curso_inscripcion_id IS NULL), 0)::numeric     AS programa,
         COALESCE(SUM(p.monto) FILTER (WHERE p.id IS NOT NULL AND p.curso_inscripcion_id IS NOT NULL), 0)::numeric AS cursos
    FROM semanas s
    LEFT JOIN public.pagos p
      ON date_trunc('week', p.fecha_pago) = s.inicio
   GROUP BY s.inicio
   ORDER BY s.inicio;
$$;

DROP FUNCTION IF EXISTS public.reporte_ingresos_mensuales(integer);

CREATE FUNCTION public.reporte_ingresos_mensuales(num_meses integer DEFAULT 6)
RETURNS TABLE (mes text, total numeric, programa numeric, cursos numeric)
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
         COALESCE(SUM(p.monto), 0)::numeric AS total,
         COALESCE(SUM(p.monto) FILTER (WHERE p.id IS NOT NULL AND p.curso_inscripcion_id IS NULL), 0)::numeric     AS programa,
         COALESCE(SUM(p.monto) FILTER (WHERE p.id IS NOT NULL AND p.curso_inscripcion_id IS NOT NULL), 0)::numeric AS cursos
    FROM meses m
    LEFT JOIN public.pagos p
      ON date_trunc('month', p.fecha_pago) = m.inicio
   GROUP BY m.inicio
   ORDER BY m.inicio;
$$;

-- Detector de incoherencia entre los dos criterios. NO corrige nada: reporta.
CREATE OR REPLACE FUNCTION public.reporte_coherencia_pagos()
RETURNS TABLE (
  -- concepto dice "curso" pero no hay inscripción enlazada: se está contando
  -- como ingreso del PROGRAMA.
  concepto_curso_sin_inscripcion integer,
  -- hay inscripción enlazada pero el concepto es de programa: se cuenta como
  -- ingreso de CURSOS (la FK manda) y el concepto quedó mal escrito.
  inscripcion_con_concepto_programa integer
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE p.concepto LIKE 'curso\_%' AND p.curso_inscripcion_id IS NULL)::integer,
    COUNT(*) FILTER (WHERE p.concepto NOT LIKE 'curso\_%' AND p.curso_inscripcion_id IS NOT NULL)::integer
  FROM public.pagos p;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- T2 — estado_cuenta_alumnos: fecha_ultimo_pago habla SOLO del programa
-- ═══════════════════════════════════════════════════════════════════════════
-- La función se contradecía a sí misma: `meses_con_pago` filtra por
-- concepto='mensualidad' (correcto), pero `fecha_ultimo_pago` sumaba TODOS los
-- pagos. Un alumno del programa que pagara un diplomado aparecía con
-- «Último pago: hoy» en la misma fila cuyo badge decía «N meses sin pago
-- registrado». Dos columnas de la misma fila afirmando cosas contrarias.
--
-- Este es el estado de cuenta DEL PROGRAMA. Los pagos de curso del alumno se
-- ven en la vista de su inscripción (B3, GET /api/admin/inscripciones/[id],
-- que lista los pagos con curso_inscripcion_id = esa inscripción). No se
-- duplican aquí.
--
-- Criterio de separación: el MISMO de T1 (la FK), por las razones de arriba.
-- La firma no cambia: mismas 12 columnas, mismos tipos, mismo orden.

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
         AND p.curso_inscripcion_id IS NULL
       GROUP BY p.alumno_id
    ) mp ON mp.alumno_id = a.id
    LEFT JOIN (
      SELECT p.alumno_id, MAX(p.fecha_pago)::timestamptz AS fecha_ultimo_pago
        FROM public.pagos p
       WHERE p.curso_inscripcion_id IS NULL   -- ← B6: solo pagos del programa
       GROUP BY p.alumno_id
    ) up ON up.alumno_id = a.id
   WHERE a.activo = true
   ORDER BY u.nombre, u.apellidos;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- T3 — DATOS DEL VERTICAL DE CURSOS PARA REPORTES
-- ═══════════════════════════════════════════════════════════════════════════

-- Inscripciones a cursos, con la misma aritmética de ventana que usa el gate
-- de B2 (meses abiertos × módulos_por_mes, topado por los módulos del curso).
CREATE OR REPLACE FUNCTION public.reporte_curso_inscripciones()
RETURNS TABLE (
  inscripcion_id uuid,
  alumno text,
  matricula text,
  email text,
  diplomado text,
  tipo text,
  estado text,
  fecha_inscripcion timestamptz,
  meses_abiertos integer,
  tope_meses integer,
  modulos_visibles integer,
  modulos_totales integer,
  fecha_vencimiento date
)
LANGUAGE sql STABLE
AS $$
  SELECT i.id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.email, '—'),
         a.matricula,
         u.email,
         c.nombre,
         c.tipo,
         i.estado,
         i.fecha_inscripcion,
         i.meses_desbloqueados,
         public.curso_tope_meses(c.id),
         LEAST(
           i.meses_desbloqueados * GREATEST(c.modulos_por_mes, 0),
           (SELECT COUNT(*) FROM public.curso_modulos m WHERE m.curso_id = c.id)
         )::integer,
         (SELECT COUNT(*) FROM public.curso_modulos m WHERE m.curso_id = c.id)::integer,
         i.fecha_vencimiento
    FROM public.curso_inscripciones i
    JOIN public.cursos   c ON c.id = i.curso_id
    JOIN public.alumnos  a ON a.id = i.alumno_id
    JOIN public.usuarios u ON u.id = a.id
   ORDER BY c.nombre, u.nombre, u.apellidos;
$$;

-- Pagos del vertical de cursos. La FK manda (ver arriba); `concepto` se muestra
-- tal cual está guardado, sin normalizar, para que una incoherencia se vea.
CREATE OR REPLACE FUNCTION public.reporte_curso_pagos()
RETURNS TABLE (
  pago_id uuid,
  fecha_pago date,
  alumno text,
  matricula text,
  diplomado text,
  concepto text,
  monto numeric,
  metodo_pago text,
  referencia text,
  registrado_por text,
  mes_que_abrio integer
)
LANGUAGE sql STABLE
AS $$
  SELECT p.id,
         p.fecha_pago,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.email, '—'),
         a.matricula,
         c.nombre,
         p.concepto,
         p.monto,
         p.metodo_pago,
         p.referencia,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ru.nombre, ru.apellidos)), ''), ru.email, '—'),
         p.mes_desbloqueado
    FROM public.pagos p
    JOIN public.curso_inscripciones i ON i.id = p.curso_inscripcion_id
    JOIN public.cursos   c  ON c.id = i.curso_id
    JOIN public.alumnos  a  ON a.id = p.alumno_id
    JOIN public.usuarios u  ON u.id = a.id
    LEFT JOIN public.usuarios ru ON ru.id = p.registrado_por
   WHERE p.curso_inscripcion_id IS NOT NULL
   ORDER BY p.fecha_pago DESC, p.created_at DESC;
$$;

-- Constancias emitidas. Se leen los SNAPSHOTS de curso_constancias (B4), no un
-- JOIN a alumnos/cursos: el diploma dice lo que decía el día que se emitió,
-- aunque el alumno se haya cambiado el nombre después.
CREATE OR REPLACE FUNCTION public.reporte_curso_constancias()
RETURNS TABLE (
  folio text,
  alumno_nombre text,
  curso_nombre text,
  calificacion numeric,
  horas integer,
  emitido_en timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT k.folio,
         k.alumno_nombre,
         k.curso_nombre,
         k.calificacion,
         k.horas,
         k.emitido_en
    FROM public.curso_constancias k
   ORDER BY k.emitido_en DESC;
$$;

-- Avance por inscripción activa.
--
-- ⚠️ EL DENOMINADOR ES EL CURSO ENTERO, no lo que el alumno tiene abierto. Es
-- la lección que dejó B2: al filtrar las lecciones por la ventana de pago, el
-- denominador encogía y un alumno con 1 de 6 meses pagados salía al 100%. Aquí
-- se cuentan TODAS las lecciones del curso, con el cliente admin, y solo
-- números — ningún contenido de lección sale de esta función.
CREATE OR REPLACE FUNCTION public.reporte_curso_avance()
RETURNS TABLE (
  inscripcion_id uuid,
  alumno text,
  matricula text,
  diplomado text,
  lecciones_completadas integer,
  lecciones_totales integer,
  porcentaje integer
)
LANGUAGE sql STABLE
AS $$
  WITH tot AS (
    SELECT m.curso_id, COUNT(l.id)::integer AS n
      FROM public.curso_modulos m
      LEFT JOIN public.curso_lecciones l ON l.modulo_id = m.id
     GROUP BY m.curso_id
  ), hechas AS (
    SELECT m.curso_id, pr.alumno_id, COUNT(*)::integer AS n
      FROM public.curso_progreso pr
      JOIN public.curso_lecciones l ON l.id = pr.leccion_id
      JOIN public.curso_modulos   m ON m.id = l.modulo_id
     WHERE pr.completada
     GROUP BY m.curso_id, pr.alumno_id
  )
  SELECT i.id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.email, '—'),
         a.matricula,
         c.nombre,
         COALESCE(h.n, 0),
         COALESCE(t.n, 0),
         CASE WHEN COALESCE(t.n, 0) > 0
              THEN ROUND(COALESCE(h.n, 0)::numeric * 100 / t.n)::integer
              ELSE 0 END
    FROM public.curso_inscripciones i
    JOIN public.cursos   c ON c.id = i.curso_id
    JOIN public.alumnos  a ON a.id = i.alumno_id
    JOIN public.usuarios u ON u.id = a.id
    LEFT JOIN tot    t ON t.curso_id = c.id
    LEFT JOIN hechas h ON h.curso_id = c.id AND h.alumno_id = i.alumno_id
   WHERE i.estado = 'activa'
   ORDER BY c.nombre, u.nombre, u.apellidos;
$$;


-- ── GRANTS ──────────────────────────────────────────────────────────────────
-- OBLIGATORIO tras los DROP de arriba: soltar una función se lleva sus grants,
-- y una función recreada nace ejecutable por PUBLIC. Se re-aplica el bloque
-- completo (incluidas las que solo se reemplazaron) para que el estado final
-- no dependa de qué migraciones ya habían corrido.
--
-- SECURITY INVOKER en todas, a propósito: el endpoint admin las llama con
-- service_role. Si algún día se expusieran, la RLS de cada tabla sigue
-- aplicando para quien las invoque.
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.estado_cuenta_alumnos()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_coherencia_pagos()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_curso_inscripciones()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_curso_pagos()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_curso_constancias()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_curso_avance()               FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.estado_cuenta_alumnos()               TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_coherencia_pagos()            TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_curso_inscripciones()         TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_curso_pagos()                 TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_curso_constancias()           TO service_role;
GRANT EXECUTE ON FUNCTION public.reporte_curso_avance()                TO service_role;
