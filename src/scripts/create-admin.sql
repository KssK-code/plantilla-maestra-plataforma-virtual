-- ============================================================
-- Script para crear el usuario administrador en IVS Virtual
-- ============================================================
-- INSTRUCCIONES:
-- 1. Primero crea el usuario en Supabase Authentication:
--    Dashboard → Authentication → Users → Invite user
--    Email: ivsvirtualadmin@gmail.com
--    (o usa la API de Supabase Auth con la service role key)
--
-- 2. Copia el UUID del usuario creado en Auth y reemplaza
--    'REEMPLAZA_CON_UUID_DEL_USUARIO' abajo.
--
-- 3. Ejecuta este script en el SQL Editor de Supabase.
-- ============================================================

-- Opción A: Insertar directamente si ya existe el usuario en auth.users
INSERT INTO usuarios (
  id,
  email,
  nombre_completo,
  rol,
  activo,
  created_at
)
VALUES (
  'REEMPLAZA_CON_UUID_DEL_USUARIO',  -- UUID del usuario creado en Supabase Auth
  'ivsvirtualadmin@gmail.com',
  'Administrador IVS',
  'ADMIN',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET rol = 'ADMIN',
      activo = true;

-- ============================================================
-- Opción B: Crear via API de Admin (usar en script Node.js):
-- ============================================================
-- const { createClient } = require('@supabase/supabase-js')
-- const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
--
-- // 1. Crear usuario en Auth
-- const { data: authUser } = await supabase.auth.admin.createUser({
--   email: 'ivsvirtualadmin@gmail.com',
--   password: 'TuPasswordSegura123!',
--   email_confirm: true,
-- })
--
-- // 2. Crear fila en tabla usuarios
-- await supabase.from('usuarios').insert({
--   id: authUser.user.id,
--   email: 'ivsvirtualadmin@gmail.com',
--   nombre_completo: 'Administrador IVS',
--   rol: 'ADMIN',
--   activo: true,
-- })
-- ============================================================

-- Verificar que el usuario admin fue creado correctamente:
SELECT id, email, nombre_completo, rol, activo, created_at
FROM usuarios
WHERE email = 'ivsvirtualadmin@gmail.com';
