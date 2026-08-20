import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validarPregunta, CAMPOS_PREGUNTA, CAMPOS_QUIZ, PREGUNTA_MAX, OPCION_MAX, ORDEN_MAX } from '@/lib/preguntas'
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
