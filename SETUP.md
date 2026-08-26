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
>
> ✅ **LA CADENA COMPLETA ES RE-EJECUTABLE** (desde B8.1): las 19 migraciones se
> pueden volver a correr desde el principio sin errores — replay verificado
> 19/19, dos pasadas limpias contra un proyecto Supabase real. (Hubo una época
> en que no: B6 amplió dos funciones de ingresos y el replay moría en
> `20260716150000` y `20260717120000` con `cannot change return type` — es el
> Bug 80 del PLAYBOOK; B8.1 lo corrigió con `DROP FUNCTION IF EXISTS` en esas
> dos migraciones. Coherente con `SOLO-CURSOS-ARQUITECTURA.md`.)

1. supabase.com → New project
2. **Schema base** → ejecutar `scripts/schema.sql` completo

   > **Hay DOS instaladores de esquema y no son intercambiables.** Desde
   > `20260819120000_bootstrap_drift_semanas.sql` ya no divergen en columnas,
   > pero siguen sirviendo a rutas distintas:
   >
   > | Archivo | Para qué | Quién lo usa |
   > |---|---|---|
   > | `scripts/schema.sql` | **Línea tradicional.** Se mantiene a mano. | `mev-onboarding.py` (TAREA 3, paso 1), este documento, `INSTRUCCIONES-NUEVO-CLIENTE.md`, `scripts/README.md` |
   > | `supabase/schema.sql` | **Línea Solo-Cursos** y desarrollo local con la cadena de migraciones. | `INSTRUCCIONES-SOLO-CURSOS.md`, `supabase db reset` |
   >
   > **`supabase/schema.sql` es hoy un superconjunto estricto de
   > `scripts/schema.sql`**: mismas 22 tablas, mismas columnas, 13 funciones,
   > 3 triggers y 22 RLS — más las **9 políticas de storage** de los buckets
   > `avatares`, `documentos`, `constancias` y `recibos`, que solo él declara.
   > Por la ruta de este documento esas políticas se crean en el paso 9
   > (Buckets de Storage), así que tampoco falta nada aquí.
   >
   > Los dos archivos los vigila **`tests/unit/guardian-schema-onboarding.spec.ts`
   > en ambas direcciones**: que todo `CREATE` de `supabase/migrations/` llegue a
   > `scripts/schema.sql`, y que toda columna de `scripts/schema.sql` exista
   > también en `supabase/schema.sql`. Si agregas algo a uno, el guardián te
   > exige el otro.
   >
   > *Historia:* hasta ago-2026 `supabase/schema.sql` no traía
   > `semanas.contenido`, `video_url_2` ni `video_url_3`, y usarlo aquí hacía
   > reventar el seed del paso 3 con *column "video_url_2" does not exist*.
   > **Esa advertencia ya no aplica.** Ver **Bug 99** del PLAYBOOK.

   (Al correrlo verás `ERROR: schema "public" already exists` en la línea 28:
   es inofensivo — toda base de Postgres ya trae `public`. Continúa solo.)
3. **Seed de contenido** → ejecutar `scripts/setup.sql`
   ⚠️ **Desde dentro de `scripts/`**, no desde la raíz del repo: usa `\i` con
   rutas relativas al *directorio de trabajo*, así que `psql -f scripts/setup.sql`
   falla con *No such file or directory*. Correcto:
   `cd scripts && psql "$DATABASE_URL" -f setup.sql`
   (En el SQL Editor de Supabase no aplica: ahí se pega el contenido de cada
   archivo por separado.)
   Es el orquestador único del seed (materias, meses, semanas, evaluaciones y las
   265 preguntas universales). Reemplaza a los antiguos `seed-materias.sql` y
   `distribuir-meses.sql`, que **ya no existen en el repo**.
   Ajustar nombres de materias según el cliente después de sembrar.
   Resultado esperado: 25 materias, 265 preguntas, 592 del quiz semanal.
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
7bis. **Línea Solo-Cursos (diplomados)** — obligatoria si el cliente vende
   diplomados, y **obligatoria también en modo tradicional** si quiere ofrecerlos
   como complemento. Correr en este orden, después del paso 7:

   | Orden | Migración | Qué trae |
   |---|---|---|
   | 1 | `20260716120000_pagos.sql` | tabla `pagos` |
   | 2 | `20260716130000_rol_secretario.sql` | rol acotado |
   | 3 | `20260716140000_bucket_recibos.sql` | bucket de recibos |
   | 4 | `20260716150000_reporte_ingresos.sql` | ingresos por semana/mes |
   | 5 | `20260716160000_estado_cuenta.sql` | estado de cuenta |
   | 6 | `20260717120000_pagos_fecha_pago.sql` | `fecha_pago` editable (Bug 57) |
   | 7 | `20260730120000_b1_fundacion_solo_cursos.sql` | **B1** — columnas de curso, `nivel='diplomado'`, `curso_constancias`, `curso_folio_seq` |
   | 8 | `20260730130000_b2_gate_ventana_cursos.sql` | **B2** — el gate de acceso por mes pagado, en RLS |
   | 9 | `20260730140000_b3_abrir_mes_y_pagos_curso.sql` | **B3** — Abrir Mes + pagos por inscripción |
   | 10 | `20260730150000_b4_constancia_y_eventos.sql` | **B4** — folio consecutivo + bitácora |
   | 11 | `20260730160000_b6_reportes_por_vertical.sql` | **B6** — ingresos programa vs diplomados |
   | 12 | `20260730170000_b7_estado_cuenta_excluye_diplomado.sql` | **B7** — el estado de cuenta ignora a los de diplomado |
   | 13 | `20260730180000_b82_emision_manual_con_actor.sql` | **B8.2** — emisión manual con actor + guard de aprobación |

   > No hay migración de B5 ni de B7/T1–T3: son cambios de código, no de esquema.

   Para un cliente **Solo-Cursos** (solo diplomados), ver
   **`INSTRUCCIONES-SOLO-CURSOS.md`**: la configuración del modo, el catálogo
   público y los 3 pasos posteriores.

8. **Verificación** → ejecutar `scripts/post-setup-check.sql`
   Reporta ✅/❌ por check. Si todo sale ✅, la plataforma está lista para entregar.
9. **Buckets de Storage** — los crea el SQL de los pasos anteriores; verificar que existan:

   | Bucket | Privacidad | Límite | Lo crea | Notas |
   |---|---|---|---|---|
   | `avatares` | **público** | 5 MB | `supabase/schema.sql` → `INSERT INTO storage.buckets` | ⚠️ ver aviso abajo |
   | `documentos` | privado | 10 MB | idem | documentos del alumno + la constancia |
   | `constancias` | privado | 10 MB | idem | declarado pero **sin uso en la app** hoy |
   | `recibos` | privado | 2 MB | idem + `migrations/20260716140000` | recibos de pago |
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

## Paso 8 — Entrega al cliente (ÚLTIMO PASO, obligatorio)

Con la plataforma ya en producción **y el dominio definitivo conectado**:

```bash
cp scripts/entrega/entrega.local.ejemplo.json entrega.local.json
# …llenar con nombre del admin, correo y contraseñas…
pnpm entrega
```

Genera los dos entregables del cliente:

| Archivo | Qué es |
|---|---|
| `entrega/<NOMBRE>_Entrega_Oficial.pdf` | Documento de entrega con la marca del cliente |
| `entrega/ENTREGA-WHATSAPP.txt` | Mensaje listo para copiar y pegar |

Ambos se arman solos desde `src/lib/config.ts` y de la base: niveles,
modalidades, precios, licenciaturas y conteo real de contenido. **Se adaptan a lo
que el cliente contrató** — un plan o varios, inscripción plana o por nivel, con
licenciaturas o sin ellas.

> ⚠️ **El comando aborta si el dominio no es el definitivo.** No se emite un
> documento oficial con una URL de `vercel.app`: el cliente lo guarda y lo
> reenvía, y meses después el enlace ya no existe. Si el dominio no está listo,
> el paso pendiente es conectarlo.

Detalle completo en `scripts/entrega/README.md`.

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
