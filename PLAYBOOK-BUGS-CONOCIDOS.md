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

### Bug 59-bis — Seis consultas mezclaban el catálogo de TODAS las carreras
**Síntoma:** en un cliente con dos o más programas de licenciatura/diplomado, el
alumno de uno ve materias del otro. En concreto:
- La ficha del admin lista 48 materias en vez de 24 y el avance sale sobre el
  plan equivocado.
- El **boletín** y la **constancia** —documento que el alumno imprime— incluyen
  materias de un programa que no cursa.
- Los logros `mes_completado` y `mitad_carrera` **no se otorgan nunca**.
- **Cerrar mes borra lo que no debe** (ver abajo).

**Causa:** todas las carreras comparten `nivel = 'licenciatura'`. Filtrar solo
por `nivel` devuelve el catálogo completo. El Bug 59 original ya se había
corregido en `/api/alumno/materias` y en `cargarContextoAcceso()`, pero **no se
portó** a estos seis lugares:

| Archivo | Efecto |
|---|---|
| `api/admin/alumnos/[id]/avance` | ficha con el doble de materias |
| `api/admin/alumnos/[id]/cerrar-mes` | **borra progreso del programa equivocado** |
| `api/alumno/evaluacion/[id]/enviar` (×2) | logros que no llegan |
| `api/alumno/calificaciones` | boletín mezclado |
| `api/alumno/constancia` | **documento impreso mezclado** |

**El peor es `cerrar-mes`.** Toma las materias del mes con
`.range(inicio, fin)` sobre la lista ordenada y después **BORRA**
`progreso_semanas`, `quiz_respuestas` e `intentos_evaluacion`. Con el catálogo
mezclado el rango cae partido entre dos programas: cerrar el mes 1 de un alumno
toca materias de otro programa y deja su propio mes cerrado a medias.

**Fix:** en los seis, acotar por carrera **solo cuando el nivel es
licenciatura**, con el mismo criterio que `cargarContextoAcceso()`:
```ts
if (alumno.nivel === 'licenciatura' && alumno.carrera) {
  query = query.eq('carrera', alumno.carrera)
}
```
⚠️ Hay que añadir `carrera` al `select` del alumno y al de `materias`, o el
filtro queda inerte y el bug parece corregido sin estarlo.
**Detectado en:** EDU CEL ACADEMY (#177) con Playwright sobre producción,
27-ago-2026. Corregido en plantilla.

---

### Bug 103 — La ventana de licenciatura hereda `materiasPorMes` de prepa
**Síntoma:** un alumno de un programa de 24 materias en el plan de 6 meses
avanza hasta la materia 12 y ahí se detiene. Al abrir cualquier materia
posterior, `/api/alumno/materia/[id]` responde **403**. Subirle
`meses_desbloqueados` **no lo desbloquea**, porque el tope es un producto.
**Causa:** los ids de las **dos** tablas de modalidades colisionan: `'3_meses'` y
`'6_meses'` existen a la vez en `CONFIG.modalidades` (Sec/Prepa) y en
`CONFIG.licenciaturas.modalidades`. En `src/lib/modalidades.ts`:
```ts
function buscarModalidad(id) {
  const base = CONFIG.modalidades.find(m => m.id === id && m.activa)
  if (base) return base            // ← el programa SIEMPRE gana
  return modalidadesLic().find(...)
}
```
`materiasPorMesDePlan()` recibía entonces el valor de prepa (2) y calculaba
`límite = meses × 2`: 12 materias sobre un temario de 24.
**Alcance:** cualquier cliente que venda un programa de licenciatura en 3 o 6
meses. Los planes de 9, 12 y 18 meses no colisionan, y por eso no se había
visto: el diplomado de enfermería del banco se documenta con `--meses 18`.
**Fix:** `materiasPorMesDePlan()` ya recibe el alumno; cuando su nivel es
`'licenciatura'` resuelve contra la tabla de licenciatura con
`getMateriasPorMesLicenciatura()`, y conserva el fallback anterior si esa
modalidad no está declarada ahí. Lo mismo en `cerrar-mes`, que calcula el rango.
**`buscarModalidad()` NO se toca:** lo consumen los 11 archivos de API del
programa y su comportamiento para Sec/Prepa debe quedar idéntico.
**Alternativa descartada:** renombrar los ids a `lic_6_meses`. El CHECK de
`alumnos.modalidad` solo acepta `'3_meses'` y `'6_meses'`, y
`alumnos.duracion_meses` es una columna GENERATED que los lee. Exigiría migrar
el esquema en toda la flota.
**Validación:**
```
licenciatura 6_meses → ventana 24 materias (antes 12)
preparatoria 6_meses → ventana 12 materias (sin cambio)
```
**Detectado en:** EDU CEL ACADEMY (#177), 27-ago-2026. Corregido en plantilla.

---

### Bug 105 — El item activo del sidebar podía perderse contra el fondo
**Síntoma:** en un cliente cuyos dos colores de marca son vecinos en el círculo
cromático (p. ej. morado `#6B21A8` e índigo `#1E3A8A`), el item seleccionado del
sidebar se ve como un bloque plano y no se distingue del fondo.
**Causa:** el realce salía de `var(--color-acento)` y se pinta **encima** de
`var(--color-primario)`. Con colores vecinos y luminancia parecida, no hay
contraste. Lo mismo con el avatar y el chip de nivel, que además llevaban azules
escritos a mano (`rgba(21,101,192,…)`) que sobre un primario no azul se ven
sucios.
**Fix:** cada realce sale de su propia variable, **con fallback al valor de
siempre**, así que un cliente que no las declare ve el sidebar idéntico:
`--color-sidebar-activo`, `--color-sidebar-activo-texto`,
`--color-sidebar-hover`, `--color-sidebar-realce`, `--color-sidebar-borde`,
`--color-sidebar-borde-fuerte`. Se declaran opcionalmente en `CONFIG.colores` y
`layout.tsx` las inyecta.
**Para un cliente con este problema:** blanco translúcido resuelve el contraste
sin meter un tercer color.
**Detectado en:** EDU CEL ACADEMY (#177), 26-ago-2026. Corregido en plantilla.

---

### Bug 106 — Pagos e Informes existían pero no estaban enlazados
**Síntoma:** el admin no encuentra el historial de pagos ni los informes.
`/admin/pagos` responde 404 y a `/admin/reportes` solo se llega escribiendo la
URL a mano.
**Causa:** dos cosas distintas que se ven igual desde el panel:
- `NAV_ITEMS.ADMIN` no incluía ni Pagos ni Informes. `NAV_ITEMS_SOLO_CURSOS`
  sí lleva Informes, así que el módulo solo era alcanzable en modo Solo-Cursos.
- `/admin/pagos` no existía como página. Sí existían `POST /api/admin/pagos`,
  `GET /api/admin/pagos/[id]/recibo` (con PDF a Storage y URL de WhatsApp) y el
  bucket `recibos`: todo el backend, sin pantalla que lo usara.
**Fix:** ambos items en `NAV_ITEMS.ADMIN` (Pagos también en `SECRETARIO`, que es
quien cobra; Informes NO, porque el export exige rol ADMIN), la página
`/admin/pagos` y el `GET /api/admin/pagos` que lista el historial con KPIs.
**⚠️ Al escribir ese GET:** el filtro por texto NO puede ir en un `.or()` de
PostgREST. `alumnos.nombre.ilike.%x%` dentro de un `.or()` no filtra la tabla
embebida — devuelve la fila con el embed en `null` y la tabla se llena de pagos
"sin alumno". Hay que filtrar en el servidor sobre las filas ya unidas.
**Detectado en:** EDU CEL ACADEMY (#177), 26-ago-2026. Corregido en plantilla.

---

### Bug 107 — La oferta del cliente estaba escrita a mano en el footer
**Síntoma:** el pie del portal dice "Preparatoria · Secundaria · 100% en línea"
en cualquier cliente. Uno que solo venda secundaria anuncia prepa, y el alumno
de un curso o diplomado lee al pie de SU portal dos programas que no cursa.
Aparece en todas las pantallas del portal.
**Fix:** `src/components/layout/footer.tsx` arma el texto con `getNivelLabel()`
y las carreras declaradas. Un cliente sin licenciaturas ve el mismo texto.
**Detectado en:** EDU CEL ACADEMY (#177), 27-ago-2026. Corregido en plantilla.

---

### Bug 100 — El folio de la constancia cambia en cada recarga
**Síntoma:** un alumno abre `/alumno/constancia`, ve `CONST-2026-890346`,
recarga y ahora dice `CONST-2026-214877`. Dos impresiones del mismo documento
salen con folios distintos, y el prefijo es `CONST-` en todos los clientes.
**Causa:** `src/app/(dashboard)/alumno/constancia/page.tsx` genera el folio con
`Math.random()` en el CLIENTE, en cada render. No se persiste ni se deriva de
nada del alumno, y el prefijo está escrito a mano — ignora
`CONFIG.diploma.folioPrefijo`.
**Estado: NO corregido.** No rompe nada: la constancia se imprime igual. Es un
problema de credibilidad del documento.
**Fix propuesto:** derivarlo de datos estables del alumno (matrícula + nivel) y
tomar el prefijo del config, o persistirlo en `public.constancias` la primera
vez que se emite — que es lo que ya hace la constancia de diplomados con
`curso_folio_seq`.
**Detectado en:** EDU CEL ACADEMY (#177), 26-ago-2026.

---

### Nota 104 — La materia demo aparece dentro del catálogo de cada carrera
**Síntoma:** un alumno inscrito a un programa de 24 materias ve **25**, y la
primera de la lista no pertenece a su programa.
**Causa:** `seed-demo-materia.sql` siembra una materia con `nivel = 'demo'`, que
`acceso-materias.ts` trata como tutorial: siempre visible y sin lugar en la
ventana. Es **deliberado** —el README de `scripts/` la marca como CRÍTICA para el
modo prueba— y le pasa igual al alumno de preparatoria, que ve 13 en vez de 12.
**No es un bug**, pero conviene saberlo antes de reportar un conteo que no cuadra.
Si un cliente no la quiere: `UPDATE materias SET activa = false WHERE nivel = 'demo';`

---

### Bug 108 — El Documento de Entrega anunciaba precios que la plataforma no cobra
**Síntoma:** el PDF de entrega de un cliente con precios distintos por nivel
dice "Secundaria: 3 Meses $2,000/mes · 6 Meses $1,000/mes" cuando su plataforma
cobra $1,800 y $900. El cliente recibe un documento oficial que contradice a su
propia página de precios.
**Causa:** `scripts/entrega/generar-entrega.mjs` leía `modalidades[].mensualidad`,
que es **un solo número** para toda la tabla, y lo repetía en cada nivel: salía
el de preparatoria para todos. Los precios reales por nivel viven en
`CONFIG.precios.<nivel>_<n>meses_normal`, que es de donde lee la landing.
**Fix:** `mens(m, nivel)` consulta primero `precios.<nivel>_<n>meses_normal` y
solo cae a `mensualidad` si esa clave no existe. Un cliente con tarifa única no
nota ningún cambio.
**Cómo se detecta:** comparar la tabla de precios del PDF contra la sección de
precios de la landing. Si no coinciden, es esto.
**Detectado en:** EDU CEL ACADEMY (#177), 27-ago-2026. Corregido en plantilla.

---

### Bug 109 — La entrega ignoraba los cursos y diplomados ya cargados
**Síntoma:** un cliente al que se le entregaron programas del riel de
licenciatura (cursos, diplomados, carreras) recibía un PDF y un mensaje de
WhatsApp que no los mencionaban. El WhatsApp no los nombraba **ni una vez**, y
el PDF solo los delataba con una fila "Licenciatura — Plan 6 Meses" en la tabla
de modalidades.
**Causa:** el generador solo contaba materias por nivel `secundaria`/`preparatoria`
y trataba `CONFIG.licenciaturas` como un bloque de precios, no como oferta.
**Fix:** el inventario ahora se calcula **por carrera** (`INV.porCarrera[slug]`)
—nunca por nivel, que sumaría los programas entre sí, ver Bug 59— y alimenta:
una sección propia del PDF con catálogo y descripciones, un bloque en el
WhatsApp, la portada, y la lista de funcionalidad.
**Ojo con el vocabulario:** un curso de preparación no es una licenciatura ni
tiene cuatrimestres. El generador infiere el tipo del nombre; para fijarlo,
agrega `tipo: 'curso' | 'diplomado' | 'licenciatura'` a la carrera en el config.
**Detectado en:** EDU CEL ACADEMY (#177), 27-ago-2026. Corregido en plantilla.

---

### Bug 110 — El enlace del PDF a la sección de programas caía en el vacío
**Síntoma:** el Documento de Entrega ofrece "Sección pública:
`<dominio>/#programas`". El cliente hace clic y la página no se mueve.
**Causa:** ese id no existía. El único ancla parecida en la landing es
`#diplomados`, que es **otra cosa** —el catálogo de cursos propios del cliente—
y además solo se renderiza si publicó alguno, así que en un cliente recién
entregado ni siquiera está en el DOM.
**Fix:** el generador **lee** el id de `LandingClient.tsx` (busca `programas`,
`carreras`, `licenciaturas`) en vez de darlo por hecho, y si no encuentra
ninguno omite la fila. Prometer un enlace que no anda es peor que no darlo.
**Al reescribir la landing de un cliente con programas:** ponle
`id="programas"` a esa sección, o el PDF no podrá enlazarla.
**Detectado en:** EDU CEL ACADEMY (#177), 27-ago-2026. Corregido en plantilla.
