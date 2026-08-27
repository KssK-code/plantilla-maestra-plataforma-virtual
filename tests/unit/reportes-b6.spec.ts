import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { celda, armarCSV, nombreArchivoSeguro } from '@/lib/reportes/csv'

/**
 * B6 — Reportes con desglose por vertical.
 *
 * Dos cosas se protegen aquí:
 *   1. Que el CSV no se pueda usar como vector de ejecución en la máquina de
 *      administración (inyección de fórmulas).
 *   2. Que el criterio de separación de verticales siga siendo la FK y no el
 *      concepto — y que el schema BASE no se haya contaminado con columnas del
 *      módulo opcional de cursos, que lo dejarían sin poder correr solo.
 *
 * El cuadre aritmético (programa + cursos = total) y el filtro de
 * `fecha_ultimo_pago` se prueban contra Postgres de verdad en el cluster
 * scratch, no aquí: son SQL, y afirmarlos con un grep sería teatro.
 */

const raiz = process.cwd()
// Normaliza los finales de linea a LF antes de que ninguna prueba mire el
// texto. En Windows `core.autocrlf=true` deja los fuentes con CRLF, y una
// prueba que recorte buscando dos saltos de linea seguidos no encuentra
// nada: el `indexOf` devuelve -1, el `slice` entrega el resto del archivo
// entero, y la asercion termina evaluandose sobre texto que no le tocaba.
// Eso tenia roja a cms-contenido-f3 en `main` desde el PR #79, con el
// codigo de la app correcto.
const leer = (p: string) =>
  readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

/** SQL sin comentarios: el archivo NOMBRA lo que prohíbe, y grepear el crudo daría siempre positivo. */
const sinComentariosSQL = (s: string) => s.replace(/--.*$/gm, '')
/** TS sin comentarios, por la misma razón. */
const sinComentariosTS = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const migracion = sinComentariosSQL(leer('supabase/migrations/20260730160000_b6_reportes_por_vertical.sql'))

// ─────────────────────────── CSV: inyección de fórmulas ───────────────────────

test('el CSV neutraliza las celdas que Excel interpretaría como fórmula', () => {
  // El vector real: un alumno registrado con este "nombre" ejecutaría la
  // fórmula al abrir el archivo en la máquina de control escolar.
  for (const ataque of [
    '=HYPERLINK("http://evil.mx","cobrar")',
    '+1+1',
    '-1+1',
    '@SUM(A1:A9)',
    '\tinyectado',
    '\rinyectado',
  ]) {
    const salida = celda(ataque)
    // Queda como texto: el primer carácter ya no abre la celda.
    expect(salida.startsWith('"\'')).toBe(true)
  }
})

test('un valor normal NO se ensucia con la comilla de escape', () => {
  expect(celda('Dactiloscopia Forense')).toBe('"Dactiloscopia Forense"')
  expect(celda(1500)).toBe('"1500"')
  expect(celda(null)).toBe('')
  expect(celda(undefined)).toBe('')
})

test('las comillas dobles se escapan duplicándolas', () => {
  expect(celda('Juan "El Güero" Pérez')).toBe('"Juan ""El Güero"" Pérez"')
})

test('las comas y saltos de línea no parten la fila', () => {
  const csv = armarCSV(['a', 'b'], [['uno, con coma', 'dos\ncon salto']])
  // Encerrado en comillas: el parser no ve ni la coma ni el salto como separador.
  expect(csv).toContain('"uno, con coma"')
  expect(csv).toContain('"dos\ncon salto"')
})

test('el CSV lleva BOM UTF-8 y CRLF', () => {
  const csv = armarCSV(['Diplomado'], [['Balística Forense']])
  // Sin BOM, Excel en Windows abre en la codificación local y rompe los acentos.
  expect(csv.charCodeAt(0)).toBe(0xfeff)
  expect(csv).toContain('\r\n')
  expect(csv).toContain('Balística Forense')
})

test('el nombre de archivo no puede inyectar cabeceras', () => {
  const malicioso = nombreArchivoSeguro('pagos"; DROP\r\nX-Evil: 1', '2026-07-30')
  expect(malicioso).not.toContain('"')
  expect(malicioso).not.toContain('\r')
  expect(malicioso).not.toContain('\n')
  expect(malicioso).not.toContain(';')
  expect(malicioso.endsWith('.csv')).toBe(true)
})

// ─────────────────────── El criterio de separación es la FK ───────────────────

test('el desglose de ingresos separa por la FK, no por el concepto', () => {
  // `concepto` es TEXT sin CHECK en la base: un typo clasificaría mal para
  // siempre y en silencio. La FK no puede tener un typo.
  for (const fn of ['reporte_ingresos_semanales', 'reporte_ingresos_mensuales']) {
    const cuerpo = migracion.slice(migracion.indexOf(`FUNCTION public.${fn}`))
    const hasta = cuerpo.indexOf('$$;')
    const solo = cuerpo.slice(0, hasta)
    expect(solo).toContain('curso_inscripcion_id IS NULL')
    expect(solo).toContain('curso_inscripcion_id IS NOT NULL')
    // Que NO clasifique por concepto.
    expect(solo).not.toContain("concepto LIKE 'curso")
    expect(solo).not.toContain("concepto = 'curso_mensualidad'")
  }
})

test('las dos funciones de ingresos conservan la columna `total`', () => {
  // Compatibilidad: /api/admin/reportes ya lee `total`. Si se renombrara,
  // los ingresos del mes en curso se irían a cero sin ningún error visible.
  expect(migracion).toContain('RETURNS TABLE (semana_inicio date, total numeric, programa numeric, cursos numeric)')
  expect(migracion).toContain('RETURNS TABLE (mes text, total numeric, programa numeric, cursos numeric)')
})

test('estado_cuenta_alumnos filtra fecha_ultimo_pago a pagos del programa', () => {
  const i = migracion.indexOf('FUNCTION public.estado_cuenta_alumnos')
  expect(i).toBeGreaterThan(-1)
  const cuerpo = migracion.slice(i, migracion.indexOf('$$;', i))
  expect(cuerpo).toContain('MAX(p.fecha_pago)')
  // El filtro nuevo. Sin él, un pago de diplomado movía el «Último pago» del
  // estado de cuenta del programa.
  expect(cuerpo).toContain('curso_inscripcion_id IS NULL')
  // Y la firma no cambió: 12 columnas, mismo orden.
  expect(cuerpo).toContain('fecha_ultimo_pago timestamptz')
})

test('la migración recupera los grants después del DROP', () => {
  // Un DROP FUNCTION se lleva los grants y la función recreada nace ejecutable
  // por PUBLIC. Sin este bloque, B6 ABRIRÍA funciones que 20260717120000 cerró.
  expect(migracion).toContain('DROP FUNCTION IF EXISTS public.reporte_ingresos_semanales(integer)')
  expect(migracion).toContain('DROP FUNCTION IF EXISTS public.reporte_ingresos_mensuales(integer)')
  for (const fn of [
    'reporte_ingresos_semanales(integer)',
    'reporte_ingresos_mensuales(integer)',
    'estado_cuenta_alumnos()',
    'reporte_curso_inscripciones()',
    'reporte_curso_pagos()',
    'reporte_curso_constancias()',
    'reporte_curso_avance()',
    'reporte_coherencia_pagos()',
  ]) {
    expect(migracion).toContain(`REVOKE EXECUTE ON FUNCTION public.${fn}`)
    expect(migracion).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}`)
  }
})

test('el avance usa el denominador honesto: el curso entero', () => {
  const i = migracion.indexOf('FUNCTION public.reporte_curso_avance')
  const cuerpo = migracion.slice(i, migracion.indexOf('$$;', i))
  // El total de lecciones se cuenta por curso, SIN mirar meses desbloqueados.
  // Filtrar por la ventana de pago encogía el denominador y un alumno con 1 de
  // 6 meses pagados salía al 100% (el bug de segundo orden que apareció en B2).
  expect(cuerpo).toContain('FROM public.curso_modulos m')
  expect(cuerpo).not.toContain('meses_desbloqueados')
})

// ───────────────── El schema BASE no se contamina con el módulo ───────────────

test('los schema en disco siguen pudiendo correr SOLOS', () => {
  // schema.sql define el esquema BASE y "debe poder correrse solo". La versión
  // B6 de las funciones referencia pagos.curso_inscripcion_id, que crea B1 —
  // parte del módulo OPCIONAL de cursos. Postgres valida el cuerpo de una
  // función SQL al crearla, así que copiarla al schema base lo aborta con
  // "column p.curso_inscripcion_id does not exist" en todo cliente que no
  // contrate Cursos. Verificado contra una base limpia durante B6.
  for (const f of ['supabase/schema.sql', 'scripts/schema.sql']) {
    const src = sinComentariosSQL(leer(f))
    expect(src).not.toContain('curso_inscripcion_id')
  }
})

test('ambos schema documentan que B6 reemplaza esas funciones', () => {
  // Sin la nota, el siguiente que lea schema.sql concluye que la versión sin
  // desglose es la vigente.
  for (const f of ['supabase/schema.sql', 'scripts/schema.sql']) {
    const src = leer(f)
    expect(src).toContain('B6 REEMPLAZA ESTA FUNCIÓN')
    expect(src).toContain('B6 REEMPLAZA ESTAS DOS FUNCIONES')
  }
})

// ───────────────────────────── El endpoint de export ──────────────────────────

test('el export resuelve el dataset por lista blanca, nunca concatenando', () => {
  const src = sinComentariosTS(leer('src/app/api/admin/reportes/export/route.ts'))
  // El nombre de la RPC sale de un objeto fijo. Si se construyera con el
  // parámetro, `?dataset=` sería una invitación a invocar RPCs arbitrarias.
  expect(src).toContain('hasOwnProperty.call(DATASETS')
  expect(src).not.toMatch(/rpc\(\s*[`'"].*\$\{/)
  expect(src).not.toMatch(/rpc\(\s*pedido/)
  expect(src).toContain('def.rpc')
})

test('el export es admin-only y no se cachea', () => {
  const src = sinComentariosTS(leer('src/app/api/admin/reportes/export/route.ts'))
  // Sale el padrón completo con matrícula y correo.
  expect(src).toContain('verifyAdmin')
  expect(src).not.toContain('verifyStaff')
  expect(src).toContain("'Cache-Control': 'no-store'")
})

/**
 * La única hoja de cálculo permitida es el tarball oficial de SheetJS,
 * versionado en `vendor/` y con su SHA-256 comprobado aquí.
 *
 * LA DECISIÓN ES DE CADENA DE SUMINISTRO, NO DE EXPLOTABILIDAD.
 * En esta plantilla `xlsx` se usa SOLO PARA ESCRIBIR: la única ruta que lo
 * importa es reportes/excel, y su superficie es book_new / json_to_sheet /
 * aoa_to_sheet / book_append_sheet / write. Los dos avisos de npm
 * —CVE-2023-30533 (prototype pollution) y CVE-2024-22363 (ReDoS)— son de la
 * ruta de LECTURA, así que la exposición práctica de 0.18.5 era ~nula.
 *
 * Aun así no se deja: una plantilla que se despliega a 144 clientes no debe
 * llevar una dependencia archivada con avisos abiertos «porque en nuestro
 * caso no aplica». Quien reabra esto, que discuta ESE argumento.
 *
 * Se descartó `exceljs`: pesa 21.8 MB contra 8.1, no publica desde dic-2024,
 * obliga a reescribir la ruta y arrastra 9 dependencias — entre ellas jszip,
 * unzipper y saxes. Cambiar una librería de solo escritura por una que trae
 * dos descompresores de ZIP y un parser de XML es ir en la dirección
 * contraria.
 *
 * Procedimiento de actualización: vendor/README.md.
 */
test('la hoja de cálculo viene del tarball oficial, existe y su SHA-256 cuadra', () => {
  const TARBALL = 'vendor/xlsx-0.20.3.tgz'
  const SHA256  = '8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8'

  // 1. package.json apunta EXACTAMENTE al tarball versionado, no a npm.
  const pkg = JSON.parse(leer('package.json'))
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  expect(deps['xlsx'], 'xlsx debe venir de vendor/, nunca de npm').toBe(`file:${TARBALL}`)

  // 2. El tarball existe y es BYTE POR BYTE el que se auditó. Un blob binario
  //    en el repo sin checksum verificado solo cambia un riesgo de cadena de
  //    suministro por otro.
  const ruta = join(raiz, TARBALL)
  expect(existsSync(ruta), `falta ${TARBALL} — ver vendor/README.md`).toBe(true)
  const hash = createHash('sha256').update(readFileSync(ruta)).digest('hex')
  expect(hash, `${TARBALL} no coincide con el SHA-256 auditado`).toBe(SHA256)

  // 3. Ninguna otra librería de hojas de cálculo entra por la puerta de atrás.
  for (const prohibida of ['exceljs', 'node-xlsx', 'xlsx-populate', 'write-excel-file', 'sheetjs']) {
    expect(Object.keys(deps), `${prohibida} no está permitida`).not.toContain(prohibida)
  }
})

test('xlsx se usa solo para ESCRIBIR: un read reabre la decisión', () => {
  // Todo el razonamiento de arriba cuelga de este supuesto. Si alguien
  // introduce un XLSX.read, los CVEs de parseo dejan de ser teóricos y hay que
  // volver a decidir — no seguir de largo.
  const ruta = sinComentariosTS(leer('src/app/api/admin/reportes/excel/route.ts'))
  expect(ruta, 'apareció un XLSX.read: reabrir la decisión de vendor/README.md')
    .not.toMatch(/XLSX\.(read|readFile)\b/)
})
