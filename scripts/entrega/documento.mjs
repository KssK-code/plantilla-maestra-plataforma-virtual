/**
 * documento.mjs — construye el HTML del Documento de Entrega Oficial.
 *
 * No sabe nada de Supabase ni de la línea de comandos: recibe un objeto `d` ya
 * resuelto y devuelve una cadena de HTML. `generar-entrega.mjs` lo imprime a PDF.
 *
 * La estructura sigue el documento de referencia de la línea MEV (portada,
 * accesos, precios, módulos, soporte, cierre) y se ADAPTA a lo que cada cliente
 * tiene contratado: el número de páginas cambia según haya licenciaturas, cursos
 * de ingreso o modo Solo-Cursos.
 */

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const mxn = (n) => '$' + Number(n || 0).toLocaleString('es-MX')
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)

/* ── Paleta ────────────────────────────────────────────────────────────────
 * Se deriva de CONFIG.colores del cliente. El documento se imprime en papel,
 * así que la superficie es SIEMPRE clara aunque el sitio sea dark mode: las
 * bandas usan el color primario y los acentos el color de acento.            */
function paleta(colores = {}) {
  const primario = colores.primario || '#0F172A'
  const acento = colores.acento || '#2563EB'
  const acentoHover = colores.acentoHover || acento
  return {
    banda: primario,
    acento,
    acento2: acentoHover,
    // Tinte muy claro del acento para fondos alternos de tabla.
    tinte: mezclar(acento, '#FFFFFF', 0.9),
    tinte2: mezclar(acento, '#FFFFFF', 0.82),
    linea: mezclar(acento, '#FFFFFF', 0.72),
    // Sobre el color primario el texto va claro; sobre el acento, se calcula.
    sobreBanda: contraste(primario) === 'claro' ? '#FFFFFF' : '#111111',
    sobreAcento: contraste(acento) === 'claro' ? '#FFFFFF' : '#0A0A0A',
    texto: '#1A1712',
    suave: '#6B5F52',
  }
}
const hex = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) }
function mezclar(a, b, t) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b)
  const m = (x, y) => Math.round(x + (y - x) * t)
  return '#' + [m(r1, r2), m(g1, g2), m(b1, b2)].map(v => v.toString(16).padStart(2, '0')).join('')
}
/** Luminancia relativa → si el fondo es oscuro, encima va texto claro. */
function contraste(bg) {
  const [r, g, b] = hex(bg).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 0.35 ? 'claro' : 'oscuro'
}

const css = (P, fuentes) => `
@page { size: Letter; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body{ font-family:${fuentes.cuerpoCSS}; color:${P.texto};
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.page{ width:8.5in; height:11in; background:${P.tinte}; position:relative;
       page-break-after:always; overflow:hidden; display:flex; flex-direction:column; }
.page:last-child{ page-break-after:auto; }
.hdr{ background:${P.banda}; color:${P.sobreBanda}; height:.62in; flex-shrink:0;
      display:flex; align-items:center; justify-content:space-between;
      padding:0 .55in; font-size:8.5pt; }
.hdr .pg{ color:${P.acento}; font-weight:600; }
.body{ flex:1; padding:.42in .55in .2in; overflow:hidden; }
.ftr{ background:${P.banda}; color:${P.acento}; height:.42in; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-family:${fuentes.tituloCSS}; font-style:italic; font-size:9.5pt; }
h1{ font-family:${fuentes.tituloCSS}; font-size:25pt; font-weight:800; text-align:center; }
h2{ font-family:${fuentes.tituloCSS}; font-size:17pt; font-weight:700; margin-bottom:.06in; }
h2 .num{ color:${P.acento}; }
.rule{ width:.55in; height:3px; background:${P.acento}; margin:.05in 0 .17in; border-radius:2px; }
h3{ font-size:11pt; font-weight:700; color:${P.acento2}; margin:.2in 0 .08in; }
p{ font-size:9.8pt; line-height:1.62; }
p.lead{ color:${P.suave}; }
.small{ font-size:8.6pt; color:${P.suave}; line-height:1.55; }
.banner{ background:${P.banda}; border-radius:14px; padding:.34in .3in;
         display:flex; align-items:center; justify-content:center; min-height:1.9in; }
.banner img{ max-height:1.55in; max-width:5.4in; }
.banner .txt{ font-family:${fuentes.tituloCSS}; font-size:30pt; font-weight:800;
              color:${P.sobreBanda}; text-align:center; letter-spacing:.02em; }
.sub{ text-align:center; font-size:11.5pt; color:${P.acento2}; font-weight:600; margin-top:.06in; }
.quote{ background:${P.banda}; color:${P.sobreBanda}; border-radius:12px; padding:.2in .3in;
        text-align:center; font-family:${fuentes.tituloCSS}; font-style:italic;
        font-size:11.5pt; line-height:1.5; }
.quote b{ color:${P.acento}; font-style:normal; font-weight:600; }
.hr{ height:1px; background:${P.linea}; margin:.24in 0; }
table{ width:100%; border-collapse:collapse; font-size:9.4pt; }
.kv td{ padding:.075in .12in; border-bottom:1px solid ${P.linea}; }
.kv tr:nth-child(odd) td{ background:${P.tinte2}; }
.kv td:first-child{ color:${P.suave}; width:2.05in; }
.kv td:last-child{ font-weight:600; }
.dt{ border-radius:8px; overflow:hidden; margin-top:.06in; }
.dt th{ background:${P.banda}; color:${P.sobreBanda}; font-size:9pt; font-weight:600;
        text-align:left; padding:.085in .12in; }
.dt th.c,.dt td.c{ text-align:center; }
.dt td{ padding:.075in .12in; border-bottom:1px solid ${P.linea}; }
.dt tr:nth-child(even) td{ background:${P.tinte2}; }
.dt tr.total td{ background:${P.banda}!important; color:${P.acento}; font-weight:700; }
ul{ list-style:none; margin-top:.04in; }
li{ font-size:9.5pt; line-height:1.5; padding-left:.22in; position:relative; margin-bottom:.075in; }
li::before{ content:''; position:absolute; left:.02in; top:.075in; width:6px; height:6px;
            border-radius:50%; background:${P.acento}; }
.note{ background:${P.tinte2}; border-left:4px solid ${P.acento};
       border-radius:0 9px 9px 0; padding:.15in .2in; margin-top:.16in; }
.note > b{ display:block; font-size:10pt; margin-bottom:.04in; }
.note p{ font-size:9pt; color:${P.suave}; line-height:1.55; }
.note p b{ font-weight:700; color:${P.texto}; }
.note ul{ margin:.06in 0 0 .16in; padding:0; }
.note li{ font-size:8.6pt; color:${P.suave}; line-height:1.5; margin:.02in 0; }
.center{ text-align:center; } .mt{ margin-top:.2in; } .mt2{ margin-top:.3in; }
`

/** Tabla clave/valor. */
const kv = (filas) => `<table class="kv">${filas
  .filter(Boolean)
  .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`

/** Tabla de datos con encabezado. `filas` admite {total:true}. */
function dt(cols, filas) {
  const th = cols.map((c, i) => `<th${i ? ' class="c"' : ''}>${esc(c)}</th>`).join('')
  const tr = filas.map(f => {
    const celdas = (f.celdas || f)
    const cls = f.total ? ' class="total"' : ''
    return `<tr${cls}>${celdas.map((c, i) => `<td${i ? ' class="c"' : ''}>${esc(c)}</td>`).join('')}</tr>`
  }).join('')
  return `<table class="dt"><tr>${th}</tr>${tr}</table>`
}

const ul = (items) => `<ul>${items.filter(Boolean).map(i => `<li>${i}</li>`).join('')}</ul>`

/* ── Páginas ─────────────────────────────────────────────────────────────── */

function marca(d) {
  return d.logoData
    ? `<div class="banner"><img src="${d.logoData}" alt="${esc(d.nombreCompleto)}"></div>`
    : `<div class="banner"><div class="txt">${esc(d.nombre)}</div></div>`
}

function portada(d) {
  return `
${marca(d)}
<h1 class="mt">${esc(d.nombreCompleto.toUpperCase())}</h1>
<div class="sub">Documento de entrega oficial de tu plataforma educativa</div>
<div class="quote mt">"${esc(d.tagline)}"</div>
<div class="hr"></div>
<h2>Bienvenid${d.adminGenero === 'f' ? 'a' : 'o'} a la familia MEV, ${esc(d.adminNombre)}.</h2>
<div class="rule"></div>
<p>Lo que tienes en tus manos no es solo un sitio web: es la infraestructura
digital completa para operar ${esc(d.frasePrograma)}, con tu propio panel de
administración, control de pagos y seguimiento de cada alumno, todo bajo la
marca <b>${esc(d.nombre)}</b>.</p>
<p class="mt"><b>Este documento contiene todos tus accesos y enlaces.</b></p>
<p class="small">Guárdalo en un lugar seguro — es la llave maestra de tu plataforma.</p>
<div class="note mt2"><b>Tu plataforma incluye</b><p>${d.incluye.join(' · ')}.</p></div>`
}

function accesos(d) {
  return `
<h2>Tu plataforma</h2>
<div class="rule"></div>
<p class="lead">${esc(d.fraseIntro)}</p>
<h3>Accesos</h3>
${kv([
    ['Dirección de tu plataforma', d.url],
    ['Panel de administración', `${d.url}/admin`],
    ['Usuario administrador', d.adminEmail],
    ['Contraseña', d.adminPassword],
    d.alumnoEmail && ['Alumno de prueba', `${d.alumnoEmail} / ${d.alumnoPassword}`],
    d.matricula && ['Matrícula del alumno', d.matricula],
    d.whatsappDisplay && ['WhatsApp de contacto', d.whatsappDisplay],
  ])}
${d.alumnoEmail ? `<p class="small">El usuario <b>${esc(d.alumnoEmail)}</b> está creado para que veas
exactamente lo que verá un alumno al registrarse. Úsalo también para recorridos
de demostración a futuros estudiantes.</p>` : ''}
${d.contenido.length ? `<h3>Contenido cargado</h3>${dt(['Concepto', 'Cantidad'], d.contenido)}` : ''}`
}

function precios(d) {
  return `
<h2>Precios configurados</h2>
<div class="rule"></div>
<p class="lead">${esc(d.frasePrecios)}</p>
${dt(d.preciosCols, d.preciosFilas)}
<p class="small">${esc(d.notaPrecios)}</p>
<h3>Funcionalidad entregada</h3>
${ul(d.funcionalidad)}`
}

function tablaModalidades(d) {
  return `
<h3>Modalidades de tu escuela, en resumen</h3>
${dt(d.modalidadesCols, d.modalidadesFilas)}
${d.notaModalidades ? `<p class="small">${esc(d.notaModalidades)}</p>` : ''}`
}

function cursos(d) {
  return `
<h2><span class="num">Módulo incluido ·</span> Crea tus propios cursos</h2>
<div class="rule"></div>
<p class="lead">Además del programa académico, tu plataforma incluye un módulo
independiente para vender cursos y diplomados cortos. Se entrega
<b>instalado y ${d.cursosPublicados ? `con ${d.cursosPublicados} curso(s) cargado(s)` : 'vacío'}</b>,
listo para que ${d.cursosPublicados ? 'sigas ampliando tu oferta' : 'cargues tu propia oferta cuando lo decidas'}.</p>
${kv([
    ['Panel de gestión', `${d.url}/admin/cursos`],
    ['Catálogo público', `${d.url}/diplomados`],
    ['Contenido inicial', d.cursosPublicados ? `${d.cursosPublicados} curso(s)` : 'Vacío — lo defines tú'],
  ])}
<h3>Qué te permite hacer</h3>
${ul([
    'Crear cursos con un asistente paso a paso: portada, módulos y lecciones',
    'Cada lección admite video y material de apoyo descargable',
    'Examen final con banco de preguntas propio por curso',
    'Constancia con folio consecutivo al terminar el curso',
    'Inscribir alumnos y seguir su avance lección por lección',
    'Cobro por inscripción y por mensualidad, independiente del programa académico',
    'Apertura de contenido mes a mes, igual que en el programa',
  ])}
<div class="note"><b>Cómo empezar</b><p>Entra a <b>Gestionar Cursos</b> en el menú de
tu panel y crea tu primer curso. Mientras no publiques ninguno, la sección de
diplomados no se muestra en tu página pública.</p></div>
${tablaModalidades(d)}`
}

function licenciaturas(d) {
  const L = d.licenciaturas
  // El cliente puede vender un curso, un diplomado o una licenciatura por los
  // mismos rieles. El documento usa la palabra que corresponde a lo que compró.
  const titulo  = d.etiquetaProgramas || 'Licenciaturas'
  const bloque  = d.palabraBloque || 'Cuatrimestres'
  const conInv  = L.carreras.some(c => c.inv?.materias)
  // Materias: el conteo REAL de la base cuando lo hay; si no, lo declarado.
  const mats    = c => c.inv?.materias ?? c.totalMaterias ?? 0
  const react   = c => (c.inv?.preguntas || 0) + (c.inv?.quiz || 0)
  const totalM  = L.carreras.reduce((a, c) => a + mats(c), 0)
  const totalR  = L.carreras.reduce((a, c) => a + react(c), 0)

  const cols = ['Programa', bloque, 'Materias', ...(conInv ? ['Reactivos'] : [])]
  const filas = L.carreras.map(c => [
    c.nombre, c.cuatrimestres, mats(c), ...(conInv ? [react(c) || '—'] : []),
  ]).concat([{ celdas: ['Total', '', totalM, ...(conInv ? [totalR] : [])], total: true }])

  return `
<h2><span class="num">Programa ·</span> ${titulo}</h2>
<div class="rule"></div>
<p class="lead">${L.carreras.length === 1 ? 'Vive' : 'Viven'} dentro de la misma
plataforma, con su propia sección en la página pública y su propio panel de
contenido. Se ${L.carreras.length === 1 ? 'inscribe' : 'inscriben'} desde el
mismo registro, eligiendo el programa.</p>
${kv([
    // El ancla se comprueba contra la landing real (ver `anclaProgramas` en
    // generar-entrega.mjs). Prometer un enlace que no anda es peor que no darlo.
    d.anclaProgramas ? ['Sección pública', `${d.url}/#${d.anclaProgramas}`] : null,
    // Un cliente cuyo programa no lleva inscripción aparte no debe ver una
    // fila que diga "$0.00": se omite.
    L.inscripcion ? ['Inscripción', mxn(L.inscripcion)] : ['Inscripción', 'Sin inscripción adicional'],
    L.certificacion ? ['Certificación profesional', mxn(L.certificacion)] : null,
  ])}
${L.carreras.length ? `<h3>Catálogo</h3>${dt(cols, filas)}` : ''}
${L.carreras.some(c => c.desc) ? L.carreras.filter(c => c.desc).map(c => `
<div class="note"><b>${esc(c.nombre)}</b><p>${esc(c.desc)}</p>${
  (c.incluye || []).length ? ul(c.incluye.map(esc)) : ''
}</div>`).join('') : ''}
${L.modalidades.length ? `<h3>Planes configurados</h3>${dt(['Plan', 'Duración', 'Mensualidad', 'Total del plan'],
      L.modalidades.map(m => [m.label || m.id, `${m.meses} meses`, `${mxn(m.mensualidad)}/mes`,
        mxn((m.mensualidad || 0) * (m.meses || 0))]))}` : ''}`
}

function soporte(d) {
  return `
${d.validez ? `<h2>Validez oficial y respaldo</h2>
<div class="rule"></div>
<p class="lead">Tu página pública incluye una sección dedicada a la validez del
certificado, con tres bloques que resuelven la objeción más común de cualquier
prospecto: "¿esto es real?".</p>
${ul([
      '<b>Un certificado, dos países</b> — reconocimiento en México y Estados Unidos',
      '<b>Los dos documentos oficiales</b> que recibe el alumno al terminar, con imagen de cada uno',
      '<b>Verifícalo tú mismo</b> — folio de ejemplo y enlace directo al portal SIGED de la SEP',
    ])}
<h2 class="mt2">Soporte técnico MEV</h2>` : '<h2>Soporte técnico MEV</h2>'}
<div class="rule"></div>
${kv([
    ['Horario', d.soporte.horario],
    ['Tiempo de respuesta', d.soporte.respuesta],
    ['Canal', d.soporte.canal],
  ])}
<h3>Academia MEV — video tutoriales</h3>
<p class="small">Antes de operar tu plataforma, dedica unos minutos a la Academia
MEV: nuestra biblioteca de micro-tutoriales oficiales.</p>
${ul(d.tutoriales)}
<h3>Tus primeros pasos</h3>
${ul(d.primerosPasos)}`
}

function cierre(d) {
  return `
${marca(d)}
<h1 class="mt">${esc(d.nombreCompleto.toUpperCase())}</h1>
<div class="center" style="font-family:${d.fuentes.tituloCSS};font-style:italic;
     font-size:12pt;color:${d.P.acento2};margin-top:.06in;">${esc(d.taglineCierre)}</div>
<div class="hr"></div>
<h2 class="center" style="font-size:16pt;">Hoy comienza tu ${esc(d.palabraInstitucion)} en línea</h2>
<div class="mt"></div>
<p>Hay decisiones que muchos posponen durante años: llevar su institución
educativa al mundo digital. Tú ya la tomaste.</p>
<p class="mt">Lo que sigue es lo más importante: llenar tu plataforma de alumnos.
Confía en el sistema, dedica tiempo a entenderlo y úsalo todos los días. En pocos
meses verás resultados que hoy parecen lejanos.</p>
<p class="mt">Estamos contigo en este camino. Cualquier duda técnica, escríbenos.
Nuestro objetivo es que <b>${esc(d.nombreCompleto)}</b> se convierta en un
referente de educación virtual en línea.</p>
<div class="quote mt2">"${esc(d.tagline)}"</div>
<div class="center mt2">
  <div style="font-weight:700;font-size:12pt;">Equipo MEV — Mi Escuela Virtual</div>
  <div class="small">Soporte y desarrollo de plataformas educativas</div>
</div>
${d.isotipoData ? `<div class="center" style="margin-top:.35in;">
  <img src="${d.isotipoData}" style="height:.7in;opacity:.9;"></div>` : ''}`
}

/** Ensambla el documento completo. */
export function construirHTML(d) {
  const P = paleta(d.colores)
  d.P = P
  const secciones = [portada(d), accesos(d), precios(d)]
  if (d.licenciaturas?.activas) secciones.push(licenciaturas(d))
  secciones.push(cursos(d))
  secciones.push(soporte(d), cierre(d))

  const paginas = secciones.map((body, i) => `<div class="page">
<div class="hdr"><span>${d.marcaEncabezado} · Documento de Entrega Oficial · MEV (Mi Escuela Virtual)</span><span class="pg">Pág. ${i + 1}</span></div>
<div class="body">${body}</div>
<div class="ftr">${esc(d.taglineCierre)}</div>
</div>`).join('\n')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(d.nombreCompleto)} — Documento de Entrega Oficial</title>
${d.fuentes.link}
<style>${css(P, d.fuentes)}</style></head><body>
${paginas}
</body></html>`
}

export { mxn, cap, dt, kv, ul, paleta }
