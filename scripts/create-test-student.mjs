/**
 * create-test-student.mjs — alumno de prueba para demos y QA.
 *
 * Uso:  node --env-file=.env.local scripts/create-test-student.mjs
 *
 * ⚠️ EL ALTA VA POR LA API DE ADMIN DE AUTH, NUNCA POR INSERT A `auth.users`.
 * Es el Bug 76 del PLAYBOOK y ya costó un incidente en VERTIX: GoTrue mapea
 * cuatro columnas de `auth.users` (`confirmation_token`, `recovery_token`,
 * `email_change`, `email_change_token_new`) a campos `string` NO nulos, y esas
 * cuatro NO tienen DEFAULT. Un INSERT manual que no las liste las deja en NULL y
 * el login de ESE usuario devuelve 500 «Database error querying schema» para
 * siempre. `auth.admin.createUser()` las puebla bien.
 *
 * CONSCIENTE DEL MODO: lee `CONFIG.modo` de src/lib/config.ts. En 'solo_cursos'
 * el alumno nace con `nivel='diplomado'` y `modalidad=NULL` — la misma fila que
 * producen las dos puertas reales de alta (registro público y panel admin).
 *
 * IDEMPOTENTE: si el alumno ya existe se reutiliza; correrlo dos veces no
 * duplica ni rompe.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const EMAIL     = process.env.QA_ALUMNO_EMAIL    ?? 'alumno.prueba@example.com'
const PASSWORD  = process.env.QA_ALUMNO_PASSWORD ?? 'Test1234!'
const NOMBRE    = 'Alumno'
const APELLIDOS = 'Prueba'

/**
 * Lee el modo del config sin importar el módulo (es TypeScript y este script es
 * Node puro). Un regex sobre la clave basta y evita montar un transpilador.
 */
function modoDeConfig() {
  // `fileURLToPath` y no `new URL(...)` a secas: en Windows la ruta trae
  // "Kevin Serrano" con espacio, que en una file:// URL viaja como %20 y
  // readFileSync no siempre lo resuelve. Con fileURLToPath queda una ruta
  // nativa y deja de depender de eso.
  const ruta = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'config.ts')

  // ⚠️ SIN `try/catch` QUE DEVUELVA UN DEFAULT. La versión anterior tenía
  // `catch { return 'tradicional' }` y eso convirtió un fallo de ruta en un
  // dato plausible: el script decía «Modo detectado: tradicional» y creaba el
  // alumno con el nivel equivocado, sin un solo error a la vista. Si no se
  // puede leer el modo, hay que parar — no adivinarlo.
  const src = readFileSync(ruta, 'utf8')
  const m = /^\s*modo:\s*'([a-z_]+)'/m.exec(src)
  if (!m) throw new Error(`No se encontró la clave 'modo' en ${ruta}`)
  return m[1]
}

async function main() {
  const modo = modoDeConfig()
  const soloCursos = modo === 'solo_cursos'
  console.log(`Modo detectado: ${modo}`)

  // ── 1. Usuario de Auth (idempotente) ───────────────────────────────────────
  let userId
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const previo = lista?.users?.find(u => u.email === EMAIL)

  if (previo) {
    userId = previo.id
    // Se reutiliza y solo se re-fija la contraseña, para que el login de QA sea
    // predecible sin borrar al alumno (borrarlo arrastraría inscripciones y
    // constancias por CASCADE/RESTRICT).
    const { error } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD })
    if (error) { console.error('updateUserById:', error.message); process.exit(1) }
    console.log(`Usuario de Auth ya existía, contraseña re-fijada: ${userId}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: NOMBRE, apellidos: APELLIDOS },
    })
    if (error) { console.error('createUser:', error.message); process.exit(1) }
    userId = data.user.id
    console.log(`Usuario de Auth creado: ${userId}`)
  }

  // ── 2. public.usuarios ─────────────────────────────────────────────────────
  // `rol` en MINÚSCULAS: el CHECK de usuarios.rol solo acepta
  // 'alumno' | 'admin' | 'secretario'. En mayúsculas el INSERT falla.
  const { error: eUsuario } = await admin.from('usuarios').upsert(
    { id: userId, email: EMAIL, nombre: NOMBRE, apellidos: APELLIDOS, rol: 'alumno' },
    { onConflict: 'id' }
  )
  if (eUsuario) { console.error('usuarios:', eUsuario.message); process.exit(1) }

  // ── 3. public.alumnos ──────────────────────────────────────────────────────
  // La matrícula la asigna el trigger trg_asignar_matricula; no se envía.
  const fila = {
    id: userId,
    nivel:               soloCursos ? 'diplomado' : 'preparatoria',
    modalidad:           soloCursos ? null        : '6_meses',
    inscripcion_pagada:  false,
    meses_desbloqueados: 0,
    activo:              true,
    fecha_inscripcion:   new Date().toISOString(),
  }
  const { error: eAlumno } = await admin.from('alumnos').upsert(fila, { onConflict: 'id' })
  if (eAlumno) { console.error('alumnos:', eAlumno.message); process.exit(1) }

  const { data: alumno } = await admin
    .from('alumnos').select('matricula, nivel, modalidad').eq('id', userId).single()

  console.log('')
  console.log('Alumno de prueba listo')
  console.log(`  email:     ${EMAIL}`)
  console.log(`  matrícula: ${alumno?.matricula ?? '(pendiente)'}`)
  console.log(`  nivel:     ${alumno?.nivel} | modalidad: ${alumno?.modalidad ?? 'NULL'}`)
  console.log(`  id:        ${userId}`)
}

main().catch(err => { console.error('Error inesperado:', err.message); process.exit(1) })
