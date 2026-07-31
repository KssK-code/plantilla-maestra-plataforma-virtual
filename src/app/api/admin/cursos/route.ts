import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { signedUrl } from '@/lib/cursos/storage'
import { validarParametrosCurso } from '@/lib/cursos/parametros'
import type { Curso, CursoListItem } from '@/types/cursos'

// ─── GET /api/admin/cursos — lista con contadores y portada firmada ──────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { data: cursos, error } = await admin
      .from('cursos')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items: CursoListItem[] = await Promise.all(
      ((cursos ?? []) as Curso[]).map(async (curso) => {
        const { data: modulos } = await admin
          .from('curso_modulos')
          .select('id')
          .eq('curso_id', curso.id)
        const moduloIds = (modulos ?? []).map(m => m.id)

        let numLecciones = 0
        if (moduloIds.length > 0) {
          const { count } = await admin
            .from('curso_lecciones')
            .select('*', { count: 'exact', head: true })
            .in('modulo_id', moduloIds)
          numLecciones = count ?? 0
        }

        const { count: numAlumnos } = await admin
          .from('curso_inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('curso_id', curso.id)

        return {
          ...curso,
          portadaUrl: await signedUrl(admin, curso.portada_path),
          numModulos: moduloIds.length,
          numLecciones,
          numAlumnos: numAlumnos ?? 0,
        }
      })
    )

    return NextResponse.json(items)
  } catch (err) {
    console.error('[GET /api/admin/cursos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── POST /api/admin/cursos — crear curso (nace en borrador) ─────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json()
    const nombre = (body.nombre as string | undefined)?.trim()
    const descripcion = (body.descripcion as string | undefined)?.trim() || null
    const tipo = body.tipo as string | undefined

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    if (tipo !== 'curso' && tipo !== 'diplomado') {
      return NextResponse.json({ error: "tipo debe ser 'curso' o 'diplomado'" }, { status: 400 })
    }

    // B7/T3 — parámetros comerciales opcionales al crear. Los que no vengan se
    // quedan con el DEFAULT de la tabla (precios 0, modulos_por_mes 2,
    // intentos_permitidos 3), que es justo lo que pasaba antes de B7: el alta
    // desde el formulario "Nuevo curso" no los manda y no cambia de conducta.
    const params = validarParametrosCurso(body as Record<string, unknown>)
    if (!params.ok) return NextResponse.json({ error: params.error }, { status: 400 })

    const admin = createAdminClient()
    const { data: curso, error } = await admin
      .from('cursos')
      .insert({ nombre, descripcion, tipo, estado: 'borrador', ...params.updates })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(curso, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/cursos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
