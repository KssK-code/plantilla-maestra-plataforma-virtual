import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { hayOfertasIngreso } from '@/lib/cursos/oferta'
import { getCarreras } from '@/lib/licenciatura-utils'

/**
 * Trae TODAS las filas de una consulta, en páginas.
 *
 * Supabase corta cualquier select en `max-rows` (1.000 por defecto) y lo hace
 * en silencio: un cliente con 185 materias ronda las 9.000 semanas, así que un
 * select plano devolvería 1.000 y el conteo saldría corto justo en el cliente
 * que motivó dejar de hacer N+1. Se avanza por las filas REALMENTE devueltas
 * —no por el tamaño de página pedido— para que valga sea cual sea el tope del
 * proyecto, y se ordena por `id` para que la paginación no duplique ni salte.
 */
async function traerTodas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const TAM = 1000
  const filas: T[] = []
  for (let desde = 0; ;) {
    const { data } = await pagina(desde, desde + TAM - 1)
    const lote = data ?? []
    filas.push(...lote)
    if (lote.length === 0) break
    desde += lote.length
  }
  return filas
}

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
      .select('id, nombre, descripcion, nivel, orden, color, activa, carrera')
      .order('orden')

    if (matErr) return NextResponse.json({ error: matErr.message }, { status: 500 })

    type MateriaRow = {
      id: string; nombre: string; descripcion: string | null
      nivel: string; orden: number | null; color: string | null; activa: boolean
      carrera: string | null
    }

    let totalMaterias = 0, totalSemanas = 0, totalEvaluaciones = 0

    // ── Conteos por materia: TRES lecturas agregadas, no 2-3 POR MATERIA ──────
    // El Promise.all de antes hacía una consulta de meses, una de semanas y una
    // de evaluaciones por cada materia: con 185 materias (GLOBALMIND) eran unas
    // 550 consultas por carga de esta pantalla.
    //
    // Se leen las tablas enteras y se agrupa en JS a propósito: acotar con
    // .in('mes_id', [...]) obligaría a meter miles de UUID en la URL —PostgREST
    // consulta por GET— y reventaría el límite de longitud mucho antes que el
    // volumen de datos.
    //
    // Join correcto IVS: materias → meses_contenido → semanas.
    const [mesesTodos, semanasTodas, evaluacionesTodas] = await Promise.all([
      // `activa` en los DOS niveles: el número que ve el admin tiene que ser el
      // que ve el alumno, y él ya no ve lo archivado.
      traerTodas<{ id: string; materia_id: string | null }>((desde, hasta) => admin
        .from('meses_contenido').select('id, materia_id')
        .eq('activa', true).order('id').range(desde, hasta)),
      traerTodas<{ mes_id: string | null }>((desde, hasta) => admin
        .from('semanas').select('mes_id')
        .eq('activa', true).order('id').range(desde, hasta)),
      // Solo las evaluaciones ACTIVAS, igual que las semanas y los meses: el
      // numero de esta lista tiene que ser lo que el alumno ve, y el alumno ya
      // filtra `evaluaciones.activa` desde antes de F3
      // (api/alumno/materia/[id]). Sin esto, archivar un examen lo retiraba
      // para el alumno pero el admin seguia viendolo contado.
      traerTodas<{ materia_id: string | null }>((desde, hasta) => admin
        .from('evaluaciones').select('materia_id')
        .eq('activa', true).order('id').range(desde, hasta)),
    ])

    const materiaDeMes = new Map<string, string>()
    for (const m of mesesTodos) if (m.materia_id) materiaDeMes.set(m.id, m.materia_id)

    const semanasPorMateria = new Map<string, number>()
    for (const s of semanasTodas) {
      // Sin mes activo detrás no cuenta: o el mes está archivado, o no cuelga
      // de ninguna materia. En los dos casos el alumno no la ve.
      const materiaId = s.mes_id ? materiaDeMes.get(s.mes_id) : undefined
      if (!materiaId) continue
      semanasPorMateria.set(materiaId, (semanasPorMateria.get(materiaId) ?? 0) + 1)
    }

    const evalsPorMateria = new Map<string, number>()
    for (const e of evaluacionesTodas) {
      if (!e.materia_id) continue
      evalsPorMateria.set(e.materia_id, (evalsPorMateria.get(e.materia_id) ?? 0) + 1)
    }

    const materiasConStats = ((materias ?? []) as unknown as MateriaRow[]).map((mat) => {
      const semCount = semanasPorMateria.get(mat.id) ?? 0
      const evCount  = evalsPorMateria.get(mat.id)   ?? 0

      totalMaterias++
      totalSemanas    += semCount
      totalEvaluaciones += evCount

      return {
        id:               mat.id,
        codigo:           '',                      // IVS no tiene 'codigo' — vacío para compatibilidad UI
        nombre:           mat.nombre,
        color_hex:        mat.color ?? '#1565C0',  // IVS usa 'color', mapeamos a color_hex para el frontend
        descripcion:      mat.descripcion ?? '',
        nivel:            mat.nivel,
        carrera:          mat.carrera ?? null,
        num_semanas:      semCount,
        num_evaluaciones: evCount,
      }
    })

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

    // Licenciatura: un grupo POR CARRERA. 'licenciatura' no esta en NIVELES, asi
    // que sin esto las materias de licenciatura no aparecen en ningun grupo. Y
    // agruparlas todas juntas tampoco sirve: son 32 por carrera, asi que un
    // cliente con 4 carreras tendria 128 materias en un solo acordeon sin forma
    // de distinguir a cual pertenece cada una.
    for (const c of getCarreras()) {
      const materiasCarrera = materiasConStats.filter(
        m => m.nivel === 'licenciatura' && m.carrera === c.slug
      )
      if (materiasCarrera.length === 0) continue
      meses.push({
        id:       `carrera-${c.slug}`,
        numero:   meses.length + 1,
        titulo:   c.nombre,
        materias: materiasCarrera,
      })
    }

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
