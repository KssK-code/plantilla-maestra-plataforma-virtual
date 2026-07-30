import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { CONFIG } from '@/lib/config'
import { errorDeRpcCurso } from '@/lib/cursos/inscripciones'

// ─── POST /api/admin/inscripciones/[id]/constancia ───────────────────────────
// Re-emisión MANUAL, para el borde en que la emisión automática del `enviar`
// falló (un error de red al final del flujo, por ejemplo).
//
// NUNCA crea una segunda: si ya existe, la función devuelve la existente con
// ya_existia = true y no quema folio. No hay forma de duplicar un diploma desde
// aquí, ni queriendo.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // El mejor resultado del alumno en ese curso: es la calificación que se
    // congela como snapshot en el diploma.
    const { data: insc } = await admin
      .from('curso_inscripciones')
      .select('curso_id, alumno_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!insc) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

    const i = insc as { curso_id: string; alumno_id: string }

    const { data: mejor } = await admin
      .from('curso_examen_resultados')
      .select('porcentaje')
      .eq('curso_id', i.curso_id)
      .eq('alumno_id', i.alumno_id)
      .order('porcentaje', { ascending: false })
      .limit(1)

    const porcentaje = mejor?.[0]?.porcentaje ?? null

    const { data, error } = await admin.rpc('curso_emitir_constancia', {
      p_inscripcion_id: params.id,
      p_prefijo: CONFIG.diploma.folioPrefijo,
      p_calificacion: porcentaje,
    })

    if (error) {
      const { status, mensaje } = errorDeRpcCurso(error)
      return NextResponse.json({ error: mensaje }, { status })
    }

    const fila = Array.isArray(data) ? data[0] : data
    return NextResponse.json({
      ok: true,
      folio: fila?.folio ?? null,
      emitido_en: fila?.emitido_en ?? null,
      ya_existia: Boolean(fila?.ya_existia),
      aviso: fila?.ya_existia
        ? 'Esta inscripción ya tenía constancia. Se devolvió la existente; no se emitió una segunda.'
        : null,
    })
  } catch (err) {
    console.error('[POST /api/admin/inscripciones/[id]/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
