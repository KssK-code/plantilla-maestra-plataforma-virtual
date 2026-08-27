#!/usr/bin/env node
/**
 * generar-entrega.mjs — ÚLTIMO PASO del proceso de desarrollo MEV.
 *
 * Produce los dos entregables finales de cualquier cliente de la plantilla:
 *   entrega/<SLUG>_Entrega_Oficial.pdf
 *   entrega/ENTREGA-WHATSAPP.txt
 *
 * Uso:
 *   pnpm entrega                    # PDF + mensaje
 *   pnpm entrega --solo-pdf         # solo el PDF
 *   pnpm entrega --datos otro.json  # otro archivo de datos
 *
 * TODO lo que sabe del cliente lo saca de `src/lib/config.ts` y de la base de
 * datos: nombre, dominio, colores, logo, niveles, modalidades, precios,
 * licenciaturas y conteo real de contenido. Lo único que no vive en el config
 * son las credenciales, que van en `entrega.local.json` (ignorado por git).
 *
 * REGLA DEL DOMINIO: el documento se emite SIEMPRE con el dominio definitivo
 * del cliente. Si `CONFIG.dominio` está vacío o apunta a un host provisional
 * (vercel.app, netlify.app, localhost), el script ABORTA. Un documento de
 * entrega oficial con una URL temporal envejece mal: el cliente lo guarda, lo
 * reenvía, y meses después el enlace ya no existe.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { construirHTML, mxn, cap } from './documento.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const opt = (n, def) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : def }

const log = (...a) => console.log(...a)
const abortar = (msg, ayuda) => {
  console.error(`\n✖ ${msg}`)
  if (ayuda) console.error(`\n${ayuda}`)
  process.exit(1)
}

/* ── Constantes de la línea MEV ──────────────────────────────────────────── */
const TUTORIALES = {
  playlist: 'https://www.youtube.com/playlist?list=PLWcWYoZvoCwk',
  alumno: 'https://youtu.be/yWtejlC2t_U',
}
const SOPORTE = {
  horario: 'Lunes a viernes · 9:00 — 18:00 (hora de México)',
  respuesta: 'Hasta 24 horas hábiles',
  canal: 'WhatsApp o correo electrónico',
}
const HOSTS_PROVISIONALES = ['vercel.app', 'netlify.app', 'localhost', '127.0.0.1', 'onrender.com', 'pages.dev']

/* ── 1. Config del cliente ───────────────────────────────────────────────── */
const { CONFIG } = await import(pathToFileURL(path.join(RAIZ, 'src/lib/config.ts')).href)

const dominio = String(CONFIG.dominio || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
if (!dominio) abortar('CONFIG.dominio está vacío.',
  'El documento de entrega se emite con el dominio definitivo del cliente.\nDefínelo en src/lib/config.ts antes de generar la entrega.')
if (HOSTS_PROVISIONALES.some(h => dominio.includes(h)))
  abortar(`CONFIG.dominio apunta a un host provisional: ${dominio}`,
    'El documento de entrega NO se emite con URLs temporales.\nRegistra y conecta el dominio definitivo, ponlo en src/lib/config.ts y vuelve a correr.')
const URL_BASE = `https://${dominio}`

/* ── 2. Credenciales (fuera del repo) ────────────────────────────────────── */
const rutaDatos = path.join(RAIZ, opt('datos', 'entrega.local.json'))
if (!fs.existsSync(rutaDatos)) abortar(`No encuentro ${path.basename(rutaDatos)}`, [
  'Crea ese archivo en la raíz del repo (git lo ignora) con esta forma:',
  '',
  JSON.stringify({
    adminNombre: 'Nombre del administrador',
    adminGenero: 'f',
    adminEmail: 'admin@cliente.com',
    adminPassword: '••••••',
    alumnoEmail: 'prueba@gmail.com',
    alumnoPassword: '12345678',
  }, null, 2),
].join('\n'))
const D = JSON.parse(fs.readFileSync(rutaDatos, 'utf8'))
for (const k of ['adminNombre', 'adminEmail', 'adminPassword'])
  if (!D[k]) abortar(`Falta "${k}" en ${path.basename(rutaDatos)}`)

/* ── 3. Conteo real de contenido ─────────────────────────────────────────── */
async function inventario() {
  const env = path.join(RAIZ, '.env.local')
  if (!fs.existsSync(env)) { log('  · sin .env.local — se omite el inventario'); return {} }
  const vars = Object.fromEntries(fs.readFileSync(env, 'utf8').split('\n')
    .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
  const url = vars.NEXT_PUBLIC_SUPABASE_URL, key = vars.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { log('  · .env.local sin credenciales — se omite el inventario'); return {} }
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const n = async (tabla, filtro) => {
    let q = sb.from(tabla).select('*', { count: 'exact', head: true })
    if (filtro) q = filtro(q)
    const { count, error } = await q
    return error ? null : (count ?? 0)
  }
  const inv = {}
  for (const nivel of CONFIG.niveles) {
    if (nivel === 'licenciatura') continue
    inv[`materias_${nivel}`] = await n('materias', q => q.eq('nivel', nivel).eq('activa', true))
  }

  // Programas de licenciatura: se cuenta POR CARRERA, no en bloque. Todas
  // comparten `nivel = 'licenciatura'`, así que un conteo por nivel sumaría los
  // programas entre sí y el documento diría "48 materias" donde el alumno de
  // cada uno cursa 24. Ver Bug 59 del playbook.
  inv.porCarrera = {}
  for (const c of (CONFIG.licenciaturas?.activas ? (CONFIG.licenciaturas.carreras || []) : [])) {
    const materias = await n('materias', q => q.eq('carrera', c.slug).eq('activa', true))
    if (materias == null) continue
    const { data: ids } = await sb.from('materias').select('id').eq('carrera', c.slug).eq('activa', true)
    const materiaIds = (ids || []).map(x => x.id)
    let evaluaciones = 0, preguntas = 0, quiz = 0, semanas = 0
    if (materiaIds.length) {
      const { data: ev } = await sb.from('evaluaciones').select('id').in('materia_id', materiaIds)
      const evIds = (ev || []).map(x => x.id)
      evaluaciones = evIds.length
      if (evIds.length) preguntas = await n('preguntas', q => q.in('evaluacion_id', evIds)) ?? 0
      const { data: mc } = await sb.from('meses_contenido').select('id').in('materia_id', materiaIds)
      const mesIds = (mc || []).map(x => x.id)
      if (mesIds.length) {
        const { data: sem } = await sb.from('semanas').select('id').in('mes_id', mesIds)
        const semIds = (sem || []).map(x => x.id)
        semanas = semIds.length
        if (semIds.length) quiz = await n('quiz_semana', q => q.in('semana_id', semIds)) ?? 0
      }
    }
    inv.porCarrera[c.slug] = { materias, semanas, evaluaciones, preguntas, quiz }
  }
  inv.materias_demo = await n('materias', q => q.eq('nivel', 'demo'))
  inv.semanas = await n('semanas')
  inv.evaluaciones = await n('evaluaciones')
  inv.preguntas = await n('preguntas')
  inv.quiz = await n('quiz_semana')
  inv.cursos = await n('cursos', q => q.eq('estado', 'publicado'))
  const { data: al } = await sb.from('alumnos').select('matricula')
    .not('matricula', 'is', null).order('created_at').limit(1)
  inv.matricula = al?.[0]?.matricula ?? null
  return inv
}
log('· Leyendo inventario de contenido…')
const INV = await inventario()

/* ── 4. Modalidades y precios, adaptados a lo CONTRATADO ─────────────────── */
/**
 * Un cliente puede vender un CURSO, un DIPLOMADO o una LICENCIATURA por los
 * mismos rieles internos. Llamarlos a todos "licenciatura" en el documento de
 * entrega es decirle al cliente algo que no vendió — y "cuatrimestres" donde
 * su temario habla de módulos. Se infiere del nombre y se puede fijar a mano
 * con `tipo` en la carrera si algún día hace falta.
 */
const tipoDePrograma = (c) => {
  if (c.tipo) return c.tipo
  const n = String(c.nombre || '').toLowerCase()
  if (n.startsWith('curso')) return 'curso'
  if (n.startsWith('diplomado')) return 'diplomado'
  return 'licenciatura'
}
const CARRERAS = (CONFIG.licenciaturas?.activas ? (CONFIG.licenciaturas.carreras || []) : [])
  .map(c => ({ ...c, tipo: tipoDePrograma(c), inv: INV.porCarrera?.[c.slug] ?? null }))
const TIPOS = [...new Set(CARRERAS.map(c => c.tipo))]
/** Título de la sección y palabra para el bloque, según lo que el cliente vende. */
// El documento enlaza a la sección de los programas en la página pública. El id
// se LEE de la landing en vez de darlo por hecho: estaba escrito '#programas' y
// el id real es 'diplomados', asi que el enlace del PDF no llevaba a ninguna
// parte. Si no se encuentra ninguno, no se promete el enlace.
const anclaProgramas = (() => {
  if (!CARRERAS.length) return null
  try {
    const landing = fs.readFileSync(new URL('../../src/components/landing/LandingClient.tsx', import.meta.url), 'utf8')
    // Solo la sección de los programas. `diplomados` NO sirve: es el catálogo
    // de cursos propios del cliente y se renderiza únicamente si publicó
    // alguno, así que enlazar ahí manda al vacío.
    for (const id of ['programas', 'carreras', 'licenciaturas']) {
      if (landing.includes(`id="${id}"`)) return id
    }
  } catch { /* sin landing legible, se omite el enlace */ }
  return null
})()

const ETIQUETA_PROGRAMAS = TIPOS.length === 0 ? 'Programas'
  : TIPOS.length === 1
    ? ({ curso: 'Cursos de preparación', diplomado: 'Diplomados', licenciatura: 'Licenciaturas' })[TIPOS[0]]
    : 'Cursos y diplomados'
const PALABRA_BLOQUE = TIPOS.includes('licenciatura') ? 'Cuatrimestres' : 'Módulos'

const nivelesPrograma = CONFIG.niveles.filter(n => n !== 'licenciatura')
const modalidadesActivas = (CONFIG.modalidades || []).filter(m => m && typeof m === 'object' && m.activa)
if (!modalidadesActivas.length && CONFIG.modo !== 'solo_cursos')
  abortar('CONFIG.modalidades no tiene ninguna modalidad activa.',
    'Revisa que sea un array de OBJETOS completos ({id,label,meses,mensualidad,materiasPorMes,activa}),\nno un array de cadenas.')

/** Resuelve un precio que puede ser número o {nivel: monto}. */
const porNivel = (v, nivel) => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const k = String(nivel || '').toLowerCase()
  if (k in v) return v[k]
  const vals = Object.values(v).filter(x => typeof x === 'number')
  return vals.length ? Math.max(...vals) : 0
}
const insc = (nivel) => porNivel(CONFIG.precios?.inscripcion, nivel)
const cert = (nivel) => CONFIG.precios?.[`certificacion${cap(nivel)}`]
  ?? CONFIG.precios?.[`certificacion_${nivel}`] ?? 0
/**
 * Mensualidad de una modalidad para un nivel.
 *
 * ⚠️ `modalidades[].mensualidad` es UN SOLO número, así que en un cliente con
 * precios diferenciados por nivel devuelve el mismo para todos. La plantilla ya
 * resuelve esa diferencia con las claves `precios.<nivel>_<n>meses_normal`, que
 * es de donde lee la landing (ver LandingClient, tarjeta de Secundaria). Sin
 * consultarlas, el documento de entrega contradecía a la propia plataforma:
 * anunciaba la mensualidad de preparatoria como si fuera la de secundaria.
 */
const mens = (m, nivel) => {
  const meses = m?.meses
  const clave = nivel && meses ? `${String(nivel).toLowerCase()}_${meses}meses_normal` : null
  const porClave = clave ? CONFIG.precios?.[clave] : undefined
  if (typeof porClave === 'number') return porClave
  return porNivel(m.mensualidad, nivel)
}

// Tabla de precios: una columna por nivel, una fila por concepto.
const preciosCols = ['Concepto', ...nivelesPrograma.map(cap)]
const preciosFilas = []
const inscDistinta = new Set(nivelesPrograma.map(insc)).size > 1
preciosFilas.push(['Inscripción (pago único)', ...nivelesPrograma.map(n => mxn(insc(n)))])
for (const m of modalidadesActivas)
  preciosFilas.push([`Plan ${m.label || m.id}`, ...nivelesPrograma.map(n => `${mxn(mens(m, n))}/mes`)])
if (nivelesPrograma.some(n => cert(n)))
  preciosFilas.push(['Certificación', ...nivelesPrograma.map(n => mxn(cert(n)))])
for (const m of modalidadesActivas) {
  const etiqueta = modalidadesActivas.length > 1
    ? `Costo total — plan ${m.label || m.id}` : 'Costo total del programa completo'
  preciosFilas.push({
    total: true,
    celdas: [etiqueta, ...nivelesPrograma.map(n => mxn(insc(n) + mens(m, n) * (m.meses || 0) + cert(n)))],
  })
}

// Tabla de modalidades contratadas.
const rango = (m) => {
  const v = [...new Set(nivelesPrograma.map(n => mens(m, n)))].sort((a, b) => a - b)
  return v.length === 1 ? `${mxn(v[0])}/mes` : `${mxn(v[0])} — ${mxn(v[v.length - 1])}/mes`
}
const modalidadesCols = ['Modalidad', 'Duración', 'Mensualidad', 'Ritmo de apertura']
const modalidadesFilas = []
for (const n of nivelesPrograma)
  for (const m of modalidadesActivas)
    modalidadesFilas.push([`${cap(n)} — plan ${m.label || m.id}`, `${m.meses} meses`,
      `${mxn(mens(m, n))}/mes`, `${m.materiasPorMes} materia${m.materiasPorMes === 1 ? '' : 's'} por mes`])
// Los programas de pago único: se nombran por lo que son. Decir "Licenciatura"
// a un curso de preparación es anunciarle al cliente algo que no vendió.
if (CARRERAS.length)
  for (const m of (CONFIG.licenciaturas.modalidades || []).filter(x => x.activa !== false))
    modalidadesFilas.push([
      CARRERAS.length === 1 ? `${CARRERAS[0].nombre} — ${m.label || m.id}`
                            : `${ETIQUETA_PROGRAMAS} — ${m.label || m.id}`,
      `${m.meses} meses`, `${mxn(m.mensualidad)}/mes`,
      `${m.materiasPorMes} materia${m.materiasPorMes === 1 ? '' : 's'} por mes`])
// El módulo para que el cliente cargue SUS propios cursos, distinto de los
// programas ya entregados: se etiqueta para que no se confundan.
modalidadesFilas.push(['Cursos propios (módulo vacío)', 'La define cada curso', 'Por curso', 'Por módulos'])

/* ── 5. Datos del documento ──────────────────────────────────────────────── */
const b64 = (rel) => {
  const p = path.join(RAIZ, 'public', rel.replace(/^\//, ''))
  if (!fs.existsSync(p)) return null
  const buf = fs.readFileSync(p)
  if (buf.length < 200) return null   // placeholder 1x1
  return `data:image/png;base64,${buf.toString('base64')}`
}
const [tag1, tag2] = String(CONFIG.tagline || '').split(' / ')
const taglineCierre = CONFIG.taglineSecundario || tag2 || tag1 || CONFIG.tagline


const contenido = []
for (const n of nivelesPrograma)
  if (INV[`materias_${n}`]) contenido.push([`Materias de ${cap(n)}`, INV[`materias_${n}`]])
if (INV.materias_demo) contenido.push(['Materia tutorial (demostración)', INV.materias_demo])
// Los totales de la base incluyen TODO, programas de pago único incluidos. Si
// además se desglosa cada programa abajo, el cliente lee 746 preguntas y luego
// 360 + 360 y parece que se suman. Se resta lo que ya se detalla aparte.
const sumaCarreras = (k) => CARRERAS.reduce((a, c) => a + (c.inv?.[k] || 0), 0)
const soloPrograma = (total, k) => Math.max(0, (total || 0) - sumaCarreras(k))
if (INV.semanas) contenido.push(['Semanas de contenido', soloPrograma(INV.semanas, 'semanas')])
if (INV.evaluaciones) contenido.push(['Evaluaciones del programa', soloPrograma(INV.evaluaciones, 'evaluaciones')])
if (INV.preguntas) contenido.push(['Preguntas de examen', soloPrograma(INV.preguntas, 'preguntas')])
if (INV.quiz) contenido.push(['Preguntas de quiz semanal', soloPrograma(INV.quiz, 'quiz')])
// Cada programa aparte, con su conteo real: es lo que el cliente compró y lo
// que quiere ver confirmado en el documento.
for (const c of CARRERAS) {
  if (!c.inv?.materias) continue
  contenido.push([`${c.nombre} — materias`, c.inv.materias])
  if (c.inv.preguntas || c.inv.quiz)
    contenido.push([`${c.nombre} — reactivos`, (c.inv.preguntas || 0) + (c.inv.quiz || 0)])
}

const listaNiveles = nivelesPrograma.map(cap).join(' y ')
const dur = modalidadesActivas.map(m => `${m.meses}`).join(' o ')

const datos = {
  nombre: CONFIG.nombre,
  nombreCompleto: CONFIG.nombreCompleto || CONFIG.nombre,
  // Evita "Horizontes — Horizontes Instituto Digital" en el encabezado cuando
  // el nombre corto ya está contenido en el completo.
  marcaEncabezado: (() => {
    const corto = CONFIG.nombre, largo = CONFIG.nombreCompleto || CONFIG.nombre
    return largo.toLowerCase().includes(corto.toLowerCase())
      ? `<b>${largo}</b>` : `<b>${corto}</b> — ${largo}`
  })(),
  tagline: tag1 || CONFIG.tagline,
  taglineCierre,
  colores: CONFIG.colores,
  url: URL_BASE,
  adminNombre: D.adminNombre, adminGenero: D.adminGenero || 'o',
  adminEmail: D.adminEmail, adminPassword: D.adminPassword,
  alumnoEmail: D.alumnoEmail, alumnoPassword: D.alumnoPassword,
  matricula: INV.matricula,
  whatsappDisplay: CONFIG.whatsappDisplay,
  logoData: CONFIG.logoListo === false ? null : (b64(CONFIG.logoOscuro || CONFIG.logo) || b64(CONFIG.logo)),
  isotipoData: CONFIG.isotipo ? b64(CONFIG.isotipo) : null,
  // Usa la palabra que el cliente eligió para su institución —academia,
  // instituto, centro— en lugar de "instituto" en duro, y nombra también los
  // programas de pago único: son parte de lo que se le está entregando.
  frasePrograma: `tu ${D.palabraInstitucion || 'instituto'} en línea — ${listaNiveles}${
    CARRERAS.length ? `, ${CARRERAS.map(c => c.nombre).join(' y ')}` : ''}`,
  fraseIntro: `Una sola plataforma que atiende tus ${nivelesPrograma.length === 1 ? 'alumnos' : `${nivelesPrograma.length} niveles`}: ${listaNiveles}${
    CARRERAS.length ? `, más ${CARRERAS.length === 1 ? 'tu programa' : `tus ${CARRERAS.length} programas`} de pago único` : ''
  }. El alumno se registra, elige ${CARRERAS.length ? 'qué quiere estudiar' : 'su nivel'} y avanza mes a mes; tú lo administras todo desde un único panel.`,
  frasePrecios: modalidadesActivas.length === 1
    ? `Tu escuela opera con un plan único de ${modalidadesActivas[0].meses} meses${inscDistinta ? ' y una inscripción diferenciada por nivel' : ''}. Así quedó cargado en la plataforma:`
    : `Tu escuela ofrece ${modalidadesActivas.length} planes de ${dur} meses${inscDistinta ? ', con inscripción diferenciada por nivel' : ''}. Así quedaron cargados:`,
  notaPrecios: 'El total suma inscripción + mensualidades del plan + certificación. Los montos se muestran solos en la página pública y en el registro, y el panel te sugiere el monto correcto según el nivel del alumno al capturar un pago.',
  contenido,
  preciosCols, preciosFilas, modalidadesCols, modalidadesFilas,
  notaModalidades: modalidadesActivas.length === 1
    ? 'Tu plataforma ofrece un solo plan, así que el alumno no elige duración al registrarse: se le asigna automáticamente.'
    : 'El alumno elige su plan al registrarse, y el ritmo de apertura de materias se ajusta solo.',
  // Se enriquece con el conteo REAL de la base y con el tipo de cada programa,
  // para que el documento no repita el `totalMaterias` declarado en el config
  // sin comprobarlo, ni llame "licenciatura" a un curso de preparación.
  licenciaturas: CONFIG.licenciaturas?.activas
    ? { ...CONFIG.licenciaturas, carreras: CARRERAS }
    : CONFIG.licenciaturas,
  anclaProgramas,
  etiquetaProgramas: ETIQUETA_PROGRAMAS,
  palabraBloque: PALABRA_BLOQUE,
  incluirCursos: true,
  cursosPublicados: INV.cursos || 0,
  validez: D.validez !== false,
  soporte: D.soporte || SOPORTE,
  tutoriales: [
    `Playlist completa: ${TUTORIALES.playlist}`,
    `"Así se estudia en tu plataforma" — compártelo con tus alumnos nuevos: ${TUTORIALES.alumno}`,
  ],
  primerosPasos: [
    'Entra al panel y recorre el menú con calma: Alumnos, Estado de Cuenta y Reportes',
    D.alumnoEmail && 'Inicia sesión con el alumno de prueba para ver la plataforma desde su lado',
    'Da de alta a tu primer alumno real y registra su inscripción',
    'Comparte tu dirección y el video "Así se estudia" con cada nuevo estudiante',
  ].filter(Boolean),
  incluye: [
    `Programa académico de ${listaNiveles}`,
    modalidadesActivas.length === 1
      ? `Plan único de ${modalidadesActivas[0].meses} meses`
      : `${modalidadesActivas.length} planes de estudio (${dur} meses)`,
    // Lo que el cliente ya tiene cargado va ANTES del módulo vacío: es lo que
    // acaba de comprar y lo primero que quiere ver confirmado.
    ...(CARRERAS.length ? [CARRERAS.length === 1
      ? `${CARRERAS[0].nombre}, con su contenido cargado`
      : `${CARRERAS.length} programas ya cargados: ${CARRERAS.map(c => c.nombre).join(' y ')}`] : []),
    'Módulo de Cursos y Diplomados listo para tu propio contenido',
    D.validez !== false && 'Sección de Validez Oficial México + Estados Unidos',
    'Panel de pagos, reportes y estado de cuenta',
  ].filter(Boolean),
  palabraInstitucion: D.palabraInstitucion || 'instituto',
  fuentes: {
    tituloCSS: "'Playfair Display',serif",
    cuerpoCSS: "'Manrope',system-ui,sans-serif",
    link: '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">',
  },
  funcionalidad: [
    `Registro público de alumnos con matrícula automática (prefijo ${CONFIG.prefijoMatricula}-)`,
    'Desbloqueo progresivo del contenido, mes a mes, a tu ritmo de cobro',
    'Video, quiz semanal y examen final en cada materia',
    D.validez !== false && 'Sección de Validez Oficial México + Estados Unidos, con folio verificable en el portal SIGED de la SEP',
    'Módulo de pagos: recibo en PDF con tu marca y envío por WhatsApp',
    'Estado de cuenta por alumno',
    'Reportes de ingresos por semana y por mes, con descarga',
    'Gestión de documentos del alumno con validación del administrador',
    ...(CARRERAS.length ? [
      `${ETIQUETA_PROGRAMAS} ya cargados y listos para inscribir: ${CARRERAS.map(c => c.nombre).join(' y ')}`,
    ] : []),
    'Módulo de Cursos y Diplomados, listo para cargar tu propio contenido',
    'Rol de secretario con accesos delimitados',
  ].filter(Boolean),
}

/* ── 6. PDF ──────────────────────────────────────────────────────────────── */
const SALIDA = path.join(RAIZ, 'entrega')
fs.mkdirSync(SALIDA, { recursive: true })
const slug = (CONFIG.nombre || 'cliente').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
const htmlPath = path.join(SALIDA, '.entrega.html')
const pdfPath = path.join(SALIDA, `${slug}_Entrega_Oficial.pdf`)

fs.writeFileSync(htmlPath, construirHTML(datos), 'utf8')
log('· Imprimiendo el PDF…')
const { chromium } = await import('@playwright/test')
const nav = await chromium.launch()
const pag = await nav.newPage()
await pag.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await pag.evaluate(() => document.fonts.ready)
await pag.waitForTimeout(2000)
await pag.pdf({ path: pdfPath, format: 'Letter', printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' } })
await nav.close()
fs.unlinkSync(htmlPath)
log(`✓ PDF   → entrega/${path.basename(pdfPath)}`)

/* ── 7. Mensaje de WhatsApp ──────────────────────────────────────────────── */
if (!flag('solo-pdf')) {
  const L = []
  L.push(`¡Hola ${D.adminNombre.split(' ')[0]}! 🎉 Tu plataforma de ${datos.nombreCompleto} ya está lista.`, '')
  L.push('🌐 TU PLATAFORMA', URL_BASE, '')
  L.push('👤 ACCESO ADMINISTRADOR', `Usuario: ${D.adminEmail}`, `Contraseña: ${D.adminPassword}`, `Panel: ${URL_BASE}/admin`, '')
  if (D.alumnoEmail) L.push('🎓 ACCESO ALUMNO DE PRUEBA',
    '(para que veas la plataforma tal como la ve un alumno)',
    `Usuario: ${D.alumnoEmail}`, `Contraseña: ${D.alumnoPassword}`, '')
  if (contenido.length) {
    L.push('📚 LO QUE YA ESTÁ CARGADO')
    for (const [c, n] of contenido) L.push(`• ${c}: ${n}`)
    L.push('')
  }
  L.push('💳 TUS PRECIOS, YA CONFIGURADOS')
  for (const n of nivelesPrograma) {
    const partes = [`inscripción ${mxn(insc(n))}`]
    for (const m of modalidadesActivas)
      partes.push(modalidadesActivas.length > 1
        ? `${m.label || m.id}: ${mxn(mens(m, n))}/mes` : `${mxn(mens(m, n))}/mes`)
    if (cert(n)) partes.push(`certificación ${mxn(cert(n))}`)
    L.push(`${cap(n)}: ${partes.join(' · ')}`)
  }
  L.push(modalidadesActivas.length === 1
    ? `Plan único de ${modalidadesActivas[0].meses} meses.`
    : `Planes disponibles: ${modalidadesActivas.map(m => m.label || m.id).join(' y ')}.`, '')

  // Los programas de pago único van con su propio bloque: son otro producto,
  // con otro precio y —normalmente— sin la inscripción del programa escolar.
  // Sin esto, el mensaje de entrega no mencionaba ni una vez lo que el cliente
  // acababa de comprar.
  if (CARRERAS.length) {
    const modsLic = (CONFIG.licenciaturas.modalidades || []).filter(m => m.activa !== false)
    L.push(`🎓 ${ETIQUETA_PROGRAMAS.toUpperCase()}`)
    for (const c of CARRERAS) {
      const partes = []
      if (c.inv?.materias) partes.push(`${c.inv.materias} materias`)
      if (c.cuatrimestres) partes.push(`${c.cuatrimestres} módulos`)
      const reactivos = (c.inv?.preguntas || 0) + (c.inv?.quiz || 0)
      if (reactivos) partes.push(`${reactivos} reactivos`)
      L.push(`• ${c.nombre}${partes.length ? ` — ${partes.join(' · ')}` : ''}`)
    }
    if (modsLic.length) {
      const precios = modsLic.map(m => `${m.label || m.id}: ${mxn(m.mensualidad)}/mes`).join(' · ')
      L.push(`Precio: ${precios}`)
    }
    const inscLic = CONFIG.licenciaturas.inscripcion
    L.push(inscLic ? `Inscripción: ${mxn(inscLic)}` : 'Sin inscripción adicional.')
    L.push('Se inscriben desde tu misma página, eligiendo el programa al registrarse.', '')
  }
  L.push('⚙️ LO QUE PUEDES HACER DESDE TU PANEL',
    '• Dar de alta alumnos y abrirles el contenido mes a mes',
    '• Registrar pagos y generar el recibo en PDF con tu logo',
    '• Ver el estado de cuenta de cada alumno',
    '• Consultar reportes de ingresos por semana y por mes',
    '• Revisar y validar los documentos que suben tus alumnos',
    '• Crear tus propios Cursos y Diplomados cuando quieras',
    ...(CARRERAS.length
      ? [`• Gestionar a los alumnos de ${CARRERAS.length === 1 ? 'tu programa' : 'tus programas'} igual que a los de ${listaNiveles}`]
      : []), '')
  L.push('📄 Te adjunto el Documento de Entrega Oficial con todo el detalle.',
    'Guárdalo, ahí tienes tus accesos y el resumen completo de tu plataforma.', '')
  L.push('🎬 ACADEMIA MEV — TUS TUTORIALES', '',
    'Antes de empezar, dedica unos minutos a nuestros micro-tutoriales oficiales:',
    `▶️ ${TUTORIALES.playlist}`, '',
    'Y este compártelo con cada alumno nuevo — le explica cómo estudiar en la plataforma:',
    `▶️ ${TUTORIALES.alumno}`, '')
  L.push('Cualquier duda, quedo al pendiente 🙌')

  const txt = path.join(SALIDA, 'ENTREGA-WHATSAPP.txt')
  fs.writeFileSync(txt, L.join('\n'), 'utf8')
  log('✓ Mensaje → entrega/ENTREGA-WHATSAPP.txt')
  log('\n──────── copia desde aquí ────────\n')
  log(L.join('\n'))
  log('\n──────── hasta aquí ────────')
}
log(`\n✓ Entrega lista para ${datos.nombreCompleto} · ${URL_BASE}`)
