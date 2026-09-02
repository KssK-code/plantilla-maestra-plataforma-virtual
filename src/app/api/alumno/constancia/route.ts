import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONFIG } from '@/lib/config'
import { getMesesByModalidad, getDefaultModalidadId } from '@/lib/modalidades'
import { cargarAlumnoAcceso, cargarContextoAcceso } from '@/lib/acceso-materias'
import {
  SELECT_CALIFICACIONES_BOLETIN,
  armarBoletin,
  normalizarCalificaciones,
} from '@/lib/boletin'

/**
 * Prefijo del código de cada materia en la constancia. En licenciatura son las
 * siglas del slug de la carrera: 'GEN' no distinguía entre dos programas del
 * mismo cliente.
 */
function prefijoCodigo(nivel: string | null, carrera: string | null): string {
  if (nivel === 'preparatoria') return 'PREP'
  if (nivel === 'secundaria')   return 'SECU'
  if (nivel === 'demo')         return 'TUT'
  return carrera
    ? carrera.split('-').map(x => x[0]).join('').toUpperCase().slice(0, 4)
    : 'GEN'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Usuario ───────────────────────────────────────────────────────────────
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, email, foto_url')
      .eq('id', user.id)
      .single()

    // ── Alumno (schema nuevo: alumnos.id = user.id) ───────────────────────────
    // Dos lecturas de `alumnos` a propósito: la ficha (matrícula, fecha) es de
    // esta ruta; el acceso (nivel, carrera con reintento si el esquema no la
    // tiene, meses, modalidad) viene por `cargarAlumnoAcceso`, la misma vía que
    // todos los gates.
    const { data: alumno } = await supabase
      .from('alumnos')
      .select('matricula, modalidad, meses_desbloqueados, created_at')
      .eq('id', user.id)
      .single()

    const acceso = await cargarAlumnoAcceso(supabase, user.id)

    if (!alumno || !acceso) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const nombre_completo = [usuario?.nombre, usuario?.apellidos]
      .filter(Boolean)
      .join(' ') || 'Alumno'

    const duracionMeses      = getMesesByModalidad(alumno.modalidad)
    const alumnoCarrera      = acceso.carrera ?? null
    const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0

    // ── Materias cursadas: misma regla que el boletín (lib/boletin) ───────────
    // Antes esta ruta decidía el universo con `inscripcion_pagada` (sin pagar →
    // solo demo) y los Pendientes con el mes crudo contra los meses pagados, en
    // un documento que el alumno imprime: con la bandera en false las
    // acreditadas del plan desaparecían (Bug 138). Ahora: acreditadas/no
    // acreditadas siempre (es historial, con la materia embebida SIN filtro de
    // `activa`) y pendientes solo las que la ventana posicional real abre en
    // Mis Materias; el catálogo ya viene acotado por nivel y, en licenciatura,
    // por carrera (Bug 59).
    const { materias: catalogo, acreditadas } = await cargarContextoAcceso(
      supabase,
      acceso.id,
      acceso
    )

    const { data: califs, error: califsError } = await supabase
      .from('calificaciones')
      .select(SELECT_CALIFICACIONES_BOLETIN)
      .eq('alumno_id', acceso.id)

    if (califsError) {
      console.error('[api/alumno/constancia] query error:', califsError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    const filas = armarBoletin(acceso, catalogo, normalizarCalificaciones(califs), acreditadas)

    // Código por mes y consecutivo, en el orden canónico de la ventana (antes
    // el consecutivo dependía del orden en que PostgREST devolviera las filas).
    const contadorPorMes: Record<number, number> = {}

    const materias_cursadas = filas.map(f => {
      const mesNum = f.mes_numero
      contadorPorMes[mesNum] = (contadorPorMes[mesNum] ?? 0) + 1
      // Una calificada trae su carrera embebida; una Pendiente de licenciatura
      // sale del catálogo acotado a la carrera del alumno.
      const carrera = f.materia.carrera
        ?? (f.materia.nivel === 'licenciatura' ? alumnoCarrera : null)
      return {
        materia_id:     f.materia.id,
        codigo:         `${prefijoCodigo(f.materia.nivel, carrera)}-M${mesNum}-${String(contadorPorMes[mesNum]).padStart(2, '0')}`,
        nombre_materia: f.materia.nombre,
        mes_numero:     mesNum,
        estado:         f.estado,
      }
    })

    const porcentaje_avance = duracionMeses > 0
      ? Math.round((mesesDesbloqueados / duracionMeses) * 100)
      : 0

    const admin = createAdminClient()
    const { data: fotoDoc } = await admin
      .from('documentos_alumno')
      .select('url_archivo, nombre_archivo')
      .eq('alumno_id', user.id)
      .eq('tipo_documento', 'foto_perfil_doc')
      .order('fecha_subida', { ascending: false })
      .limit(1)
      .maybeSingle()

    let fotoPerfilUrl: string | null = usuario?.foto_url ?? null
    if (fotoDoc) {
      const doc = fotoDoc as { url_archivo?: string | null; nombre_archivo?: string | null }
      let storagePath: string | null = null
      const raw = doc.url_archivo
      if (raw) {
        const marker = '/documentos/'
        const idx = raw.indexOf(marker)
        if (idx !== -1) {
          storagePath = decodeURIComponent(raw.slice(idx + marker.length).split('?')[0])
        }
      }
      if (!storagePath) {
        const ext = (doc.nombre_archivo ?? 'foto.jpg').split('.').pop()?.toLowerCase() || 'jpg'
        storagePath = `${user.id}/foto_perfil_doc.${ext}`
      }
      const { data: signedData, error: signErr } = await admin.storage
        .from('documentos')
        .createSignedUrl(storagePath, 86400)
      if (!signErr && signedData?.signedUrl) {
        fotoPerfilUrl = signedData.signedUrl
      }
    }

    return NextResponse.json({
      nombre_completo,
      nombre:              usuario?.nombre   ?? '',
      apellidos:           usuario?.apellidos ?? '',
      foto_url:            fotoPerfilUrl,
      matricula:           alumno.matricula   ?? `${CONFIG.nombre}-0000`,
      nivel:               acceso.nivel       ?? null,
      modalidad:           alumno.modalidad   ?? getDefaultModalidadId(),
      meses_desbloqueados: mesesDesbloqueados,
      duracion_meses:      duracionMeses,
      // El ternario binario etiquetaba «6 Meses» a cualquier plan que no fuera
      // de 3, así que un alumno de licenciatura en 9 meses salía con 6 en su
      // constancia. Se deriva de la duración real.
      plan_nombre:         `${duracionMeses} Meses`,
      porcentaje_avance,
      fecha_inscripcion:   alumno.created_at,
      avatar_url:          fotoPerfilUrl,
      materias_cursadas,
    })
  } catch (err) {
    console.error('[api/alumno/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
