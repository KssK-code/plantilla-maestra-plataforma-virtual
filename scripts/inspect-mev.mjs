import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))

const src = JSON.parse(readFileSync(join(__dirname, 'mev-content.json'), 'utf-8'))

console.log('\n── meses_contenido (primer registro) ──')
console.log(JSON.stringify(src.meses_contenido[0], null, 2))

console.log('\n── materias (primer registro) ──')
console.log(JSON.stringify(src.materias[0], null, 2))

console.log('\n── semanas (primer registro) ──')
console.log(JSON.stringify(src.semanas[0], null, 2))

console.log('\n── evaluaciones (primer registro) ──')
console.log(JSON.stringify(src.evaluaciones[0], null, 2))

console.log('\n── preguntas (primer registro) ──')
console.log(JSON.stringify(src.preguntas[0], null, 2))

console.log('\n── planes_estudio (todos) ──')
console.log(JSON.stringify(src.planes_estudio, null, 2))
