import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { porcentajeProgreso, cursoCompletado } from '@/lib/cursos/progreso'
import { modulosConProgreso, portadaFirmada, resumenVentana, totalLeccionesDelCurso } from '@/lib/cursos/alumno-data'
import type { CursoDetalleAlumno } from '@/types/cursos-alumno'
import type { CursoTipo } from '@/types/cursos'

// ─── GET /api/alumno/cursos/[id] — detalle del curso para el visor ────────────
// Sesión del usuario + RLS: si el alumno no está inscrito o el curso no está
// publicado, la RLS devuelve vacío → 404 (el front redirige al catálogo).
// El admin (es_admin()) accede aunque esté en borrador → modoPreview.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: curso } = await supabase
      .from('cursos')
      .select('id, nombre, descripcion, tipo, estado, portada_path')
      .eq('id', params.id)
      .maybeSingle()

    // RLS vacío = sin acceso (no inscrito / no publicado / no existe)
    if (!curso) return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 })

    // ¿El que mira es admin? → vista previa (sin progreso ni inscripción)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    const modoPreview = (usuario?.rol as string | undefined)?.toLowerCase() === 'admin'

    // Los módulos y lecciones se leen con la SESIÓN del alumno, así que la RLS
    // (migración B2) ya devuelve únicamente los que caen dentro de la ventana
    // de pago — incluidas las URLs firmadas del material, que se firman con esa
    // misma sesión. Aquí no hace falta volver a filtrar: hacerlo sería una
    // segunda implementación de la regla, que es justo lo que produjo la
    // divergencia del Bug 61.
    const { modulos, total, completadas } = await modulosConProgreso(supabase, user.id, params.id)

    // Resumen de la ventana: SOLO NÚMEROS, para que la UI pueda decir "quedan N
    // módulos, disponibles al abrir el mes M" sin filtrar nada de lo bloqueado.
    const admin = createAdminClient()
    const ventana = modoPreview ? null : await resumenVentana(admin, user.id, params.id)

    // DENOMINADOR = curso COMPLETO, no solo lo desbloqueado. `total` viene de la
    // sesión y por tanto ya está recortado por la ventana; usarlo daría 100 % y
    // "completado" a quien pagó 1 de 6 meses. El numerador sí es lo completado.
    const totalCurso = modoPreview ? total : await totalLeccionesDelCurso(admin, params.id)

    // Primera lección pendiente en orden (módulo, lección); si todas están
    // completas o no hay progreso, la primera lección del curso.
    const enOrden = modulos.flatMap(m => m.lecciones)
    const pendiente = enOrden.find(l => !l.completada)
    const primeraLeccionPendienteId = pendiente?.id ?? enOrden[0]?.id ?? null

    const detalle: CursoDetalleAlumno = {
      curso: {
        id: curso.id as string,
        nombre: curso.nombre as string,
        descripcion: (curso.descripcion as string | null) ?? null,
        tipo: curso.tipo as CursoTipo,
        estado: curso.estado as string,
        portadaUrl: await portadaFirmada(supabase, curso.portada_path as string | null),
      },
      modoPreview,
      modulos,
      totalLecciones: totalCurso,
      completadas,
      porcentaje: porcentajeProgreso(completadas, totalCurso),
      completado: cursoCompletado(completadas, totalCurso),
      primeraLeccionPendienteId,
      ventana,
    }
    return NextResponse.json(detalle)
  } catch (err) {
    console.error('[GET /api/alumno/cursos/[id]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
