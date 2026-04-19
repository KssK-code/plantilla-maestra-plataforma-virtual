-- Tabla para registrar semanas leídas por el alumno
CREATE TABLE IF NOT EXISTS progreso_semanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  semana_id UUID NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  completada_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, semana_id)
);

-- Tabla para logros/badges del alumno
CREATE TABLE IF NOT EXISTS logros_alumno (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  obtenido_en TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(alumno_id, tipo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_progreso_alumno ON progreso_semanas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_progreso_semana ON progreso_semanas(semana_id);
CREATE INDEX IF NOT EXISTS idx_logros_alumno ON logros_alumno(alumno_id);

-- RLS
ALTER TABLE progreso_semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_alumno ENABLE ROW LEVEL SECURITY;

-- Políticas: alumno solo ve y escribe su propio progreso
CREATE POLICY "alumno_read_own_progreso" ON progreso_semanas
  FOR SELECT USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "alumno_insert_own_progreso" ON progreso_semanas
  FOR INSERT WITH CHECK (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "alumno_read_own_logros" ON logros_alumno
  FOR SELECT USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "alumno_insert_own_logros" ON logros_alumno
  FOR INSERT WITH CHECK (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

-- Admin acceso total
CREATE POLICY "admin_full_progreso" ON progreso_semanas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
  );

CREATE POLICY "admin_full_logros" ON logros_alumno
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
  );
