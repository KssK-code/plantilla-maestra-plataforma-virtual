import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarCorreccionPlan, mensajeCandado } from '@/lib/corregir-plan'

// Corrige la CAPTURA del plan de estudio (nivel/carrera/modalidad) de un
// alumno que aún no comienza. La UI esconde el botón cuando algún candado
// bloquea, pero la decisión real vive en public.corregir_plan_estudio():
// re-evalúa los seis candados DENTRO de la transacción del UPDATE, borra las
// notas del alumno (con conteo) y deja el evento en alumno_plan_eventos.
// Nunca confiar en que la UI escondió el botón.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json().catch(() => null)
    const validacion = validarCorreccionPlan(body)
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 400 })
    }
    const { nivel, carrera, modalidad } = validacion.plan

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('corregir_plan_estudio', {
      p_alumno:    params.id,
      p_nivel:     nivel,
      p_carrera:   carrera,
      p_modalidad: modalidad,
      // El actor va como parámetro: la RPC corre con service_role, donde
      // auth.uid() es NULL (Bug 83).
      p_actor:     user.id,
    })

    if (error) {
      // Cliente sin la migración 20260817120000: la función no existe.
      // Degrada con un mensaje accionable en vez de un 500 mudo.
      if (error.code === 'PGRST202' || /corregir_plan_estudio/.test(error.message)) {
        console.error('[corregir-plan] falta la migración 20260817120000_corregir_plan_estudio:', error.message)
        return NextResponse.json(
          { error: 'La corrección de plan no está habilitada en esta plataforma (falta la migración).' },
          { status: 501 },
        )
      }
      console.error('[corregir-plan] rpc error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const resultado = data as { ok: boolean; candado?: string; matricula?: string; notas_borradas?: number } | null
    if (!resultado) {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!resultado.ok) {
      if (resultado.candado === 'no_existe') {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
      }
      return NextResponse.json(
        { error: mensajeCandado(resultado.candado ?? ''), candado: resultado.candado },
        { status: 409 },
      )
    }

    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[POST /api/admin/alumnos/[id]/corregir-plan]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
