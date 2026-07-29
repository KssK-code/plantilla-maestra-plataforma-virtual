import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { esLetra } from '@/lib/cursos/examen'
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

// ─── PATCH /api/admin/cursos/[id]/examen/preguntas/[preguntaId] ──────────────
// Edición parcial: solo se tocan los campos presentes en el body.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; preguntaId: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const parche: Record<string, unknown> = {}

    for (const campo of ['enunciado', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'] as const) {
      if (campo in body) {
        const v = body[campo]
        if (typeof v !== 'string' || !v.trim()) {
          return NextResponse.json({ error: `"${campo}" no puede quedar vacío` }, { status: 400 })
        }
        parche[campo] = v.trim()
      }
    }
    if ('respuesta_correcta' in body) {
      if (!esLetra(body.respuesta_correcta)) {
        return NextResponse.json({ error: 'La respuesta correcta debe ser a, b, c o d' }, { status: 400 })
      }
      parche.respuesta_correcta = body.respuesta_correcta
    }
    // tema y explicacion sí admiten vaciarse: se guardan como NULL.
    for (const campo of ['tema', 'explicacion'] as const) {
      if (campo in body) {
        const v = body[campo]
        parche[campo] = typeof v === 'string' && v.trim() ? v.trim() : null
      }
    }
    if ('orden' in body && Number.isInteger(body.orden)) parche.orden = body.orden

    if (Object.keys(parche).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const admin = createAdminClient()
    // Se filtra también por curso_id: una pregunta de otro curso no se toca
    // desde esta URL aunque el id exista.
    const { data, error } = await admin
      .from('curso_examen_preguntas')
      .update(parche)
      .eq('id', params.preguntaId)
      .eq('curso_id', params.id)
      .select(CAMPOS)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Pregunta no encontrada en este curso' }, { status: 404 })
    return NextResponse.json({ pregunta: data as PreguntaExamen })
  } catch (err) {
    console.error('[PATCH /api/admin/cursos/[id]/examen/preguntas/[preguntaId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/cursos/[id]/examen/preguntas/[preguntaId] ─────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; preguntaId: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('curso_examen_preguntas')
      .delete()
      .eq('id', params.preguntaId)
      .eq('curso_id', params.id)
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Pregunta no encontrada en este curso' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/cursos/[id]/examen/preguntas/[preguntaId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
