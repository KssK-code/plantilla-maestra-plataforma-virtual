import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { hayOfertasIngreso } from '@/lib/cursos/oferta'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    // Usar admin client para bypass RLS
    const admin = createAdminClient()

    // Columnas reales del schema IVS (sin 'codigo' ni 'color_hex')
    const { data: materias, error: matErr } = await admin
      .from('materias')
      .select('id, nombre, descripcion, nivel, orden, color, activa')
      .order('orden')

    if (matErr) return NextResponse.json({ error: matErr.message }, { status: 500 })

    type MateriaRow = {
      id: string; nombre: string; descripcion: string | null
      nivel: string; orden: number | null; color: string | null; activa: boolean
    }

    let totalMaterias = 0, totalSemanas = 0, totalEvaluaciones = 0

    const materiasConStats = await Promise.all(
      ((materias ?? []) as unknown as MateriaRow[]).map(async (mat) => {
        // Join correcto IVS: materias → meses_contenido → semanas
        const { data: mesesIds } = await admin
          .from('meses_contenido')
          .select('id')
          .eq('materia_id', mat.id)

        const mesIds = (mesesIds ?? []).map(m => m.id)

        let semCount = 0
        if (mesIds.length > 0) {
          const { count } = await admin
            .from('semanas')
            .select('*', { count: 'exact', head: true })
            .in('mes_id', mesIds)
          semCount = count ?? 0
        }

        const { count: evCount } = await admin
          .from('evaluaciones')
          .select('*', { count: 'exact', head: true })
          .eq('materia_id', mat.id)

        totalMaterias++
        totalSemanas    += semCount
        totalEvaluaciones += evCount ?? 0

        return {
          id:               mat.id,
          codigo:           '',                      // IVS no tiene 'codigo' — vacío para compatibilidad UI
          nombre:           mat.nombre,
          color_hex:        mat.color ?? '#1565C0',  // IVS usa 'color', mapeamos a color_hex para el frontend
          descripcion:      mat.descripcion ?? '',
          nivel:            mat.nivel,
          num_semanas:      semCount,
          num_evaluaciones: evCount ?? 0,
        }
      })
    )

    // Agrupar por nivel para el acordeón del frontend (reemplaza agrupación por mes)
    const NIVELES = ['demo', 'preparatoria', 'secundaria']
    const meses = NIVELES
      .map((nivel, i) => {
        const materiasNivel = materiasConStats.filter(m => m.nivel === nivel)
        if (materiasNivel.length === 0) return null
        return {
          id:       `nivel-${nivel}`,
          numero:   i + 1,
          titulo:   nivel.charAt(0).toUpperCase() + nivel.slice(1),
          materias: materiasNivel,
        }
      })
      .filter(Boolean) as { id: string; numero: number; titulo: string; materias: typeof materiasConStats }[]

    // Cursos de Ingreso. Viven en otra jerarquia (cursos -> curso_modulos ->
    // curso_lecciones) y `cursos` no tiene columna `nivel`, asi que no entran
    // por la whitelist NIVELES: necesitan su propio grupo. Va detras de
    // hayOfertasIngreso() para que los clientes sin el add-on no vean un
    // acordeon vacio.
    if (hayOfertasIngreso()) {
      const { data: cursos } = await admin
        .from('cursos')
        .select('id, nombre, descripcion, estado, orden')
        .order('orden')

      const cursosConStats = await Promise.all(
        ((cursos ?? []) as { id: string; nombre: string; descripcion: string | null }[])
          .map(async (curso) => {
            const { data: modulos } = await admin
              .from('curso_modulos').select('id').eq('curso_id', curso.id)
            const modIds = (modulos ?? []).map(m => m.id)

            let lecCount = 0
            if (modIds.length > 0) {
              const { count } = await admin
                .from('curso_lecciones')
                .select('*', { count: 'exact', head: true })
                .in('modulo_id', modIds)
              lecCount = count ?? 0
            }

            const { count: pregCount } = await admin
              .from('curso_examen_preguntas')
              .select('*', { count: 'exact', head: true })
              .eq('curso_id', curso.id)

            totalMaterias++
            totalSemanas      += lecCount
            totalEvaluaciones += pregCount ?? 0

            return {
              id:               curso.id,
              codigo:           '',
              nombre:           curso.nombre,
              color_hex:        '#8B5CF6',
              descripcion:      curso.descripcion ?? '',
              nivel:            'curso_ingreso',
              num_semanas:      lecCount,
              num_evaluaciones: pregCount ?? 0,
              // Discriminador: la UI navega al editor de cursos, no al de materias.
              tipoContenido:    'curso' as const,
            }
          })
      )

      if (cursosConStats.length > 0) {
        meses.push({
          id:       'cursos-ingreso',
          numero:   meses.length + 1,
          titulo:   'Cursos de Ingreso',
          materias: cursosConStats as unknown as typeof materiasConStats,
        })
      }
    }

    return NextResponse.json({
      meses,
      stats: { totalMaterias, totalSemanas, totalEvaluaciones },
    })
  } catch (err) {
    console.error('[GET /api/admin/contenido]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
