import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA,
  materialPathSemana, nombreVisible, validarRutaMaterial,
} from '@/lib/materiales-semana'

/**
 * CMS de Contenido — F2 (materiales PDF por semana).
 *
 * Invariantes:
 *  1. La migración va en los TRES archivos de esquema. El de scripts/ es el que
 *     instala el onboarding: faltar ahí = nacer roto en todo cliente nuevo.
 *  2. El bucket es admin-only en RLS. El alumno NUNCA lee del bucket: pasa por
 *     /api/material/[id], que reusa tieneAccesoSemana(). Una sola definición de
 *     acceso, no dos que puedan divergir (el bug T3 de las portadas de Cursos).
 *  3. Los helpers de archivo se COMPARTEN con Cursos, no se copian.
 */

const raiz = process.cwd()
const leer = (p: string) => readFileSync(join(raiz, p), 'utf8')

const MIGRACION = 'supabase/migrations/20260819130000_cms_contenido_materiales.sql'
const ESQUEMAS = ['scripts/schema.sql', 'supabase/schema.sql', 'supabase/schema-01-tablas.sql']

test('la migración crea la tabla, su índice y el bucket privado', () => {
  const sql = leer(MIGRACION)
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.semana_materiales')
  expect(sql).toContain('REFERENCES public.semanas(id) ON DELETE CASCADE')
  expect(sql).toContain('idx_semana_materiales_semana')
  // Bucket privado y con tope, igual que 'cursos'
  expect(sql).toContain("INSERT INTO storage.buckets")
  expect(sql).toMatch(/'materias'[\s\S]*false[\s\S]*10485760/)
})

test('el bucket NO abre lectura a authenticated — solo admin', () => {
  const sql = leer(MIGRACION)
  const politicas = sql.match(/CREATE POLICY[^;]+;/g) ?? []
  const deStorage = politicas.filter(p => p.includes('storage.objects'))
  expect(deStorage.length).toBeGreaterThan(0)
  for (const p of deStorage) {
    expect(p, `política de storage sin es_admin(): ${p.slice(0, 80)}`).toContain('public.es_admin()')
    // Si alguna vez alguien añade acceso por alumno aquí, la regla queda
    // duplicada con /api/material/[id] y vuelve el bug de las portadas.
    expect(p).not.toContain('alumnos')
    expect(p).not.toContain('progreso_semanas')
  }
})

test('la tabla lleva RLS con el mismo par de políticas que el resto del contenido', () => {
  const sql = leer(MIGRACION)
  expect(sql).toContain('ALTER TABLE public.semana_materiales ENABLE ROW LEVEL SECURITY')
  expect(sql).toContain('semana_materiales: admin gestiona')
  expect(sql).toContain('semana_materiales: lectura autenticados')
})

test('la migración se refleja en los TRES esquemas', () => {
  for (const archivo of ESQUEMAS) {
    const s = leer(archivo)
    expect(s, `${archivo} sin semana_materiales`).toContain('public.semana_materiales')
  }
})

test('los espejos dejan de nacer sin las columnas que F1 hizo editables', () => {
  // Deriva PREEXISTENTE: supabase/schema.sql y schema-01-tablas.sql creaban
  // `semanas` sin contenido/video_url_2/video_url_3, que scripts/schema.sql sí
  // tiene. Un cliente instalado desde un espejo nacía sin los apuntes.
  for (const archivo of ESQUEMAS) {
    const ddl = leer(archivo).match(/CREATE TABLE (?:IF NOT EXISTS )?public\.semanas[\s\S]*?\n\);/)?.[0] ?? ''
    expect(ddl, `${archivo}: no encontré el DDL de semanas`).not.toBe('')
    for (const col of ['contenido', 'video_url_2', 'video_url_3']) {
      // Declaración REAL de columna, no una subcadena. Con toContain, este test
      // daba un PASS falso para `contenido`: esa cadena ya aparecía dentro de
      // `REFERENCES public.meses_contenido(id)`, así que la aserción pasaba
      // aunque la columna no existiera — que es justo el caso que vigila.
      expect(ddl, `${archivo}: semanas sin la columna ${col}`)
        .toMatch(new RegExp(`^\\s*${col}\\s+(?:text|TEXT)\\b`, 'm'))
    }
  }
})

// ─────────── Los helpers se comparten con Cursos, no se copian ──────────────

test('los helpers de archivo viven en un solo sitio', () => {
  const comunes = leer('src/lib/archivos-comunes.ts')
  for (const fn of ['sanitizeFilename', 'extensionDe', 'validarMaterial', 'MATERIAL_MAX_BYTES', 'MATERIAL_MIMES']) {
    expect(comunes, `archivos-comunes sin ${fn}`).toContain(fn)
  }
  // Cursos los reexporta en vez de tener su propia copia
  const cursos = leer('src/lib/cursos/archivos.ts')
  expect(cursos).toContain("from '@/lib/archivos-comunes'")
  expect(cursos).not.toMatch(/export function sanitizeFilename/)
})

test('signedUrl y removeFolder reciben el bucket, no lo llevan cableado', () => {
  const comun = leer('src/lib/storage-comun.ts')
  expect(comun).toContain('bucket: string')
  expect(comun).not.toContain('BUCKET_CURSOS')
  // El envoltorio de Cursos sigue existiendo para no tocar a sus consumidores
  const cursos = leer('src/lib/cursos/storage.ts')
  expect(cursos).toContain('BUCKET_CURSOS')
  expect(cursos).toContain("from '@/lib/storage-comun'")
})

test('el uploader de cliente tambien recibe el bucket como parametro', () => {
  const comun = leer('src/lib/upload-comun.ts')
  expect(comun).toContain('bucket: string')
  expect(comun).not.toContain('BUCKET_CURSOS')
  const cursos = leer('src/lib/cursos/upload.ts')
  expect(cursos).toContain("from '@/lib/upload-comun'")
})

// ───────────────────── Rutas y nombres de material ──────────────────────────

test('la ruta lleva materia y semana, en ese orden', () => {
  const p = materialPathSemana('MAT', 'SEM', 'Guía de estudio.pdf', 1700000000000)
  expect(p.startsWith('MAT/SEM/')).toBe(true)
  // Nombre saneado: sin acentos, sin espacios, minúsculas
  expect(p).toContain('guia-de-estudio.pdf')
  expect(p).toContain('1700000000000-')
})

test('el nombre visible conserva el original, no el saneado', () => {
  expect(nombreVisible('Guía de estudio.pdf')).toBe('Guía de estudio.pdf')
  expect(nombreVisible('   ')).toBe('material.pdf')
  expect(nombreVisible('a'.repeat(300)).length).toBeLessThanOrEqual(200)
})

test('una ruta que se sale de su carpeta se rechaza', () => {
  const ok = validarRutaMaterial('MAT/SEM/1700000000000-guia.pdf', 'MAT', 'SEM')
  expect(ok.ok).toBe(true)
  for (const mala of [
    'OTRA/SEM/1-guia.pdf',            // otra materia
    'MAT/OTRA/1-guia.pdf',            // otra semana
    'MAT/SEM/sub/1-guia.pdf',         // subcarpeta
    'MAT/SEM/../../otro.pdf',         // escape
    'MAT/SEM/',                       // sin archivo
    '',                               // vacía
  ]) {
    expect(validarRutaMaterial(mala, 'MAT', 'SEM').ok, mala).toBe(false)
  }
})

test('hay un tope de materiales por semana', () => {
  expect(MATERIALES_MAX_POR_SEMANA).toBeGreaterThan(0)
  expect(BUCKET_MATERIAS).toBe('materias')
})

// ─────────────────────── Rutas admin de material ────────────────────────────

test('las rutas admin de material exigen rol ADMIN', () => {
  for (const r of [
    'src/app/api/admin/semanas/[id]/materiales/route.ts',
    'src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts',
  ]) {
    const src = leer(r)
    expect(src, `${r} sin verifyAdmin`).toContain('verifyAdmin')
    expect(src, `${r} usa verifyStaff`).not.toContain('verifyStaff')
  }
})

test('el confirm valida el objeto REALMENTE subido, no lo que dice el cliente', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  expect(src).toContain('validarRutaMaterial')
  expect(src).toContain('.list(carpeta')          // se consulta el storage
  expect(src).toContain('MATERIAL_MIMES')          // y se valida el mime real
  expect(src).toContain('MATERIAL_MAX_BYTES')
})

test('el tope por semana se comprueba antes de dar la URL de subida', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  const upload = src.slice(src.indexOf("action === 'upload-url'"), src.indexOf("action === 'confirm'"))
  expect(upload).toContain('MATERIALES_MAX_POR_SEMANA')
})

test('borrar un material exige que sea de esa semana', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/[materialId]/route.ts')
  expect(src).toContain(".eq('semana_id', params.id)")
})

test('los objetos que nunca se confirmaron se barren, con ventana de gracia', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  expect(src).toContain('limpiarHuerfanos')
  // El barrido va en upload-url, no en confirm: es cuando ya hay que listar.
  const upload = src.slice(src.indexOf("action === 'upload-url'"), src.indexOf("action === 'confirm'"))
  expect(upload).toContain('limpiarHuerfanos')
  // Y NO puede borrar una subida en vuelo: el objeto existe antes que su fila.
  expect(src).toContain('GRACIA_HUERFANO_MS')
})

test('orden se llena al insertar, no se queda NULL', () => {
  const src = leer('src/app/api/admin/semanas/[id]/materiales/route.ts')
  expect(src).toContain('siguienteOrden')
  expect(src).toContain('orden: siguienteOrden')
})

// ───────── Una sola regla de acceso para el archivo, no dos ─────────────────

test('la descarga reusa tieneAccesoSemana y no reimplementa el gate', () => {
  const src = leer('src/app/api/material/[id]/route.ts')
  expect(src).toContain('tieneAccesoSemana')
  expect(src).toContain('BUCKET_MATERIAS')
  // La regla NO se reescribe a mano aquí
  expect(src).not.toContain('meses_desbloqueados')
  expect(src).not.toContain('modalidad')
})

test('las APIs devuelven metadatos, no URLs firmadas por adelantado', () => {
  for (const r of ['src/app/api/alumno/materia/[id]/route.ts', 'src/app/api/admin/contenido/[id]/route.ts']) {
    const src = leer(r)
    expect(src, `${r} no devuelve materiales`).toContain('semana_materiales')
    expect(src, `${r} firma URLs por adelantado (N+1 de red)`).not.toContain('createSignedUrl')
  }
})

test('los materiales no entran en el diff de campos de la semana', () => {
  const lib = leer('src/lib/contenido-semana.ts')
  expect(lib).not.toContain('materiales')          // CAMPOS_VALOR sigue con 7
  const editor = leer('src/app/(dashboard)/admin/contenido/[id]/SemanaEditor.tsx')
  expect(editor).toContain('MaterialesPanel')
})

test('el panel valida el PDF antes de pedir la URL de subida', () => {
  const src = leer('src/app/(dashboard)/admin/contenido/[id]/MaterialesPanel.tsx')
  // La MISMA funcion que valida el servidor: cliente y servidor no pueden
  // discrepar sobre que es un PDF valido.
  expect(src).toContain('validarMaterial')
  // La subida pasa por el helper compartido, no reimplementa los tres pasos
  expect(src).toContain('subirArchivo')
  expect(src).not.toContain('uploadToSignedUrl')
  expect(src).toContain('/api/material/')          // el enlace de descarga
})
