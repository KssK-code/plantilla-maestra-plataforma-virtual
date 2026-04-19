CREATE TABLE IF NOT EXISTS documentos_alumno (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'acta_nacimiento',
    'curp',
    'certificado_primaria',
    'certificado_secundaria',
    'identificacion_oficial',
    'foto_perfil_doc'
  )),
  nombre_archivo TEXT NOT NULL,
  url TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  comentario_admin TEXT,
  subido_en TIMESTAMPTZ DEFAULT NOW(),
  revisado_en TIMESTAMPTZ,
  UNIQUE(alumno_id, tipo)
);

ALTER TABLE documentos_alumno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumno_read_own_docs" ON documentos_alumno
  FOR SELECT USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "alumno_insert_own_docs" ON documentos_alumno
  FOR INSERT WITH CHECK (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "alumno_update_own_docs" ON documentos_alumno
  FOR UPDATE USING (
    alumno_id IN (SELECT id FROM alumnos WHERE usuario_id = auth.uid())
  );

CREATE POLICY "admin_full_docs" ON documentos_alumno
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'ADMIN')
  );
