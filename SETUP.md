# 🚀 Setup Nuevo Cliente LMS — Tiempo estimado: 2 horas

## Paso 1 — Crear repo desde template (5 min)
1. Ir a github.com/KssK-code/ivs-virtual-plataforma
2. Clic en "Use this template" → "Create a new repository"
3. Nombre del repo: nombre-cliente-plataforma
4. Clone local: git clone [url]
5. `pnpm install` — este repo usa **pnpm** (hay `pnpm-lock.yaml`). No uses npm.

## Paso 2 — Personalizar cliente (10 min)
Editar SOLO este archivo: src/lib/config.ts
- nombre, nombreCompleto
- whatsapp, whatsappDisplay
- logo (subir archivo a /public/)
- colores (primary, secondary, accent)
- dominio

## Paso 3 — Supabase nuevo proyecto (30 min)

> El orden respeta dependencias de FK y de funciones. No lo alteres.
> Correr por conexión **directa** (puerto 5432), nunca el pooler (6543).

1. supabase.com → New project
2. **Schema base** → ejecutar `supabase/schema.sql` completo
3. **Seed de contenido** → ejecutar `scripts/setup.sql`
   Es el orquestador único del seed (materias, meses, semanas, evaluaciones y las
   265 preguntas universales). Reemplaza a los antiguos `seed-materias.sql` y
   `distribuir-meses.sql`, que **ya no existen en el repo**.
   Ajustar nombres de materias según el cliente después de sembrar.
4. **Admin** → ejecutar `scripts/create-admin.sql`
   (cambiar email y password; requiere el UUID real del usuario de Auth)
5. **Módulo Cursos y Diplomados** → ejecutar `scripts/migracion-cursos-diplomados.sql`
   (crea 5 tablas `curso_*` + el bucket privado `cursos`). Corre DESPUÉS de schema.sql.
   Si las políticas de storage fallan por ownership, crearlas desde la UI
   (Storage → Policies; ver el comentario del archivo).
6. **Examen final de curso** → ejecutar `supabase/migrations/20260728120000_examen_final_cursos.sql`
   Añade `curso_examen_preguntas` y `curso_examen_resultados` (banco de preguntas
   con RLS solo-admin + resultados). **Obligatorio si se va a usar el examen:** el
   código de `/api/alumno/cursos/[id]/examen/**` ya está en la plantilla y sin estas
   tablas responde error. Tiene preflight y aborta solo si falta el paso 5.
7. **Parches de seguridad (obligatorios)** — correr los tres, en este orden:
   - `supabase/migrations/20260729120000_fix_s1_rol_alta.sql`
     Cierra la escalada de rol en el alta (S1). Sin esto, cualquiera puede
     registrarse como `admin` con solo la anon key.
   - `supabase/migrations/20260729121000_fix_s2_es_admin.sql`
     `es_admin()` / `es_staff()` en plpgsql con `LOWER(rol)` y `search_path` (S2).
     Sin esto, un admin con `rol='ADMIN'` en mayúsculas no puede administrar cursos.
   - `supabase/migrations/20260729122000_fix_portadas_storage_policy.sql`
     Corrige la política del bucket para que el alumno vea las portadas.
     Corre DESPUÉS del paso 5.
   > Para clientes **ya desplegados**, el retrofit equivalente de S1+S2 es
   > `scripts/fix-s1-s2-roles.sql`, y sigue haciendo falta `scripts/fix-escalada-rol.sql`
   > (Bug 47/52): son vectores distintos, hay que correr los dos.
8. **Verificación** → ejecutar `scripts/post-setup-check.sql`
   Reporta ✅/❌ por check. Si todo sale ✅, la plataforma está lista para entregar.
9. **Buckets de Storage** — los crea el SQL de los pasos anteriores; verificar que existan:

   | Bucket | Privacidad | Límite | Lo crea | Notas |
   |---|---|---|---|---|
   | `avatares` | **público** | 5 MB | `supabase/schema.sql:688` | ⚠️ ver aviso abajo |
   | `documentos` | privado | 10 MB | `supabase/schema.sql:689` | documentos del alumno + la constancia |
   | `constancias` | privado | 10 MB | `supabase/schema.sql:690` | declarado pero **sin uso en la app** hoy |
   | `recibos` | privado | 2 MB | `supabase/schema.sql:691` + `migrations/20260716140000` | recibos de pago |
   | `cursos` | privado | 10 MB | `scripts/migracion-cursos-diplomados.sql:241` | portadas y PDF de Cursos y Diplomados |

   > ⚠️ **Discrepancia conocida `avatares` vs `avatars`.** El schema crea el bucket
   > `avatares` (en español), pero el código sube la foto de perfil a `avatars`
   > (en inglés): `src/app/api/alumno/avatar/route.ts:28`, que además usa
   > `getPublicUrl`. Hasta que se unifique el nombre, **crear también el bucket
   > `avatars` como público** o la foto de perfil no funciona. No se toca en este
   > PR porque excede su alcance; queda registrado para no perderlo.
10. Copiar: Project URL, anon key, service_role key

## Paso 4 — Variables de entorno (5 min)
Copiar .env.example → .env.local y llenar con datos de Supabase

## Paso 5 — Probar local (10 min)
`pnpm dev`
- Login como admin
- Crear alumno de prueba
- Abrir mes 1
- Verificar materias disponibles

## Paso 6 — Vercel (15 min)
1. vercel.com → Add New Project
2. Importar repo GitHub del cliente
3. Environment Variables → pegar las 3 variables de .env.local
4. Deploy

## Paso 7 — Dominio (10 min)
1. Vercel → Settings → Domains → Add
2. Configurar DNS en el registrador del dominio

## Qué cambiar por cliente
| Archivo | Qué cambiar |
|---|---|
| src/lib/config.ts | Todo |
| public/logo.png | Logo del cliente |
| .env.local | Credenciales Supabase |
| scripts/seed-materias.sql | Materias del cliente |

## Qué NO tocar
- Toda la lógica de meses/materias
- Panel admin
- Dashboard alumno
- Sistema de logros y badges
- Constancias
