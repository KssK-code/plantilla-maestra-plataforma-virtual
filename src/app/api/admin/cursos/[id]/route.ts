import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { removeFolder, signedUrl } from '@/lib/cursos/storage'
import { validarParametrosCurso } from '@/lib/cursos/parametros'
import { purgarCatalogoPublico } from '@/lib/cursos/purga'
import type { Curso, CursoDetalle, CursoInscrito, CursoLeccion, CursoModulo } from '@/types/cursos'

type LeccionRow = Omit<CursoLeccion, 'materialUrl'>
type ModuloRow = { id: string; curso_id: string; nombre: string; orden: number }

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

// ─── GET /api/admin/cursos/[id] — detalle completo para el editor ────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()

    const { data: curso, error } = await admin
      .from('cursos')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error || !curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

    // Módulos ordenados
    const { data: modulosRaw } = await admin
      .from('curso_modulos')
      .select('id, curso_id, nombre, orden')
      .eq('curso_id', params.id)
      .order('orden', { ascending: true })
      .order('id', { ascending: true })

    const moduloIds = ((modulosRaw ?? []) as ModuloRow[]).map(m => m.id)

    // Lecciones de todos los módulos, con URL firmada del material
    let leccionesRaw: LeccionRow[] = []
    if (moduloIds.length > 0) {
      const { data } = await admin
        .from('curso_lecciones')
        .select('id, modulo_id, titulo, video_url, contenido_texto, material_path, orden')
        .in('modulo_id', moduloIds)
        .order('orden', { ascending: true })
        .order('id', { ascending: true })
      leccionesRaw = (data ?? []) as LeccionRow[]
    }

    const lecciones: CursoLeccion[] = await Promise.all(
      leccionesRaw.map(async l => ({
        ...l,
        materialUrl: await signedUrl(admin, l.material_path),
      }))
    )

    const modulos: CursoModulo[] = ((modulosRaw ?? []) as ModuloRow[]).map(m => ({
      ...m,
      lecciones: lecciones.filter(l => l.modulo_id === m.id),
    }))

    // Inscritos con datos del usuario (alumnos.id = usuarios.id)
    const { data: inscripciones } = await admin
      .from('curso_inscripciones')
      .select('id, alumno_id, created_at, meses_desbloqueados, estado, fecha_inscripcion, fecha_vencimiento')
      .eq('curso_id', params.id)
      .order('created_at', { ascending: false })

    const alumnoIds = (inscripciones ?? []).map(i => i.alumno_id)
    let inscritos: CursoInscrito[] = []
    if (alumnoIds.length > 0) {
      const [{ data: usuarios }, { data: alumnos }] = await Promise.all([
        admin.from('usuarios').select('id, nombre, apellidos, email').in('id', alumnoIds),
        admin.from('alumnos').select('id, matricula, activo').in('id', alumnoIds),
      ])
      const uMap = new Map((usuarios ?? []).map(u => [u.id, u]))
      const aMap = new Map((alumnos ?? []).map(a => [a.id, a]))
      inscritos = (inscripciones ?? []).map(i => {
        const u = uMap.get(i.alumno_id) as { nombre?: string; apellidos?: string; email?: string } | undefined
        const a = aMap.get(i.alumno_id) as { matricula?: string; activo?: boolean } | undefined
        const row = i as unknown as {
          id: string; alumno_id: string; created_at: string
          meses_desbloqueados: number | null; estado: string | null
          fecha_inscripcion: string | null; fecha_vencimiento: string | null
        }
        return {
          inscripcion_id: row.id,
          alumno_id: i.alumno_id,
          created_at: i.created_at,
          nombre: [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || '—',
          email: u?.email ?? '—',
          matricula: a?.matricula ?? null,
          activo: a?.activo ?? false,
          meses_desbloqueados: row.meses_desbloqueados ?? 0,
          estado: row.estado ?? 'activa',
          fecha_inscripcion: row.fecha_inscripcion,
          fecha_vencimiento: row.fecha_vencimiento,
        }
      })
    }

    const detalle: CursoDetalle = {
      curso: { ...(curso as Curso), portadaUrl: await signedUrl(admin, (curso as Curso).portada_path) },
      modulos,
      inscritos,
    }
    return NextResponse.json(detalle)
  } catch (err) {
    console.error('[GET /api/admin/cursos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/cursos/[id] — actualizar datos / estado ────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.nombre !== undefined) {
      const nombre = (body.nombre as string).trim()
      if (!nombre) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      updates.nombre = nombre
    }
    if (body.descripcion !== undefined) {
      updates.descripcion = (body.descripcion as string | null)?.toString().trim() || null
    }
    if (body.tipo !== undefined) {
      if (body.tipo !== 'curso' && body.tipo !== 'diplomado') {
        return NextResponse.json({ error: "tipo debe ser 'curso' o 'diplomado'" }, { status: 400 })
      }
      updates.tipo = body.tipo
    }
    if (body.estado !== undefined) {
      if (body.estado !== 'borrador' && body.estado !== 'publicado') {
        return NextResponse.json({ error: "estado debe ser 'borrador' o 'publicado'" }, { status: 400 })
      }
      updates.estado = body.estado
    }

    // B7/T3 — parámetros comerciales y de ritmo. La validación vive en
    // src/lib/cursos/parametros.ts, compartida con el POST de creación: los
    // `min` del formulario son ayuda visual y un curl los ignora.
    // Ojo con el nombre: `params` ya es el de la ruta de Next ({ id }). Llamar
    // igual a esto lo sombreaba y `params.id` dejaba de compilar más abajo.
    const parametros = validarParametrosCurso(body as Record<string, unknown>)
    if (!parametros.ok) return NextResponse.json({ error: parametros.error }, { status: 400 })
    Object.assign(updates, parametros.updates)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }
    updates.updated_at = new Date().toISOString()

    const admin = createAdminClient()
    const { data: curso, error } = await admin
      .from('cursos')
      .update(updates)
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '22P02') return NextResponse.json({ error: 'Id de curso inválido' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

    // B8.2 — TODO lo que este PATCH puede tocar cambia lo que el público ve:
    // `estado` decide si el curso aparece, y nombre/descripcion/precios/horas/
    // duración son exactamente los campos que el catálogo pinta. Sin esta purga,
    // la landing estática seguía sirviendo el HTML del build y publicar un
    // diplomado no lo ponía a la venta hasta el siguiente deploy.
    purgarCatalogoPublico(params.id)

    return NextResponse.json(curso)
  } catch (err) {
    console.error('[PATCH /api/admin/cursos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/cursos/[id] — borrar curso + objetos del bucket ───────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()

    const { data: curso } = await admin
      .from('cursos')
      .select('id')
      .eq('id', params.id)
      .single()
    if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

    // ⚠️ El cascade de la DB borra módulos, lecciones, inscripciones y progreso —
    // PERO YA NO las constancias: desde B4, curso_constancias.inscripcion_id es
    // ON DELETE RESTRICT, así que un curso con diplomas emitidos NO se puede
    // borrar. Es deliberado: el registro de folios es el libro contable de
    // diplomas de la institución y no puede evaporarse con un clic.
    //
    // Esta ruta asumía CASCADE hasta el fondo, así que sin esta comprobación el
    // admin recibiría un 23503 crudo de Postgres sin saber qué hacer.
    const { count: constancias } = await admin
      .from('curso_constancias')
      .select('folio', { count: 'exact', head: true })
      .in(
        'inscripcion_id',
        ((await admin.from('curso_inscripciones').select('id').eq('curso_id', params.id)).data ?? [])
          .map(r => r.id as string)
      )

    if ((constancias ?? 0) > 0) {
      return NextResponse.json({
        error:
          `Este curso tiene ${constancias} diploma(s) emitido(s) y no puede borrarse: ` +
          'el registro de folios es el comprobante de esos documentos. ' +
          'Pásalo a borrador para retirarlo de circulación sin perder el historial.',
      }, { status: 409 })
    }

    const { error } = await admin.from('cursos').delete().eq('id', params.id)
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Este curso tiene diplomas emitidos y no puede borrarse. Pásalo a borrador para retirarlo de circulación.',
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Limpieza de storage: materiales ({cursoId}/...) y portadas (portadas/{cursoId}/...)
    await removeFolder(admin, params.id)
    await removeFolder(admin, `portadas/${params.id}`)

    // B8.2 — un curso publicado que se borra debe salir del catálogo sin redeploy.
    purgarCatalogoPublico(params.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/cursos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
