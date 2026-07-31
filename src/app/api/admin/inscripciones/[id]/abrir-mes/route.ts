import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorDeRpcCurso } from '@/lib/cursos/inscripciones'

// ─── POST /api/admin/inscripciones/[id]/abrir-mes ────────────────────────────
// Abre un mes de una inscripción a curso: +1 en curso_inscripciones.meses_desbloqueados.
// El gate de B2 reacciona solo — aquí no se toca ninguna regla de acceso.
//
// ⚠️ SE LLAMA CON LA SESIÓN DEL USUARIO, NO con el cliente admin. La función
// curso_abrir_mes() es SECURITY DEFINER y comprueba es_admin() adentro, y
// es_admin() se apoya en auth.uid(): con service_role ese uid es NULL y la
// función rechazaría al propio administrador. La escritura la puede hacer igual
// porque, al ser DEFINER, corre como el dueño y la RLS no la frena.
//
// body { meses_esperados?: number } — el valor que el admin tenía a la vista.
// Es el candado contra el doble clic: si alguien ya lo movió, la función
// devuelve 40001 en vez de incrementar dos veces.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const esperados =
      typeof body?.meses_esperados === 'number' && Number.isInteger(body.meses_esperados)
        ? body.meses_esperados
        : null

    const { data, error } = await supabase.rpc('curso_abrir_mes', {
      p_inscripcion_id: params.id,
      p_meses_esperados: esperados,
    })

    if (error) {
      const { status, mensaje } = errorDeRpcCurso(error)
      return NextResponse.json({ error: mensaje }, { status })
    }

    const fila = Array.isArray(data) ? data[0] : data
    return NextResponse.json({
      ok: true,
      meses_desbloqueados: fila?.meses_desbloqueados ?? null,
      tope: fila?.tope ?? null,
    })
  } catch (err) {
    console.error('[POST /api/admin/inscripciones/[id]/abrir-mes]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
