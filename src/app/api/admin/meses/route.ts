import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarMes } from '@/lib/estructura-contenido'

const COLUMNAS = 'id, materia_id, numero_mes, titulo, descripcion, activa, created_at'

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

    const body = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'El cuerpo de la petición debe ser un objeto.' }, { status: 400 })
    }

    // `materia_id` se lee APARTE y se comprueba contra la base: NO entra por la
    // whitelist de `validarMes`. `meses_contenido.materia_id` es NULLABLE, así
    // que un mes sin materia se crearía sin protestar y nacería invisible —
    // nadie lista meses que no cuelgan de una materia.
    const { materia_id: materiaId, ...resto } = body as Record<string, unknown>
    if (typeof materiaId !== 'string' || !materiaId.trim()) {
      return NextResponse.json({ error: 'materia_id es requerido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: materia } = await admin
      .from('materias').select('id').eq('id', materiaId).maybeSingle()
    if (!materia) return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })

    const validacion = validarMes(resto, { crear: true })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    // Sin número explícito, va al final de la materia.
    let numero = validacion.datos.numero_mes
    if (numero === undefined) {
      const { data: ultimo } = await admin
        .from('meses_contenido')
        .select('numero_mes')
        .eq('materia_id', materiaId)
        .order('numero_mes', { ascending: false })
        .limit(1)
        .maybeSingle()
      numero = ((ultimo as { numero_mes: number } | null)?.numero_mes ?? 0) + 1
    }

    const { data: fila, error } = await admin
      .from('meses_contenido')
      .insert({ ...validacion.datos, numero_mes: numero, materia_id: materiaId })
      .select(COLUMNAS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ mes: fila })
  } catch (err) {
    console.error('[POST /api/admin/meses]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
