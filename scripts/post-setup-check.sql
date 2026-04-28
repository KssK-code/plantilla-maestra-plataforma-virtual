-- ============================================================
-- POST-SETUP CHECK — Plataforma Virtual MEV
-- ============================================================
-- Ejecutar DESPUÉS de correr todos los SQLs de setup.
-- Reporta en la última columna ✅ (OK) o ❌ (FAIL) para cada check.
-- Si TODO sale ✅, la plataforma virtual está lista para entregar.
-- 
-- USO desde Claude Code Desktop:
--   psql -f scripts/post-setup-check.sql
-- ============================================================

\echo ''
\echo '════════════════════════════════════════════════════════'
\echo '  POST-SETUP CHECK — Plataforma Virtual'
\echo '════════════════════════════════════════════════════════'
\echo ''

-- ─── CHECK 1: Materias cargadas ─────────────────────────────
SELECT 
  'Materias cargadas (debe ser >= 25)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) >= 25 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM materias;

-- ─── CHECK 2: Materia DEMO existe con UUID correcto ─────────
SELECT
  'Materia DEMO (UUID f0551b82-...)' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM materias
WHERE id = 'f0551b82-1c3e-4286-bfb4-878842bc6eff'
  AND nivel = 'demo';

-- ─── CHECK 3: Semanas DEMO con video ────────────────────────
SELECT
  'Semanas demo con video (debe ser 8)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) = 8 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM semanas s
JOIN meses_contenido mc ON s.mes_id = mc.id
JOIN materias m ON mc.materia_id = m.id
WHERE m.nivel = 'demo'
  AND s.video_url IS NOT NULL;

-- ─── CHECK 4: Quiz inline en semanas demo (16 filas) ────────
SELECT
  'quiz_semana en demo (debe ser 16)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) >= 16 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM quiz_semana qs
JOIN semanas s ON qs.semana_id = s.id
JOIN meses_contenido mc ON s.mes_id = mc.id
JOIN materias m ON mc.materia_id = m.id
WHERE m.nivel = 'demo';

-- ─── CHECK 5: Evaluación tutorial existe ────────────────────
SELECT
  'Evaluación tutorial bb000000-...' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM evaluaciones
WHERE id = 'bb000000-0000-4000-a000-000000000001';

-- ─── CHECK 6: 15 preguntas tutorial ─────────────────────────
SELECT
  'Preguntas evaluación tutorial (15)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) = 15 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM preguntas
WHERE evaluacion_id = 'bb000000-0000-4000-a000-000000000001';

-- ─── CHECK 7: Constraint UNIQUE calificaciones ──────────────
SELECT
  'Constraint UNIQUE calificaciones' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM pg_constraint
WHERE conname = 'calificaciones_alumno_materia_unique';

-- ─── CHECK 8: Admin user creado ─────────────────────────────
SELECT
  'Admin user en tabla usuarios' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) >= 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM usuarios
WHERE rol = 'admin';

-- ─── CHECK 9: Total preguntas (>= 240) ──────────────────────
SELECT
  'Total preguntas evaluaciones (>=240)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) >= 240 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM preguntas;

-- ─── CHECK 10: 200 semanas totales ──────────────────────────
SELECT
  'Total semanas plataforma (>=200)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) >= 200 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM semanas;

\echo ''
\echo '════════════════════════════════════════════════════════'
\echo '  Si TODO sale ✅, la plataforma virtual está lista.'
\echo '  Si algo sale ❌, REVISAR antes de avanzar.'
\echo '════════════════════════════════════════════════════════'
\echo ''

-- ─── CHECK 11: RLS SELECT policy en tabla usuarios ──────────
-- Sin esta policy el frontend recibe null silenciosamente al
-- consultar rol → fallback ALUMNO → admin entra como alumno.
-- Bug detectado en cliente Santa Barbara (28-abr-2026).
SELECT
  'RLS SELECT policy en usuarios' AS check_name,
  COUNT(*)::text AS valor,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ OK'
    ELSE '❌ FAIL — admin entrará como alumno (ver fix/rls-usuarios-select-policy)'
  END AS resultado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'usuarios'
  AND cmd = 'SELECT';

-- ─── CHECK 12: Función is_admin() existe (evita recursión RLS) ──
-- La política "admin lee todos" en usuarios necesita is_admin() con
-- SECURITY DEFINER para evitar recursión infinita (error 500 en login).
-- Bug detectado en cliente Santa Barbara (28-abr-2026).
SELECT
  'Funcion is_admin() con SECURITY DEFINER' AS check_name,
  COUNT(*)::text AS valor,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ OK'
    ELSE '❌ FALTA is_admin() — riesgo de recursion RLS infinita'
  END AS resultado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'is_admin';

-- ─── CHECK 13: Cobertura de SELECT policies en todas las tablas ─
-- Detecta el bug historico donde el setup aplica politicas incompletas.
-- Afecto a Santa Barbara (28-abr-2026): 10 tablas con RLS sin SELECT.
WITH tablas_sin_policy AS (
  SELECT c.relname AS tabla
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid AND p.polcmd = 'r'
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  GROUP BY c.relname
  HAVING COUNT(p.oid) = 0
)
SELECT
  CASE
    WHEN COUNT(*) = 0
      THEN 'CHECK 13: Todas las tablas con RLS tienen SELECT policy'
    ELSE 'FAIL CHECK 13: ' || COUNT(*) || ' tablas sin SELECT: ' || string_agg(tabla, ', ')
  END AS resultado
FROM tablas_sin_policy;
