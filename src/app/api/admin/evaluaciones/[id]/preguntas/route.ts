import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarPregunta } from '@/lib/preguntas'

const COLUMNAS =
  'id, evaluacion_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden, activa'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

// El editor ve TODAS, archivadas incluidas: para poder restaurarlas.
export async function GET(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('preguntas')
      .select(COLUMNAS)
      .eq('evaluacion_id', params.id)
      .order('orden', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ preguntas: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/evaluaciones/[id]/preguntas]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const { data: evaluacion } = await admin
      .from('evaluaciones').select('id').eq('id', params.id).maybeSingle()
    if (!evaluacion) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })

    // El examen mensual se valida como examen. Con el otro tipo se colaría
    // `explicacion`, columna que `preguntas` NO tiene: el INSERT reventaría con
    // "column explicacion does not exist" y saldría un 500 opaco.
    const validacion = validarPregunta(await request.json(), { crear: true, tipo: 'examen' })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    // `orden` explícito: dejarlo NULL funciona de rebote pero deja la columna
    // inerte, y en este repo ya hubo un bug de posición por un orden NULL.
    let orden = validacion.datos.orden
    if (orden === undefined) {
      const { data: ultimo } = await admin
        .from('preguntas').select('orden').eq('evaluacion_id', params.id)
        .order('orden', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
      orden = ((ultimo as { orden: number | null } | null)?.orden ?? -1) + 1
    }

    // `preguntas.opcion_d` es NOT NULL (en quiz_semana es nullable): esta es la
    // única asimetría real entre las dos tablas. El validador de examen ya
    // exige la opción, así que este `?? ''` no debería dispararse nunca; está
    // para que un null jamás llegue a Postgres como 500.
    const { data: fila, error } = await admin
      .from('preguntas')
      .insert({
        ...validacion.datos,
        opcion_d: validacion.datos.opcion_d ?? '',
        orden,
        evaluacion_id: params.id,
      })
      .select(COLUMNAS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pregunta: fila })
  } catch (err) {
    console.error('[POST /api/admin/evaluaciones/[id]/preguntas]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
