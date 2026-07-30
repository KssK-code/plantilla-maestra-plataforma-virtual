import { test, expect } from '@playwright/test'
import {
  CONCEPTOS_CURSO, ESTADOS_INSCRIPCION, errorDeRpcCurso, esConceptoCurso,
  esEstadoInscripcion, esMetodoPago, fechaValida,
} from '@/lib/cursos/inscripciones'
import { limiteVentana } from '@/lib/cursos/acceso'

/**
 * B3 — "Abrir mes" y pagos por inscripción.
 *
 * El grueso de B3 vive en funciones de Postgres (atomicidad y compare-and-swap
 * no se pueden expresar en TypeScript), y se verifica en el cluster scratch.
 * Aquí se clavan las piezas puras: la traducción de errores, los dominios de
 * valores, y — lo más importante — que los pagos de curso NO usen el concepto
 * que distorsionaría el estado de cuenta del programa.
 */

test('los conceptos de curso NO colisionan con los del programa', () => {
  // estado_cuenta_alumnos() cuenta los meses pagados del PROGRAMA con
  //   WHERE p.concepto = 'mensualidad'
  // Si un pago de diplomado usara ese concepto, el alumno aparecería al
  // corriente del programa por haber pagado un curso. Verificado en el cluster:
  // con 'curso_mensualidad' la vista da meses_con_pago = 0; con 'mensualidad',
  // salta a 1.
  const CONCEPTOS_PROGRAMA = ['inscripcion', 'mensualidad', 'otro']
  for (const c of CONCEPTOS_CURSO) {
    expect(CONCEPTOS_PROGRAMA).not.toContain(c)
  }
  expect(esConceptoCurso('mensualidad')).toBe(false)
  expect(esConceptoCurso('curso_mensualidad')).toBe(true)
  expect(esConceptoCurso('cualquier_cosa')).toBe(false)
})

test('estados de inscripción: solo los cuatro del CHECK de B1', () => {
  expect([...ESTADOS_INSCRIPCION]).toEqual(['activa', 'suspendida', 'completada', 'cancelada'])
  expect(esEstadoInscripcion('activa')).toBe(true)
  expect(esEstadoInscripcion('pausada')).toBe(false)
  expect(esEstadoInscripcion(null)).toBe(false)
})

test('solo activa concede acceso; el resto no mueve la ventana', () => {
  // Coherencia con el gate de B2: abrir meses se rechaza sobre no-activas, y
  // aunque el contador tuviera valor, el gate tampoco daría acceso.
  const curso = { modulos_por_mes: 2, estado: 'publicado' }
  expect(limiteVentana({ meses_desbloqueados: 3, estado: 'activa' }, curso)).toBe(6)
  expect(limiteVentana({ meses_desbloqueados: 3, estado: 'suspendida' }, curso)).toBe(0)
  expect(limiteVentana({ meses_desbloqueados: 3, estado: 'cancelada' }, curso)).toBe(0)
  // 'completada' conserva lo liberado (decisión de B2) y abrir más se rechaza en B3.
  expect(limiteVentana({ meses_desbloqueados: 3, estado: 'completada' }, curso)).toBe(6)
})

test('métodos de pago: mismo dominio que el módulo tradicional', () => {
  for (const m of ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']) {
    expect(esMetodoPago(m)).toBe(true)
    expect(esMetodoPago(m.toLowerCase())).toBe(true) // se normaliza a mayúsculas
  }
  expect(esMetodoPago('BITCOIN')).toBe(false)
  expect(esMetodoPago(null)).toBe(false)
})

test('fechaValida rechaza fechas que el regex sí acepta', () => {
  expect(fechaValida('2026-07-30')).toBe(true)
  // 30 de febrero: el regex la acepta y new Date() hace roll-over silencioso.
  // Sin esta comprobación, Postgres devolvería un 500 críptico.
  expect(fechaValida('2026-02-30')).toBe(false)
  expect(fechaValida('2026-13-01')).toBe(false)
  expect(fechaValida('30-07-2026')).toBe(false)
  expect(fechaValida('')).toBe(false)
  expect(fechaValida(null)).toBe(false)
})

test('los SQLSTATE de las funciones se traducen a HTTP con sentido', () => {
  const e = (code: string, message = 'mensaje de la función') =>
    ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as never

  // No admin → 403, no 500: es una decisión de autorización.
  expect(errorDeRpcCurso(e('42501')).status).toBe(403)
  // Inscripción inexistente → 404.
  expect(errorDeRpcCurso(e('P0002')).status).toBe(404)
  // Doble clic / carrera → 409, para que la UI diga "recarga".
  expect(errorDeRpcCurso(e('40001')).status).toBe(409)
  // Tope alcanzado o estado inválido → 422: la petición está bien formada,
  // pero la regla de negocio la rechaza.
  expect(errorDeRpcCurso(e('22023')).status).toBe(422)
  expect(errorDeRpcCurso(e('XX000')).status).toBe(500)
})

test('el mensaje de la función se propaga tal cual, sin reescribirlo', () => {
  // El texto lo redacta la función porque es la que conoce el tope real y el
  // estado real. Reescribirlo en la ruta lo dejaría en dos sitios y divergiría.
  const msg = 'Este curso llega hasta 3 meses y la inscripción ya los tiene todos abiertos.'
  const r = errorDeRpcCurso({ code: '22023', message: msg, details: '', hint: '', name: 'PostgrestError' } as never)
  expect(r.mensaje).toBe(msg)
  expect(r.status).toBe(422)
})
