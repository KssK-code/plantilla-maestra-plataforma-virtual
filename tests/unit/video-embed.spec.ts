import { test, expect } from '@playwright/test'
import { esVideoReproducible } from '@/components/alumno/VideoEmbed'

/**
 * Qué URL de video puede ver el alumno.
 *
 * `VideoEmbed` tenía una rama que, con una URL `results?search_query`, montaba
 * un iframe de `youtube.com/embed/videosearch`. YouTube retiró ese endpoint
 * para sitios de terceros: hoy responde 200 con la tarjeta "Este video no está
 * disponible". O sea, un reproductor muerto dentro de una materia pagada.
 *
 * Degradarlas a link externo tampoco sirve: mandaría al alumno a una lista de
 * resultados de YouTube, fuera de la plataforma y sin curaduría — justo los
 * canales de escuelas que el banco filtra al elegir el video.
 *
 * Por eso una URL de búsqueda no es reproducible y la semana la trata igual que
 * a `video_url` en NULL: no pinta el bloque.
 */

test('una URL de búsqueda de YouTube NO es reproducible', () => {
  expect(esVideoReproducible('https://www.youtube.com/results?search_query=derecho+internacional')).toBe(false)
  expect(esVideoReproducible('https://youtube.com/results?search_query=algo')).toBe(false)
  expect(esVideoReproducible('https://www.youtube.com/results?search_query=a+b+c&sp=EgIQAQ')).toBe(false)
})

test('vacío, nulo o solo espacios NO es reproducible', () => {
  expect(esVideoReproducible('')).toBe(false)
  expect(esVideoReproducible('   ')).toBe(false)
  expect(esVideoReproducible(null)).toBe(false)
  expect(esVideoReproducible(undefined)).toBe(false)
})

test('las tres formas de URL de YouTube que la app sabe montar SÍ son reproducibles', () => {
  expect(esVideoReproducible('https://www.youtube.com/watch?v=Nyts_ereM4Y')).toBe(true)
  expect(esVideoReproducible('https://youtu.be/Nyts_ereM4Y')).toBe(true)
  expect(esVideoReproducible('https://www.youtube.com/embed/Nyts_ereM4Y')).toBe(true)
})

test('un video externo que no es de YouTube sigue siendo reproducible (cae al link)', () => {
  expect(esVideoReproducible('https://vimeo.com/123456789')).toBe(true)
  expect(esVideoReproducible('https://drive.google.com/file/d/abc/view')).toBe(true)
})

/**
 * El componente ya no debe contener la rama muerta. Esta prueba mira el
 * archivo, no el render: es un candado contra que alguien la reviva sin saber
 * que el endpoint no existe.
 */
test('VideoEmbed ya no monta embed/videosearch', () => {
  const fs = require('fs') as typeof import('fs')
  const src = fs.readFileSync('src/components/alumno/VideoEmbed.tsx', 'utf8')
  const codigo = src
    .split('\n')
    .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
    .join('\n')
  expect(codigo, 'embed/videosearch está muerto para terceros — no revivir').not.toContain('embed/videosearch')
})
