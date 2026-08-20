import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  validarPregunta, CAMPOS_PREGUNTA, CAMPOS_QUIZ, PREGUNTA_MAX, OPCION_MAX, ORDEN_MAX,
  validarEvaluacion, CAMPOS_EVALUACION, TITULO_EVAL_MAX, TIEMPO_EVAL_MAX, INTENTOS_MAX,
} from '@/lib/preguntas'
import { decidirRetirada } from '@/lib/retirar-contenido'

/**
 * CMS de Contenido — F3 (quizzes semanales y evaluaciones mensuales).
 *
 * Invariantes:
 *  1. Retirar una pregunta RESPONDIDA archiva, nunca borra: quiz_respuestas
 *     cuelga de quiz_semana con ON DELETE CASCADE, así que un DELETE se lleva
 *     en silencio lo que los alumnos contestaron.
 *  2. `activa` se filtra donde se LISTA para el alumno, y NO donde se
 *     CALIFICA: archivar a mitad de un examen no puede cambiar la nota.
 *  3. respuesta_correcta='d' exige opcion_d no vacía. El CHECK del esquema
 *     admite 'd' pero opcion_d es nullable en quiz_semana.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

const MIGRACION = 'supabase/migrations/20260820120000_cms_contenido_preguntas.sql'
const ESQUEMAS = ['scripts/schema.sql', 'supabase/schema.sql', 'supabase/schema-01-tablas.sql']

test('la migración añade activa a las dos tablas de preguntas', () => {
  const sql = leer(MIGRACION)
  for (const t of ['quiz_semana', 'preguntas']) {
    expect(sql, `sin ALTER de ${t}`).toMatch(
      new RegExp(`ALTER TABLE public\\.${t}[\\s\\S]{0,120}ADD COLUMN IF NOT EXISTS activa`))
  }
  // DEFAULT true: en los ~100 clientes ya desplegados nada puede desaparecer
  expect((sql.match(/DEFAULT true/g) ?? []).length).toBeGreaterThanOrEqual(2)
})

test('activa llega a los TRES esquemas', () => {
  for (const archivo of ESQUEMAS) {
    const sql = leer(archivo)
    for (const tabla of ['quiz_semana', 'preguntas']) {
      const ddl = sql.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?public\\.${tabla}[\\s\\S]*?\\n\\s*\\);`))?.[0] ?? ''
      expect(ddl, `${archivo}: sin DDL de ${tabla}`).not.toBe('')
      expect(ddl, `${archivo}: ${tabla} sin activa`).toMatch(/^\s*activa\s+(?:boolean|BOOLEAN)/m)
    }
  }
})

// ────────────────────────── Validación de preguntas ─────────────────────────

test('la whitelist del examen NO incluye explicacion — esa columna no existe ahí', () => {
  expect([...CAMPOS_PREGUNTA]).toEqual([
    'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
    'respuesta_correcta', 'orden',
  ])
  expect([...CAMPOS_QUIZ]).toContain('explicacion')
})

test('mandar explicacion a una pregunta de examen se rechaza, no revienta el insert', () => {
  // `preguntas` no tiene columna explicacion: sin esto, Postgres respondería
  // "column explicacion does not exist" y la ruta devolvería un 500 opaco.
  expect(validarPregunta({ explicacion: 'x' }, { crear: false, tipo: 'examen' }).ok).toBe(false)
  expect(validarPregunta({ explicacion: 'x' }, { crear: false, tipo: 'quiz' }).ok).toBe(true)
})

test('una clave fuera de la whitelist rechaza la petición entera', () => {
  const r = validarPregunta({ pregunta: '¿?', semana_id: 'otra' }, { crear: false, tipo: 'quiz' })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('Campo no permitido: semana_id')
})

test('crear exige enunciado, tres opciones y respuesta correcta', () => {
  expect(validarPregunta({}, { crear: true, tipo: 'quiz' }).ok).toBe(false)
  const base = { pregunta: '¿2+2?', opcion_a: '3', opcion_b: '4', opcion_c: '5', respuesta_correcta: 'b' }
  expect(validarPregunta(base, { crear: true, tipo: 'quiz' }).ok).toBe(true)
})

test('editar acepta un solo campo — no obliga a reenviar la pregunta entera', () => {
  const r = validarPregunta({ explicacion: 'porque sí' }, { crear: false, tipo: 'quiz' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(Object.keys(r.datos)).toEqual(['explicacion'])
})

test('respuesta_correcta solo admite a, b, c o d', () => {
  for (const mala of ['e', 'A', '', 'ab', 1, null]) {
    expect(validarPregunta({ respuesta_correcta: mala }, { crear: false, tipo: 'quiz' }).ok, String(mala)).toBe(false)
  }
})

test("marcar 'd' como correcta exige que opcion_d exista — el CHECK del esquema no lo cubre", () => {
  const sinD = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'd' }
  expect(validarPregunta(sinD, { crear: true, tipo: 'quiz' }).ok).toBe(false)
  expect(validarPregunta({ ...sinD, opcion_d: '4' }, { crear: true, tipo: 'quiz' }).ok).toBe(true)
  // Y tampoco vale vaciar opcion_d dejando 'd' como correcta
  expect(validarPregunta({ opcion_d: '', respuesta_correcta: 'd' }, { crear: false, tipo: 'quiz' }).ok).toBe(false)
})

test('las opciones a, b y c no pueden quedar vacías; la d sí (es opcional)', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  for (const campo of ['opcion_a', 'opcion_b', 'opcion_c']) {
    expect(validarPregunta({ ...base, [campo]: '   ' }, { crear: true, tipo: 'quiz' }).ok, campo).toBe(false)
  }
  expect(validarPregunta({ ...base, opcion_d: '' }, { crear: true, tipo: 'quiz' }).ok).toBe(true)
})

test('los textos tienen tope', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  expect(validarPregunta({ ...base, pregunta: 'a'.repeat(PREGUNTA_MAX + 1) }, { crear: true, tipo: 'quiz' }).ok).toBe(false)
  expect(validarPregunta({ ...base, opcion_a: 'a'.repeat(OPCION_MAX + 1) }, { crear: true, tipo: 'quiz' }).ok).toBe(false)
})

test('los topes valen lo que deben valer, no lo que diga la constante', () => {
  expect(PREGUNTA_MAX).toBe(2_000)
  expect(OPCION_MAX).toBe(500)
})

test('orden debe ser un entero no negativo', () => {
  for (const malo of [-1, 1.5, '3', null]) {
    expect(validarPregunta({ orden: malo }, { crear: false, tipo: 'quiz' }).ok, String(malo)).toBe(false)
  }
  expect(validarPregunta({ orden: 0 }, { crear: false, tipo: 'quiz' }).ok).toBe(true)
})

test('cada campo se guarda en SU clave, recortado', () => {
  const r = validarPregunta(
    { pregunta: '  ¿2+2?  ', opcion_a: ' 3 ', opcion_b: '4', opcion_c: '5', opcion_d: '6', respuesta_correcta: 'b', orden: 2 },
    { crear: true, tipo: 'quiz' })
  expect(r).toEqual({
    ok: true,
    datos: { pregunta: '¿2+2?', opcion_a: '3', opcion_b: '4', opcion_c: '5', opcion_d: '6', respuesta_correcta: 'b', orden: 2 },
  })
})

// ──────────────────── Archivar o borrar (regla D2) ──────────────────────────

test('sin dependencias se borra de verdad', () => {
  expect(decidirRetirada(0)).toEqual({ accion: 'borrar' })
})

test('con dependencias se archiva y se dice cuántas', () => {
  const r = decidirRetirada(7)
  expect(r.accion).toBe('archivar')
  if (r.accion === 'archivar') expect(r.dependencias).toBe(7)
})

// ─── La asimetría de opcion_d va en LOS DOS sentidos ────────────────────────
// quiz_semana.opcion_d es nullable; preguntas.opcion_d es NOT NULL. Cubrir solo
// un lado deja el mismo 500 opaco que el parametro `tipo` existe para evitar.

test('en un EXAMEN opcion_d es obligatoria — la columna es NOT NULL', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  // Sin opcion_d: el INSERT reventaria con "violates not-null constraint"
  expect(validarPregunta(base, { crear: true, tipo: 'examen' }).ok).toBe(false)
  // Vacia: se normalizaria a null y reventaria igual
  expect(validarPregunta({ ...base, opcion_d: '   ' }, { crear: true, tipo: 'examen' }).ok).toBe(false)
  expect(validarPregunta({ opcion_d: null }, { crear: false, tipo: 'examen' }).ok).toBe(false)
  // Con valor, pasa
  expect(validarPregunta({ ...base, opcion_d: '4' }, { crear: true, tipo: 'examen' }).ok).toBe(true)
})

test('en un QUIZ opcion_d sigue siendo opcional — su columna sí es nullable', () => {
  const base = { pregunta: '¿?', opcion_a: '1', opcion_b: '2', opcion_c: '3', respuesta_correcta: 'a' }
  expect(validarPregunta(base, { crear: true, tipo: 'quiz' }).ok).toBe(true)
  const r = validarPregunta({ opcion_d: '  ' }, { crear: false, tipo: 'quiz' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.datos.opcion_d).toBeNull()
})

test('orden tiene techo: la columna es INTEGER, no bigint', () => {
  expect(ORDEN_MAX).toBe(2_147_483_647)
  expect(validarPregunta({ orden: ORDEN_MAX }, { crear: false, tipo: 'quiz' }).ok).toBe(true)
  // Sin techo, Postgres respondia "integer out of range" con un 500 opaco
  expect(validarPregunta({ orden: ORDEN_MAX + 1 }, { crear: false, tipo: 'quiz' }).ok).toBe(false)
})

// ─────────────────────── Rutas admin del quiz ───────────────────────────────

test('las rutas de quiz exigen rol ADMIN', () => {
  for (const r of [
    'src/app/api/admin/semanas/[id]/quiz/route.ts',
    'src/app/api/admin/quiz/[id]/route.ts',
  ]) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('borrar una pregunta cuenta las respuestas ANTES de tocarla', () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  const del = src.slice(src.indexOf('export async function DELETE'))
  expect(del).toContain("from('quiz_respuestas')")
  expect(del).toContain('decidirRetirada')
  // El DELETE fisico va DESPUES de la decision, nunca antes: quiz_respuestas
  // cuelga con ON DELETE CASCADE.
  expect(del.indexOf('decidirRetirada')).toBeLessThan(del.indexOf('.delete()'))
})

test("el PATCH cierra la coherencia 'd' contra la FILA, no solo contra el body", () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  expect(src).toContain('opcionDFinal')
  expect(src).toContain('correctaFinal')
  // Se relee la fila: sin eso, un PATCH que solo cambia una de las dos cosas
  // no puede saber como queda la otra.
  expect(src).toContain("select('opcion_d, respuesta_correcta')")
})

test('el POST del quiz valida como quiz, no como examen', () => {
  const src = leer('src/app/api/admin/semanas/[id]/quiz/route.ts')
  expect(src).toContain("tipo: 'quiz'")
})

test('el borrado archiva primero y vuelve a contar antes de borrar de verdad', () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  const del = src.slice(src.indexOf('export async function DELETE'))
  // El conteo y el DELETE son dos viajes sin transaccion: archivar antes deja
  // de servir la pregunta y estrecha la ventana en la que una respuesta nueva
  // se iria con el ON DELETE CASCADE.
  expect(del).toContain("update({ activa: false })")
  expect(del.indexOf("update({ activa: false })")).toBeLessThan(del.indexOf('.delete()'))
  // Y hay un SEGUNDO conteo, despues de archivar
  expect((del.match(/from\('quiz_respuestas'\)/g) ?? []).length).toBe(2)
})

test('tocar una pregunta inexistente da 404 en las dos ramas del PATCH', () => {
  const src = leer('src/app/api/admin/quiz/[id]/route.ts')
  const patch = src.slice(src.indexOf('export async function PATCH'), src.indexOf('export async function DELETE'))
  // La rama de `activa` tambien comprueba que la fila exista: antes devolvia
  // 200 {ok:true} sin haber cambiado nada.
  expect((patch.match(/Pregunta no encontrada/g) ?? []).length).toBe(2)
})

// ─────────────────── Validación de la evaluación en sí ──────────────────────

test('la whitelist de la evaluación deja fuera materia_id y mes_id — se derivan', () => {
  expect([...CAMPOS_EVALUACION]).toEqual([
    'titulo', 'descripcion', 'tiempo_limite_minutos', 'intentos_permitidos',
  ])
  // Aceptarlos del cliente permitiria colgar un examen de una materia ajena
  for (const clave of ['materia_id', 'mes_id']) {
    const r = validarEvaluacion({ [clave]: 'otra' }, { crear: false })
    expect(r.ok, clave).toBe(false)
    if (!r.ok) expect(r.error).toContain(`Campo no permitido: ${clave}`)
  }
  // Y tampoco colandolos junto a un campo legitimo
  expect(validarEvaluacion({ titulo: 'Examen', materia_id: 'otra' }, { crear: true }).ok).toBe(false)
})

test('crear una evaluación exige titulo, y no vale uno en blanco', () => {
  expect(validarEvaluacion({}, { crear: true }).ok).toBe(false)
  expect(validarEvaluacion({ titulo: '   ' }, { crear: true }).ok).toBe(false)
  expect(validarEvaluacion({ titulo: 'a'.repeat(TITULO_EVAL_MAX + 1) }, { crear: true }).ok).toBe(false)
  const r = validarEvaluacion({ titulo: '  Examen del mes 1  ' }, { crear: true })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.datos).toEqual({ titulo: 'Examen del mes 1' })
})

test('editar acepta un solo campo, pero no un cuerpo vacío', () => {
  const r = validarEvaluacion({ intentos_permitidos: 2 }, { crear: false })
  expect(r.ok).toBe(true)
  if (r.ok) expect(Object.keys(r.datos)).toEqual(['intentos_permitidos'])
  expect(validarEvaluacion({}, { crear: false }).ok).toBe(false)
  expect(validarEvaluacion(null, { crear: false }).ok).toBe(false)
  expect(validarEvaluacion([], { crear: false }).ok).toBe(false)
})

test('tiempo_limite_minutos es un entero entre 1 y 600', () => {
  for (const malo of [0, -5, 601, 1.5, '60', null]) {
    expect(validarEvaluacion({ tiempo_limite_minutos: malo }, { crear: false }).ok, String(malo)).toBe(false)
  }
  expect(validarEvaluacion({ tiempo_limite_minutos: 1 }, { crear: false }).ok).toBe(true)
  expect(validarEvaluacion({ tiempo_limite_minutos: TIEMPO_EVAL_MAX }, { crear: false }).ok).toBe(true)
  expect(TIEMPO_EVAL_MAX).toBe(600)
})

test('intentos_permitidos es un entero entre 1 y 20', () => {
  // Cero intentos dejaria el examen imposible de presentar sin decirlo
  for (const malo of [0, -1, 21, 2.5, '3', null]) {
    expect(validarEvaluacion({ intentos_permitidos: malo }, { crear: false }).ok, String(malo)).toBe(false)
  }
  expect(validarEvaluacion({ intentos_permitidos: 1 }, { crear: false }).ok).toBe(true)
  expect(validarEvaluacion({ intentos_permitidos: INTENTOS_MAX }, { crear: false }).ok).toBe(true)
  expect(INTENTOS_MAX).toBe(20)
})

test('descripcion es opcional: null o vacía se guardan como null', () => {
  for (const v of [null, '', '   ']) {
    const r = validarEvaluacion({ descripcion: v }, { crear: false })
    expect(r.ok, String(v)).toBe(true)
    if (r.ok) expect(r.datos.descripcion).toBeNull()
  }
  expect(validarEvaluacion({ descripcion: 7 }, { crear: false }).ok).toBe(false)
})

// ───────────────── Rutas admin del examen mensual ───────────────────────────

const RUTAS_EVAL = [
  'src/app/api/admin/meses/[id]/evaluaciones/route.ts',
  'src/app/api/admin/evaluaciones/[id]/route.ts',
  'src/app/api/admin/evaluaciones/[id]/preguntas/route.ts',
  'src/app/api/admin/preguntas/[id]/route.ts',
]

test('todas las rutas del examen exigen rol ADMIN', () => {
  for (const r of RUTAS_EVAL) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('la materia de una evaluación se deriva del mes, no se acepta del cliente', () => {
  const src = leer('src/app/api/admin/meses/[id]/evaluaciones/route.ts')
  expect(src).toContain('meses_contenido')
  expect(src).toContain('materia_id')
  // Colgar un examen de una materia ajena seria trivial si esto se leyera
  expect(src).not.toMatch(/body\.materia_id/)
  expect(src).not.toMatch(/body\.mes_id/)
})

test('las preguntas de examen se validan como examen, no como quiz', () => {
  for (const r of [
    'src/app/api/admin/evaluaciones/[id]/preguntas/route.ts',
    'src/app/api/admin/preguntas/[id]/route.ts',
  ]) {
    const src = leer(r)
    expect(src, `${r}`).toContain("tipo: 'examen'")
    // Con tipo 'quiz' se colaria `explicacion`, columna que preguntas NO tiene
    expect(src, `${r} valida como quiz`).not.toContain("tipo: 'quiz'")
  }
})

test('preguntas.opcion_d es NOT NULL: se inserta cadena vacía, no null', () => {
  const src = leer('src/app/api/admin/evaluaciones/[id]/preguntas/route.ts')
  expect(src).toContain('opcion_d')
  expect(src).toMatch(/opcion_d[^\n]*\?\?\s*''/)
})

test('borrar una evaluación suma intentos Y calificaciones antes de decidir', () => {
  const src = leer('src/app/api/admin/evaluaciones/[id]/route.ts')
  const del = src.slice(src.indexOf('export async function DELETE'))
  expect(del).toContain("from('intentos_evaluacion')")
  expect(del).toContain("from('calificaciones')")
  expect(del).toContain('decidirRetirada')
  expect(del.indexOf('decidirRetirada')).toBeLessThan(del.indexOf('.delete()'))
})

test('borrar una pregunta de examen mira los intentos de SU evaluación', () => {
  const src = leer('src/app/api/admin/preguntas/[id]/route.ts')
  const del = src.slice(src.indexOf('export async function DELETE'))
  expect(del).toContain("from('intentos_evaluacion')")
  expect(del).toContain('evaluacion_id')
})

test('las cuatro rutas archivan antes de borrar', () => {
  for (const r of ['src/app/api/admin/evaluaciones/[id]/route.ts', 'src/app/api/admin/preguntas/[id]/route.ts']) {
    const src = leer(r)
    const del = src.slice(src.indexOf('export async function DELETE'))
    expect(del, `${r}`).toContain('activa: false')
    expect(del.indexOf('activa: false'), `${r}`).toBeLessThan(del.indexOf('.delete()'))
  }
})

test('el borrado del examen vuelve a contar después de archivar', () => {
  // El conteo y el DELETE son dos viajes sin transaccion: sin el segundo
  // conteo, un intento que llega entre medias se iria con el CASCADE.
  for (const r of ['src/app/api/admin/evaluaciones/[id]/route.ts', 'src/app/api/admin/preguntas/[id]/route.ts']) {
    const src = leer(r)
    const del = src.slice(src.indexOf('export async function DELETE'))
    expect((del.match(/await contar\(\)/g) ?? []).length, `${r}`).toBe(2)
  }
})

test('tocar una evaluación o pregunta inexistente da 404 en las dos ramas del PATCH', () => {
  for (const [r, msg] of [
    ['src/app/api/admin/evaluaciones/[id]/route.ts', 'Evaluación no encontrada'],
    ['src/app/api/admin/preguntas/[id]/route.ts', 'Pregunta no encontrada'],
  ] as const) {
    const src = leer(r)
    const patch = src.slice(src.indexOf('export async function PATCH'), src.indexOf('export async function DELETE'))
    expect((patch.match(new RegExp(msg, 'g')) ?? []).length, r).toBe(2)
  }
})
