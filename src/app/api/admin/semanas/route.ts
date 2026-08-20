import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarSemana } from '@/lib/estructura-contenido'

// Se devuelve la fila ENTERA, `activa` incluida: la pantalla la pinta sin tener
// que volver a pedir el árbol de contenido.
const COLUMNAS =
  'id, mes_id, numero_semana, titulo, descripcion, contenido, video_url, video_url_2, video_url_3, tiempo_estimado_minutos, activa, created_at'

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

    // `mes_id` se lee APARTE y se comprueba contra la base, igual que
    // `materiaDeSemana` en F2: NO entra por la whitelist de `validarSemana`,
    // que solo mira el contenido. Un padre que se acepta a ciegas cuelga la
    // semana de cualquier mes, o de ninguno.
    const { mes_id: mesId, ...resto } = body as Record<string, unknown>
    if (typeof mesId !== 'string' || !mesId.trim()) {
      return NextResponse.json({ error: 'mes_id es requerido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: mes } = await admin
      .from('meses_contenido').select('id').eq('id', mesId).maybeSingle()
    if (!mes) return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 })

    const validacion = validarSemana(resto, { crear: true })
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    // Sin número explícito, va al final del mes. Se calcula DENTRO del mes: el
    // alumno ve las semanas ordenadas por `numero_semana` y un hueco o un
    // empate le descoloca el temario.
    let numero = validacion.datos.numero_semana
    if (numero === undefined) {
      const { data: ultima } = await admin
        .from('semanas')
        .select('numero_semana')
        .eq('mes_id', mesId)
        .order('numero_semana', { ascending: false })
        .limit(1)
        .maybeSingle()
      numero = ((ultima as { numero_semana: number } | null)?.numero_semana ?? 0) + 1
    }

    const { data: fila, error } = await admin
      .from('semanas')
      .insert({ ...validacion.datos, numero_semana: numero, mes_id: mesId })
      .select(COLUMNAS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ semana: fila })
  } catch (err) {
    console.error('[POST /api/admin/semanas]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
