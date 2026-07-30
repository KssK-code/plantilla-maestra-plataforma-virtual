import { test, expect } from '@playwright/test'
import { calificar } from '@/lib/cursos/examen'
import type { PreguntaExamen, RespuestaEnviada } from '@/types/cursos-examen'

/**
 * Invariante de SEGURIDAD del examen final de curso:
 *
 *   La respuesta correcta y la explicación solo pueden viajar al cliente para
 *   las preguntas que el alumno contestó en ESE envío.
 *
 * El agujero que cierran estas pruebas: `calificar()` adjuntaba la clave a TODAS
 * las preguntas, así que un POST con todas las respuestas en `null` devolvía el
 * banco completo. Enviar en blanco, leer las claves de la respuesta HTTP y
 * reenviar contestando bien daba 100% sin estudiar — y con ello, el diploma.
 *
 * Se comprueba sobre el JSON serializado, no sobre el objeto en memoria: lo que
 * importa es lo que sale por el cable. Una propiedad con valor `undefined`
 * desaparece al serializar, pero una con `null` no — y `null` seguiría delatando
 * la posición de la clave.
 */

const LETRAS = ['a', 'b', 'c', 'd'] as const

function banco(n: number): PreguntaExamen[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    curso_id: 'curso-1',
    orden: i + 1,
    tema: i % 2 === 0 ? 'Dactiloscopia' : 'Balística',
    enunciado: `Pregunta ${i + 1}`,
    opcion_a: 'A',
    opcion_b: 'B',
    opcion_c: 'C',
    opcion_d: 'D',
    respuesta_correcta: LETRAS[i % 4],
    explicacion: `Porque sí ${i + 1}`,
  }))
}

/** Lo que realmente vería el alumno en el navegador. */
function porElCable<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

test('envío vacío: cero contestadas y ninguna clave viaja', () => {
  const preguntas = banco(10)
  // Así manda la UI un examen en blanco: TODAS las preguntas con respuesta null.
  const enviadas: RespuestaEnviada[] = preguntas.map(p => ({ pregunta_id: p.id, respuesta: null }))

  const r = calificar(preguntas, enviadas)

  expect(r.contestadas).toBe(0)
  expect(r.aciertos).toBe(0)
  expect(r.total).toBe(10)

  const revision = porElCable(r.revision)
  expect(revision).toHaveLength(10)
  for (const item of revision) {
    expect(item).not.toHaveProperty('respuesta_correcta')
    expect(item).not.toHaveProperty('explicacion')
  }

  // Prueba de fuego: la clave no aparece por ningún lado del payload.
  const crudo = JSON.stringify(revision)
  expect(crudo).not.toContain('respuesta_correcta')
  expect(crudo).not.toContain('explicacion')
})

test('envío vacío por array vacío: mismo resultado', () => {
  const preguntas = banco(5)
  const r = calificar(preguntas, [])

  expect(r.contestadas).toBe(0)
  const crudo = JSON.stringify(porElCable(r.revision))
  expect(crudo).not.toContain('respuesta_correcta')
})

test('envío parcial (3 de 10): la clave viaja solo de esas 3', () => {
  const preguntas = banco(10)
  const contestadasIds = ['p2', 'p5', 'p9']
  const enviadas: RespuestaEnviada[] = preguntas.map(p => ({
    pregunta_id: p.id,
    respuesta: contestadasIds.includes(p.id) ? 'a' : null,
  }))

  const r = calificar(preguntas, enviadas)
  expect(r.contestadas).toBe(3)

  const revision = porElCable(r.revision)
  const conClave = revision.filter(i => 'respuesta_correcta' in i)
  expect(conClave.map(i => i.pregunta_id).sort()).toEqual(contestadasIds)

  // Y las otras 7 no traen ni clave ni explicación.
  for (const item of revision.filter(i => !contestadasIds.includes(i.pregunta_id))) {
    expect(item).not.toHaveProperty('respuesta_correcta')
    expect(item).not.toHaveProperty('explicacion')
    expect(item.tu_respuesta).toBeNull()
    expect(item.es_correcta).toBe(false)
  }
})

test('una respuesta incorrecta también revela su clave: contestar es el precio', () => {
  const preguntas = banco(4) // claves: a, b, c, d
  // Contesta la 2 (clave 'b') con 'a' — incorrecta, pero contestada.
  const r = calificar(preguntas, [{ pregunta_id: 'p2', respuesta: 'a' }])

  expect(r.contestadas).toBe(1)
  expect(r.aciertos).toBe(0)

  const revision = porElCable(r.revision)
  const p2 = revision.find(i => i.pregunta_id === 'p2')!
  expect(p2.es_correcta).toBe(false)
  expect(p2.respuesta_correcta).toBe('b')
  expect(p2.explicacion).toBe('Porque sí 2')

  // Las otras tres siguen cerradas.
  expect(revision.filter(i => 'respuesta_correcta' in i)).toHaveLength(1)
})

test('basura y preguntas de otro curso no inflan el conteo ni abren claves', () => {
  const preguntas = banco(5)
  const enviadas = [
    { pregunta_id: 'de-otro-curso', respuesta: 'a' },
    { pregunta_id: 'p999', respuesta: 'b' },
    { pregunta_id: 'p1', respuesta: 'zzz' },   // letra inválida → no cuenta
  ] as unknown as RespuestaEnviada[]

  const r = calificar(preguntas, enviadas)

  expect(r.contestadas).toBe(0)
  expect(r.total).toBe(5)
  const crudo = JSON.stringify(porElCable(r.revision))
  expect(crudo).not.toContain('respuesta_correcta')
})

test('examen contestado completo: la revisión sí trae todo', () => {
  const preguntas = banco(4)
  const enviadas: RespuestaEnviada[] = preguntas.map(p => ({
    pregunta_id: p.id,
    respuesta: p.respuesta_correcta,
  }))

  const r = calificar(preguntas, enviadas)

  expect(r.contestadas).toBe(4)
  expect(r.aciertos).toBe(4)
  expect(r.porcentaje).toBe(100)

  const revision = porElCable(r.revision)
  for (const item of revision) {
    expect(item).toHaveProperty('respuesta_correcta')
    expect(item.es_correcta).toBe(true)
  }
})

test('el denominador no cambia: no contestar sigue contando como incorrecta', () => {
  const preguntas = banco(10)
  const r = calificar(preguntas, [{ pregunta_id: 'p1', respuesta: preguntas[0].respuesta_correcta }])

  expect(r.total).toBe(10)
  expect(r.aciertos).toBe(1)
  expect(r.porcentaje).toBe(10)
  // El desglose tampoco se encoge por sanitizar.
  const totalDesglose = r.desglose.reduce((s, d) => s + d.total, 0)
  expect(totalDesglose).toBe(10)
})
