# PROVISIÓN DE UN CLIENTE SOLO-CURSOS

Receta para dar de alta un instituto que **solo vende diplomados** — sin
secundaria ni preparatoria. Complementa a `SETUP.md` y a
`INSTRUCCIONES-NUEVO-CLIENTE.md`: aquí solo va **lo que cambia** respecto a un
cliente tradicional.

> **Qué hace distinto este modo.** No apaga módulos: cambia cuál es la
> superficie principal. El alumno entra directo a sus diplomados, el panel
> pierde las secciones del programa académico y el registro público da de alta
> con `nivel = 'diplomado'`. Un cliente tradicional puede seguir vendiendo
> diplomados como complemento sin tocar nada de esto.

---

## 1. Las llaves de `src/lib/config.ts`

Todas viven en ese archivo. No hay variables de entorno nuevas.

### 1.1 El interruptor

```ts
modo: 'solo_cursos' as ModoPlataforma,   // default: 'tradicional'
```

Es lo único obligatorio. Con eso ya cambian menús, aterrizaje y registro.

### 1.2 Catálogo público en la landing (B5)

```ts
landing: {
  mostrarCatalogoCursos: true,                      // default: false
  catalogoTitulo:        'Nuestros diplomados',
  catalogoSubtitulo:     'Programas especializados, con acompañamiento y material descargable.',
},
```

Sin `mostrarCatalogoCursos: true` la landing no lista nada y el prospecto no
tiene por dónde entrar. Los dos textos son libres.

> ⚠️ El subtítulo por defecto **no afirma validez oficial**. No escribas «con
> validez oficial», «SEP» ni «RVOE» salvo que el cliente acredite su propio
> registro: lo que se escriba aquí sale publicado en su nombre.

### 1.3 Folio de la constancia (B4)

```ts
diploma: {
  folioPrefijo: 'IFC',                  // default: 'CONST'
  etiqueta:     'Constancia',           // 'Constancia' | 'Diploma' | 'Certificado'
  firma:        '/firma-director.png',  // PNG con alfa. Vacío = sin firma
  firmaCargo:   'Dirección Académica',
},
```

El folio es **consecutivo y global** (sale de la secuencia `curso_folio_seq`),
así que el prefijo es de nivel cliente, no por curso. Se fija **antes** de
emitir la primera constancia: cambiarlo después parte el libro de folios en dos
numeraciones y deja de servir para verificar un diploma impreso.

### 1.4 Lo de siempre

`nombre`, `nombreCompleto`, `prefijoMatricula`, `whatsapp*`, `colores`,
`dominio`, `logo`. Igual que cualquier cliente.

`niveles`, `modalidades`, `precios` y `documentosRequeridos` **se ignoran** en
este modo: son del programa académico. Déjalos como estén.

---

## 2. Base de datos

Igual que `SETUP.md`, **más el módulo de Cursos, que aquí no es opcional**:

| Paso | Archivo |
|---|---|
| Schema base | `supabase/schema.sql` |
| Módulo de Cursos | `scripts/migracion-cursos-diplomados.sql` |
| Examen final | `supabase/migrations/20260728120000_examen_final_cursos.sql` |
| Parches de seguridad | los tres `20260729*` |
| Línea Solo-Cursos | los `20260730*`, en orden (B1 → B2 → B3 → B4 → B6 → B7) |

> **El schema base de esta línea es `supabase/schema.sql`, a propósito** — no lo
> cambies por `scripts/schema.sql` aunque `SETUP.md` use ese otro. Solo
> `supabase/schema.sql` declara las 9 políticas de storage (`avatares`,
> `documentos`, `constancias`, `recibos`), y repuntar aquí las perdería.
> Las tablas `cursos` y `curso_inscripciones` no salen de ningún schema base:
> las crea `scripts/migracion-cursos-diplomados.sql`, el paso siguiente.
>
> Hasta ago-2026 este archivo además no traía `semanas.contenido`,
> `video_url_2` ni `video_url_3`; ya no es el caso
> (`20260819120000_bootstrap_drift_semanas.sql`, Bug 99 del PLAYBOOK).

**Puedes saltarte** `scripts/setup.sql` (el seed de materias, meses y las 265
preguntas del programa). Un cliente Solo-Cursos no usa nada de eso, y sembrarlo
solo deja tablas llenas que nadie consulta.

---

## 3. Los 3 pasos después de provisionar

### Paso 1 — Crear los diplomados

`/admin/cursos` → **Nuevo curso**. Por cada uno:

1. Nombre, descripción y tipo (`diplomado`).
2. Portada (JPG/PNG/WebP, máx 5 MB).
3. **Precios y ritmo** — la sección que hace que el cliente no nos necesite:

   | Campo | Qué controla |
   |---|---|
   | Inscripción | Cuota única al inscribirse. 0 = no se cobra |
   | Mensualidad | Lo que paga cada mes; es el monto propuesto al registrar el pago |
   | Horas | Sale en la constancia y en el catálogo público |
   | **Módulos por mes** | **Cuántos módulos abre cada mes pagado — el ritmo del curso** |
   | Duración (meses) | Tope de meses que se pueden abrir. Vacío = sin tope |
   | Intentos del examen | Cuántas veces puede presentarlo cada alumno |

4. Módulos y lecciones, en orden.
5. Preguntas del examen final, si lo va a tener.

> ⚠️ **Módulos por mes y Duración son retroactivos.** El acceso se recalcula en
> cada lectura a partir de los meses pagados, no se congela al inscribir.
> Cambiarlos con alumnos dentro les mueve lo que ven: bajarlos oculta módulos
> que ya tenían abiertos. El panel avisa antes de guardar cuando hay
> inscripciones activas. Déjalos definidos **antes** de inscribir al primero.

### Paso 2 — Publicar

Pestaña **Publicación** → `publicado`.

Un curso en **borrador** no existe para nadie fuera del panel: no aparece en el
catálogo y su página pública da 404 — el mismo 404 que un curso inexistente, a
propósito, para que no se pueda enumerar lo que está en preparación.

### Paso 3 — Verificar el catálogo

1. Abre la landing sin sesión: la sección de diplomados debe listar los
   publicados.
2. Entra a uno: temario (títulos de módulo), precios y el botón de WhatsApp.
3. Comprueba que el botón abre WhatsApp con el nombre del diplomado precargado.
4. En móvil: las tarjetas van en una columna y el botón ocupa el ancho.

Si la sección no sale: o `mostrarCatalogoCursos` sigue en `false`, o no hay
ningún curso en `publicado`.

---

## 4. Cómo entra un alumno

No hay autoinscripción ni pasarela de pago: **la conversión es por WhatsApp**.

```
Prospecto → landing → /diplomados/[id] → WhatsApp → el admin lo inscribe
```

1. El alumno se registra en `/register`, o el admin lo da de alta desde
   `/admin/alumnos`. **Las dos puertas producen la misma fila**: el servidor
   pone `nivel = 'diplomado'` y `modalidad = NULL`, ignorando lo que venga en la
   petición. No se pide nivel ni modalidad en ninguna de las dos.
2. El admin lo inscribe al diplomado desde `/admin/cursos/[id]` → Alumnos.
3. Registra el pago. Si es mensualidad, **Abrir mes** libera el siguiente bloque
   de módulos.
4. Al aprobar el examen, **el admin emite la constancia** desde la ficha de la
   inscripción. **La emisión es manual a propósito** (B8.2): el folio es
   permanente e irrepetible, así que un humano verifica antes de congelar el
   documento. No es un paso que falte automatizar — no lo "arregles" de vuelta:
   el sistema rechaza emitir sin examen aprobado, no duplica folios, y el
   alumno aprobado ve «constancia en emisión» mientras tanto.

---

## 5. Qué NO va a ver el cliente en este modo

Para que nadie lo reporte como un error:

- **Alumno**: sin Mis Materias, Calificaciones, Logros ni la constancia del
  programa. Solo Mis Diplomados y Mis Documentos. Aterriza en `/alumno/cursos`.
- **Admin**: sin Contenido (materias y meses) ni Estado de Cuenta. Quedan
  Dashboard, Alumnos, Diplomados, Reportes, Documentos, Usuarios y Configuración.
- **Secretario**: solo Alumnos, desde donde registra los pagos del diplomado.

Las URLs del programa siguen existiendo pero redirigen: un enlace viejo a
`/alumno/materias` lleva a `/alumno/cursos`, no a una pantalla rota.

---

## 6. Limitaciones conocidas

Cosas que están así **a propósito**, para que nadie las reporte como defectos ni
las "arregle" sin saber por qué existen.

### `materias.nivel` no admite `'diplomado'` — y no debe

El CHECK de `materias.nivel` acepta `secundaria`, `preparatoria`, `demo` y
`licenciatura`. **No** `diplomado`, aunque `alumnos.nivel` sí lo acepte desde B1.

No es un olvido. `materias` es el temario del PROGRAMA académico: meses, semanas,
evaluaciones, quiz semanal. Un alumno de diplomado no cursa nada de eso — su
contenido vive en `curso_modulos` y `curso_lecciones`, que son otras tablas con
otro gate (B2). Agregar `'diplomado'` al CHECK abriría un valor que **ningún
consumidor lee**: no habría forma de crear una materia de diplomado desde el
panel, ni pantalla que la mostrara. Sería un permisivo sin destinatario, y la
próxima persona que lo viera tendría que averiguar para qué sirve.

Consecuencia práctica: si un alumno de diplomado llegara a `/alumno/materias`, la
lista saldría vacía. En modo `solo_cursos` esa ruta está redirigida (ver §5), y
en un cliente híbrido el alumno de diplomado no tiene por qué entrar ahí.

### `alumnos.nivel` es de una sola escritura

Se fija al dar de alta —por registro público o por el panel— y **no hay pantalla
ni endpoint para cambiarlo después**. El `PATCH` de `/api/admin/alumnos/[id]`
solo acepta `contactado_whatsapp`.

En modo `solo_cursos` no duele: las dos puertas fuerzan `'diplomado'`, así que no
hay forma de equivocarse. Donde sí importa es en un cliente **híbrido**, donde el
admin elige el nivel a mano: si se equivoca, la corrección hoy es un `UPDATE`
directo en la base.

Queda registrado como deuda operativa. Cerrarla es una pantalla de edición de
nivel con su propia validación — no entró en esta línea porque ningún flujo de
Solo-Cursos la necesita.

---

## 7. Checklist de entrega

- [ ] `modo: 'solo_cursos'` en `config.ts`
- [ ] `landing.mostrarCatalogoCursos: true` + los dos textos
- [ ] `diploma.folioPrefijo` fijado **antes** de la primera constancia
- [ ] Identidad, colores, logo y WhatsApp del cliente
- [ ] Migraciones aplicadas hasta B7
- [ ] Al menos un diplomado **publicado**, con precios y ritmo
- [ ] Catálogo visible en la landing sin sesión, y en móvil
- [ ] Un alumno de prueba: registro → inscripción → pago → abrir mes → ve el módulo
- [ ] El admin sabe crear un diplomado él solo — **es la promesa comercial**
