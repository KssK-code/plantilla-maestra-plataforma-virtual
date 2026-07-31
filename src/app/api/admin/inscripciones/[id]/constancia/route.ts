import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { CONFIG } from '@/lib/config'
import { errorDeRpcCurso } from '@/lib/cursos/inscripciones'

// ─── POST /api/admin/inscripciones/[id]/constancia ───────────────────────────
// LA emisión de la constancia. No es un respaldo de nada: desde B8.2 la emisión
// es MANUAL y este es el único camino — el admin verifica y emite a conciencia,
// porque el folio es permanente e irrepetible (decisión de producto, ver
// SOLO-CURSOS-ARQUITECTURA.md).
//
// ⚠️ LA LLAMADA VA CON LA SESIÓN, NO CON service_role. Es la trampa que B3
// documentó: `curso_emitir_constancia` registra `actor = auth.uid()` en la
// bitácora, y con service_role eso es NULL — el evento más consecuente del
// sistema (emitir un folio) quedaba sin autor. Con la sesión, el actor es el
// admin que emitió, que es además el único dato correcto posible. La función
// tiene GRANT a authenticated + guard es_admin() interno (patrón B3), así que
// la sesión del admin pasa y la de un alumno recibe 403.
//
// Los guards viven EN LA FUNCIÓN, no aquí: sin examen aprobado no hay emisión
// (422), y si la constancia ya existe se devuelve la existente sin quemar folio.
// La calificación del snapshot también la calcula la función — este endpoint ya
// no manda ninguna: no se confía del caller lo que se va a congelar (Bug 78).
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

    const { data, error } = await supabase.rpc('curso_emitir_constancia', {
      p_inscripcion_id: params.id,
      p_prefijo: CONFIG.diploma.folioPrefijo,
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
