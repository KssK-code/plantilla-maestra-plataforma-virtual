-- ============================================================================
-- MIGRACIÓN: el prefijo de matrícula deja de estar escrito en el SQL
-- ============================================================================
-- generar_matricula() llevaba el prefijo literal en el cuerpo de la función
-- ('CEEVA-' en la plantilla actual, 'IVS-' en versiones anteriores). Como el
-- archivo de schema se aplica igual en todos los clientes, cada plataforma
-- nueva heredaba el prefijo del cliente para el que se escribió: Angelópolis y
-- EVOCONTUCER declaran prefijoMatricula 'ANGELOPOLIS' y 'EVO' en su config.ts y
-- emiten matrículas 'IVS-2026-0001'. La función ignoraba el config por completo.
--
-- Ahora el prefijo vive en public.ajustes y lo siembra el servidor desde
-- CONFIG.prefijoMatricula al dar de alta un alumno (src/lib/matricula.ts), así
-- que no queda ningún paso manual que se pueda olvidar al aprovisionar.
--
-- SOLO AFECTA A MATRÍCULAS NUEVAS. Las ya emitidas no se tocan: son el
-- identificador que el alumno ya tiene anotado. Una plataforma con historial
-- va a quedar con matrículas mezcladas, y está bien.
--
-- Idempotente. Conexión directa puerto 5432, NUNCA el pooler 6543.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ajustes (
  clave       TEXT        PRIMARY KEY,
  valor       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ajustes IS
  'Valores de config que la BD necesita por su cuenta, porque corren en triggers y funciones sin acceso a src/lib/config.ts. Los siembra el servidor; no capturar a mano.';

-- En Supabase toda tabla de `public` sale por PostgREST, así que dejarla sin
-- RLS la haría legible por cualquier visitante. Con RLS y sin políticas solo la
-- alcanzan el service role (que la salta) y generar_matricula() (SECURITY DEFINER).
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generar_matricula()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  anio     TEXT := TO_CHAR(NOW(), 'YYYY');
  prefijo  TEXT;
  contador INTEGER;
  nueva    TEXT;
BEGIN
  SELECT valor INTO prefijo FROM public.ajustes WHERE clave = 'prefijo_matricula';
  -- 'MEV' solo aplica mientras el servidor no haya sembrado el ajuste, es
  -- decir hasta el primer alta después de desplegar. Es neutro a propósito:
  -- si vuelve a aparecer el prefijo de otro cliente, el culpable es un literal.
  prefijo := NULLIF(TRIM(COALESCE(prefijo, '')), '');
  IF prefijo IS NULL THEN
    prefijo := 'MEV';
  END IF;

  SELECT COUNT(*) + 1 INTO contador FROM public.alumnos;
  nueva := prefijo || '-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  -- evitar colisiones en caso de concurrencia
  WHILE EXISTS (SELECT 1 FROM public.alumnos WHERE matricula = nueva) LOOP
    contador := contador + 1;
    nueva := prefijo || '-' || anio || '-' || LPAD(contador::TEXT, 4, '0');
  END LOOP;
  RETURN nueva;
END;
$$;

-- El trigger ya existía; se recrea por si el cliente viene de un schema que no
-- lo tenía, y porque sin él la ruta de alta por admin —que ya no arma la
-- matrícula— insertaría alumnos con matricula NULL.
CREATE OR REPLACE FUNCTION public.trigger_asignar_matricula()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.matricula IS NULL OR NEW.matricula = '' THEN
    NEW.matricula := public.generar_matricula();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_matricula ON public.alumnos;
CREATE TRIGGER trg_asignar_matricula
  BEFORE INSERT ON public.alumnos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_asignar_matricula();
