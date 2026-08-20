import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { MATERIAL_MAX_BYTES, MATERIAL_MIMES, validarMaterial } from '@/lib/archivos-comunes'
import {
  BUCKET_MATERIAS, MATERIALES_MAX_POR_SEMANA,
  materialPathSemana, nombreVisible, validarRutaMaterial,
} from '@/lib/materiales-semana'

async function authAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const denied = await verifyAdmin(supabase, user.id)
  if (denied) return { denied }
  return { denied: null }
}

/** materia a la que pertenece la semana. null si la semana no existe. */
async function materiaDeSemana(
  admin: ReturnType<typeof createAdminClient>,
  semanaId: string,
): Promise<string | null> {
  const { data: semana } = await admin
    .from('semanas').select('mes_id').eq('id', semanaId).maybeSingle()
  const mesId = (semana as { mes_id: string | null } | null)?.mes_id
  if (!mesId) return null
  const { data: mes } = await admin
    .from('meses_contenido').select('materia_id').eq('id', mesId).maybeSingle()
  return (mes as { materia_id: string | null } | null)?.materia_id ?? null
}

/** Ventana de gracia antes de considerar huérfano un objeto sin fila. Sin ella,
 *  barrer mataría una subida que está EN VUELO: el objeto ya está en storage y
 *  su fila aún no existe hasta que llega el `confirm`. */
const GRACIA_HUERFANO_MS = 60 * 60 * 1000 // 1 hora

/**
 * Borra los objetos de la carpeta de la semana que ninguna fila referencia.
 *
 * Cada `upload-url` que el navegador sube y NO confirma —se cae la red, el
 * admin cierra la pestaña, el `confirm` rechaza la ruta— deja un objeto que
 * nada recoge. Y el tope por semana cuenta FILAS, no objetos, así que tampoco
 * los frena: un admin con mala conexión los acumula sin límite.
 *
 * Se barre al pedir una URL de subida, que es justo cuando ya hay que listar la
 * carpeta de todos modos. Nunca falla la operación principal: si el barrido no
 * puede, se registra y se sigue.
 */
async function limpiarHuerfanos(
  admin: ReturnType<typeof createAdminClient>,
  materiaId: string,
  semanaId: string,
): Promise<void> {
  try {
    const carpeta = `${materiaId}/${semanaId}`
    const { data: entries } = await admin.storage.from(BUCKET_MATERIAS).list(carpeta, { limit: 1000 })
    const objetos = (entries ?? []).filter(e => e.id)
    if (objetos.length === 0) return

    const { data: filas } = await admin
      .from('semana_materiales').select('path').eq('semana_id', semanaId)
    const referenciados = new Set(((filas ?? []) as { path: string }[]).map(f => f.path))

    const limite = Date.now() - GRACIA_HUERFANO_MS
    const huerfanos = objetos
      .filter(e => {
        if (referenciados.has(`${carpeta}/${e.name}`)) return false
        // Sin fecha no se arriesga: podría ser una subida en vuelo.
        const creado = e.created_at ? Date.parse(e.created_at) : NaN
        return Number.isFinite(creado) && creado < limite
      })
      .map(e => `${carpeta}/${e.name}`)

    if (huerfanos.length > 0) {
      await admin.storage.from(BUCKET_MATERIAS).remove(huerfanos)
    }
  } catch (err) {
    console.error('[materiales] no se pudo barrer huérfanos:', err)
  }
}

export async function GET(_r: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('semana_materiales')
      .select('id, nombre, tamano_bytes, orden, created_at')
      .eq('semana_id', params.id)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ materiales: data ?? [] })
  } catch (err) {
    console.error('[GET /api/admin/semanas/[id]/materiales]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST — dos acciones, mismo patrón que el material de Cursos:
//   {action:'upload-url', filename, size, type} → {path, token}
//   {action:'confirm', path, filename, size}    → inserta la fila
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { denied } = await authAdmin()
    if (denied) return denied

    const admin = createAdminClient()
    const materiaId = await materiaDeSemana(admin, params.id)
    if (!materiaId) return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })

    const body = await request.json()

    if (body.action === 'upload-url') {
      const filename = String(body.filename ?? '')
      const size = Number(body.size ?? 0)
      const type = String(body.type ?? '')

      const valid = validarMaterial({ name: filename, size, type })
      if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 })

      // El tope se comprueba ANTES de dar la URL de subida: si no, el archivo
      // ya está en el bucket cuando se rechaza y queda huérfano.
      const { count } = await admin
        .from('semana_materiales')
        .select('*', { count: 'exact', head: true })
        .eq('semana_id', params.id)
      if ((count ?? 0) >= MATERIALES_MAX_POR_SEMANA) {
        return NextResponse.json(
          { error: `Esta semana ya tiene ${MATERIALES_MAX_POR_SEMANA} materiales. Quita alguno antes de subir otro.` },
          { status: 400 },
        )
      }

      await limpiarHuerfanos(admin, materiaId, params.id)

      const path = materialPathSemana(materiaId, params.id, filename, Date.now())
      const { data, error } = await admin.storage.from(BUCKET_MATERIAS).createSignedUploadUrl(path)
      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'No se pudo crear la URL de subida' }, { status: 500 })
      }
      return NextResponse.json({ path: data.path, token: data.token })
    }

    if (body.action === 'confirm') {
      const path = String(body.path ?? '')
      const ruta = validarRutaMaterial(path, materiaId, params.id)
      if (!ruta.ok) return NextResponse.json({ error: ruta.error }, { status: 400 })

      // Verificar el objeto REALMENTE subido, no lo que dice el cliente.
      const carpeta = `${materiaId}/${params.id}`
      const nombreEnStorage = path.slice(carpeta.length + 1)
      const { data: entries } = await admin.storage.from(BUCKET_MATERIAS).list(carpeta, { limit: 1000 })
      const objeto = (entries ?? []).find(e => e.name === nombreEnStorage && e.id)
      if (!objeto) {
        return NextResponse.json({ error: 'El archivo no se subió correctamente, reintenta' }, { status: 400 })
      }

      const meta = objeto.metadata as { size?: number; mimetype?: string } | null
      const mimeOk = !meta?.mimetype || (MATERIAL_MIMES as readonly string[]).includes(meta.mimetype)
      const sizeOk = !meta?.size || meta.size <= MATERIAL_MAX_BYTES
      if (!mimeOk || !sizeOk) {
        await admin.storage.from(BUCKET_MATERIAS).remove([path])
        return NextResponse.json({ error: 'El archivo subido no es un PDF válido (≤10MB)' }, { status: 400 })
      }

      // `orden` explícito desde el primer archivo. Dejarlo NULL funciona de
      // rebote —el desempate por created_at acaba gobernando— pero deja la
      // columna inerte, y en este proyecto ya hubo un bug de posición por un
      // `orden` NULL en la ventana de Cursos. F4 solo tendrá que reescribirlo.
      const { data: ultimo } = await admin
        .from('semana_materiales')
        .select('orden')
        .eq('semana_id', params.id)
        .order('orden', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      const siguienteOrden = ((ultimo as { orden: number | null } | null)?.orden ?? -1) + 1

      const { data: fila, error: dbError } = await admin
        .from('semana_materiales')
        .insert({
          semana_id: params.id,
          nombre: nombreVisible(String(body.filename ?? nombreEnStorage)),
          path,
          tamano_bytes: meta?.size ?? null,
          orden: siguienteOrden,
        })
        .select('id, nombre, tamano_bytes, orden, created_at')
        .single()

      if (dbError) {
        // La fila es la que hace visible el archivo: sin ella, el objeto sería
        // basura invisible en el bucket. Se limpia.
        await admin.storage.from(BUCKET_MATERIAS).remove([path])
        return NextResponse.json({ error: dbError.message }, { status: 500 })
      }

      return NextResponse.json({ material: fila })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/admin/semanas/[id]/materiales]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
