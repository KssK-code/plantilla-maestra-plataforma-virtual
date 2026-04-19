# 🚀 Setup Nuevo Cliente LMS — Tiempo estimado: 2 horas

## Paso 1 — Crear repo desde template (5 min)
1. Ir a github.com/KssK-code/ivs-virtual-plataforma
2. Clic en "Use this template" → "Create a new repository"
3. Nombre del repo: nombre-cliente-plataforma
4. Clone local: git clone [url]
5. npm install

## Paso 2 — Personalizar cliente (10 min)
Editar SOLO este archivo: src/lib/config.ts
- nombre, nombreCompleto
- whatsapp, whatsappDisplay
- logo (subir archivo a /public/)
- colores (primary, secondary, accent)
- dominio

## Paso 3 — Supabase nuevo proyecto (30 min)
1. supabase.com → New project
2. SQL Editor → ejecutar supabase/schema.sql completo
3. SQL Editor → ejecutar scripts/seed-materias.sql 
   (ajustar nombres de materias según el cliente)
4. SQL Editor → ejecutar scripts/distribuir-meses.sql
5. SQL Editor → ejecutar scripts/create-admin.sql
   (cambiar email y password del admin)
6. Copiar: Project URL, anon key, service_role key

## Paso 4 — Variables de entorno (5 min)
Copiar .env.example → .env.local y llenar con datos de Supabase

## Paso 5 — Probar local (10 min)
npm run dev
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
