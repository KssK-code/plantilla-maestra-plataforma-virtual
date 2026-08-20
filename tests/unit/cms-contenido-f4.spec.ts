import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
