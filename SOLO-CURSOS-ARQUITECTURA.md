# LÍNEA SOLO-CURSOS — arquitectura y mapa de fases

Para quien mantenga esto después. Explica **qué es**, **cómo está partido** y
**dónde tocar** cada cosa.

- Instalar un cliente: **`SETUP.md`**
- Provisionar un cliente Solo-Cursos: **`INSTRUCCIONES-SOLO-CURSOS.md`**

---

## 1. Qué es

La plantilla nació para escuelas de **secundaria y preparatoria**: materias,
meses, semanas, evaluaciones. La línea Solo-Cursos añade un segundo producto —
**diplomados**— que se vende y se consume distinto:

| | Programa académico | Diplomados |
|---|---|---|
| Contenido | `materias` → `meses_contenido` → `semanas` | `cursos` → `curso_modulos` → `curso_lecciones` |
| Quién avanza | `alumnos.meses_desbloqueados` | `curso_inscripciones.meses_desbloqueados` |
| Qué libera un mes | materias del mes | `modulos_por_mes` módulos |
| Cobro | `pagos` con `concepto='mensualidad'` | `pagos` con `curso_inscripcion_id` |
| Documento final | constancia por materias acreditadas | constancia con **folio consecutivo** |

**Son dos verticales que conviven, no uno que reemplaza al otro.** Un cliente
tradicional puede vender diplomados como complemento. Lo que cambia es cuál es
la superficie principal, y eso lo decide un interruptor.

## 2. El interruptor

```ts
// src/lib/config.ts
modo: 'tradicional' as ModoPlataforma,   // 'tradicional' | 'solo_cursos'
```

**Default `'tradicional'`, y esa es la garantía**: 144 clientes comparten esta
plantilla y con el default la app es idéntica a la de antes de esta línea. El
invariante se verifica, no se argumenta — el bloque `NAV_ITEMS` del sidebar es
byte-idéntico al de `main`.

Toda la lógica del modo vive en **`src/lib/modo.ts`**. Si te encuentras
preguntando `CONFIG.modo === ...` fuera de ese archivo, es que falta un helper.

Los menús de `solo_cursos` son una **constante aparte** (`NAV_ITEMS_SOLO_CURSOS`),
no un filtro sobre los tradicionales. Mientras sea así, editar el de diplomados
no puede romper el otro.

## 3. Mapa de las fases

| Fase | Qué resolvió | Migración |
|---|---|---|
| **B0** | Escalada de rol en el alta (S1), `es_admin` con `LOWER` (S2), política de portadas | `20260729120000`, `20260729121000`, `20260729122000` |
| **B0.5** | El envío del examen devolvía la clave de las no contestadas (Bug 69) | — (código) |
| **B1/B1.1** | Fundación: columnas de curso, `nivel='diplomado'`, `curso_constancias`, `curso_folio_seq` | `20260730120000` |
| **B2** | **El gate**: la ventana de acceso por mes pagado, en RLS *y* en código | `20260730130000` |
| **B3** | Abrir Mes + pagos por inscripción, atómicos | `20260730140000` |
| **B4** | Diploma con folio consecutivo + bitácora de inscripción | `20260730150000` |
| **B5** | Catálogo público en la landing + `/diplomados/[id]` | — (código) |
| **B6** | Reportes con desglose por vertical + export CSV | `20260730160000` |
| **B7** | El modo + autoservicio de parámetros del curso | `20260730170000` |
| **B8** | QA de cierre, docs, PR | — |
| **B8.1/B8.2** | Gate E2E contra stack real; replay de la cadena (fix Bug 80); catálogo fresco por `revalidatePath`; **emisión manual con actor** | `20260730180000` |

Las migraciones se aplican **en orden**. Desde B8.1 la cadena completa es
re-ejecutable (dos pasadas limpias, verificado).

### La emisión de constancias es MANUAL — no lo "arregles"

Aprobar el examen es la **condición** de la constancia, no su gatillo. El único
camino de emisión es `POST /api/admin/inscripciones/[id]/constancia`, **con la
sesión del admin** — así la bitácora registra quién emitió. Es decisión de
producto (B8.2, supersede la auto-emisión de B4): el folio es permanente e
irrepetible y un humano verificando antes de congelar el snapshot es feature
(Bug 78). Los candados viven en la función SQL, no en el código: sin examen
aprobado la emisión se rechaza (422), un alumno que la invoque directo recibe
403 (`es_admin()`), y una llamada con `service_role` **falla a propósito** —
`auth.uid()` NULL dejaría el evento sin autor, que era el bug.

## 4. Los archivos que importan

| Archivo | Qué gobierna |
|---|---|
| `src/lib/modo.ts` | El modo: qué se oculta, a dónde se redirige, qué nivel se fuerza |
| `src/lib/cursos/acceso.ts` | **El gate de B2.** Fuente única de la ventana. No leer progreso aquí |
| `src/lib/cursos/parametros.ts` | Validación de los 6 parámetros del curso, compartida crear/editar |
| `src/lib/cursos/catalogo.ts` | Lista blanca de campos del catálogo público |
| `src/lib/reportes/csv.ts` | Serialización CSV con neutralización de fórmulas |

## 5. Tres reglas que costaron caro

**1. El gate no lee progreso.** Lo que un alumno ve depende *solo* de meses
pagados. Mezclar progreso fue el Bug 61 (el "ratchet"): completar módulos abría
los siguientes sin pagar.

**2. El denominador del avance es el curso entero.** Filtrar las lecciones por la
ventana encogía el denominador y un alumno con 1 de 6 meses salía al 100%.

**3. Lo que se congela en un snapshot se valida antes.** `curso_constancias`
guarda nombre, curso y horas del día de la emisión, y la emisión es idempotente:
un dato malo ahí es un folio quemado. Ver Bug 77 y 78 del PLAYBOOK.

## 6. Pendientes registrados

- **Verificación pública de folio** (`/verificar/[folio]`): no implementada.
  Es decisión de privacidad — expone que una persona cursó algo.
- **`alumnos.nivel` es de una sola escritura**: sin pantalla de corrección.
  Ver `INSTRUCCIONES-SOLO-CURSOS.md` §6.
- **`reporte_coherencia_pagos()`**: monitor, no alarma. Cuenta pagos donde el
  concepto y la inscripción se contradicen. Si crece, hay un escritor nuevo mal.
- **Quiz semanal (Bug 59)**: su GET sigue devolviendo `respuesta_correcta`.
  Es del programa académico, no de esta línea.
