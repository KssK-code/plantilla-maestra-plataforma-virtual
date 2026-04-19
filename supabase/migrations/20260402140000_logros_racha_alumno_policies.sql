-- Permite que el alumno inserte/actualice su racha y sus logros sin service role.
-- Ejecutar en proyectos Supabase ya desplegados antes de actualizar schema.sql.

DROP POLICY IF EXISTS "logros: insertar propios" ON public.logros_alumno;
CREATE POLICY "logros: insertar propios"
  ON public.logros_alumno FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

DROP POLICY IF EXISTS "racha: insertar propia" ON public.racha_actividad;
CREATE POLICY "racha: insertar propia"
  ON public.racha_actividad FOR INSERT
  WITH CHECK (alumno_id = auth.uid());

DROP POLICY IF EXISTS "racha: actualizar propia" ON public.racha_actividad;
CREATE POLICY "racha: actualizar propia"
  ON public.racha_actividad FOR UPDATE
  USING (alumno_id = auth.uid());
