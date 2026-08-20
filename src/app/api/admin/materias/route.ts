import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarMateria } from '@/lib/estructura-contenido'

const COLUMNAS = 'id, nombre, descripcion, nivel, carrera, color, icono, orden, activa, created_at'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

export async function POST(request: NextRequest) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    // La materia es la raíz: no tiene padre que comprobar. `validarMateria`
    // exige nombre y nivel, y si el nivel es licenciatura exige además una
    // carrera del CONFIG — nunca texto libre, porque la carrera decide qué
    // catálogo ve el alumno.
    const validacion = validarMateria(await request.json(), { crear: true })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const admin = createAdminClient()
    const { data: fila, error } = await admin
      .from('materias')
      .insert(validacion.datos)
      .select(COLUMNAS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ materia: fila })
  } catch (err) {
    console.error('[POST /api/admin/materias]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
