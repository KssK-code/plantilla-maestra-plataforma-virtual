import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function buildNombre(nombre?: string | null, apellidos?: string | null, fallback?: string | null) {
  return [nombre, apellidos].filter(Boolean).join(' ') || fallback || 'Alumno'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    console.log('[perfil] user.id:', user.id, '| user.email:', user.email)

    // ── Intentar con schema antiguo: alumnos.usuario_id ──────────────────────
    const { data, error } = await supabase
      .from('alumnos')
      .select('*, planes_estudio(nombre, duracion_meses), usuarios(id, nombre, apellidos, email, avatar_url)')
      .eq('usuario_id', user.id)
      .single()

    console.log('[perfil] schema antiguo — error:', error?.message ?? null, '| data:', JSON.stringify(data))

    if (!error && data) {
      const a = data as unknown as {
        id: string
        matricula: string
        meses_desbloqueados: number
        inscripcion_pagada?: boolean
        nivel?: string
        planes_estudio: { nombre: string; duracion_meses: number } | null
        usuarios: { id?: string; nombre?: string; apellidos?: string; email: string; avatar_url?: string | null } | null
      }

      console.log('[perfil] usuarios join:', JSON.stringify(a.usuarios))

      const nombreCompleto = buildNombre(a.usuarios?.nombre, a.usuarios?.apellidos, user.email)

      return NextResponse.json({
        id:                  a.id,
        matricula:           a.matricula ?? 'IVS-0000',
        meses_desbloqueados: a.meses_desbloqueados ?? 0,
        inscripcion_pagada:  a.inscripcion_pagada ?? false,
        nivel:               a.nivel ?? null,
        plan_nombre:         a.planes_estudio?.nombre ?? '',
        duracion_meses:      a.planes_estudio?.duracion_meses ?? 0,
        nombre_completo:     nombreCompleto,
        email:               a.usuarios?.email ?? user.email ?? '',
        avatar_url:          a.usuarios?.avatar_url ?? null,
      })
    }

    // ── Intentar con schema nuevo: alumnos.id = auth.users.id ────────────────
    const { data: data2, error: error2 } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', user.id)
      .single()

    // ── Obtener datos del usuario ─────────────────────────────────────────────
    const { data: usuarioNuevo, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('id, nombre, apellidos, email, foto_url, rol')
      .eq('id', user.id)
      .single()

    console.log('[perfil] schema nuevo — alumnos error:', error2?.message ?? null)
    console.log('[perfil] usuario query — error:', errorUsuario?.message ?? null, '| data:', JSON.stringify(usuarioNuevo))

    if (!error2 && data2) {
      const a = data2 as unknown as {
        id: string
        matricula?: string
        meses_desbloqueados?: number
        inscripcion_pagada?: boolean
        nivel?: string
        modalidad?: string
      }
      const u = usuarioNuevo as unknown as {
        nombre?: string
        apellidos?: string
        email?: string
        foto_url?: string | null
      } | null

      const nombreCompleto = buildNombre(u?.nombre, u?.apellidos, user.email)

      console.log('[perfil] nombre construido:', nombreCompleto)

      return NextResponse.json({
        id:                  a.id,
        matricula:           a.matricula ?? 'IVS-0000',
        meses_desbloqueados: a.meses_desbloqueados ?? 0,
        inscripcion_pagada:  a.inscripcion_pagada ?? false,
        nivel:               a.nivel ?? null,
        plan_nombre:         a.nivel === 'preparatoria' ? 'Preparatoria' : 'Secundaria',
        duracion_meses:      6,
        nombre_completo:     nombreCompleto,
        email:               u?.email ?? user.email ?? '',
        avatar_url:          u?.foto_url ?? null,
      })
    }

    // ── Fallback: usuario autenticado pero sin fila en alumnos ────────────────
    const { data: uFallback, error: errorFallback } = await supabase
      .from('usuarios')
      .select('id, nombre, apellidos, email, rol')
      .eq('id', user.id)
      .single()

    console.log('[perfil] fallback usuario — error:', errorFallback?.message ?? null, '| data:', JSON.stringify(uFallback))

    const uf = uFallback as unknown as {
      nombre?: string; apellidos?: string; email?: string
    } | null

    const nombreFallback = buildNombre(uf?.nombre, uf?.apellidos, user.email)

    console.log('[perfil] fallback nombre:', nombreFallback)

    return NextResponse.json({
      id:                  user.id,
      matricula:           'IVS-0000',
      meses_desbloqueados: 0,
      inscripcion_pagada:  false,
      nivel:               null,
      plan_nombre:         '',
      duracion_meses:      0,
      nombre_completo:     nombreFallback,
      email:               user.email ?? '',
      avatar_url:          null,
    })
  } catch (err) {
    console.error('[api/alumno/perfil] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
