import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarEvaluacion } from '@/lib/preguntas'

const COLUMNAS =
  'id, materia_id, mes_id, titulo, descripcion, tiempo_limite_minutos, intentos_permitidos, activa, created_at'

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
      .from('evaluaciones')
      .select(COLUMNAS)
      .eq('mes_id', params.id)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ evaluaciones: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/meses/[id]/evaluaciones]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()

    // La materia se DERIVA del mes por el que entra la petición, igual que
    // `materiaDeSemana` en F2. Leerla del cuerpo permitiría colgar un examen de
    // una materia ajena: `validarEvaluacion` la deja fuera de la whitelist y
    // aquí no se vuelve a mirar el cuerpo.
    const { data: mes } = await admin
      .from('meses_contenido').select('materia_id').eq('id', params.id).maybeSingle()
    if (!mes) return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 })

    const materiaDelMes = (mes as { materia_id: string | null }).materia_id
    // `meses_contenido.materia_id` es NULLABLE. Un examen sin materia nace
    // invisible: no lo lista la vista de la materia ni lo ve `cerrar-mes`, que
    // busca las evaluaciones POR materia. Mejor rechazarlo que crear basura.
    if (!materiaDelMes) {
      return NextResponse.json(
        { error: 'Ese mes no pertenece a ninguna materia, así que el examen quedaría suelto.' },
        { status: 409 })
    }

    const validacion = validarEvaluacion(await request.json(), { crear: true })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const { data: fila, error } = await admin
      .from('evaluaciones')
      .insert({ ...validacion.datos, mes_id: params.id, materia_id: materiaDelMes })
      .select(COLUMNAS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ evaluacion: fila })
  } catch (err) {
    console.error('[POST /api/admin/meses/[id]/evaluaciones]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
