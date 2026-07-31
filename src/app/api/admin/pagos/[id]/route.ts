import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

/**
 * DELETE /api/admin/pagos/[id]
 * Elimina un pago mal capturado (hard delete, solo admin).
 */
export async function DELETE(
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

    const { data: pago, error: pagoErr } = await admin
      .from('pagos')
      .select('id, curso_inscripcion_id, mes_desbloqueado, concepto')
      .eq('id', params.id)
      .single()
    if (pagoErr || !pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const p = pago as { curso_inscripcion_id: string | null; mes_desbloqueado: number | null }

    // ⚠️ Borrar el pago NO cierra el mes, y es deliberado: los meses solo se
    // mueven por "Abrir mes" / "Cerrar mes", que aplican tope, estado y
    // protección de doble clic. Meter una segunda puerta aquí sería justo el
    // patrón que B3 evitó.
    //
    // Pero el admin tiene que ENTERARSE: si no, borra el pago creyendo que
    // deshace la operación completa y el alumno conserva el acceso que compró
    // con un pago que ya no existe.
    const abrioMes = Boolean(p.curso_inscripcion_id) && p.mes_desbloqueado !== null

    const { error } = await admin
      .from('pagos')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      id: params.id,
      curso_inscripcion_id: p.curso_inscripcion_id,
      mes_afectado: p.mes_desbloqueado,
      aviso: abrioMes
        ? `Se borró el pago, pero el mes ${p.mes_desbloqueado} de esa inscripción SIGUE ABIERTO: el alumno conserva el acceso. Si querías revocarlo, usa "Cerrar mes" en la inscripción.`
        : null,
    })
  } catch (err) {
    console.error('[DELETE /api/admin/pagos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
