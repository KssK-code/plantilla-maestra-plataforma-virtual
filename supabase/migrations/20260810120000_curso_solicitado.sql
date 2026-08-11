-- ============================================================================
-- MIGRACIÓN: alumnos.curso_solicitado — add-on Cursos de Ingreso
-- ============================================================================
-- Guarda QUÉ oferta de curso de ingreso pidió el alumno al registrarse, para
-- que el admin sepa qué activarle. Antes de esto el alumno se registraba como
-- si fuera de Sec/Prepa y el admin tenía que enterarse por fuera.
--
-- Es TEXT y no un UUID con FK a cursos(id) a propósito:
--   * La oferta comercial no siempre es UN curso. EVOCONTUCER vende los 6
--     cursos como PAQUETE ÚNICO: ahí el valor es 'paquete' y al activar se
--     inscriben los 6. Un UUID no puede representar eso.
--   * El catálogo del registro vive en CONFIG.cursosIngreso, no en la tabla
--     cursos: /register es público y la RLS de `cursos` es solo para
--     `authenticated`, así que un visitante anónimo no puede leerla.
--   * src/lib/cursos/oferta.ts traduce id de oferta → UUID(s) a inscribir.
--
-- El valor se valida contra la whitelist de getOfertasIngreso() en la API, no
-- con un CHECK: la lista de ofertas es de nivel cliente y cambia con el config,
-- y un CHECK obligaría a una migración cada vez que se agrega un curso.
--
-- NO se limpia al activar: queda como registro de qué contrató el alumno. El
-- estado (Pendiente/Activado) se deriva de si existe la fila en
-- curso_inscripciones, no de un flag aparte que podría desincronizarse.
--
-- Idempotente. Conexión directa puerto 5432, NUNCA el pooler 6543.
-- ============================================================================

ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS curso_solicitado TEXT;

COMMENT ON COLUMN public.alumnos.curso_solicitado IS
  'Id de la oferta de curso de ingreso solicitada en el registro (ver CONFIG.cursosIngreso / src/lib/cursos/oferta.ts). NULL = no pidió ninguno.';

-- Índice parcial: las consultas del admin solo buscan a los que SÍ pidieron
-- curso, que son minoría frente al total de alumnos.
CREATE INDEX IF NOT EXISTS idx_alumnos_curso_solicitado
  ON public.alumnos (curso_solicitado)
  WHERE curso_solicitado IS NOT NULL;
