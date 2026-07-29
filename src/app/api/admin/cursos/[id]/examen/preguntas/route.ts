import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarPregunta } from '@/lib/cursos/examen'
import type { PreguntaExamen } from '@/types/cursos-examen'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

const CAMPOS = 'id, curso_id, orden, tema, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion'

// ─── GET /api/admin/cursos/[id]/examen/preguntas ─────────────────────────────
// Listado COMPLETO para el editor (aquí sí van clave y explicación: es admin).
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('curso_examen_preguntas')
      .select(CAMPOS)
      .eq('curso_id', params.id)
      .order('orden', { ascending: true })
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ preguntas: (data ?? []) as PreguntaExamen[] })
  } catch (err) {
    console.error('[GET /api/admin/cursos/[id]/examen/preguntas]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── POST /api/admin/cursos/[id]/examen/preguntas — alta ─────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json().catch(() => ({}))
    const invalido = validarPregunta(body)
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 })

    const admin = createAdminClient()

    // Si no mandan orden, va al final: se evita que todas caigan en 0.
    let orden = Number.isInteger(body.orden) ? (body.orden as number) : null
    if (orden === null) {
      const { data: ultima } = await admin
        .from('curso_examen_preguntas')
        .select('orden')
        .eq('curso_id', params.id)
        .order('orden', { ascending: false })
        .limit(1)
      orden = (ultima?.[0]?.orden ?? 0) + 1
    }

    const { data, error } = await admin
      .from('curso_examen_preguntas')
      .insert({
        curso_id: params.id,
        orden,
        tema: typeof body.tema === 'string' && body.tema.trim() ? body.tema.trim() : null,
        enunciado: (body.enunciado as string).trim(),
        opcion_a: (body.opcion_a as string).trim(),
        opcion_b: (body.opcion_b as string).trim(),
        opcion_c: (body.opcion_c as string).trim(),
        opcion_d: (body.opcion_d as string).trim(),
        respuesta_correcta: body.respuesta_correcta,
        explicacion: typeof body.explicacion === 'string' && body.explicacion.trim() ? body.explicacion.trim() : null,
      })
      .select(CAMPOS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pregunta: data as PreguntaExamen }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/cursos/[id]/examen/preguntas]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
