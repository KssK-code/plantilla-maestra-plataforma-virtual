import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { semanaId } = params

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { id: alumnoId } = alumnoData as { id: string }

    // Obtener nota del alumno para esta semana
    const { data: nota } = await supabase
      .from('notas_alumno')
      .select('contenido, updated_at')
      .eq('alumno_id', alumnoId)
      .eq('semana_id', semanaId)
      .single()

    return NextResponse.json({
      contenido: nota?.contenido ?? '',
      updated_at: nota?.updated_at ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { semanaId } = params
    const body = await request.json()
    const { contenido } = body as { contenido: string }

    if (contenido === undefined || contenido === null) {
      return NextResponse.json({ error: 'contenido requerido' }, { status: 400 })
    }

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { id: alumnoId } = alumnoData as { id: string }

    // Upsert nota
    const { error } = await supabase
      .from('notas_alumno')
      .upsert(
        {
          alumno_id: alumnoId,
          semana_id: semanaId,
          contenido,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'alumno_id,semana_id', ignoreDuplicates: false }
      )

    if (error) return NextResponse.json({ error: 'Error al guardar nota' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
