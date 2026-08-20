import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  validarMateria, validarMes, validarSemana,
  CAMPOS_MATERIA, CAMPOS_MES, CAMPOS_SEMANA, NIVELES,
  ORDEN_MAX, NUMERO_MES_MAX, NUMERO_SEMANA_MAX,
  describirDependencias,
} from '@/lib/estructura-contenido'
import { getCarreras } from '@/lib/licenciatura-utils'

/**
 * CMS de Contenido — F4 (estructura del programa).
 *
 * Invariantes:
 *  1. Retirar una semana o un mes con historial ARCHIVA, nunca borra: la
 *     cascada se lleva progreso, notas personales del alumno, preguntas de
 *     quiz y sus respuestas.
 *  2. `activa` nace con DEFAULT true: en los ~100 clientes ya desplegados nada
 *     puede cambiar de visibilidad al aplicar la migración.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

const MIGRACION = 'supabase/migrations/20260820130000_cms_contenido_estructura.sql'
const ESQUEMAS = ['scripts/schema.sql', 'supabase/schema.sql', 'supabase/schema-01-tablas.sql']

test('la migración añade activa a semanas y meses_contenido', () => {
  const sql = leer(MIGRACION)
  for (const t of ['semanas', 'meses_contenido']) {
    expect(sql, `sin ALTER de ${t}`).toMatch(
      new RegExp(`ALTER TABLE public\\.${t}[\\s\\S]{0,120}ADD COLUMN IF NOT EXISTS activa`))
  }
  expect((sql.match(/DEFAULT true/g) ?? []).length).toBeGreaterThanOrEqual(2)
})

test('activa llega a los TRES esquemas, en las dos tablas', () => {
  for (const archivo of ESQUEMAS) {
    const sql = leer(archivo)
    for (const tabla of ['semanas', 'meses_contenido']) {
      const ddl = sql.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?public\\.${tabla}[\\s\\S]*?\\n\\s*\\);`))?.[0] ?? ''
      expect(ddl, `${archivo}: sin DDL de ${tabla}`).not.toBe('')
      expect(ddl, `${archivo}: ${tabla} sin activa`).toMatch(/^\s*activa\s+(?:boolean|BOOLEAN)/m)
    }
  }
})

test('la migración documenta QUÉ se lleva la cascada', () => {
  // El porqué de esta columna es la cascada. Si el comentario se pierde, el
  // siguiente que lea la migración no sabrá que un DELETE destruye las notas
  // personales del alumno.
  const sql = leer(MIGRACION)
  for (const tabla of ['progreso_semanas', 'notas_alumno', 'quiz_respuestas']) {
    expect(sql, `la migración no menciona ${tabla}`).toContain(tabla)
  }
})

// ── Validación de materia, mes y semana ──────────────────────────────────────

test('la whitelist de cada validador es exactamente la constante que exporta', () => {
  expect([...CAMPOS_MATERIA].sort()).toEqual(
    ['carrera', 'color', 'descripcion', 'icono', 'nivel', 'nombre', 'orden'])
  expect([...CAMPOS_MES].sort()).toEqual(['descripcion', 'numero_mes', 'titulo'])
  expect([...CAMPOS_SEMANA].sort()).toEqual(['numero_semana', 'titulo'])

  // Y cada campo permitido pasa de verdad: una constante que el validador no
  // acepte es una promesa rota para la ruta que la lea.
  const ejemplos: Record<string, unknown> = {
    nombre: 'Álgebra', descripcion: 'texto', nivel: 'secundaria', carrera: 'derecho',
    color: '#fff', icono: 'Book', orden: 3, numero_mes: 2, titulo: 'Mes 2', numero_semana: 4,
  }
  const motivo = (r: { ok: true } | { ok: false; error: string }) => (r.ok ? '' : r.error)
  for (const campo of CAMPOS_MATERIA) {
    const r = validarMateria({ [campo]: ejemplos[campo] }, { crear: false })
    expect(motivo(r), `materia rechaza su propio campo ${campo}`).not.toContain('Campo no permitido')
  }
  for (const campo of CAMPOS_MES) {
    const r = validarMes({ [campo]: ejemplos[campo] }, { crear: false })
    expect(motivo(r), `mes rechaza su propio campo ${campo}`).not.toContain('Campo no permitido')
  }
  for (const campo of CAMPOS_SEMANA) {
    const r = validarSemana({ [campo]: ejemplos[campo] }, { crear: false })
    expect(motivo(r), `semana rechaza su propio campo ${campo}`).not.toContain('Campo no permitido')
  }
})

test('una clave fuera de la whitelist rechaza la peticion ENTERA', () => {
  // `activa` no está en ninguna whitelist a propósito: retirar es otra acción,
  // con su propio conteo de dependencias. Colarla aquí saltaría ese conteo.
  const m = validarMateria({ nombre: 'Álgebra', nivel: 'secundaria', activa: false }, { crear: true })
  expect(m.ok).toBe(false)
  expect(m.ok === false && m.error).toContain('activa')

  const mes = validarMes({ titulo: 'Mes 1', activa: false }, { crear: true })
  expect(mes.ok).toBe(false)

  const s = validarSemana({ titulo: 'Semana 1', apuntes: '<script>' }, { crear: true })
  expect(s.ok).toBe(false)
  expect(s.ok === false && s.error).toContain('apuntes')
})

test('el cuerpo tiene que ser un objeto, no un array ni null', () => {
  for (const basura of [null, 'texto', 42, [{ nombre: 'x' }]]) {
    expect(validarMateria(basura, { crear: true }).ok, `aceptó ${JSON.stringify(basura)}`).toBe(false)
  }
})

test('crear materia exige nombre y nivel', () => {
  expect(validarMateria({ nivel: 'secundaria' }, { crear: true }).ok).toBe(false)
  expect(validarMateria({ nombre: 'Álgebra' }, { crear: true }).ok).toBe(false)
  expect(validarMateria({ nombre: '   ', nivel: 'secundaria' }, { crear: true }).ok).toBe(false)
  expect(validarMateria({ nombre: 'Álgebra', nivel: 'secundaria' }, { crear: true }).ok).toBe(true)
  // En PATCH ninguno es obligatorio, pero un cuerpo vacío no es un update.
  expect(validarMateria({ nombre: 'Álgebra II' }, { crear: false }).ok).toBe(true)
  expect(validarMateria({}, { crear: false }).ok).toBe(false)
  expect(validarMes({}, { crear: false }).ok).toBe(false)
})

test('NIVELES es exactamente el CHECK de materias_nivel_check', () => {
  // El comentario de la constante promete esto. Si se separan, el 400 legible
  // se convierte en un 500 opaco de Postgres.
  const sql = leer('scripts/schema.sql')
  const check = sql.match(/CONSTRAINT materias_nivel_check CHECK \(\(nivel = ANY \(ARRAY\[([^\]]+)\]/)?.[1] ?? ''
  expect(check, 'no se encontró materias_nivel_check en el esquema').not.toBe('')
  const delCheck = [...check.matchAll(/'([a-z]+)'::text/g)].map(m => m[1])
  expect([...NIVELES].sort()).toEqual(delCheck.sort())
})

test('un nivel fuera del CHECK se rechaza', () => {
  for (const nivel of ['bachillerato', 'Secundaria', 'primaria', '', 7, null]) {
    const r = validarMateria({ nombre: 'Álgebra', nivel }, { crear: true })
    expect(r.ok, `aceptó nivel ${JSON.stringify(nivel)}`).toBe(false)
  }
})

test('licenciatura EXIGE una carrera del CONFIG, nunca texto libre', () => {
  const base = { nombre: 'Derecho Romano', nivel: 'licenciatura' }
  expect(validarMateria(base, { crear: true }).ok, 'aceptó licenciatura sin carrera').toBe(false)
  expect(validarMateria({ ...base, carrera: '' }, { crear: true }).ok).toBe(false)
  expect(validarMateria({ ...base, carrera: 'inventada-que-no-existe' }, { crear: true }).ok,
    'aceptó una carrera que no está en el CONFIG').toBe(false)

  const slug = getCarreras()[0]?.slug
  if (slug) {
    const r = validarMateria({ ...base, carrera: slug }, { crear: true })
    expect(r.ok, `rechazó la carrera configurada ${slug}`).toBe(true)
    expect(r.ok === true && r.datos.carrera).toBe(slug)
  }
  // Sin carreras configuradas (el default de la plantilla) el mensaje lo dice.
  if (!slug) {
    const r = validarMateria({ ...base, carrera: 'x' }, { crear: true })
    expect(r.ok === false && r.error).toContain('ninguna configurada')
  }
})

test('fuera de licenciatura la carrera se fuerza a NULL', () => {
  // Una materia de secundaria con carrera se filtraría por carrera y
  // desaparecería del catálogo de TODOS los alumnos de secundaria.
  for (const nivel of ['secundaria', 'preparatoria', 'demo'] as const) {
    const r = validarMateria({ nombre: 'Álgebra', nivel, carrera: 'lo-que-sea' }, { crear: true })
    expect(r.ok, `rechazó ${nivel}`).toBe(true)
    expect(r.ok === true && r.datos.carrera, `${nivel} conservó la carrera`).toBeNull()
  }
})

test('orden, numero_mes y numero_semana solo aceptan enteros en rango', () => {
  const casos = [
    { fn: (v: unknown) => validarMateria({ orden: v }, { crear: false }), min: 0, max: ORDEN_MAX, campo: 'orden' },
    { fn: (v: unknown) => validarMes({ numero_mes: v }, { crear: false }), min: 1, max: NUMERO_MES_MAX, campo: 'numero_mes' },
    { fn: (v: unknown) => validarSemana({ numero_semana: v }, { crear: false }), min: 1, max: NUMERO_SEMANA_MAX, campo: 'numero_semana' },
  ]
  for (const { fn, min, max, campo } of casos) {
    expect(fn(min).ok, `${campo}: rechazó el mínimo ${min}`).toBe(true)
    expect(fn(max).ok, `${campo}: rechazó el tope ${max}`).toBe(true)
    for (const malo of [min - 1, -1, max + 1, 1.5, '3', null, NaN, Infinity]) {
      expect(fn(malo).ok, `${campo}: aceptó ${String(malo)}`).toBe(false)
    }
  }
})

test('crear mes exige titulo; crear semana exige titulo', () => {
  expect(validarMes({ numero_mes: 1 }, { crear: true }).ok).toBe(false)
  expect(validarMes({ titulo: '  ' }, { crear: true }).ok).toBe(false)
  expect(validarMes({ titulo: 'Mes 1', numero_mes: 1 }, { crear: true }).ok).toBe(true)

  expect(validarSemana({ numero_semana: 1 }, { crear: true }).ok).toBe(false)
  expect(validarSemana({ titulo: '  ' }, { crear: true }).ok).toBe(false)
  expect(validarSemana({ titulo: 'Semana 1', numero_semana: 1 }, { crear: true }).ok).toBe(true)
})

// ── Conteo de dependencias ───────────────────────────────────────────────────
// Análisis estático sobre el fuente: la verificación real es contra el piloto.

test('el conteo de una semana mira las CUATRO cosas que se lleva la cascada', () => {
  const src = leer('src/lib/estructura-contenido.ts')
  for (const t of ['progreso_semanas', 'notas_alumno', 'quiz_respuestas', 'semana_materiales']) {
    expect(src, `el conteo no mira ${t}`).toContain(t)
  }
})

test('el conteo de una materia mira calificaciones Y constancias', () => {
  const src = leer('src/lib/estructura-contenido.ts')
  const fn = src.slice(src.indexOf('export async function dependenciasMateria'))
  expect(fn, 'no cuenta calificaciones: borrar la materia destruiria las notas del alumno').toContain('calificaciones')
  expect(fn, 'no cuenta constancias: quedarian sin referencia').toContain('constancias')
})

test('el conteo del mes cuenta los examenes aunque nadie los haya respondido', () => {
  const src = leer('src/lib/estructura-contenido.ts')
  const fn = src.slice(src.indexOf('export async function dependenciasMes'), src.indexOf('export async function dependenciasMateria'))
  expect(fn).toContain('examenes')
})

test('los tres niveles comparten el conteo de semanas, sin N+1', () => {
  const src = leer('src/lib/estructura-contenido.ts')
  // `deSemanas` recibe un ARRAY: hacerlo semana por semana convertiria el
  // borrado de una materia de 48 semanas en cientos de viajes.
  expect(src).toContain('semanaIds: string[]')
  expect((src.match(/deSemanas\(db,/g) ?? []).length).toBe(3)
})

test('el conteo cubre TODA la cascada declarada en el esquema', () => {
  // Guardián de regresión. Cada tabla con FK a materias, meses, semanas,
  // quiz_semana o evaluaciones tiene que aparecer en el módulo, o estar
  // exenta AQUÍ con su motivo. Si mañana alguien cuelga una tabla nueva de
  // estas cinco, esta prueba la delata antes de que un DELETE la encuentre.
  const src = leer('src/lib/estructura-contenido.ts')
  const sql = leer('scripts/schema.sql')
  const hijas = new Set(
    [...sql.matchAll(
      /ALTER TABLE ONLY public\.(\w+)\s+ADD CONSTRAINT \w+ FOREIGN KEY \(\w+\) REFERENCES public\.(?:materias|meses_contenido|semanas|quiz_semana|evaluaciones)\(id\)/g,
    )].map(m => m[1]))
  expect(hijas.size, 'el parseo de FKs del esquema no encontró nada').toBeGreaterThan(8)

  const exentas: Record<string, string> = {
    // Estructura: es justo lo que el admin pidió retirar, no algo que se
    // pierda por sorpresa.
    semanas: 'la borra el propio DELETE del mes',
    meses_contenido: 'la borra el propio DELETE de la materia',
    // No puede existir sin su evaluación (FK NOT NULL), y las evaluaciones SÍ
    // se cuentan como `examenes`: el total nunca cae a 0 por culpa de éstas.
    preguntas: 'implica una evaluación, que ya se cuenta',
    // `quiz_semana` YA NO está exenta: se cuenta como `preguntas_quiz`. Una
    // exención obsoleta es peor que ninguna, porque enmascara la regresión que
    // esta prueba existe para cazar.
  }
  const faltantes = [...hijas].filter(t => !src.includes(t) && !(t in exentas))
  expect(faltantes, `tablas de la cascada que el conteo NO mira: ${faltantes.join(', ')}`).toEqual([])
})

test('describirDependencias nombra lo que se conserva y calla los ceros', () => {
  const frase = describirDependencias({ total: 4, detalle: { progreso: 3, notas: 1, respuestas: 0 } })
  expect(frase).toContain('3')
  expect(frase).toContain('1')
  expect(frase, 'menciona un tipo con cero filas').not.toContain('respuestas de quiz')
  expect(frase, 'coló un 0 en la frase').not.toMatch(/(^|\s)0(\s|$)/)
  expect(describirDependencias({ total: 0, detalle: { progreso: 0 } })).toBe('')
})

test('un quiz redactado sin responder impide el borrado duro de la semana', () => {
  const src = leer('src/lib/estructura-contenido.ts')
  const fn = src.slice(src.indexOf('async function deSemanas'), src.indexOf('export async function dependenciasSemana'))
  // quiz_semana cuelga de semanas con CASCADE. Sin contarlo, una semana con
  // diez preguntas escritas a mano y cero respuestas daba total 0 y se borraba
  // entera de un clic.
  expect(fn).toContain('preguntas_quiz')
  expect(fn).toContain('quizIds.length')
  // Y el mensaje al admin tiene que saber nombrarlas
  expect(src).toContain("preguntas_quiz: 'preguntas de quiz redactadas'")
})

// ─────────────────── Rutas admin de la estructura ───────────────────────────

const RUTAS_ESTRUCTURA = [
  'src/app/api/admin/semanas/route.ts',
  'src/app/api/admin/semanas/[id]/route.ts',
  'src/app/api/admin/meses/route.ts',
  'src/app/api/admin/meses/[id]/route.ts',
  'src/app/api/admin/materias/route.ts',
  'src/app/api/admin/materias/[id]/route.ts',
]

test('todas las rutas de estructura exigen rol ADMIN', () => {
  for (const r of RUTAS_ESTRUCTURA) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('los tres DELETE cuentan dependencias ANTES de borrar, y archivan primero', () => {
  const casos = [
    ['src/app/api/admin/semanas/[id]/route.ts',  'dependenciasSemana'],
    ['src/app/api/admin/meses/[id]/route.ts',    'dependenciasMes'],
    ['src/app/api/admin/materias/[id]/route.ts', 'dependenciasMateria'],
  ] as const
  for (const [ruta, fn] of casos) {
    const src = leer(ruta)
    const del = src.slice(src.indexOf('export async function DELETE'))
    expect(del, `${ruta} no cuenta`).toContain(fn)
    expect(del, `${ruta} no usa la regla comun`).toContain('decidirRetirada')
    // Archivar va SIEMPRE antes del borrado fisico: el conteo y el DELETE son
    // dos viajes sin transaccion.
    expect(del.indexOf('activa: false'), `${ruta}: borra antes de archivar`).toBeLessThan(del.indexOf('.delete()'))
    // Y hay un SEGUNDO conteo tras archivar
    expect((del.match(new RegExp(fn, 'g')) ?? []).length, `${ruta}: no recuenta`).toBeGreaterThanOrEqual(2)
  }
})

test('el admin se entera de QUE se conserva al archivar', () => {
  for (const r of ['semanas/[id]', 'meses/[id]', 'materias/[id]']) {
    const src = leer(`src/app/api/admin/${r}/route.ts`)
    expect(src, `${r} no describe las dependencias`).toContain('describirDependencias')
  }
})

test('crear una semana o un mes comprueba que su padre existe', () => {
  expect(leer('src/app/api/admin/semanas/route.ts')).toContain("from('meses_contenido')")
  expect(leer('src/app/api/admin/meses/route.ts')).toContain("from('materias')")
})

test('el PATCH de materia cierra la coherencia nivel-carrera contra la FILA', () => {
  const src = leer('src/app/api/admin/materias/[id]/route.ts')
  // validarMateria no ve la fila: si el body cambia `carrera` sin cambiar
  // `nivel`, solo la ruta sabe si esa materia es de licenciatura.
  expect(src).toContain('nivelFinal')
  expect(src).toContain('licenciatura')
})

test('el padre no se acepta del cliente al crear', () => {
  // mes_id y materia_id se leen aparte y se verifican; no entran por la
  // whitelist de validarSemana/validarMes.
  //
  // El aserto se acota a la mitad de VALIDACION del modulo, no al fichero
  // entero: la mitad de abajo —el conteo de dependencias— consulta por esas
  // MISMAS columnas (idsDe(db, 'semanas', 'mes_id', ...)), asi que un
  // not.toContain sobre todo el fichero no puede pasar nunca. El agujero que
  // esta prueba vigila esta solo arriba: que el padre entre por la whitelist.
  const lib = leer('src/lib/estructura-contenido.ts')
  const validacion = lib.slice(0, lib.indexOf('Conteo de dependencias'))
  expect(validacion).not.toContain("'mes_id'")
  expect(validacion).not.toContain("'materia_id'")
  expect([...CAMPOS_SEMANA] as string[], 'la semana acepta su mes del cliente').not.toContain('mes_id')
  expect([...CAMPOS_MES] as string[], 'el mes acepta su materia del cliente').not.toContain('materia_id')
})
