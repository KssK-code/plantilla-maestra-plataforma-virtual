-- Panel Admin Unificado (Fase 4): agregación de ingresos por semana y por mes
-- para /admin/reportes. Server-side (GROUP BY date_trunc) — el endpoint ya no
-- necesita traer todos los pagos para sumarlos en JS.
-- Zona horaria: America/Mexico_City (los clientes MEV operan en México;
-- el server de Vercel corre en UTC y cortaría las semanas/meses 6h antes).
-- Semana inicia en lunes (date_trunc('week') es ISO). Rellena con 0 los
-- periodos sin pagos para que la serie siempre traiga num_semanas/num_meses filas.

-- ⚠️ EL `DROP IF EXISTS` NO SOBRA — es lo que hace RE-EJECUTABLE a la cadena
-- completa (Bug 80 del PLAYBOOK). B6 (20260730160000) amplía estas dos funciones
-- a cuatro columnas con DROP + CREATE, porque Postgres no deja cambiar el tipo
-- de retorno con CREATE OR REPLACE. Sin este DROP, volver a correr la cadena
-- desde el principio revienta aquí con «cannot change return type of existing
-- function» y, con ON_ERROR_STOP en una sola sesión, aborta todo lo que sigue.
--
-- Es seguro en las dos direcciones: en una instalación fresca es un no-op, y en
-- un replay de la cadena ENTERA el estado final vuelve a ser el de B6, porque B6
-- corre después y re-amplía. Los grants los re-aplica 20260717120000 más
-- adelante en la misma cadena (este archivo es anterior al endurecimiento).
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
      ON date_trunc('week', (p.created_at AT TIME ZONE 'America/Mexico_City')) = s.inicio
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
      ON date_trunc('month', (p.created_at AT TIME ZONE 'America/Mexico_City')) = m.inicio
   GROUP BY m.inicio
   ORDER BY m.inicio;
$$;

-- SECURITY INVOKER (default) a propósito: si un alumno la invocara directo,
-- RLS de pagos solo le agrega SUS propios pagos. El endpoint admin la llama
-- con service role y ve todo.
