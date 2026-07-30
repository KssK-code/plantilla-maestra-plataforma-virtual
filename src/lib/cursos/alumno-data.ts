/**
 * Lectura de cursos del alumno con la SESIÓN DEL USUARIO (RLS activo, sin
 * service role). La RLS garantiza que solo se devuelven cursos publicados en
 * los que el alumno está inscrito (o todo, si es_admin() → vista previa).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { SIGNED_URL_TTL } from './storage'
import { BUCKET_CURSOS } from './archivos'
import { limiteVentana } from './acceso'
import type { CursoVentana, InscripcionVentana } from './acceso'
import type { LeccionAlumno, ModuloAlumno, VentanaCurso } from '@/types/cursos-alumno'

async function signed(supabase: SupabaseClient, path: string | null): Promise<string | null> {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET_CURSOS).createSignedUrl(path, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

/** Ids de las lecciones de un curso accesible (ordenadas), vía RLS. */
export async function leccionesDeCurso(
  supabase: SupabaseClient,
  cursoId: string
): Promise<{ moduloId: string; leccionId: string }[]> {
  const { data: modulos } = await supabase
    .from('curso_modulos')
    .select('id')
    .eq('curso_id', cursoId)
  const moduloIds = (modulos ?? []).map(m => m.id as string)
  if (moduloIds.length === 0) return []

  const { data: lecciones } = await supabase
    .from('curso_lecciones')
    .select('id, modulo_id')
    .in('modulo_id', moduloIds)
  return (lecciones ?? []).map(l => ({ moduloId: l.modulo_id as string, leccionId: l.id as string }))
}

/** Set de leccion_id completadas por el usuario actual en un conjunto de lecciones. */
export async function completadasDe(
  supabase: SupabaseClient,
  userId: string,
  leccionIds: string[]
): Promise<Set<string>> {
  if (leccionIds.length === 0) return new Set()
  const { data } = await supabase
    .from('curso_progreso')
    .select('leccion_id')
    .eq('alumno_id', userId)
    .eq('completada', true)
    .in('leccion_id', leccionIds)
  return new Set((data ?? []).map(r => r.leccion_id as string))
}

/** Estructura completa de módulos+lecciones de un curso, con progreso y URLs firmadas. */
export async function modulosConProgreso(
  supabase: SupabaseClient,
  userId: string,
  cursoId: string
): Promise<{ modulos: ModuloAlumno[]; total: number; completadas: number }> {
  const { data: modulosRaw } = await supabase
    .from('curso_modulos')
    .select('id, nombre, orden')
    .eq('curso_id', cursoId)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })

  const moduloIds = (modulosRaw ?? []).map(m => m.id as string)
  if (moduloIds.length === 0) return { modulos: [], total: 0, completadas: 0 }

  const { data: leccionesRaw } = await supabase
    .from('curso_lecciones')
    .select('id, modulo_id, titulo, video_url, contenido_texto, material_path, orden')
    .in('modulo_id', moduloIds)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })

  const todas = (leccionesRaw ?? [])
  const completadasSet = await completadasDe(supabase, userId, todas.map(l => l.id as string))

  const lecciones: LeccionAlumno[] = await Promise.all(
    todas.map(async l => ({
      id: l.id as string,
      titulo: l.titulo as string,
      video_url: (l.video_url as string | null) ?? null,
      contenido_texto: (l.contenido_texto as string | null) ?? null,
      materialUrl: await signed(supabase, l.material_path as string | null),
      tieneMaterial: Boolean(l.material_path),
      orden: (l.orden as number) ?? 0,
      completada: completadasSet.has(l.id as string),
    }))
  )

  const modulos: ModuloAlumno[] = (modulosRaw ?? []).map(m => ({
    id: m.id as string,
    nombre: m.nombre as string,
    orden: (m.orden as number) ?? 0,
    lecciones: lecciones.filter(l => todas.find(t => t.id === l.id)?.modulo_id === m.id),
  }))

  return { modulos, total: todas.length, completadas: completadasSet.size }
}

export const portadaFirmada = signed

/**
 * Total de lecciones del curso, TODAS — incluidas las que la ventana bloquea.
 *
 * ⚠️ Se lee con el cliente ADMIN a propósito, y esto NO es un descuido de
 * seguridad: devuelve un NÚMERO, nunca contenido.
 *
 * Existe por un efecto de segundo orden del gate de B2: como la RLS ahora solo
 * devuelve las lecciones en ventana, contar con la sesión del alumno encogería
 * el DENOMINADOR del progreso. Un alumno que pagó 1 de 6 meses completaría "sus"
 * 2 lecciones y llegaría a 100 % con `completado: true` — y el visor le diría
 * "¡Completaste este diplomado!". Con curso_constancias ya creada (B1) esperando
 * consumidor, eso terminaría certificando un diplomado pagado a un sexto.
 *
 * El numerador (lo completado) sigue saliendo de la sesión; el denominador es el
 * curso entero. Avanzar solo puede venir de pagar más meses.
 */
export async function totalLeccionesDelCurso(
  admin: SupabaseClient,
  cursoId: string
): Promise<number> {
  const { data: modulos } = await admin
    .from('curso_modulos')
    .select('id')
    .eq('curso_id', cursoId)

  const ids = (modulos ?? []).map(m => m.id as string)
  if (ids.length === 0) return 0

  const { count } = await admin
    .from('curso_lecciones')
    .select('id', { count: 'exact', head: true })
    .in('modulo_id', ids)

  return count ?? 0
}

/**
 * Resumen de la ventana de pago del alumno en un curso.
 *
 * Se lee con el cliente ADMIN a propósito: el conteo total de módulos tiene que
 * incluir los bloqueados, y con la sesión del alumno la RLS ya los filtró. Lo
 * que sale de aquí son SOLO NÚMEROS — jamás nombres, títulos ni URLs de lo
 * bloqueado.
 *
 * Devuelve null si el usuario no tiene inscripción en el curso (p. ej. un admin
 * en vista previa): la UI entonces no pinta banda de ventana.
 */
export async function resumenVentana(
  admin: SupabaseClient,
  alumnoId: string,
  cursoId: string
): Promise<VentanaCurso | null> {
  const { data: insc } = await admin
    .from('curso_inscripciones')
    .select('meses_desbloqueados, estado, fecha_vencimiento')
    .eq('curso_id', cursoId)
    .eq('alumno_id', alumnoId)
    .maybeSingle()

  if (!insc) return null

  const { data: curso } = await admin
    .from('cursos')
    .select('modulos_por_mes, estado')
    .eq('id', cursoId)
    .maybeSingle()

  const { count } = await admin
    .from('curso_modulos')
    .select('id', { count: 'exact', head: true })
    .eq('curso_id', cursoId)

  const inscripcion = insc as InscripcionVentana & { estado?: string | null }
  const cursoV = (curso ?? null) as CursoVentana | null

  const limite = limiteVentana(inscripcion, cursoV)
  const totales = count ?? 0
  const bloqueados = Math.max(0, totales - Math.min(limite, totales))
  const porMes = cursoV?.modulos_por_mes ?? 0

  return {
    meses_desbloqueados: inscripcion.meses_desbloqueados ?? 0,
    modulos_por_mes: porMes,
    limite,
    modulos_totales: totales,
    modulos_bloqueados: bloqueados,
    // El siguiente módulo bloqueado está en `orden = limite`; su mes es 1-based.
    proximo_mes: bloqueados > 0 && porMes > 0 ? Math.floor(limite / porMes) + 1 : null,
    estado_inscripcion: inscripcion.estado ?? null,
  }
}
