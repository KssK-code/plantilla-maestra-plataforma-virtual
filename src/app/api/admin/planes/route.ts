import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { getModalidadesActivas, getModalidadesLicenciatura } from '@/lib/modalidades'
import { CONFIG } from '@/lib/config'

/**
 * Planes de estudio activos del cliente.
 *
 * ⚠️ Antes esto consultaba la tabla `planes_estudio`, que NO EXISTE en el
 * esquema vivo (es un vestigio del schema EDVEX previo a la migración). La
 * consulta fallaba con PGRST205, el `catch` devolvía `[]` en silencio y el
 * panel pintaba "No hay planes activos" / "0 Planes activos" en un cliente con
 * 89 materias sembradas y alumnos ya inscritos (TICKET-2026-09-02-26).
 *
 * La fuente de verdad de los planes es `CONFIG.modalidades` (Sec/Prepa) más
 * `CONFIG.licenciaturas.modalidades` — las mismas que consume el registro
 * público y `src/lib/modalidades.ts`. No hay tabla que consultar.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const programa = getModalidadesActivas().map(m => ({
      id: m.id,
      nombre: `${CONFIG.nombre} — ${m.label}`,
      duracion_meses: m.meses,
      precio_mensual: m.mensualidad,
    }))

    // Un plan por carrera × modalidad: es lo que el alumno realmente elige en
    // el registro, y lo que el admin espera reconocer en el panel.
    const lic = (CONFIG as { licenciaturas?: { activas?: boolean; carreras?: ReadonlyArray<{ slug: string; nombre: string }> } }).licenciaturas
    const licenciatura = lic?.activas && lic.carreras
      ? lic.carreras.flatMap(c =>
          getModalidadesLicenciatura().map(m => ({
            id: `${c.slug}__${m.id}`,
            nombre: `${c.nombre} — ${m.label}`,
            duracion_meses: m.meses,
            precio_mensual: m.mensualidad,
          })),
        )
      : []

    return NextResponse.json([...programa, ...licenciatura])
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
