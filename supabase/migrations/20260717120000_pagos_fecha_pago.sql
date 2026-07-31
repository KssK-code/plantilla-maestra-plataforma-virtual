-- Panel Admin Unificado: fecha_pago editable en pagos (Bug 57 - módulo V6).
-- Antes la fecha del pago era created_at (momento de captura), sin posibilidad de
-- registrar pagos con fecha real/retroactiva. Se agrega la columna fecha_pago
-- (DATE, editable desde el panel admin) y se migran a ella todas las lecturas y
-- agregaciones (recibo, listados, reportes de ingresos, estado de cuenta).

-- 1) Columna fecha_pago. Idempotente y sin pisar datos:
--    se agrega nullable, se rellena desde created_at (zona MX) y luego se fija
--    default + NOT NULL. Re-ejecutable: el backfill solo toca filas NULL.
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS fecha_pago DATE;

UPDATE public.pagos
   SET fecha_pago = (created_at AT TIME ZONE 'America/Mexico_City')::date
 WHERE fecha_pago IS NULL;

ALTER TABLE public.pagos ALTER COLUMN fecha_pago SET DEFAULT CURRENT_DATE;
ALTER TABLE public.pagos ALTER COLUMN fecha_pago SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago ON public.pagos (fecha_pago DESC);

-- 2) Reportes de ingresos: agrupar por fecha_pago (DATE) en vez de created_at.
--    fecha_pago no tiene zona horaria, así que se elimina el AT TIME ZONE.
-- ⚠️ `DROP IF EXISTS` por la misma razón que en 20260716150000: B6 amplía estas
-- funciones a cuatro columnas y sin esto el replay de la cadena muere aquí
-- (Bug 80). No-op en instalación fresca. Los grants se re-aplican al final de
-- este mismo archivo, así que el DROP no deja la función abierta (Bug 77).
DROP FUNCTION IF EXISTS public.reporte_ingresos_semanales(integer);
CREATE OR REPLACE FUNCTION public.reporte_ingresos_semanales(num_semanas integer DEFAULT 8)
RETURNS TABLE (semana_inicio date, total numeric)
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
         COALESCE(SUM(p.monto), 0)::numeric AS total
    FROM semanas s
    LEFT JOIN public.pagos p
      ON date_trunc('week', p.fecha_pago) = s.inicio
   GROUP BY s.inicio
   ORDER BY s.inicio;
$$;

DROP FUNCTION IF EXISTS public.reporte_ingresos_mensuales(integer);   -- ver nota de arriba (Bug 80)
CREATE OR REPLACE FUNCTION public.reporte_ingresos_mensuales(num_meses integer DEFAULT 6)
RETURNS TABLE (mes text, total numeric)
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
         COALESCE(SUM(p.monto), 0)::numeric AS total
    FROM meses m
    LEFT JOIN public.pagos p
      ON date_trunc('month', p.fecha_pago) = m.inicio
   GROUP BY m.inicio
   ORDER BY m.inicio;
$$;

-- 3) Estado de cuenta: el último pago se toma por fecha_pago. Se conserva el
--    tipo timestamptz de la columna (cast desde date) para no cambiar la firma.
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
       GROUP BY p.alumno_id
    ) mp ON mp.alumno_id = a.id
    LEFT JOIN (
      SELECT p.alumno_id, MAX(p.fecha_pago)::timestamptz AS fecha_ultimo_pago
        FROM public.pagos p
       GROUP BY p.alumno_id
    ) up ON up.alumno_id = a.id
   WHERE a.activo = true
   ORDER BY u.nombre, u.apellidos;
$$;

-- Grants (SECURITY INVOKER; solo service_role las ejecuta desde el endpoint admin).
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.estado_cuenta_alumnos()             FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reporte_ingresos_semanales(integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.reporte_ingresos_mensuales(integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.estado_cuenta_alumnos()             TO service_role;
