/**
 * Catálogo público de diplomados.
 *
 * ⚠️ EL INVARIANTE DE ESTA CAPA, y no es negociable:
 *
 *   La RLS NO se abre para `anon`. Ni una política. B2 dejó verificado que un
 *   visitante anónimo no lee NADA de las tablas `curso_*`, y así se queda.
 *
 * El catálogo público se sirve leyendo con el cliente ADMIN **desde el
 * servidor**, con una lista EXPLÍCITA de campos. La diferencia con abrir la RLS
 * es toda: aquí el servidor decide qué sale, campo por campo; abriendo la
 * política, el navegador podría pedir lo que quisiera a PostgREST.
 *
 * Nunca `select('*')`. Los campos prohibidos —contenido de lecciones, URLs de
 * video, material, preguntas y respuestas del examen, datos de inscritos— no
 * están en esta lista y no pueden llegar por accidente.
 *
 * Los TÍTULOS de módulos sí son públicos: son el temario, y el temario es
 * material de venta.
 */
import { createAdminClient } from '@/lib/supabase/admin'

// La purga del catálogo (revalidatePath al publicar/editar/borrar) vive en
// src/lib/cursos/purga.ts, NO aquí: este archivo lo importa LandingClient
// ('use client') por precioMXN, y traer next/cache por esa cadena metía código
// de caché de servidor al bundle del navegador (+14 kB en la landing de los 144).

/** Lista blanca de campos del catálogo. Todo lo que no esté aquí, no sale. */
const CAMPOS_CATALOGO =
  'id, nombre, descripcion, tipo, horas, duracion_meses, precio_inscripcion, precio_mensualidad, orden'

export interface CursoCatalogoPublico {
  id: string
  nombre: string
  descripcion: string | null
  tipo: string
  horas: number | null
  duracion_meses: number | null
  precio_inscripcion: number
  precio_mensualidad: number
}

/**
 * Cursos publicados, para el catálogo. Solo `estado='publicado'`.
 *
 * ⚠️ NUNCA LANZA. Esta función la llama `src/app/page.tsx`, o sea la LANDING, y
 * la landing tiene que compilar y servirse aunque la base no responda. Con el
 * catálogo encendido por defecto, un fallo aquí tumbaba el prerender de `/` y
 * de `/diplomados` y el build entero fallaba con "Missing Supabase env vars" —
 * exactamente lo que pasa en un cliente recién clonado, antes de que alguien le
 * ponga sus credenciales. Se devuelve `[]` y la sección del catálogo
 * simplemente no se dibuja.
 */
export async function listarCatalogoPublico(): Promise<CursoCatalogoPublico[]> {
  let data: Record<string, unknown>[] | null = null
  try {
    const admin = createAdminClient()   // lanza si faltan las env vars
    const res = await admin
      .from('cursos')
      .select(CAMPOS_CATALOGO)
      .eq('estado', 'publicado')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (res.error) {
      console.error('[listarCatalogoPublico]', res.error)
      return []  // falla cerrado: sin catálogo antes que con datos a medias
    }
    data = res.data as Record<string, unknown>[] | null
  } catch (e) {
    console.error('[listarCatalogoPublico] sin acceso a la base:', e)
    return []
  }

  return (data ?? []).map(c => ({
    id: c.id as string,
    nombre: c.nombre as string,
    descripcion: (c.descripcion as string | null) ?? null,
    tipo: c.tipo as string,
    horas: (c.horas as number | null) ?? null,
    duracion_meses: (c.duracion_meses as number | null) ?? null,
    precio_inscripcion: Number(c.precio_inscripcion ?? 0),
    precio_mensualidad: Number(c.precio_mensualidad ?? 0),
  }))
}

export interface DetallePublico extends CursoCatalogoPublico {
  /** Temario: SOLO títulos de módulos, en orden. Ni lecciones ni conteos. */
  temario: string[]
}

/** Detalle público de un diplomado. `null` si no existe o no está publicado. */
export async function detallePublico(cursoId: string): Promise<DetallePublico | null> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('cursos')
    .select(`${CAMPOS_CATALOGO}, estado`)
    .eq('id', cursoId)
    .maybeSingle()

  // Se tipa a mano porque la lista de campos es una constante concatenada y el
  // cliente de Supabase no puede inferirla.
  const curso = data as unknown as (CursoCatalogoPublico & { estado: string }) | null

  // Un curso en borrador es indistinguible de uno inexistente para el público:
  // ambos dan 404. Decir "existe pero no está publicado" filtra información.
  if (!curso || curso.estado !== 'publicado') return null

  // SOLO el título y el orden. `nombre` es el temario; nada más de esta tabla
  // sale al público.
  const { data: modulos } = await admin
    .from('curso_modulos')
    .select('nombre, orden')
    .eq('curso_id', cursoId)
    .order('orden', { ascending: true })

  return {
    id: curso.id,
    nombre: curso.nombre,
    descripcion: curso.descripcion ?? null,
    tipo: curso.tipo,
    horas: curso.horas ?? null,
    duracion_meses: curso.duracion_meses ?? null,
    precio_inscripcion: Number(curso.precio_inscripcion ?? 0),
    precio_mensualidad: Number(curso.precio_mensualidad ?? 0),
    temario: (modulos ?? []).map(m => m.nombre as string),
  }
}

/** Formato MXN sin decimales — los precios de la plantilla son enteros. */
export function precioMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

/** Mensaje precargado de WhatsApp para un diplomado concreto. */
export function waUrlDiplomado(whatsappUrl: string, nombreCurso: string): string {
  const base = whatsappUrl.split('?')[0]
  return `${base}?text=${encodeURIComponent(`Hola, me interesa el diplomado "${nombreCurso}". ¿Me dan informes?`)}`
}
