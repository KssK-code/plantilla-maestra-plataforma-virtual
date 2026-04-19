-- ══════════════════════════════════════════
-- EDVEX ACADEMY — Migration: quiz_semana + notas_alumno
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════

-- Tabla para quizzes de semana (preguntas de refuerzo)
CREATE TABLE IF NOT EXISTS quiz_semana (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  semana_id UUID NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL,
  respuesta_correcta INTEGER NOT NULL,
  explicacion TEXT NOT NULL,
  orden INTEGER NOT NULL,
  UNIQUE(semana_id, orden)
);

-- Tabla para respuestas del alumno al quiz
CREATE TABLE IF NOT EXISTS quiz_respuestas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  semana_id UUID NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  respuestas JSONB NOT NULL,
  completado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, semana_id)
);

-- Tabla para notas personales
CREATE TABLE IF NOT EXISTS notas_alumno (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  semana_id UUID NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, semana_id)
);

-- ── RLS ──
ALTER TABLE quiz_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_alumno ENABLE ROW LEVEL SECURITY;

-- quiz_semana: todos los alumnos pueden leer
CREATE POLICY "read_quiz" ON quiz_semana FOR SELECT USING (true);

-- quiz_respuestas: alumno solo ve y escribe las suyas
CREATE POLICY "alumno_read_quiz_resp" ON quiz_respuestas
  FOR SELECT USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );
CREATE POLICY "alumno_insert_quiz_resp" ON quiz_respuestas
  FOR INSERT WITH CHECK (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );
CREATE POLICY "alumno_update_quiz_resp" ON quiz_respuestas
  FOR UPDATE USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

-- notas_alumno: alumno solo ve y escribe las suyas
CREATE POLICY "alumno_read_notas" ON notas_alumno
  FOR SELECT USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );
CREATE POLICY "alumno_write_notas" ON notas_alumno
  FOR ALL USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

-- Admin acceso total
CREATE POLICY "admin_quiz" ON quiz_semana FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
);
CREATE POLICY "admin_quiz_resp" ON quiz_respuestas FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
);
CREATE POLICY "admin_notas" ON notas_alumno FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
);
