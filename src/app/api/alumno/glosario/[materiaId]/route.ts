import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  cargarAlumnoAcceso,
  cargarContextoAcceso,
  tieneAccesoMateria,
} from '@/lib/acceso-materias'

export async function GET(
  _request: NextRequest,
  { params }: { params: { materiaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { materiaId } = params

    // ── Gate canon (lib/acceso-materias): solo materias accesibles ────────────
    // Sin este gate cualquier alumno autenticado leía el glosario de cualquier
    // materia, incluidas las que su ventana de pago aún no abre.
    const { data: materiaData } = await supabase
      .from('materias')
      .select('id, nombre, nivel')
      .eq('id', materiaId)
      .maybeSingle()

    if (!materiaData) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
    }
    const materia = materiaData as { id: string; nombre: string; nivel: string | null }

    const alumno = await cargarAlumnoAcceso(supabase, user.id)
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const { materias, acreditadas } = await cargarContextoAcceso(supabase, user.id, alumno)
    if (!tieneAccesoMateria(alumno, materia, materias, acreditadas).acceso) {
      return NextResponse.json({ error: 'No tienes acceso a este contenido' }, { status: 403 })
    }

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
