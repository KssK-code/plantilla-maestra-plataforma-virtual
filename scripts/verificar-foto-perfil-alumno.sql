-- Ver tipo exacto y URL de la foto de perfil subida en Mis Documentos.
-- Ejecutar en SQL Editor de Supabase o: supabase db query --linked -f scripts/verificar-foto-perfil-alumno.sql

SELECT tipo_documento, url_archivo, fecha_subida
FROM public.documentos_alumno
WHERE alumno_id = 'ad26cf7a-3aa9-4791-b437-c22a4755d075'
ORDER BY fecha_subida DESC;

-- En la app se usa principalmente tipo_documento = 'foto_perfil_doc' (ver api/alumno/documentos).
