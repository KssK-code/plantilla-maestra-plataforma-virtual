-- =============================================================
-- FIX 1 — La ventana de módulos dejaba fuera un módulo por mes,
--          y el ÚLTIMO módulo del curso era INALCANZABLE.
-- FIX 2 — `alumnos_nivel_check` perdía 'diplomado' por un choque
--          de orden entre migraciones, y rompía el alta en
--          modo solo_cursos.
--
-- Ambos hallados corriendo el flujo real de un alumno de punta a
-- punta (Playwright) sobre un cliente Solo-Cursos recién provisionado.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- FIX 1: `orden` es 1-based, pero se comparaba con `<`.
--
-- `curso_ventana_limite()` devuelve `meses_desbloqueados * modulos_por_mes`,
-- que es una CANTIDAD de módulos liberados, no un índice. Al compararla con
-- `orden <` contra un `orden` que empieza en 1, cada mes liberaba un módulo
-- MENOS del configurado:
--
--     modulos_por_mes = 2, meses = 1  ->  límite 2  ->  `orden < 2`  ->  solo el módulo 1
--
-- y en el tope del curso el efecto es que el último módulo NO SE ABRE NUNCA,
-- porque `curso_tope_meses()` se calcula como CEIL(módulos / modulos_por_mes):
-- con 10 módulos y 2 por mes el techo es 5 meses -> límite 10 -> `orden < 10`
-- deja fuera al módulo 10. Solo se salvaban los cursos con un número IMPAR de
-- módulos, donde el CEIL redondea hacia arriba y sobra un hueco.
--
-- Medido en el banco de cursos de ingreso: 5 de 6 cursos perdían su módulo
-- final — y en los 6 ese módulo es el de estrategia para el día del examen,
-- es decir el más valioso del temario. El alumno pagaba el curso completo y
-- no había forma, ni siquiera para el admin, de abrirle ese módulo.
--
-- El arreglo es `<=`. Con él un mes libera exactamente `modulos_por_mes`
-- módulos y el techo alcanza al último.
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
           <= public.curso_ventana_limite(m.curso_id, auth.uid())
  );
$$;

COMMENT ON FUNCTION public.curso_modulo_en_ventana(UUID) IS
  'Módulo dentro de la ventana pagada. `orden` es 1-based y el límite es una CANTIDAD de módulos, por eso la comparación es <= y no <: con < cada mes liberaba uno menos y el último módulo del curso quedaba inalcanzable.';


-- ─────────────────────────────────────────────────────────────
-- FIX 2: 'diplomado' volvía a quedar fuera del check de nivel.
--
-- `20260730120000_b1_fundacion_solo_cursos.sql` agrega 'diplomado' a
-- `alumnos_nivel_check`, porque es el nivel que el servidor FUERZA al registrar
-- en modo solo_cursos (ver `nivelForzadoDeRegistro()`).
--
-- `20260812120000_licenciaturas.sql` es POSTERIOR y reescribe ese mismo check
-- con solo ('secundaria','preparatoria','licenciatura'). Ninguna migración
-- posterior lo restaura, así que aplicando las migraciones en orden de fecha
-- —que es como se provisiona un cliente nuevo— el alta de CUALQUIER alumno en
-- modo solo_cursos falla con violación de constraint.
--
-- Se restaura la unión de ambos conjuntos. Este archivo va después de las dos,
-- así que gana sin importar el orden en que se hayan aplicado antes.
ALTER TABLE public.alumnos DROP CONSTRAINT IF EXISTS alumnos_nivel_check;
ALTER TABLE public.alumnos ADD  CONSTRAINT alumnos_nivel_check
  CHECK (nivel IN ('secundaria','preparatoria','licenciatura','diplomado'));


DO $$
BEGIN
  RAISE NOTICE 'FIX ventana de módulos (<=) y nivel diplomado aplicados.';
END $$;
