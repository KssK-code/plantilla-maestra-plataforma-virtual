import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG } from '@/lib/config'
import {
  esSoloCursos, aterrizajeAlumno, nivelForzadoDeRegistro,
  destinoSiEsRutaDeProgama, RUTAS_PROGRAMA_ALUMNO, RUTAS_PROGRAMA_ADMIN,
  DESTINO_ALUMNO, DESTINO_ADMIN,
} from '@/lib/modo'
import { validarParametrosCurso, afectaVentanaRetroactiva } from '@/lib/cursos/parametros'

/**
 * B7 — Modo Solo-Cursos.
 *
 * El invariante que protegen estas pruebas: con el modo apagado (el default,
 * y el estado de los 144 clientes tradicionales) NADA cambia. El comportamiento
 * de solo_cursos se prueba llamando a las funciones con la ruta como dato, no
 * encendiendo el flag: encenderlo aquí lo dejaría encendido para el resto del
 * archivo y las pruebas se contaminarían entre sí.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')
const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

// ───────────────────────── El default no mueve nada ──────────────────────────

test('el modo viene en tradicional por default', () => {
  // 144 clientes comparten esta plantilla. Si esto cambia, se les mueve la app
  // entera al actualizar.
  expect(CONFIG.modo).toBe('tradicional')
  expect(esSoloCursos()).toBe(false)
})

test('en tradicional NINGUNA ruta del programa se redirige', () => {
  // La lista completa, no una muestra: si mañana alguien agrega una ruta a
  // RUTAS_PROGRAMA_* sin condicionarla al modo, esta prueba la caza.
  const todas = [
    ...RUTAS_PROGRAMA_ALUMNO,
    ...RUTAS_PROGRAMA_ADMIN,
    '/alumno', '/alumno/materia/abc-123', '/admin/contenido/xyz',
  ]
  for (const r of todas) {
    expect(destinoSiEsRutaDeProgama(r)).toBeNull()
  }
})

test('en tradicional el alumno aterriza donde siempre y el registro no fuerza nivel', () => {
  expect(aterrizajeAlumno()).toBe('/alumno')
  // null = manda lo que eligió el usuario en el formulario.
  expect(nivelForzadoDeRegistro()).toBeNull()
})

test('el menú tradicional del sidebar conserva sus entradas exactas', () => {
  // Verificado además contra origin/main durante B7: el bloque NAV_ITEMS quedó
  // byte-idéntico. Esto lo clava para que no se erosione después.
  const src = leer('src/components/layout/sidebar.tsx')
  const bloque = src.slice(src.indexOf('const NAV_ITEMS: Record'), src.indexOf('const NAV_ITEMS_SOLO_CURSOS'))

  for (const href of ['/admin', '/admin/alumnos', '/admin/estado-cuenta', '/admin/contenido',
                      '/admin/cursos', '/admin/documentos', '/admin/usuarios', '/admin/configuracion']) {
    expect(bloque).toContain(`href: '${href}'`)
  }
  for (const href of ['/alumno', '/alumno/materias', '/alumno/calificaciones',
                      '/alumno/constancia', '/alumno/documentos']) {
    expect(bloque).toContain(`href: '${href}'`)
  }
  // Y el menú de solo_cursos es una constante APARTE, no un filtro sobre esta:
  // mientras sea así, editar el de diplomados no puede romper el tradicional.
  expect(src).toContain('const NAV_ITEMS_SOLO_CURSOS')
})

// ───────────────── Las reglas de ruta, sin encender el flag ──────────────────

test('la lista de rutas del programa no puede atrapar rutas hermanas', () => {
  // El bug clásico: startsWith('/alumno/materia') también matchea
  // '/alumno/materias'. Las reglas usan `=== base || startsWith(base + '/')`,
  // así que cada ruta y sus hijas coinciden, y las hermanas no.
  expect(RUTAS_PROGRAMA_ALUMNO).toContain('/alumno/materias')
  expect(RUTAS_PROGRAMA_ALUMNO).toContain('/alumno/materia')
  // Ambas están: si el matcher fuera prefijo simple, la segunda haría redundante
  // a la primera y '/alumno/materiales' (que no existe hoy) caería por error.
  const src = sinComentarios(leer('src/lib/modo.ts'))
  expect(src).toContain('pathname === base || pathname.startsWith(`${base}/`)')
})

test('el destino nunca puede redirigirse a sí mismo', () => {
  // Sin esta guarda, meter '/alumno' en RUTAS_PROGRAMA_ALUMNO haría que
  // '/alumno/cursos' —el destino— coincidiera con startsWith('/alumno/') y el
  // navegador cortara con ERR_TOO_MANY_REDIRECTS.
  const src = sinComentarios(leer('src/lib/modo.ts'))
  expect(src).toContain('if (pathname === DESTINO_ALUMNO || pathname === DESTINO_ADMIN) return null')
  // Y el destino del alumno no está en la lista de prefijos.
  expect(RUTAS_PROGRAMA_ALUMNO as readonly string[]).not.toContain(DESTINO_ALUMNO)
  expect(RUTAS_PROGRAMA_ADMIN as readonly string[]).not.toContain(DESTINO_ADMIN)
})

// ──────────────── T2: el nivel lo decide el servidor, no el body ─────────────

test('el registro IGNORA body.nivel en solo_cursos, no lo valida', () => {
  // La lección de S1: un campo que decide pertenencia no se acepta del cliente
  // ni para comprobarlo — se sobrescribe. Un curl con {"nivel":"preparatoria"}
  // contra un cliente solo_cursos tiene que crear un alumno 'diplomado' igual.
  const src = sinComentarios(leer('src/app/api/auth/register-complete/route.ts'))
  expect(src).toContain('nivelForzadoDeRegistro()')
  // El forzado va PRIMERO en el ?? — si estuviera al revés, body.nivel ganaría.
  expect(src).toContain('nivelForzado ?? body.nivel')
  // Y la modalidad se anula: es la duración del programa, no del diplomado.
  expect(src).toContain('nivelForzado ? null :')
})

// ─────────────────── T3: validación de los seis parámetros ───────────────────

test('rechaza negativos en precios y en los enteros', () => {
  for (const body of [
    { precio_inscripcion: -1 },
    { precio_mensualidad: -0.01 },
    { horas: -5 },
    { modulos_por_mes: -2 },
    { intentos_permitidos: -1 },
    { duracion_meses: -3 },
  ]) {
    const r = validarParametrosCurso(body)
    expect(r.ok, `deberia rechazar ${JSON.stringify(body)}`).toBe(false)
  }
})

test('modulos_por_mes e intentos_permitidos exigen al menos 1', () => {
  // La base tiene CHECK > 0 en las dos. Un 0 aquí daría un 500 de Postgres en
  // vez de un 400 con explicación.
  expect(validarParametrosCurso({ modulos_por_mes: 0 }).ok).toBe(false)
  expect(validarParametrosCurso({ intentos_permitidos: 0 }).ok).toBe(false)
  expect(validarParametrosCurso({ modulos_por_mes: 1 }).ok).toBe(true)
  expect(validarParametrosCurso({ intentos_permitidos: 1 }).ok).toBe(true)
})

test('modulos_por_mes e intentos_permitidos NO admiten vacío', () => {
  // Son NOT NULL en la base. Vaciarlos desde el formulario no puede volverlos null.
  expect(validarParametrosCurso({ modulos_por_mes: '' }).ok).toBe(false)
  expect(validarParametrosCurso({ intentos_permitidos: '' }).ok).toBe(false)
})

test('duracion_meses vacío es NULL, no cero', () => {
  // NULL = «sin tope fijo» y B3 deduce el tope contando módulos. Un 0 sería un
  // curso de cero meses, que es otra cosa y además la base lo rechaza.
  const r = validarParametrosCurso({ duracion_meses: '' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.updates.duracion_meses).toBeNull()

  const h = validarParametrosCurso({ horas: '' })
  expect(h.ok).toBe(true)
  if (h.ok) expect(h.updates.horas).toBeNull()
})

test('los precios vacíos son 0, porque la columna es NOT NULL', () => {
  const r = validarParametrosCurso({ precio_inscripcion: '', precio_mensualidad: '' })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.updates.precio_inscripcion).toBe(0)
    expect(r.updates.precio_mensualidad).toBe(0)
  }
})

test('un campo con solo espacios es VACÍO, no un cero', () => {
  // El defecto que encontró la revisión adversarial: la guarda comparaba
  // `bruto === ''` y dejaba pasar '  ', que `Number()` convierte en 0 por su
  // propia coerción (sin necesidad de trim). En `horas` —el único campo con
  // min 0 y nulo permitido— eso escribía 0 donde debía ir NULL.
  //
  // Y ese 0 no se queda en la tabla: B4 congela `cursos.horas` dentro de la
  // constancia al emitirla, y la constancia distingue con `!== null`. El
  // diploma acababa diciendo «con una duración de 0 horas», con folio ya
  // emitido e irrepetible porque la emisión es idempotente.
  for (const vacio of ['  ', '\t', '\n', ' \t ']) {
    const r = validarParametrosCurso({ horas: vacio })
    expect(r.ok, `horas=${JSON.stringify(vacio)}`).toBe(true)
    if (r.ok) expect(r.updates.horas, `horas=${JSON.stringify(vacio)}`).toBeNull()
  }
  // Y en duracion_meses da NULL («sin tope»), no un 400 confuso.
  const d = validarParametrosCurso({ duracion_meses: '  ' })
  expect(d.ok).toBe(true)
  if (d.ok) expect(d.updates.duracion_meses).toBeNull()
})

test('un arreglo o un objeto NO se coaccionan a un número', () => {
  // `String([])` es '' y `Number('')` es 0: sin guarda de tipo, `{"horas":[]}`
  // se guardaba como 0 y `{"precio_mensualidad":{}}` como un monto de 0.
  for (const basura of [[], [[]], {}, true, false, [5]]) {
    expect(validarParametrosCurso({ horas: basura }).ok, JSON.stringify(basura)).toBe(false)
    expect(validarParametrosCurso({ precio_mensualidad: basura }).ok, JSON.stringify(basura)).toBe(false)
  }
})

test('la normalización es idempotente: reinyectar lo guardado no vuelve a cambiar', () => {
  // Es la propiedad que hace converger al formulario. `hayCambios` compara el
  // texto del input contra String(valor de la BD); si normalizar dos veces no
  // diera lo mismo, el botón «Guardar» se quedaría encendido para siempre y el
  // formulario dejaría de refrescarse (lo encontró la revisión adversarial).
  for (const entrada of ['1500.00', '0.10', '06', '', '  ', 1500.567]) {
    const a = validarParametrosCurso({ precio_mensualidad: entrada })
    expect(a.ok, String(entrada)).toBe(true)
    if (!a.ok) continue
    const texto = String(a.updates.precio_mensualidad)
    const b = validarParametrosCurso({ precio_mensualidad: texto })
    expect(b.ok).toBe(true)
    if (b.ok) expect(b.updates.precio_mensualidad, `reinyectar ${texto}`).toBe(a.updates.precio_mensualidad)
  }
})

test('el formulario re-siembra su estado con la respuesta del PATCH', () => {
  // Sin esto, '1500.00' -> 1500 -> '1500' deja `hayCambios` en true para
  // siempre: el boton no se apaga, el useEffect deja de sincronizar y un clic
  // posterior reenvia valores viejos pisando la edicion de otro admin.
  const src = sinComentarios(leer('src/components/admin/cursos/CursoDatosForm.tsx'))
  expect(src).toContain('setPrecioMensualidad(aTexto(json.precio_mensualidad))')
  expect(src).toContain('setModulosPorMes(aTexto(json.modulos_por_mes))')
})

test('rechaza Infinity y valores no enteros donde la columna es INTEGER', () => {
  // `1e999` en un JSON llega como Infinity y pasaría cualquier comparación de
  // rango por arriba si se usara isNaN en vez de isFinite.
  expect(validarParametrosCurso({ precio_mensualidad: Infinity }).ok).toBe(false)
  expect(validarParametrosCurso({ modulos_por_mes: 2.5 }).ok).toBe(false)
  expect(validarParametrosCurso({ horas: 1.5 }).ok).toBe(false)
  expect(validarParametrosCurso({ modulos_por_mes: 'dos' }).ok).toBe(false)
})

test('una clave ausente no se toca', () => {
  // Es lo que permite compartir la validación entre el POST (manda todo) y el
  // PATCH (manda solo lo que cambió) sin pisar columnas con defaults.
  const r = validarParametrosCurso({ precio_mensualidad: 1500 })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(Object.keys(r.updates)).toEqual(['precio_mensualidad'])
    expect(r.updates.modulos_por_mes).toBeUndefined()
  }
})

test('los precios se redondean a dos decimales', () => {
  // La columna es NUMERIC(10,2); Postgres redondearía igual pero en silencio.
  const r = validarParametrosCurso({ precio_mensualidad: 1500.567 })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.updates.precio_mensualidad).toBe(1500.57)
})

test('solo el ritmo dispara la advertencia retroactiva', () => {
  // modulos_por_mes y duracion_meses alimentan el gate de B2, que se recalcula
  // en cada lectura: cambiarlos mueve ventanas ya abiertas. Los precios no.
  expect(afectaVentanaRetroactiva({ modulos_por_mes: 3 })).toBe(true)
  expect(afectaVentanaRetroactiva({ duracion_meses: 6 })).toBe(true)
  expect(afectaVentanaRetroactiva({ duracion_meses: null })).toBe(true)
  expect(afectaVentanaRetroactiva({ precio_mensualidad: 1500 })).toBe(false)
  expect(afectaVentanaRetroactiva({ horas: 120, intentos_permitidos: 5 })).toBe(false)
})

test('la validación es la MISMA en crear y en editar', () => {
  // Duplicar los rangos en los dos endpoints garantiza que dentro de seis meses
  // acepten cosas distintas.
  for (const f of ['src/app/api/admin/cursos/route.ts', 'src/app/api/admin/cursos/[id]/route.ts']) {
    expect(sinComentarios(leer(f))).toContain('validarParametrosCurso')
  }
})

// ───────────────────────────── T4: el hueco de Beto ──────────────────────────

test('el filtro de diplomado usa IS DISTINCT FROM, no <>', () => {
  // `nivel` es nullable (el registro público lo inserta tal cual venga). Con
  // `<>`, una fila con NULL daría NULL, el WHERE la tomaría como falsa y el
  // alumno sin nivel DESAPARECERÍA del estado de cuenta — justo al que hay que
  // ver para notar que le falta el dato.
  const mig = leer('supabase/migrations/20260730170000_b7_estado_cuenta_excluye_diplomado.sql')
  expect(mig).toContain("a.nivel IS DISTINCT FROM 'diplomado'")
  expect(mig).not.toContain("a.nivel <> 'diplomado'")
})

// ─────────── Las DOS puertas que escriben alumnos.nivel, coherentes ──────────

test('el alta manual del admin también fuerza el nivel en solo_cursos', () => {
  // Hay DOS caminos que escriben alumnos.nivel: el registro público y el alta
  // desde el panel. `nivel` es write-once —no hay pantalla ni endpoint para
  // corregirlo— así que si solo se cierra uno, el admin que dé de alta a mano
  // en un instituto de diplomados crea un alumno 'preparatoria' para siempre.
  const src = sinComentarios(leer('src/app/api/admin/alumnos/route.ts'))
  expect(src).toContain('nivelForzadoDeRegistro()')
  expect(src).toContain('nivelForzado ?? (nivel as')
  expect(src).toContain('nivelForzado ? null :')
})

test('a un alumno de diplomado no se le abren meses del programa', () => {
  // alumnos.meses_desbloqueados es la ventana del PROGRAMA, otra columna
  // distinta de curso_inscripciones.meses_desbloqueados. Abrirla no libera
  // ningún módulo del diplomado: solo ensucia el dato y el promedio del reporte.
  const src = sinComentarios(leer('src/app/api/admin/alumnos/[id]/desbloquear-mes/route.ts'))
  expect(src).toContain("a.nivel === 'diplomado'")
})

test('a un alumno de diplomado no se le piden certificados del programa', () => {
  // Sin su propia lista caía en TIPOS_PREPA, que exige certificado de
  // secundaria — justo lo que un instituto de diplomados no acredita.
  const page = leer('src/app/(dashboard)/alumno/documentos/page.tsx')
  expect(page).toContain('TIPOS_DIPLOMADO')
  const bloque = page.slice(page.indexOf('const TIPOS_DIPLOMADO'), page.indexOf('const TIPO_LABEL'))
  expect(bloque).not.toContain('certificado_secundaria')
  expect(bloque).not.toContain('certificado_primaria')
  // Y la ruta que decide la lista tiene la rama de diplomado.
  expect(sinComentarios(leer('src/app/api/alumno/documentos/route.ts'))).toContain("a.nivel === 'diplomado'")
})

test('las etiquetas de nivel cubren diplomado en TODOS los ternarios', () => {
  // La revisión adversarial encontró que arreglé el ternario binario en un
  // archivo y se me escaparon sus gemelos. Esta prueba los clava juntos.
  const archivos = [
    'src/components/layout/sidebar.tsx',
    'src/app/api/alumno/perfil/route.ts',
    'src/app/api/admin/alumnos/[id]/route.ts',
    'src/app/(dashboard)/admin/page.tsx',
  ]
  for (const f of archivos) {
    expect(sinComentarios(leer(f)), f).toContain("'diplomado'")
  }
})

test('el filtro T4 también está en las dos copias de schema en disco', () => {
  // A diferencia de los filtros de B6, este SÍ puede vivir en el schema base:
  // solo depende de alumnos.nivel, que es columna del base y cuyo CHECK ya
  // admite 'diplomado'. Verificado contra una base limpia durante B7.
  for (const f of ['supabase/schema.sql', 'scripts/schema.sql']) {
    expect(leer(f)).toContain("a.nivel IS DISTINCT FROM 'diplomado'")
  }
})
