import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

// ─── DELETE /api/admin/cursos/[id]/inscripciones/[alumnoId] — quitar alumno ──
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; alumnoId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // ⚠️ Una inscripción CON diploma emitido NO se borra (B4: la FK de
    // curso_constancias es ON DELETE RESTRICT). El registro de folios es el libro
    // contable de diplomas: con CASCADE, este mismo clic evaporaba el folio con
    // el que administración verifica un documento que el egresado tiene impreso
    // en la mano.
    //
    // Se comprueba ANTES para dar un mensaje que diga qué hacer, en vez de dejar
    // salir el 23503 crudo de Postgres.
    const { data: insc } = await admin
      .from('curso_inscripciones')
      .select('id')
      .eq('curso_id', params.id)
      .eq('alumno_id', params.alumnoId)
      .maybeSingle()

    if (!insc) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

    const { data: constancia } = await admin
      .from('curso_constancias')
      .select('folio')
      .eq('inscripcion_id', (insc as { id: string }).id)
      .maybeSingle()

    if (constancia) {
      return NextResponse.json({
        error:
          `Esta inscripción tiene un diploma emitido (folio ${(constancia as { folio: string }).folio}) y no puede borrarse. ` +
          'Cancélala (estado = cancelada) para darla de baja conservando el registro.',
      }, { status: 409 })
    }

    const { error, count } = await admin
      .from('curso_inscripciones')
      .delete({ count: 'exact' })
      .eq('curso_id', params.id)
      .eq('alumno_id', params.alumnoId)

    // Red de seguridad: si entre la comprobación y el DELETE se emitiera una
    // constancia, Postgres devuelve 23503 y se traduce igual, sin 500 crudo.
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Esta inscripción tiene un diploma emitido y no puede borrarse. Cancélala (estado = cancelada) para darla de baja conservando el registro.',
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!count) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/cursos/[id]/inscripciones/[alumnoId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
