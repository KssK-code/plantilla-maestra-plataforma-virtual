import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStaff } from '@/lib/supabase/verify-admin'
import { CONFIG } from '@/lib/config'
import { getMesesByModalidad, getDefaultModalidadId } from '@/lib/modalidades'
import { nivelForzadoDeRegistro } from '@/lib/modo'

// ─── Verificar rol ADMIN (normaliza mayúsculas) ───────────────────────────────
async function checkAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single()
  return (data?.rol as string | undefined)?.toUpperCase() === 'ADMIN'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Lectura de la lista: staff (ADMIN o SECRETARIO)
    const denied = await verifyStaff(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // ── Intento 1: nuevo schema — alumnos.id = usuarios.id ───────────────────
    const { data, error } = await admin
      .from('alumnos')
      .select(`
        id,
        matricula,
        nivel,
        modalidad,
        sindicalizado,
        activo,
        meses_desbloqueados,
        inscripcion_pagada,
        contactado_whatsapp,
        created_at,
        usuarios!inner(
          nombre,
          apellidos,
          email,
          foto_url,
          telefono
        )
      `)
      .order('created_at', { ascending: false })

    console.log('[GET /api/admin/alumnos] error schema nuevo:', error?.message ?? null)
    console.log('[GET /api/admin/alumnos] data count:', data?.length ?? 0)

    if (!error && data && data.length > 0) {
      type Row = {
        id: string; matricula?: string; nivel?: string; modalidad?: string
        sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
        inscripcion_pagada?: boolean; contactado_whatsapp?: boolean; created_at: string
        usuarios: { nombre?: string; apellidos?: string; email?: string; foto_url?: string | null; telefono?: string | null } | null
      }
      const result = (data as unknown as Row[]).map(a => {
        const u = Array.isArray(a.usuarios) ? a.usuarios[0] : a.usuarios
        return {
          id:                   a.id,
          matricula:            a.matricula ?? `${CONFIG.nombre}-0000`,
          nivel:                a.nivel ?? null,
          modalidad:            a.modalidad ?? getDefaultModalidadId(),
          sindicalizado:        a.sindicalizado ?? false,
          activo:               a.activo ?? false,
          meses_desbloqueados:  a.meses_desbloqueados ?? 0,
          duracion_meses:       getMesesByModalidad(a.modalidad),
          inscripcion_pagada:   a.inscripcion_pagada ?? false,
          contactado_whatsapp:  a.contactado_whatsapp ?? false,
          created_at:           a.created_at,
          nombre_completo:      [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || '—',
          email:                u?.email ?? '—',
          foto_url:             u?.foto_url ?? null,
          telefono:             u?.telefono ?? null,
        }
      })
      return NextResponse.json(result)
    }

    // ── Intento 2: schema antiguo — alumnos.usuario_id → usuarios.id ─────────
    const { data: data2, error: error2 } = await admin
      .from('alumnos')
      .select(`
        id,
        matricula,
        nivel,
        modalidad,
        sindicalizado,
        activo,
        meses_desbloqueados,
        inscripcion_pagada,
        contactado_whatsapp,
        created_at,
        usuario_id,
        usuarios!alumnos_usuario_id_fkey(
          nombre,
          apellidos,
          email,
          foto_url,
          telefono
        )
      `)
      .order('created_at', { ascending: false })

    console.log('[GET /api/admin/alumnos] error schema antiguo:', error2?.message ?? null)
    console.log('[GET /api/admin/alumnos] data2 count:', data2?.length ?? 0)

    if (!error2 && data2 && data2.length > 0) {
      type Row2 = {
        id: string; matricula?: string; nivel?: string; modalidad?: string
        sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
        inscripcion_pagada?: boolean; contactado_whatsapp?: boolean; created_at: string; usuario_id?: string
        usuarios: { nombre?: string; apellidos?: string; email?: string; foto_url?: string | null; telefono?: string | null } | null
      }
      const result2 = (data2 as unknown as Row2[]).map(a => {
        const u = Array.isArray(a.usuarios) ? a.usuarios[0] : a.usuarios
        return {
          id:                   a.id,
          matricula:            a.matricula ?? `${CONFIG.nombre}-0000`,
          nivel:                a.nivel ?? null,
          modalidad:            a.modalidad ?? getDefaultModalidadId(),
          sindicalizado:        a.sindicalizado ?? false,
          activo:               a.activo ?? false,
          meses_desbloqueados:  a.meses_desbloqueados ?? 0,
          duracion_meses:       getMesesByModalidad(a.modalidad),
          inscripcion_pagada:   a.inscripcion_pagada ?? false,
          contactado_whatsapp:  a.contactado_whatsapp ?? false,
          created_at:           a.created_at,
          nombre_completo:      [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || '—',
          email:                u?.email ?? '—',
          foto_url:             u?.foto_url ?? null,
          telefono:             u?.telefono ?? null,
        }
      })
      return NextResponse.json(result2)
    }

    // ── Fallback: alumnos sin join + usuarios por separado ────────────────────
    console.log('[GET /api/admin/alumnos] usando fallback sin join')
    const { data: alumnos, error: errorFallback } = await admin
      .from('alumnos')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('[GET /api/admin/alumnos] fallback error:', errorFallback?.message ?? null)
    console.log('[GET /api/admin/alumnos] fallback alumnos count:', alumnos?.length ?? 0)
    if (alumnos?.[0]) console.log('[GET /api/admin/alumnos] sample row keys:', Object.keys(alumnos[0]))

    const resultFallback = []
    for (const a of (alumnos ?? []) as {
      id: string; matricula?: string; nivel?: string; modalidad?: string
      sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
      inscripcion_pagada?: boolean; contactado_whatsapp?: boolean; created_at: string
    }[]) {
      const { data: u } = await admin
        .from('usuarios')
        .select('nombre, apellidos, email, foto_url, telefono')
        .eq('id', a.id)
        .single()
      resultFallback.push({
        id:                   a.id,
        matricula:            a.matricula ?? `${CONFIG.nombre}-0000`,
        nivel:                a.nivel ?? null,
        modalidad:            a.modalidad ?? getDefaultModalidadId(),
        sindicalizado:        a.sindicalizado ?? false,
        activo:               a.activo ?? false,
        meses_desbloqueados:  a.meses_desbloqueados ?? 0,
        duracion_meses:       getMesesByModalidad(a.modalidad),
        inscripcion_pagada:   a.inscripcion_pagada ?? false,
        contactado_whatsapp:  a.contactado_whatsapp ?? false,
        created_at:           a.created_at,
        nombre_completo:      [(u as {nombre?:string}|null)?.nombre, (u as {apellidos?:string}|null)?.apellidos].filter(Boolean).join(' ') || '—',
        email:                (u as {email?:string}|null)?.email ?? '—',
        foto_url:             (u as {foto_url?:string|null}|null)?.foto_url ?? null,
        telefono:             (u as {telefono?:string|null}|null)?.telefono ?? null,
      })
    }
    return NextResponse.json(resultFallback)

  } catch (err) {
    console.error('[GET /api/admin/alumnos] excepción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const isAdmin = await checkAdmin(user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const { nombre_completo, email, password, nivel, modalidad, telefono } = body

    // Aceptar "nombre_completo" del form y dividirlo en nombre / apellidos
    const partes     = (nombre_completo as string | undefined)?.trim().split(/\s+/) ?? []
    const nombre     = partes[0] ?? ''
    const apellidos  = partes.slice(1).join(' ')

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'nombre, email y password son requeridos' }, { status: 400 })
    }
    // ── B7: en solo_cursos el nivel lo decide el SERVIDOR ─────────────────────
    // Esta es la SEGUNDA puerta que escribe alumnos.nivel (la otra es el
    // registro público). B7 cerró aquella y sin esto dejaba esta abierta: el
    // admin que diera de alta a mano en un instituto de diplomados creaba un
    // alumno 'preparatoria', y `nivel` es write-once — no hay pantalla ni
    // endpoint para corregirlo después. Las dos puertas tienen que producir
    // exactamente la misma fila.
    const nivelForzado = nivelForzadoDeRegistro()   // 'diplomado' | null

    // Los valores deben coincidir EXACTAMENTE con alumnos_nivel_check
    // (supabase/schema.sql:30). Aceptar aquí un nivel que la BD rechaza hace
    // que el INSERT falle y que la ruta borre el usuario de Auth recién creado.
    if (!nivelForzado && (!nivel || !['secundaria', 'preparatoria', 'licenciatura'].includes(nivel))) {
      return NextResponse.json({ error: 'nivel es requerido (secundaria, preparatoria o licenciatura)' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already')) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese correo' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const newUserId = authData.user.id
    const year      = new Date().getFullYear()
    const rand      = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0')
    const matricula = `${CONFIG.nombre}-${year}-${rand}`

    // Upsert en usuarios — upsert porque un trigger de Auth puede haberla creado ya sin nombre
    const { error: usuarioError } = await admin
      .from('usuarios')
      .upsert(
        { id: newUserId, nombre, apellidos, email, telefono: telefono ?? null, rol: 'alumno' },
        { onConflict: 'id' }
      )

    if (usuarioError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: usuarioError.message }, { status: 500 })
    }

    // Insertar en alumnos. En solo_cursos el nivel lo pone el servidor y la
    // modalidad va a NULL: es la duración del PROGRAMA (3 o 6 meses de
    // secundaria/prepa), no del diplomado, cuyo ritmo lo fija el curso con
    // `modulos_por_mes`. Dejarle `getDefaultModalidadId()` le fabricaría una
    // `duracion_meses` (columna GENERATED) de un programa que no cursa.
    const { data: alumnoData, error: alumnoError } = await admin
      .from('alumnos')
      .insert({
        id:                  newUserId,
        matricula,
        nivel:               nivelForzado ?? (nivel as 'secundaria' | 'preparatoria' | 'licenciatura'),
        modalidad:           nivelForzado ? null : (modalidad ?? getDefaultModalidadId()),
        meses_desbloqueados: 0,
      })
      .select()
      .single()

    if (alumnoError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: alumnoError.message }, { status: 500 })
    }

    return NextResponse.json({ ...alumnoData, matricula }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/alumnos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
