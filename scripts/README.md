# Scripts SQL — Plantilla Maestra MEV

Esta carpeta contiene los scripts SQL para inicializar una plataforma cliente nueva.

## Inicialización rápida de cliente nuevo

Asume que ya tienes:
- Proyecto Supabase nuevo creado para el cliente
- DB password del proyecto Supabase
- psql instalado localmente (viene con PostgreSQL)

```bash
# 1. Exportar connection string del cliente nuevo
export CLIENT_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# 2. Ejecutar schema canónico (estructura de BD)
psql "$CLIENT_DB_URL" -f scripts/schema.sql

# 3. Ejecutar setup completo (seeds + constraints + tutorial demo)
psql "$CLIENT_DB_URL" -f scripts/setup.sql
```

Tiempo total: ~30-60 segundos.

## Archivos principales

### schema.sql (ejecutar PRIMERO)
DDL completo extraído de IVS Virtual:
- 18 tablas
- 72 constraints
- 12 índices
- 46 políticas RLS
- 2 triggers

### setup.sql (ejecutar SEGUNDO)
Combina vía `\i` los seeds esenciales:
- seed-demo-materia.sql → Tutorial Demo (CRÍTICO para modo prueba)
- seed-contenido-ivs.sql → Estructura de meses + semanas
- seed-contenido-semanas.sql → Contenido académico

Más constraints adicionales y limpieza (NOTIFY pgrst, DROP TRIGGER).

## Archivos NO incluidos automáticamente

| Archivo | Razón |
|---------|-------|
| seed-materias-ejemplo.sql | **DEPRECATED** — Bug: desplazaba materias reales a orden 13-24, bloqueando acceso a contenido (26-abr-2026) |
| videos-update.sql | Usa columna 'videos' JSONB no presente en schema canónico |
| quiz-data.sql | Usa columnas 'opciones' JSONB no presentes en schema canónico |
| add-bilingual-columns.sql | Migration EDVEX |
| migration-documentos.sql | Tabla ya está en schema.sql |
| create-admin.sql | Template manual — admin se crea desde Dashboard |
| verificar-*.sql | SELECTs de diagnóstico (no DDL) |

## Workflow de cliente nuevo (paso a paso)

1. Crear proyecto Supabase desde dashboard
2. Crear buckets de Storage: documentos (Public: OFF) + avatares (Public: OFF)
3. Ejecutar setup:
```bash
   export CLIENT_DB_URL="..."
   psql "$CLIENT_DB_URL" -f scripts/schema.sql
   psql "$CLIENT_DB_URL" -f scripts/setup.sql
```
4. Crear admin desde Supabase Dashboard → Authentication → Add user
5. Marcar usuario como admin:
```sql
   UPDATE public.usuarios SET rol = 'admin' WHERE email = 'admin@cliente.com';
```
6. Configurar Auth: desactivar "Confirm email" en Authentication → Providers → Email

## Troubleshooting

**Error: "permission denied for schema public"**
→ Connection string incorrecta. Verificar password del DB.

**Error: "duplicate key value violates unique constraint"**
→ Setup ya se ejecutó. Es seguro re-ejecutar (los seeds tienen ON CONFLICT).

**Error: "could not translate host name"**
→ Host mal escrito en CLIENT_DB_URL. Copiar de nuevo desde Supabase Dashboard.
