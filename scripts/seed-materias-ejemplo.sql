-- ============================================================
-- Materias de EJEMPLO para un cliente nuevo (plantilla LMS)
-- 12 materias preparatoria + 12 secundaria (2 por cada mes 1–6)
-- Requisito: supabase/schema.sql ya aplicado.
--
-- CÓMO PERSONALIZAR:
-- 1. Cambia nombres, descripcion, icono y color por materia real.
-- 2. Si cambias los UUID de materias, actualiza también los INSERT
--    de meses_contenido (materia_id).
-- 3. Tras cargar semanas/contenido real, ajusta orden en materias
--    para el orden visual en el dashboard.
-- 4. scripts/distribuir-meses.sql (si existe en tu fork) puede
--    reasignar meses; aquí cada materia tiene UN mes_contenido.
-- ============================================================

BEGIN;

-- ── Preparatoria: 12 materias (mes 1: dos filas, mes 2: dos, … mes 6: dos)
INSERT INTO public.materias (id, nombre, descripcion, nivel, orden, icono, color, activa) VALUES
('e1000001-0001-4000-8000-000000000001', 'Ejemplo Prepa — Matemáticas A (Mes 1)', 'Personalizar nombre y temario.', 'preparatoria', 1, '📐', '#3AAFA9', true),
('e1000001-0001-4000-8000-000000000002', 'Ejemplo Prepa — Comunicación A (Mes 1)', 'Personalizar nombre y temario.', 'preparatoria', 2, '✍️', '#5B6CFF', true),
('e1000001-0001-4000-8000-000000000003', 'Ejemplo Prepa — Matemáticas B (Mes 2)', 'Personalizar nombre y temario.', 'preparatoria', 3, '📐', '#3AAFA9', true),
('e1000001-0001-4000-8000-000000000004', 'Ejemplo Prepa — Ciencias A (Mes 2)', 'Personalizar nombre y temario.', 'preparatoria', 4, '🔬', '#10B981', true),
('e1000001-0001-4000-8000-000000000005', 'Ejemplo Prepa — Historia A (Mes 3)', 'Personalizar nombre y temario.', 'preparatoria', 5, '📜', '#F59E0B', true),
('e1000001-0001-4000-8000-000000000006', 'Ejemplo Prepa — Inglés A (Mes 3)', 'Personalizar nombre y temario.', 'preparatoria', 6, '🇬🇧', '#6366F1', true),
('e1000001-0001-4000-8000-000000000007', 'Ejemplo Prepa — Física A (Mes 4)', 'Personalizar nombre y temario.', 'preparatoria', 7, '⚛️', '#8B5CF6', true),
('e1000001-0001-4000-8000-000000000008', 'Ejemplo Prepa — Química A (Mes 4)', 'Personalizar nombre y temario.', 'preparatoria', 8, '🧪', '#EC4899', true),
('e1000001-0001-4000-8000-000000000009', 'Ejemplo Prepa — Filosofía A (Mes 5)', 'Personalizar nombre y temario.', 'preparatoria', 9, '💭', '#64748B', true),
('e1000001-0001-4000-8000-0000000000a0', 'Ejemplo Prepa — Orientación A (Mes 5)', 'Personalizar nombre y temario.', 'preparatoria', 10, '🎯', '#14B8A6', true),
('e1000001-0001-4000-8000-0000000000b0', 'Ejemplo Prepa — Matemáticas C (Mes 6)', 'Personalizar nombre y temario.', 'preparatoria', 11, '📊', '#3AAFA9', true),
('e1000001-0001-4000-8000-0000000000c0', 'Ejemplo Prepa — Proyecto (Mes 6)', 'Personalizar nombre y temario.', 'preparatoria', 12, '🎓', '#1B3A57', true)
ON CONFLICT (id) DO NOTHING;

-- Meses de contenido preparatoria (numero_mes 1..6, dos materias por mes)
INSERT INTO public.meses_contenido (id, materia_id, numero_mes, titulo, descripcion) VALUES
('f1000001-0001-4000-8000-000000000001', 'e1000001-0001-4000-8000-000000000001', 1, 'Mes 1 — Bloque A', 'Editar título según plan del cliente.'),
('f1000001-0001-4000-8000-000000000002', 'e1000001-0001-4000-8000-000000000002', 1, 'Mes 1 — Bloque B', 'Editar título según plan del cliente.'),
('f1000001-0001-4000-8000-000000000003', 'e1000001-0001-4000-8000-000000000003', 2, 'Mes 2 — Bloque A', NULL),
('f1000001-0001-4000-8000-000000000004', 'e1000001-0001-4000-8000-000000000004', 2, 'Mes 2 — Bloque B', NULL),
('f1000001-0001-4000-8000-000000000005', 'e1000001-0001-4000-8000-000000000005', 3, 'Mes 3 — Bloque A', NULL),
('f1000001-0001-4000-8000-000000000006', 'e1000001-0001-4000-8000-000000000006', 3, 'Mes 3 — Bloque B', NULL),
('f1000001-0001-4000-8000-000000000007', 'e1000001-0001-4000-8000-000000000007', 4, 'Mes 4 — Bloque A', NULL),
('f1000001-0001-4000-8000-000000000008', 'e1000001-0001-4000-8000-000000000008', 4, 'Mes 4 — Bloque B', NULL),
('f1000001-0001-4000-8000-000000000009', 'e1000001-0001-4000-8000-000000000009', 5, 'Mes 5 — Bloque A', NULL),
('f1000001-0001-4000-8000-0000000000a0', 'e1000001-0001-4000-8000-0000000000a0', 5, 'Mes 5 — Bloque B', NULL),
('f1000001-0001-4000-8000-0000000000b0', 'e1000001-0001-4000-8000-0000000000b0', 6, 'Mes 6 — Bloque A', NULL),
('f1000001-0001-4000-8000-0000000000c0', 'e1000001-0001-4000-8000-0000000000c0', 6, 'Mes 6 — Bloque B', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Secundaria: 12 materias
INSERT INTO public.materias (id, nombre, descripcion, nivel, orden, icono, color, activa) VALUES
('e2000001-0001-4000-8000-000000000001', 'Ejemplo Sec — Matemáticas A (Mes 1)', 'Personalizar.', 'secundaria', 1, '📐', '#3AAFA9', true),
('e2000001-0001-4000-8000-000000000002', 'Ejemplo Sec — Español A (Mes 1)', 'Personalizar.', 'secundaria', 2, '📖', '#5B6CFF', true),
('e2000001-0001-4000-8000-000000000003', 'Ejemplo Sec — Matemáticas B (Mes 2)', 'Personalizar.', 'secundaria', 3, '📐', '#3AAFA9', true),
('e2000001-0001-4000-8000-000000000004', 'Ejemplo Sec — Ciencias A (Mes 2)', 'Personalizar.', 'secundaria', 4, '🔬', '#10B981', true),
('e2000001-0001-4000-8000-000000000005', 'Ejemplo Sec — Historia A (Mes 3)', 'Personalizar.', 'secundaria', 5, '📜', '#F59E0B', true),
('e2000001-0001-4000-8000-000000000006', 'Ejemplo Sec — Inglés A (Mes 3)', 'Personalizar.', 'secundaria', 6, '🇬🇧', '#6366F1', true),
('e2000001-0001-4000-8000-000000000007', 'Ejemplo Sec — Geografía A (Mes 4)', 'Personalizar.', 'secundaria', 7, '🌍', '#8B5CF6', true),
('e2000001-0001-4000-8000-000000000008', 'Ejemplo Sec — Formación A (Mes 4)', 'Personalizar.', 'secundaria', 8, '🤝', '#EC4899', true),
('e2000001-0001-4000-8000-000000000009', 'Ejemplo Sec — Tecnología A (Mes 5)', 'Personalizar.', 'secundaria', 9, '💻', '#64748B', true),
('e2000001-0001-4000-8000-0000000000a0', 'Ejemplo Sec — Arte A (Mes 5)', 'Personalizar.', 'secundaria', 10, '🎨', '#14B8A6', true),
('e2000001-0001-4000-8000-0000000000b0', 'Ejemplo Sec — Matemáticas C (Mes 6)', 'Personalizar.', 'secundaria', 11, '📊', '#3AAFA9', true),
('e2000001-0001-4000-8000-0000000000c0', 'Ejemplo Sec — Cierre (Mes 6)', 'Personalizar.', 'secundaria', 12, '🎓', '#1B3A57', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meses_contenido (id, materia_id, numero_mes, titulo, descripcion) VALUES
('f2000001-0001-4000-8000-000000000001', 'e2000001-0001-4000-8000-000000000001', 1, 'Mes 1 — Sec A', NULL),
('f2000001-0001-4000-8000-000000000002', 'e2000001-0001-4000-8000-000000000002', 1, 'Mes 1 — Sec B', NULL),
('f2000001-0001-4000-8000-000000000003', 'e2000001-0001-4000-8000-000000000003', 2, 'Mes 2 — Sec A', NULL),
('f2000001-0001-4000-8000-000000000004', 'e2000001-0001-4000-8000-000000000004', 2, 'Mes 2 — Sec B', NULL),
('f2000001-0001-4000-8000-000000000005', 'e2000001-0001-4000-8000-000000000005', 3, 'Mes 3 — Sec A', NULL),
('f2000001-0001-4000-8000-000000000006', 'e2000001-0001-4000-8000-000000000006', 3, 'Mes 3 — Sec B', NULL),
('f2000001-0001-4000-8000-000000000007', 'e2000001-0001-4000-8000-000000000007', 4, 'Mes 4 — Sec A', NULL),
('f2000001-0001-4000-8000-000000000008', 'e2000001-0001-4000-8000-000000000008', 4, 'Mes 4 — Sec B', NULL),
('f2000001-0001-4000-8000-000000000009', 'e2000001-0001-4000-8000-000000000009', 5, 'Mes 5 — Sec A', NULL),
('f2000001-0001-4000-8000-0000000000a0', 'e2000001-0001-4000-8000-0000000000a0', 5, 'Mes 5 — Sec B', NULL),
('f2000001-0001-4000-8000-0000000000b0', 'e2000001-0001-4000-8000-0000000000b0', 6, 'Mes 6 — Sec A', NULL),
('f2000001-0001-4000-8000-0000000000c0', 'e2000001-0001-4000-8000-0000000000c0', 6, 'Mes 6 — Sec B', NULL)
ON CONFLICT (id) DO NOTHING;

-- Distribución / orden: ejemplo de reordenar por numero_mes y nombre (opcional)
-- UPDATE public.materias SET orden = sub.n FROM (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY nivel ORDER BY nombre) AS n FROM public.materias
-- ) sub WHERE public.materias.id = sub.id;

COMMIT;
