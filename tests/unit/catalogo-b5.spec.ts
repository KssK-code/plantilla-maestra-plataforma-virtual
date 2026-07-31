import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { precioMXN, waUrlDiplomado } from '@/lib/cursos/catalogo'
import { CONFIG } from '@/lib/config'

/**
 * B5 — Catálogo público.
 *
 * El invariante que estas pruebas protegen: **lo que sale al público es una
 * lista blanca de campos, no una tabla**. La RLS no se abrió para `anon` (eso se
 * verifica en el cluster scratch); aquí se clava que la capa de catálogo no
 * pueda filtrar contenido por accidente.
 */

const raizRepo = process.cwd()
const catalogoSrcCrudo = readFileSync(join(raizRepo, 'src/lib/cursos/catalogo.ts'), 'utf8')

/**
 * El archivo SIN comentarios. Hace falta porque sus propios comentarios NOMBRAN
 * lo prohibido (`select('*')`, `video_url`, `respuesta_correcta`) justamente
 * para explicar por qué no debe estar — buscar sobre el crudo daría siempre
 * positivo y la prueba no valdría nada.
 */
const catalogoSrc = catalogoSrcCrudo
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

test('el flag del catálogo viene APAGADO por default', () => {
  // 144 clientes de secundaria/preparatoria comparten esta plantilla y su
  // landing no debe cambiar. B7 lo enciende solo para Solo-Cursos.
  expect(CONFIG.landing.mostrarCatalogoCursos).toBe(false)
})

test('la capa de catálogo NUNCA selecciona con comodín', () => {
  // Un comodín traería columnas que hoy no existen y mañana sí, y las
  // publicaría sin que nadie lo decidiera.
  //
  // ⚠️ NO basta con buscar el literal `select('*')`: la prueba original hacía
  // eso y la MUTACIÓN la sobrevivió, porque poner el comodín en la constante
  // (`CAMPOS_CATALOGO = '*'`) deja el `.select(CAMPOS_CATALOGO)` intacto. Hay
  // que mirar el VALOR de la constante, que es lo que de verdad decide.
  expect(catalogoSrc).not.toContain("select('*')")
  expect(catalogoSrc).not.toContain('select("*")')

  const m = /const CAMPOS_CATALOGO\s*=\s*([^\n]*\n?[^\n]*)/.exec(catalogoSrc)
  expect(m).not.toBeNull()
  const lista = m![1]
  expect(lista.trim()).not.toBe("'*'")
  expect(lista).not.toContain('*')
  // Y de verdad enumera los campos esperados, no una cadena cualquiera.
  for (const campo of ['id', 'nombre', 'descripcion', 'precio_mensualidad']) {
    expect(lista).toContain(campo)
  }
})

test('la lista blanca NO incluye ningún campo de contenido', () => {
  // Lo que jamás puede salir al público. Si alguien agrega uno de estos a
  // CAMPOS_CATALOGO, esta prueba lo para.
  const prohibidos = [
    'video_url',        // URL del video de la lección
    'contenido_texto',  // el texto de la lección
    'material_path',    // el PDF
    'respuesta_correcta',
    'explicacion',
    'enunciado',        // preguntas del examen
    'alumno_id',        // quién está inscrito
    'meses_desbloqueados',
  ]
  // Se mira solo la constante de campos, sobre el archivo ya sin comentarios.
  const m = /const CAMPOS_CATALOGO\s*=\s*([^\n]*\n?[^\n]*)/.exec(catalogoSrc)
  expect(m).not.toBeNull()
  const lista = m![1]
  for (const campo of prohibidos) {
    expect(lista).not.toContain(campo)
  }
})

test('el temario solo pide el título del módulo', () => {
  // curso_modulos tiene id, curso_id, nombre y orden. Al público solo van
  // nombre y orden: ni el id (que permitiría pedir sus lecciones) ni nada más.
  expect(catalogoSrc).toContain("from('curso_modulos')")
  expect(catalogoSrc).toContain("select('nombre, orden')")
})

test('el detalle no distingue borrador de inexistente', () => {
  // Responder distinto a "existe pero no publicado" y a "no existe" ya filtra
  // información: permite enumerar qué diplomados se están preparando.
  expect(catalogoSrc).toContain("!== 'publicado'")
  expect(catalogoSrc).toContain('return null')
})

test('precioMXN formatea en pesos sin decimales', () => {
  const p = precioMXN(1500)
  expect(p).toContain('1,500')
  expect(p).not.toContain('.00')
  expect(precioMXN(0)).toContain('0')
})

test('el CTA de WhatsApp precarga el nombre del diplomado', () => {
  const url = waUrlDiplomado('https://wa.me/5215512345678', 'Dactiloscopia Forense')
  expect(url).toContain('wa.me/5215512345678')
  expect(decodeURIComponent(url)).toContain('Dactiloscopia Forense')
  // Y no arrastra un ?text= previo del CONFIG.
  const conTexto = waUrlDiplomado('https://wa.me/521551234?text=hola%20previo', 'Balística')
  expect((decodeURIComponent(conTexto).match(/text=/g) ?? []).length).toBe(1)
  expect(decodeURIComponent(conTexto)).not.toContain('hola previo')
})

test('los textos por defecto del catálogo no afirman validez oficial', () => {
  // Misma regla que el diploma de B4: afirmarlo por default sería ponerlo en
  // boca de todos los clientes de la plantilla.
  const texto = `${CONFIG.landing.catalogoTitulo} ${CONFIG.landing.catalogoSubtitulo}`.toLowerCase()
  for (const p of ['validez oficial', 'sep', 'rvoe', 'secretaría de educación']) {
    expect(texto).not.toContain(p)
  }
})
