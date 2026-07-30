import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { porcentajeProgreso } from '@/lib/cursos/progreso'
import { leccionesDeCurso, completadasDe, portadaFirmada, totalLeccionesDelCurso } from '@/lib/cursos/alumno-data'
import type { CursoCatalogoItem } from '@/types/cursos-alumno'
import type { CursoTipo } from '@/types/cursos'

// ─── GET /api/alumno/cursos — catálogo del alumno (RLS: publicados + inscrito) ─
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Cursos a los que el alumno está inscrito (RLS select propio en inscripciones)
    const { data: inscripciones } = await supabase
      .from('curso_inscripciones')
      .select('curso_id')
      .eq('alumno_id', user.id)

    const admin = createAdminClient()
    const cursoIds = (inscripciones ?? []).map(i => i.curso_id as string)
    if (cursoIds.length === 0) return NextResponse.json([])

    // De esos, la RLS "cursos: select inscritos o admin" devuelve solo los publicados
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id, nombre, descripcion, tipo, portada_path, orden, created_at')
      .in('id', cursoIds)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })

    const items: CursoCatalogoItem[] = await Promise.all(
      (cursos ?? []).map(async curso => {
        const lecciones = await leccionesDeCurso(supabase, curso.id as string)
        const leccionIds = lecciones.map(l => l.leccionId)
        const completadas = await completadasDe(supabase, user.id, leccionIds)
        // Denominador = curso completo (ver totalLeccionesDelCurso). Contar solo
        // lo visible haría que la barra del catálogo llegara al 100 % con un mes
        // pagado.
        const total = await totalLeccionesDelCurso(admin, curso.id as string)
        return {
          id: curso.id as string,
          nombre: curso.nombre as string,
          descripcion: (curso.descripcion as string | null) ?? null,
          tipo: curso.tipo as CursoTipo,
          portadaUrl: await portadaFirmada(supabase, curso.portada_path as string | null),
          totalLecciones: total,
          completadas: completadas.size,
          porcentaje: porcentajeProgreso(completadas.size, total),
        }
      })
    )

    return NextResponse.json(items)
  } catch (err) {
    console.error('[GET /api/alumno/cursos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
