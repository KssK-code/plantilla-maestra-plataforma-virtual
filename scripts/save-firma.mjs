import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const b64 = readFileSync(join(__dirname, 'firma.b64'), 'utf8').trim()
const buf = Buffer.from(b64, 'base64')
const out = join(__dirname, '../public/firma-direccion.png')
writeFileSync(out, buf)
console.log('✅ Guardado en public/firma-direccion.png')
