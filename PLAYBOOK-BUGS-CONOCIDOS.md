# PLAYBOOK — BUGS CONOCIDOS
## Plantilla Maestra Plataforma Virtual

---

### Bug 19 — Precios hardcodeados post-deploy
**Síntoma:** Precios en landing no coinciden con los del cliente
(ej: $599 en lugar de $500, $4900 en lugar de $4500).
**Causa:** mev-deploy.sh o mev-onboarding.py no actualiza los valores
de CONFIG.precios en config.ts al personalizar para el cliente.
**Estado:** page.tsx YA lee desde CONFIG.precios (fix en plantilla).
El problema ocurre en la personalización, no en el template.
**Fix:** Después de cada deploy, verificar con:
grep -n "599\|4900\|5900" src/lib/config.ts
Si hay hits → actualizar manualmente CONFIG.precios con valores del cliente.
**Afecta:** Todos los clientes donde mev-onboarding.py no actualice precios.
**Fix permanente pendiente:** mev-onboarding.py debe escribir CONFIG.precios
en config.ts durante la personalización automática.

---

### Bug 44 — "IVS Virtual" hardcodeado en descripciones de materias (clientes legacy)
**Síntoma:** En vista de materias del alumno, las descripciones muestran
"— Preparatoria IVS Virtual" en lugar del nombre del cliente.
Ejemplo: "Conocimiento matemático I — Preparatoria IVS Virtual"
**Causa:** `scripts/seed-contenido-ivs.sql` tenía el nombre del primer cliente
(IVS Virtual) hardcodeado en el campo `descripcion` de 12 materias preparatoria.
La plantilla fue creada a partir del cliente IVS sin anonimizar ese campo.
**Estado:** CORREGIDO en plantilla (commit 57655e7, 11-may-2026).
El seed ahora usa `{{CLIENTE_NOMBRE}}` como placeholder.
**Clientes afectados:** ~14 clientes pre-Avantix (desplegados antes del fix).
**Fix clientes legacy (bajo demanda):**
Ejecutar `scripts/cleanup-ivs-virtual.sql` en el SQL Editor de Supabase del cliente,
sustituyendo `NOMBRE_DEL_CLIENTE` con el nombre real del cliente.
**Validación post-fix:**
```sql
SELECT descripcion FROM public.materias
WHERE descripcion LIKE '%IVS Virtual%';
-- Debe regresar 0 filas
```

---

### Bug 45 — Placeholder `{{CLIENTE_NOMBRE}}` no resuelto en bootstrap nuevo cliente
**Síntoma:** Al ejecutar `seed-contenido-ivs.sql` en un cliente nuevo, las
descripciones quedan con el literal `{{CLIENTE_NOMBRE}}` en lugar del nombre real.
Ejemplo: "Conocimiento matemático I — Preparatoria {{CLIENTE_NOMBRE}}"
**Causa:** El proceso de bootstrap no hace sed/replace del placeholder antes
de ejecutar el seed. La plantilla ahora usa `{{CLIENTE_NOMBRE}}` (fix Bug 44),
pero el paso de personalización no lo resuelve automáticamente.
**Fix manual (nuevo cliente):** Antes de ejecutar `seed-contenido-ivs.sql`,
reemplazar el placeholder con el nombre real del cliente:
```bash
# En el archivo antes de correr en Supabase:
sed -i 's/{{CLIENTE_NOMBRE}}/NOMBRE_REAL_DEL_CLIENTE/g' scripts/seed-contenido-ivs.sql
```
O usar la opción Find & Replace del SQL Editor de Supabase antes de ejecutar.
**Fix permanente pendiente:** El script de bootstrap (mev-deploy.sh o equivalente)
debe ejecutar este sed automáticamente al personalizar un cliente nuevo.
**Validación:**
```sql
SELECT descripcion FROM public.materias
WHERE descripcion LIKE '%{{CLIENTE_NOMBRE}}%';
-- Debe regresar 0 filas
```

---

### Bug 90 — El alumno nunca pudo subir su foto de perfil (columna inexistente + bucket privado)
**Síntoma:** En `/alumno/perfil`, al elegir una imagen la subida falla siempre.
La respuesta es 500 con:
`{"error":"Could not find the 'avatar_url' column of 'usuarios' in the schema cache"}`
El avatar nunca aparece: ni en el sidebar, ni en el header, ni en la constancia.
**Afecta:** TODOS los clientes desplegados con la plantilla anterior a este fix.
No es un problema de configuración de un cliente: el código nunca funcionó.

**Causa — son DOS fallas, y la segunda estaba tapada por la primera:**

1. `POST /api/alumno/avatar` escribía en `usuarios.avatar_url`. Esa columna
   no existe: la real es `foto_url` (ver `scripts/schema.sql`, definición de
   `public.usuarios`, y el `GRANT UPDATE (… foto_url)` del final del archivo).
   El UPDATE fallaba y el endpoint devolvía 500 antes de llegar a nada más.
2. Aunque la columna hubiera sido la correcta, la URL se armaba con
   `getPublicUrl()` sobre el bucket `avatars`, que se crea **Public: OFF** y
   sin ninguna policy de lectura. Esa URL responde 400 para todo el mundo,
   incluido el dueño de la foto.

Además, `GET /api/alumno/perfil` pedía `usuarios(… avatar_url)` en su primer
intento. En PostgREST una columna inexistente tumba la consulta **entera**, no
solo esa columna, así que ese endpoint venía sirviendo siempre por su rama de
respaldo — se perdía la foto y de paso el resto del join.

**Estado:** CORREGIDO en plantilla (rama
`fix/avatar-alumno-columna-y-bucket-privado`).

**Qué cambió:** se restablece la convención que el resto de la plantilla ya
usaba para buckets privados (`documentos`, `cursos`): en la base se guarda la
**RUTA** y se **firma al leer**. Guardar una URL firmada no sirve —caduca y la
foto se rompe sola— y la pública tampoco, porque el bucket es privado.

- Nuevo `src/lib/avatar.ts`: `urlDeAvatar()` firma un valor suelto y
  `urlesDeAvatar()` firma un padrón completo en UNA sola llamada a Storage
  (firmar dentro del `.map()` de `/admin/alumnos` dispararía una petición por
  alumno).
- Se firma en los cinco puntos de lectura: perfil, layout del alumno
  (sidebar/header), constancia, lista de alumnos y ficha de alumno.
- Firmar exige **service role**: el bucket no tiene policies, así que la sesión
  del propio alumno no alcanza su archivo. Por eso el helper recibe siempre un
  admin client y solo puede llamarse desde el servidor.

**Recuperación de datos: NO hace falta migración.** `urlDeAvatar()` acepta los
tres formatos que pueden convivir en la columna:
ruta (lo nuevo), URL pública heredada del bucket —le extrae la ruta y la vuelve
a firmar, así las filas viejas se recuperan solas— y URL externa, que respeta.

**Cómo saber si un cliente sigue afectado:** revisar su repo.
```bash
grep -n "avatar_url\|getPublicUrl" src/app/api/alumno/avatar/route.ts
# Con hits → tiene el bug. Sin hits → ya trae el fix.
```
El fix es de código: hay que subir la actualización de la plantilla al repo del
cliente y redesplegar. No hay nada que correr en su base de datos.

**Validación post-fix** (con sesión de alumno):
```bash
# 1. La subida responde 200 y devuelve una URL firmada
curl -X POST "$URL/api/alumno/avatar" -H "Cookie: $SESION" -F "avatar=@foto.png"
# -> {"url":"https://<ref>.supabase.co/storage/v1/object/sign/avatars/…?token=…"}

# 2. En la base queda la RUTA, no una URL
#    SELECT foto_url FROM usuarios WHERE email='…';  ->  "<uuid>.png"

# 3. El perfil devuelve la URL ya firmada
curl "$URL/api/alumno/perfil" -H "Cookie: $SESION" | grep -o 'object/sign/avatars'
```

**Nota para clientes nuevos:** el bucket `avatars` se crea a mano (Public: OFF)
y la plantilla no le pone policies. No hace falta ponérselas — el fix firma con
service role justamente para no depender de eso.

---
