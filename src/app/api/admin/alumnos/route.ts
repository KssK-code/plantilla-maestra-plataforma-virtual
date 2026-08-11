import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStaff } from '@/lib/supabase/verify-admin'
import { CONFIG } from '@/lib/config'
import { getMesesByModalidad, getDefaultModalidadId } from '@/lib/modalidades'
import { nivelForzadoDeRegistro } from '@/lib/modo'
import { sincronizarPrefijoMatricula } from '@/lib/matricula'
import { getOfertaIngreso } from '@/lib/cursos/oferta'

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

// ─── Curso de ingreso solicitado ──────────────────────────────────────────────
// Se resuelve APARTE de la consulta principal, no dentro de su `select`, y se
// aplica a los tres retornos. Los tres intentos consultan schemas distintos y
// no se sabe de antemano cuál responderá en un cliente dado; añadir el campo
// solo al primero deja la columna vacía en los demás sin que nada falle. Eso
// pasó de verdad: el intento 1 pedía una columna inexistente, todos los
// clientes servían por el fallback, y el campo nuevo nunca llegó a la UI.
// Si el cliente aún no corrió la migración de `curso_solicitado`, el select
// falla, `solicitudes` viene null y todos salen sin curso: degrada, no rompe.
async function anexarCursoIngreso<T extends { id: string }>(
  admin: ReturnType<typeof createAdminClient>,
  filas: T[],
) {
  const sinCurso = {
    curso_solicitado:        null as string | null,
    curso_solicitado_nombre: null as string | null,
    curso_solicitado_ids:    [] as string[],
    curso_activado:          false,
  }
  if (filas.length === 0) return filas.map(f => ({ ...f, ...sinCurso }))

  const { data: solicitudes } = await admin
    .from('alumnos')
    .select('id, curso_solicitado')
    .not('curso_solicitado', 'is', null)

  const pedido = new Map<string, string>()
  for (const s of (solicitudes ?? []) as { id: string; curso_solicitado: string | null }[]) {
    if (s.curso_solicitado) pedido.set(s.id, s.curso_solicitado)
  }
  if (pedido.size === 0) return filas.map(f => ({ ...f, ...sinCurso }))

  // El estado se DERIVA de curso_inscripciones en vez de guardarse como flag:
  // un flag se desincroniza en cuanto el admin quita al alumno desde /admin/cursos.
  const inscritos = new Map<string, Set<string>>()
  const { data: ins } = await admin
    .from('curso_inscripciones')
    .select('alumno_id, curso_id')
    .in('alumno_id', [...pedido.keys()])
  for (const r of (ins ?? []) as { alumno_id: string; curso_id: string }[]) {
    if (!inscritos.has(r.alumno_id)) inscritos.set(r.alumno_id, new Set())
    inscritos.get(r.alumno_id)!.add(r.curso_id)
  }

  return filas.map(f => {
    const oferta = getOfertaIngreso(pedido.get(f.id))
    if (!oferta) return { ...f, ...sinCurso }
    const ya = inscritos.get(f.id) ?? new Set<string>()
    return {
      ...f,
      curso_solicitado:        pedido.get(f.id) ?? null,
      curso_solicitado_nombre: oferta.nombre,
      curso_solicitado_ids:    oferta.cursoIds,
      // Para el paquete, "activado" exige TODOS sus cursos: con uno solo seguiría incompleto.
      curso_activado:          oferta.cursoIds.every(id => ya.has(id)),
    }
  })
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

    // Los tres intentos de abajo van de más a menos específico. Ojo al pedir
    // columnas: si UNA no existe, PostgREST tumba la consulta entera y se cae
    // al siguiente intento en silencio. Eso llevaba pasando con `sindicalizado`
    // —la columna real de schema-01-tablas.sql es `es_sindicalizado`—, así que
    // ningún cliente llegaba al intento 1 y todos servían por el fallback, que
    // hace una consulta a `usuarios` POR ALUMNO. Peor: cualquier campo nuevo
    // que se agregara solo al intento 1 quedaba como código muerto.
    // Antes de sumar una columna aquí, confirmar que existe en el schema.

    // ── Intento 1: nuevo schema — alumnos.id = usuarios.id ───────────────────
    const { data, error } = await admin
      .from('alumnos')
      .select(`
        id,
        matricula,
        nivel,
        modalidad,
        es_sindicalizado,
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
        es_sindicalizado?: boolean; sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
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
          sindicalizado:        a.es_sindicalizado ?? a.sindicalizado ?? false,
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
      return NextResponse.json(await anexarCursoIngreso(admin, result))
    }

    // ── Intento 2: schema antiguo — alumnos.usuario_id → usuarios.id ─────────
    const { data: data2, error: error2 } = await admin
      .from('alumnos')
      .select(`
        id,
        matricula,
        nivel,
        modalidad,
        es_sindicalizado,
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
        es_sindicalizado?: boolean; sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
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
          sindicalizado:        a.es_sindicalizado ?? a.sindicalizado ?? false,
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
      return NextResponse.json(await anexarCursoIngreso(admin, result2))
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
      es_sindicalizado?: boolean; sindicalizado?: boolean; activo?: boolean; meses_desbloqueados?: number
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
        sindicalizado:        a.es_sindicalizado ?? a.sindicalizado ?? false,
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
    return NextResponse.json(await anexarCursoIngreso(admin, resultFallback))

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

    // La matrícula NO se arma aquí: la pone el trigger trg_asignar_matricula,
    // igual que en el alta por /register. Antes esta ruta la fabricaba con
    // `CONFIG.nombre` y un número al azar, así que en la misma plataforma
    // convivían 'ANGELOPOLIS-2026-0483' (alta por admin) e 'IVS-2026-0005'
    // (alta por registro), y el azar podía chocar con una existente.
    await sincronizarPrefijoMatricula(admin)

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

    // `alumnoData` ya trae la matrícula que puso el trigger — no hay que
    // pisarla con una calculada aquí, que era justo la que salía mal.
    //
    // Red de seguridad para el cliente que despliegue este código sin haber
    // corrido 20260811120000_prefijo_matricula_configurable.sql: sin trigger la
    // columna admite NULL y los alumnos entrarían sin matrícula, en silencio.
    let alumno = alumnoData as { matricula?: string | null } | null
    if (alumno && !alumno.matricula) {
      console.error('[POST /api/admin/alumnos] alumno sin matrícula: falta trg_asignar_matricula. Correr la migración del prefijo.')
      const anio = new Date().getFullYear()
      const { count } = await admin.from('alumnos').select('id', { count: 'exact', head: true })
      const respaldo = `${CONFIG.prefijoMatricula}-${anio}-${String((count ?? 0)).padStart(4, '0')}`
      const { data: reparado } = await admin
        .from('alumnos')
        .update({ matricula: respaldo })
        .eq('id', newUserId)
        .select()
        .single()
      if (reparado) alumno = reparado
    }

    return NextResponse.json(alumno, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/alumnos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
