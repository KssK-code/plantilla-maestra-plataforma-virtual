-- Ejecutar en Supabase → SQL Editor
-- 1) Políticas RLS de logros_alumno (debes ver SELECT + INSERT alumno + ALL admin)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'logros_alumno'
ORDER BY policyname;

-- 2) Progreso y logros del alumno (ej. María) — ejecutar tras marcar una semana en la app
SELECT * FROM progreso_semanas
WHERE alumno_id = 'ad26cf7a-3aa9-4791-b437-c22a4755d075'
LIMIT 10;

SELECT * FROM logros_alumno
WHERE alumno_id = 'ad26cf7a-3aa9-4791-b437-c22a4755d075';

-- 3) UUID de la semana 1 de una materia (ajusta el nombre):
-- SELECT s.id AS semana_id, s.numero_semana, s.titulo, m.nombre AS materia
-- FROM semanas s
-- JOIN meses_contenido mc ON mc.id = s.mes_id
-- JOIN materias m ON m.id = mc.materia_id
-- WHERE m.nombre ILIKE '%matem%'
-- ORDER BY m.nombre, mc.numero_mes, s.numero_semana
-- LIMIT 5;
