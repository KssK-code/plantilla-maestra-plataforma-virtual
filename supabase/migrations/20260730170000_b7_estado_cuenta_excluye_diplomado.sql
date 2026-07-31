-- B7 / T4 — El estado de cuenta del PROGRAMA deja de listar alumnos de diplomado.
--
-- EL DEFECTO (lo encontró B6 al sembrar el escenario mixto): un alumno con
-- `nivel = 'diplomado'` aparecía en `/admin/estado-cuenta` con el badge
-- «Al corriente» y la leyenda «Sin pagos registrados». Los dos datos son
-- CIERTOS —no debe meses del programa porque no cursa el programa, y no tiene
-- pagos del programa— pero la fila no debería existir: ese alumno no tiene
-- obligaciones que este reporte pueda medir. En una lista de 300 diplomados,
-- 300 filas «Al corriente» ahogan a los 5 alumnos del programa que sí deben.
--
-- ES UN FIX GLOBAL, NO DEL MODO. No se condiciona a `CONFIG.modo` porque el
-- caso también se da en un cliente HÍBRIDO: una preparatoria que además vende
-- diplomados y da de alta alumnos solo-diplomado. El estado de cuenta del
-- programa nunca debe hablar de ellos, opere el cliente en el modo que opere.
--
-- QUÉ NO CAMBIA: el alumno HÍBRIDO —nivel de programa ('secundaria',
-- 'preparatoria', 'licenciatura') Y además inscrito a un diplomado— SIGUE
-- apareciendo. Su fila del programa es legítima: debe mensualidades del
-- programa. Solo se excluye a quien no tiene programa que deber.
--
-- POR QUÉ EN LA FUNCIÓN Y NO EN EL CONSUMIDOR: el endpoint
-- (/api/admin/estado-cuenta) es un consumidor más, no el dueño de la regla.
-- Filtrar en TypeScript dejaría la función SQL devolviendo filas equivocadas
-- para el siguiente que la llame —un reporte, un export, una alerta de
-- morosidad— y ese siguiente no tendría por qué saber que hay que filtrar.
-- La regla vive donde vive el dato.
--
-- ⚠️ Bug 77 NO aplica aquí: la firma no cambia (mismas 12 columnas, mismos
-- tipos, mismo orden), así que basta `CREATE OR REPLACE` y los grants se
-- conservan. Aun así se re-aplican abajo y se verifican, porque «se conservan»
-- es justo el tipo de suposición que el Bug 77 castiga.
--
-- IDEMPOTENTE Y RE-EJECUTABLE.

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
       WHERE p.curso_inscripcion_id IS NULL   -- B6: solo pagos del programa
       GROUP BY p.alumno_id
    ) up ON up.alumno_id = a.id
   WHERE a.activo = true
     -- B7/T4: fuera los alumnos que solo cursan diplomados.
     --
     -- `IS DISTINCT FROM` y no `<>`: con `<>`, un alumno cuyo `nivel` sea NULL
     -- daría NULL en la comparación, el WHERE lo trataría como falso y lo
     -- DESAPARECERÍA del estado de cuenta. Y `nivel` es nullable: el registro
     -- público lo inserta tal cual venga del body, así que las filas con NULL
     -- existen de verdad. Un alumno sin nivel debe seguir viéndose —
     -- precisamente para que alguien note que le falta el dato.
     AND a.nivel IS DISTINCT FROM 'diplomado'
   ORDER BY u.nombre, u.apellidos;
$$;

-- Grants: se re-aplican aunque CREATE OR REPLACE los conserve. Cuesta dos
-- líneas y cierra la puerta a que un futuro cambio de firma (que sí obligaría a
-- DROP) los pierda en silencio. Ver Bug 77 del PLAYBOOK.
REVOKE EXECUTE ON FUNCTION public.estado_cuenta_alumnos() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.estado_cuenta_alumnos() TO service_role;
