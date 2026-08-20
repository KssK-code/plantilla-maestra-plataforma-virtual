import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
