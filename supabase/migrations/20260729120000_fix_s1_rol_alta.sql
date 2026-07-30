-- ============================================================================
-- S1 (CRÍTICO) — Cerrar la escalada de privilegios en el ALTA de usuario
-- ============================================================================
-- SÍNTOMA: cualquier visitante anónimo se vuelve admin desde el navegador,
--   sin tocar la API, usando solo la anon key (que viaja en el bundle):
--
--     supabase.auth.signUp({
--       email, password,
--       options: { data: { rol: 'admin' } }     -- <— metadata del cliente
--     })
--
-- CAUSA: public.handle_new_user() es SECURITY DEFINER (ignora RLS y GRANTs) y
--   copiaba el rol tal cual desde raw_user_meta_data, que es 100% controlado
--   por quien llama a signUp:
--
--     COALESCE(NEW.raw_user_meta_data->>'rol', 'alumno')
--
--   El valor inyectado ('admin') es literalmente el que busca public.es_admin()
--   (WHERE rol = 'admin'), así que la escalada es inmediata y total.
--
-- IMPACTO: es_admin()/is_admin() gobiernan las 13 políticas de las 7 tablas
--   curso_*, el bucket privado 'cursos', la escritura de curso_examen_resultados
--   (calificaciones fabricables) y el gate verifyAdmin de todo /api/admin/**.
--   Con rol='admin', un GET a /rest/v1/curso_examen_preguntas?select=* devuelve
--   el banco de preguntas COMPLETO con respuesta_correcta y explicacion — el
--   activo que la migración del examen declara "el banco de preguntas ES el
--   producto". También abre /admin en el middleware.
--
-- POR QUÉ EL FIX DEL BUG 52 NO LO CUBRÍA: aquel fix opera sobre GRANTs de
--   columna — REVOKE UPDATE (id, email, rol, created_at) ON public.usuarios.
--   Eso cierra el vector UPDATE ("me reescribo el rol después de entrar") y
--   deja intacto este otro, que es un INSERT hecho por una función SECURITY
--   DEFINER, sobre la que los GRANTs del usuario no aplican. Son dos vectores
--   distintos hacia el mismo privilegio; este cierra el segundo.
--
-- FIX: el rol del alta es SIEMPRE 'alumno', literal. El metadata ya no se lee
--   para nada relacionado con privilegios. El único camino a admin/secretario
--   pasa por un admin ya existente vía POST /api/admin/usuarios, que valida el
--   rol contra ROLES_STAFF y lo escribe con service_role DESPUÉS del alta
--   (src/app/api/admin/usuarios/route.ts:65 y :101-106). Ese upsert posterior
--   es también la razón por la que este cambio NO rompe la creación de staff:
--   ninguna ruta legítima depende del trigger para fijar el rol.
--
-- SOBRE 'nivel': handle_new_user() NO toca nivel — solo inserta en
--   public.usuarios (id, email, nombre, rol). La columna nivel vive en
--   public.alumnos y la escribe el panel admin con service_role. No hay nada
--   que endurecer ahí; se deja constancia para que no se busque en vano.
--
-- Se conserva `nombre` desde el metadata a propósito: es un dato de perfil que
-- el propio usuario declara, no un privilegio, y quitarlo dejaría los perfiles
-- sin nombre hasta el upsert posterior.
--
-- IDEMPOTENTE Y SEGURA sobre una BD que ya tiene la función vieja:
-- CREATE OR REPLACE conserva el OID, así que el trigger existente sigue
-- apuntando a la misma función y no hay ventana sin protección.
--
-- Aplicar por conexión directa (puerto 5432, NUNCA el pooler 6543):
--   psql "postgresql://postgres:<PASS>@db.<REF>.supabase.co:5432/postgres" \
--        -v ON_ERROR_STOP=1 -f supabase/migrations/20260729120000_fix_s1_rol_alta.sql
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- rol FIJO. No se lee raw_user_meta_data->>'rol' bajo ninguna circunstancia:
  -- ese campo lo controla quien llama a signUp. Ver encabezado (S1).
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    'alumno'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-crear el trigger es inocuo si ya existe y repara el caso de un cliente
-- al que le falte. AFTER INSERT, igual que la definición original.
DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ── Verificación manual (no altera nada; correr aparte si se quiere) ─────────
-- Debe devolver 0 filas: ningún usuario con rol elevado creado por esta vía.
--   SELECT u.id, u.email, u.rol, au.raw_user_meta_data->>'rol' AS rol_pedido
--     FROM public.usuarios u
--     JOIN auth.users au ON au.id = u.id
--    WHERE lower(u.rol) <> 'alumno'
--      AND au.raw_user_meta_data->>'rol' IS NOT NULL
--      AND lower(au.raw_user_meta_data->>'rol') = lower(u.rol);
-- Si devuelve filas, son cuentas a revisar UNA POR UNA antes de degradarlas:
-- un admin legítimo creado por el panel también tiene rol en su metadata, así
-- que esta query señala candidatos, NO culpables. No degradar en automático.
