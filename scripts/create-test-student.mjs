/**
 * create-test-student.mjs
 * Crea un alumno de prueba en EDVEX Academy
 *
 * Uso: node --env-file=.env.local scripts/create-test-student.mjs
 */

import { createClient } from '@supabase/supabase-js'

const EDVEX_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const EDVEX_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!EDVEX_URL || !EDVEX_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(EDVEX_URL, EDVEX_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL    = 'alumno.prueba@edvexacademy.online'
const PASSWORD = 'Test1234!'

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   CREAR ALUMNO DE PRUEBA — EDVEX Academy     ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // ── 1. Obtener el plan de 6 meses ─────────────────────────────────────────
  console.log('1️⃣  Buscando plan de 6 meses...')
  const { data: planes, error: planesErr } = await admin
    .from('planes_estudio')
    .select('id, nombre, duracion_meses')
    .eq('activo', true)
    .order('duracion_meses')

  if (planesErr || !planes?.length) {
    console.error('❌ No se encontraron planes:', planesErr?.message ?? 'sin datos')
    process.exit(1)
  }

  // Prioridad: plan de 6 meses; si no, el primero disponible
  const plan = planes.find(p => p.duracion_meses === 6) ?? planes[0]
  console.log(`   Plan seleccionado: "${plan.nombre}" (${plan.duracion_meses} meses)`)
  console.log(`   Plan ID: ${plan.id}\n`)

  // ── 2. Crear usuario en Supabase Auth ─────────────────────────────────────
  console.log('2️⃣  Creando usuario en Supabase Auth...')

  // Eliminar si ya existe (para re-ejecuciones seguras)
  const { data: existing } = await admin.auth.admin.listUsers()
  const prevUser = existing?.users?.find(u => u.email === EMAIL)
  if (prevUser) {
    console.log(`   ⚠  Usuario ya existe, eliminando para recrear...`)
    await admin.auth.admin.deleteUser(prevUser.id)
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:          EMAIL,
    password:       PASSWORD,
    email_confirm:  true,
  })

  if (authErr) {
    console.error('❌ Error al crear en Auth:', authErr.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`   ✅ Auth user creado`)
  console.log(`   UUID: ${userId}\n`)

  // ── 3. Insertar en public.usuarios ────────────────────────────────────────
  console.log('3️⃣  Insertando en public.usuarios...')
  const { error: usuarioErr } = await admin.from('usuarios').insert({
    id:              userId,
    email:           EMAIL,
    nombre_completo: 'Alumno Prueba',
    rol:             'ALUMNO',
    activo:          true,
  })

  if (usuarioErr) {
    console.error('❌ Error al insertar usuario:', usuarioErr.message)
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }
  console.log('   ✅ Registro en public.usuarios creado\n')

  // ── 4. Crear registro en public.alumnos ───────────────────────────────────
  console.log('4️⃣  Inscribiendo en public.alumnos...')
  const year     = new Date().getFullYear()
  const rand     = Math.floor(1000 + Math.random() * 9000)
  const matricula = `ALU-${year}-${rand}`

  const { data: alumnoData, error: alumnoErr } = await admin
    .from('alumnos')
    .insert({
      usuario_id:           userId,
      matricula,
      plan_estudio_id:      plan.id,
      meses_desbloqueados:  1,   // Mes 1 desbloqueado
    })
    .select()
    .single()

  if (alumnoErr) {
    console.error('❌ Error al crear alumno:', alumnoErr.message)
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }

  const alumnoId = alumnoData.id
  console.log(`   ✅ Alumno inscrito`)
  console.log(`   Alumno ID:  ${alumnoId}`)
  console.log(`   Matrícula:  ${matricula}\n`)

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════')
  console.log('✅ ALUMNO DE PRUEBA CREADO EXITOSAMENTE')
  console.log('════════════════════════════════════════════════')
  console.log(`  Email:               ${EMAIL}`)
  console.log(`  Password:            ${PASSWORD}`)
  console.log(`  Nombre:              Alumno Prueba`)
  console.log(`  UUID (auth.users):   ${userId}`)
  console.log(`  UUID (alumnos.id):   ${alumnoId}`)
  console.log(`  Matrícula:           ${matricula}`)
  console.log(`  Plan:                ${plan.nombre}`)
  console.log(`  Meses desbloqueados: 1`)
  console.log('════════════════════════════════════════════════')
  console.log('\nPuedes iniciar sesión en: http://localhost:3000/login\n')
}

main().catch(err => {
  console.error('❌ Error inesperado:', err.message)
  process.exit(1)
})
