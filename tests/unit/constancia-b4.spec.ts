import { test, expect } from '@playwright/test'
import { CALIFICACION_MINIMA_DEFAULT, aprobo } from '@/lib/cursos/constancia'
import { CONFIG } from '@/lib/config'

/**
 * B4 — Criterio de emisión del diploma.
 *
 * La emisión, la idempotencia y el RESTRICT viven en Postgres y se verifican en
 * el cluster scratch (no se pueden expresar en TypeScript). Aquí se clavan las
 * piezas puras: el veredicto de aprobación y la configuración del documento.
 */

test('aprobar es >= al mínimo, y el borde exacto aprueba', () => {
  expect(aprobo(70, 70)).toBe(true)   // el borde cuenta como aprobado
  expect(aprobo(69.99, 70)).toBe(false)
  expect(aprobo(100, 70)).toBe(true)
  expect(aprobo(0, 70)).toBe(false)
})

test('un porcentaje no numérico NO aprueba: falla cerrado', () => {
  // Si la calificación viniera corrupta, el diploma no se emite. Nunca al revés:
  // un dato roto no puede certificar a nadie.
  expect(aprobo(NaN, 70)).toBe(false)
  // Infinity >= 70 es cierto, pero no es finito: el guard de Number.isFinite lo
  // rechaza. Sin ese guard, una calificación corrupta certificaría a cualquiera.
  expect(aprobo(Number.POSITIVE_INFINITY, 70)).toBe(false)
  expect(aprobo(Number.NEGATIVE_INFINITY, 70)).toBe(false)
})

test('el default del umbral existe: nunca "sin umbral"', () => {
  // Antes de B4 el examen calculaba el porcentaje y NUNCA dictaminaba
  // aprobado/no aprobado. Sin umbral no hay criterio y el diploma no podría
  // existir; si la columna faltara, se cae a este default, no a "todos aprueban".
  expect(CALIFICACION_MINIMA_DEFAULT).toBe(70)
  expect(aprobo(69, CALIFICACION_MINIMA_DEFAULT)).toBe(false)
})

test('CONFIG.diploma trae prefijo de folio y etiqueta neutra', () => {
  expect(CONFIG.diploma.folioPrefijo).toBeTruthy()
  expect(CONFIG.diploma.etiqueta).toBeTruthy()
})

test('el texto por defecto NO afirma validez oficial', () => {
  // Poner "SEP", "RVOE" o "validez oficial" por default sería afirmar, en nombre
  // de TODOS los clientes de la plantilla, algo que solo puede decir quien
  // acredite su propio registro. Es un tema legal, no de redacción.
  const prohibidas = ['validez oficial', 'sep', 'rvoe', 'secretaría de educación']
  const texto = `${CONFIG.diploma.etiqueta} ${CONFIG.diploma.firmaCargo}`.toLowerCase()
  for (const p of prohibidas) {
    expect(texto).not.toContain(p)
  }
})

test('la firma es opcional: vacía por defecto', () => {
  // El default no puede traer la firma de otro cliente. Cada quien pone la suya.
  expect(CONFIG.diploma.firma).toBe('')
})
