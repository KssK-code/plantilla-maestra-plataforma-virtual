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
const mens = (m, nivel) => porNivel(m.mensualidad, nivel)

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
if (CONFIG.licenciaturas?.activas)
  for (const m of (CONFIG.licenciaturas.modalidades || []).filter(x => x.activa !== false))
    modalidadesFilas.push([`Licenciatura — ${m.label || m.id}`, `${m.meses} meses`,
      `${mxn(m.mensualidad)}/mes`, `${m.materiasPorMes} materias por mes`])
modalidadesFilas.push(['Cursos y Diplomados', 'La define cada curso', 'Por curso', 'Por módulos'])

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
if (INV.semanas) contenido.push(['Semanas de contenido', INV.semanas])
if (INV.evaluaciones) contenido.push(['Evaluaciones del programa', INV.evaluaciones])
if (INV.preguntas) contenido.push(['Preguntas de examen', INV.preguntas])
if (INV.quiz) contenido.push(['Preguntas de quiz semanal', INV.quiz])

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
  frasePrograma: `tu instituto en línea — ${listaNiveles}`,
  fraseIntro: `Una sola plataforma que atiende tus ${nivelesPrograma.length === 1 ? 'alumnos' : `${nivelesPrograma.length} niveles`}: ${listaNiveles}. El alumno se registra, elige su nivel y avanza mes a mes; tú lo administras todo desde un único panel.`,
  frasePrecios: modalidadesActivas.length === 1
    ? `Tu escuela opera con un plan único de ${modalidadesActivas[0].meses} meses${inscDistinta ? ' y una inscripción diferenciada por nivel' : ''}. Así quedó cargado en la plataforma:`
    : `Tu escuela ofrece ${modalidadesActivas.length} planes de ${dur} meses${inscDistinta ? ', con inscripción diferenciada por nivel' : ''}. Así quedaron cargados:`,
  notaPrecios: 'El total suma inscripción + mensualidades del plan + certificación. Los montos se muestran solos en la página pública y en el registro, y el panel te sugiere el monto correcto según el nivel del alumno al capturar un pago.',
  contenido,
  preciosCols, preciosFilas, modalidadesCols, modalidadesFilas,
  notaModalidades: modalidadesActivas.length === 1
    ? 'Tu plataforma ofrece un solo plan, así que el alumno no elige duración al registrarse: se le asigna automáticamente.'
    : 'El alumno elige su plan al registrarse, y el ritmo de apertura de materias se ajusta solo.',
  licenciaturas: CONFIG.licenciaturas,
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
  L.push('⚙️ LO QUE PUEDES HACER DESDE TU PANEL',
    '• Dar de alta alumnos y abrirles el contenido mes a mes',
    '• Registrar pagos y generar el recibo en PDF con tu logo',
    '• Ver el estado de cuenta de cada alumno',
    '• Consultar reportes de ingresos por semana y por mes',
    '• Revisar y validar los documentos que suben tus alumnos',
    '• Crear tus propios Cursos y Diplomados cuando quieras', '')
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
