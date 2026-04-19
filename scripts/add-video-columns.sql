-- Ejecutar en Supabase Studio > SQL Editor
-- Agrega columnas para 2º y 3er video por semana

ALTER TABLE semanas ADD COLUMN IF NOT EXISTS video_url_2 TEXT;
ALTER TABLE semanas ADD COLUMN IF NOT EXISTS video_url_3 TEXT;
