import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { materiaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { materiaId } = params

    const { data: terminos } = await supabase
      .from('glosario_materia')
      .select('id, termino, definicion')
      .eq('materia_id', materiaId)
      .order('termino')

    return NextResponse.json({ terminos: terminos ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
