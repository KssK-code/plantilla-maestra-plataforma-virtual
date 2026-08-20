import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRol } from '@/lib/supabase/verify-admin'
import { cargarAlumnoAcceso, tieneAccesoSemana } from '@/lib/acceso-materias'
import { signedUrl } from '@/lib/storage-comun'
import { BUCKET_MATERIAS } from '@/lib/materiales-semana'

/**
 * Descarga de un material de semana. UNA sola ruta para admin y alumno, y por
 * tanto una sola definición de "quién puede ver esto".
 *
 * El bucket 'materias' es admin-only en RLS: el alumno NUNCA lee de él. Aquí se
 * comprueba el acceso con `tieneAccesoSemana()` —la misma función que gatea el
 * quiz— y se firma con service role.
 *
 * El módulo Cursos resolvió esto reproduciendo la regla dentro de la política
 * SQL del bucket, y esa duplicación produjo el bug de las portadas en blanco
 * SOLO para el alumno. Aquí no hay dos reglas que puedan divergir.
 *
 * Responde 302 a la URL firmada para que un <a href> normal funcione. El
 * estado va EXPLÍCITO: NextResponse.redirect() usa 307 por defecto, y para un
 * redirect con implicaciones de acceso es peor depender de un default del
 * framework que escribirlo.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: material } = await admin
      .from('semana_materiales')
      .select('id, semana_id, path, nombre')
      .eq('id', params.id)
      .maybeSingle()

    const mat = material as { id: string; semana_id: string; path: string; nombre: string } | null
    if (!mat) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

    const rol = await getUserRol(supabase, user.id)
    if (rol !== 'ADMIN' && rol !== 'SECRETARIO') {
      // Alumno: el mismo gate que el resto de su contenido.
      const alumno = await cargarAlumnoAcceso(admin, user.id)
      if (!alumno) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      const { acceso } = await tieneAccesoSemana(admin, alumno, mat.semana_id)
      if (!acceso) {
        return NextResponse.json({ error: 'No tienes acceso a este contenido' }, { status: 403 })
      }
    }

    const url = await signedUrl(admin, BUCKET_MATERIAS, mat.path)
    if (!url) return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 })

    return NextResponse.redirect(url, 302)
  } catch (err) {
    console.error('[GET /api/material/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
