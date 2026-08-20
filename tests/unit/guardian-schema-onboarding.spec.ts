import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * GUARDIÁN DE DERIVA: supabase/migrations → scripts/schema.sql
 *
 * `mev-onboarding.py` instala los combos NUEVOS con `scripts/schema.sql`
 * (línea ~1392), NO con supabase/schema.sql ni con la cadena de migraciones.
 * Todo objeto que una migración cree y no se refleje ahí NACE AUSENTE en cada
 * cliente nuevo. Así llegaron rotos a producción (deriva del 17-ago-2026):
 * las columnas de licenciaturas (alta/registro reventados), keep_alive_log
 * (Supabase pausa el proyecto) y corregir-plan (botón que jamás aparecía).
 *
 * Este spec exige que todo CREATE de las migraciones exista en
 * scripts/schema.sql, salvo las EXCEPCIONES documentadas abajo.
 *
 * ⚠️ LÍMITE CONOCIDO — dicho con todas sus letras: los checks por nombre NO
 * ven cuerpos viejos. S1/S2 lo probaron: `handle_new_user` y `es_admin`
 * existían con el nombre correcto y el cuerpo era la trampa (el pre-S1 leía
 * el rol de metadata; es_admin no normalizaba con LOWER). El guardián frena
 * la sangría, no la cura — el cierre de fondo es que scripts/schema.sql se
 * GENERE desde las migraciones en vez de editarse a mano (decisión aparte).
 *
 * Otro límite: la extracción es por regex sobre el SQL sin comentarios; los
 * objetos creados DINÁMICAMENTE (EXECUTE format(...) dentro de DO $$) no se
 * detectan, y un nombre que solo aparezca en un comentario de
 * scripts/schema.sql da un falso PASS.
 */

const raiz = process.cwd()
const DIR_MIGRACIONES = join(raiz, 'supabase', 'migrations')

// ─── EXCEPCIONES documentadas ─────────────────────────────────────────────────
// Migraciones completas cuyos objetos NO viven en scripts/schema.sql a
// PROPÓSITO o como deuda RECONOCIDA con decisión pendiente. Si cierras una,
// bórrala de aquí para que el guardián la exija.
const EXCEPCIONES: Record<string, string> = {
  // Storage del bucket `recibos`: pendiente verificar si el pre-vuelo del
  // onboarding crea las políticas por API además de los buckets. Decisión
  // aparte (17-ago-2026) — NO cerrar por inercia.
  '20260716140000_bucket_recibos.sql': 'storage recibos: decisión pendiente',

  // Módulo opcional de Cursos / línea Solo-Cursos (B1–B8.2 + examen final +
  // fix de portadas): se aplica aparte y solo a clientes que lo contratan.
  // ⚠️ Deuda reconocida: la evolución B vive SOLO en estas migraciones —
  // scripts/migracion-cursos-diplomados.sql es pre-B1. Decisión pendiente
  // (17-ago-2026).
  '20260728120000_examen_final_cursos.sql':        'módulo Cursos: aplicación aparte',
  '20260729122000_fix_portadas_storage_policy.sql': 'módulo Cursos: aplicación aparte',
  '20260730120000_b1_fundacion_solo_cursos.sql':   'módulo Cursos: aplicación aparte',
  '20260730130000_b2_gate_ventana_cursos.sql':     'módulo Cursos: aplicación aparte',
  '20260730140000_b3_abrir_mes_y_pagos_curso.sql': 'módulo Cursos: aplicación aparte',
  '20260730150000_b4_constancia_y_eventos.sql':    'módulo Cursos: aplicación aparte',
  '20260730160000_b6_reportes_por_vertical.sql':   'módulo Cursos: aplicación aparte',
  '20260730170000_b7_estado_cuenta_excluye_diplomado.sql': 'módulo Cursos: aplicación aparte',
  '20260730180000_b82_emision_manual_con_actor.sql':       'módulo Cursos: aplicación aparte',
  '20260810120000_curso_solicitado.sql': 'columna base ya reflejada; el resto es oferta de cursos',
}

// Objetos individuales exentos aunque su migración NO lo esté.
// (Hoy vacío a propósito: si necesitas uno, documenta el porqué.)
const OBJETOS_EXENTOS = new Set<string>([
  // Políticas del bucket `materias` (F2, materiales PDF por semana:
  // 20260819130000_cms_contenido_materiales.sql). scripts/schema.sql NO tiene
  // ni una línea de storage —ni buckets ni políticas, para NINGÚN bucket—:
  // esa capa la crea el pre-vuelo del onboarding, no este SQL. Y meterla aquí
  // no sería solo desentonar: el DDL sobre storage.objects exige ser dueño de
  // la tabla, así que con el rol del onboarding aborta el script ENTERO con
  // "must be owner of table objects" y el cliente nuevo nace sin base de
  // datos. Mismo trato que el módulo de Cursos, exento arriba en bloque.
  // Lo que SÍ se exige y sí está reflejado: la tabla public.semana_materiales,
  // su índice y sus dos políticas de RLS. Lo exento es solo el storage.
  'materias: solo admin lee',
  'materias: solo admin escribe',
  'materias: solo admin actualiza',
  'materias: solo admin borra',
])

function sinComentarios(sql: string): string {
  // Comentarios de línea completos y de bloque. Evita el falso positivo que ya
  // nos mordió dos veces: un patrón matcheando DENTRO de un comentario (Bug 90).
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '')
}

interface Objeto { tipo: string; nombre: string; migracion: string }

function extraerObjetos(nombreMigracion: string, sql: string): Objeto[] {
  const limpio = sinComentarios(sql)
  const objetos: Objeto[] = []
  const push = (tipo: string, nombre: string) => objetos.push({ tipo, nombre, migracion: nombreMigracion })

  for (const m of limpio.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/g)) push('tabla', m[1])
  for (const m of limpio.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?(\w+)\s*\(/g)) push('función', m[1])
  for (const m of limpio.matchAll(/CREATE TRIGGER (\w+)/g)) push('trigger', m[1])
  for (const m of limpio.matchAll(/CREATE POLICY "([^"]+)"/g)) push('política', m[1])
  for (const m of limpio.matchAll(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)/g)) push('índice', m[1])
  for (const m of limpio.matchAll(/ALTER TABLE (?:IF EXISTS )?(?:ONLY )?(?:public\.)?\w+\s+ADD COLUMN (?:IF NOT EXISTS )?(\w+)/g)) push('columna', m[1])

  return objetos
}

test('todo objeto CREATE de supabase/migrations existe en scripts/schema.sql (el que instala el onboarding)', () => {
  const schemaOnboarding = readFileSync(join(raiz, 'scripts', 'schema.sql'), 'utf8')
  const migraciones = readdirSync(DIR_MIGRACIONES).filter(f => f.endsWith('.sql')).sort()
  expect(migraciones.length).toBeGreaterThan(0)

  const faltantes: string[] = []
  for (const mig of migraciones) {
    if (EXCEPCIONES[mig]) continue
    const sql = readFileSync(join(DIR_MIGRACIONES, mig), 'utf8')
    for (const obj of extraerObjetos(mig, sql)) {
      if (OBJETOS_EXENTOS.has(obj.nombre)) continue
      if (!schemaOnboarding.includes(obj.nombre)) {
        faltantes.push(`${obj.tipo} «${obj.nombre}» (${obj.migracion})`)
      }
    }
  }

  expect(
    faltantes,
    `Objetos de migraciones AUSENTES de scripts/schema.sql — el combo nuevo nace sin ellos.\n` +
    `O los reflejas (idénticos en efecto) o los documentas en EXCEPCIONES con su porqué:\n  ${faltantes.join('\n  ')}`,
  ).toEqual([])
})

test('las excepciones apuntan a migraciones que existen (sin excepciones zombis)', () => {
  for (const mig of Object.keys(EXCEPCIONES)) {
    expect(existsSync(join(DIR_MIGRACIONES, mig)), `EXCEPCIONES tiene «${mig}» pero esa migración ya no existe`).toBe(true)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GUARDIÁN INVERSO: scripts/schema.sql → supabase/schema.sql
//
// El guardián de arriba vigila que las migraciones lleguen a scripts/schema.sql
// (lo que instala el onboarding). Faltaba la dirección contraria, y por ahí se
// coló el hallazgo lateral del Bug 99: `semanas.contenido`, `video_url_2`,
// `video_url_3` y `keep_alive_log.source` vivían SOLO en scripts/schema.sql.
// `supabase/schema.sql` es la ruta de INSTRUCCIONES-SOLO-CURSOS.md y del
// desarrollo local, así que una columna que solo esté en uno rompe esa mitad.
//
// La comparación es por TABLA + COLUMNA: un nombre de columna suelto (p. ej.
// `titulo`) existe en media docena de tablas y compararlo global daría un falso
// PASS. Se acepta que la columna llegue a supabase/ por su schema o por una
// migración ADD COLUMN.
// ─────────────────────────────────────────────────────────────────────────────

/** Columnas declaradas dentro de cada CREATE TABLE. -> Map<tabla, Set<columna>> */
function columnasPorTabla(sql: string): Map<string, Set<string>> {
  const limpio = sinComentarios(sql)
  const mapa = new Map<string, Set<string>>()
  for (const m of limpio.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\);/g)) {
    const tabla = m[1]
    const set = mapa.get(tabla) ?? new Set<string>()
    for (const linea of m[2].split('\n')) {
      // Columna = primer token de la línea, descartando constraints de tabla.
      const c = linea.match(/^\s{2,}"?(\w+)"?\s+[A-Za-z]/)
      if (c && !/^(PRIMARY|UNIQUE|CHECK|CONSTRAINT|FOREIGN|EXCLUDE)$/i.test(c[1])) set.add(c[1])
    }
    mapa.set(tabla, set)
  }
  return mapa
}

/** Añade a `mapa` las columnas que las migraciones agregan por ALTER. */
function aplicarAlters(mapa: Map<string, Set<string>>, sql: string): void {
  for (const m of sinComentarios(sql).matchAll(
    /ALTER TABLE (?:IF EXISTS )?(?:ONLY )?(?:public\.)?(\w+)\s+ADD COLUMN (?:IF NOT EXISTS )?(\w+)/g)) {
    const set = mapa.get(m[1]) ?? new Set<string>()
    set.add(m[2])
    mapa.set(m[1], set)
  }
}

test('toda columna de scripts/schema.sql existe también en supabase/schema.sql (+ migraciones)', () => {
  const deOnboarding = columnasPorTabla(readFileSync(join(raiz, 'scripts', 'schema.sql'), 'utf8'))

  const sqlBootstrap = readFileSync(join(raiz, 'supabase', 'schema.sql'), 'utf8')
  const deBootstrap = columnasPorTabla(sqlBootstrap)
  // OJO: el propio bootstrap trae ALTERs además de los CREATE TABLE
  // (p. ej. `keep_alive_log.source` se agrega por ALTER dos líneas después de
  // su CREATE). Sin esta línea el guardián da un falso positivo por columna
  // que sí existe. Mismo tropiezo que motivó este guardián — no lo quites.
  aplicarAlters(deBootstrap, sqlBootstrap)
  for (const mig of readdirSync(DIR_MIGRACIONES).filter(f => f.endsWith('.sql'))) {
    aplicarAlters(deBootstrap, readFileSync(join(DIR_MIGRACIONES, mig), 'utf8'))
  }

  const faltantes: string[] = []
  for (const [tabla, columnas] of deOnboarding) {
    const enBootstrap = deBootstrap.get(tabla)
    if (!enBootstrap) continue          // tabla exclusiva del instalador: otro problema, no este
    for (const col of columnas) {
      if (!enBootstrap.has(col)) faltantes.push(`${tabla}.${col}`)
    }
  }

  expect(
    faltantes,
    `Columnas que solo existen en scripts/schema.sql — la ruta de Solo-Cursos y el ` +
    `desarrollo local nacen sin ellas (Bug 99).\nRefléjalas en supabase/schema.sql y ` +
    `añade una migración ADD COLUMN IF NOT EXISTS para las bases ya instaladas:\n  ` +
    `${faltantes.join('\n  ')}`,
  ).toEqual([])
})

test('los cuerpos-trampa conocidos no regresan a scripts/schema.sql (S1/S2)', () => {
  // Complemento CONDUCTUAL-estático del límite documentado arriba: el check
  // por nombre no ve cuerpos, así que estos dos se vigilan por contenido.
  const schema = sinComentarios(readFileSync(join(raiz, 'scripts', 'schema.sql'), 'utf8'))
  // S1 (Bug 66): handle_new_user jamás vuelve a leer el rol del metadata.
  expect(schema).not.toContain("raw_user_meta_data->>'rol'")
  // S2 (Bug 67): es_admin/es_staff normalizan el rol con LOWER.
  const cuerpoEsAdmin = schema.match(/FUNCTION public\.es_admin\(\)[\s\S]*?\$\$;/)?.[0] ?? ''
  const cuerpoEsStaff = schema.match(/FUNCTION public\.es_staff\(\)[\s\S]*?\$\$;/)?.[0] ?? ''
  expect(cuerpoEsAdmin).toContain('LOWER(rol)')
  expect(cuerpoEsStaff).toContain('LOWER(rol)')
})

