/**
 * POST /api/auth/register-complete
 * Llamar justo después de supabase.auth.signUp().
 * Crea las filas en public.usuarios y public.alumnos.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nivelForzadoDeRegistro } from '@/lib/modo'
import { getCarreras } from '@/lib/licenciatura-utils'
import { sincronizarPrefijoMatricula } from '@/lib/matricula'
import { getOfertaIngreso } from '@/lib/cursos/oferta'

export async function POST(request: Request) {
  try {
    // Verificar sesión activa
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const nombre           = (body.nombre          ?? '').trim()
    const apellidos        = (body.apellidos        ?? '').trim()
    const telefono         = (body.telefono         ?? '').trim()
    const es_sindicalizado = Boolean(body.es_sindicalizado)
    const sindicato        = body.sindicato         ?? null

    // ── B7: el nivel en modo solo_cursos lo decide el SERVIDOR ────────────────
    // `nivelForzadoDeRegistro()` devuelve 'diplomado' si el cliente es
    // solo_cursos, y null en tradicional (donde manda lo que eligió el usuario).
    //
    // ⚠️ SE IGNORA `body.nivel` EN SOLO_CURSOS, no se "valida". Es la lección de
    // S1: el registro es un endpoint que cualquiera puede llamar con la anon
    // key, así que un campo que decide privilegios o pertenencia no se acepta
    // del cliente ni siquiera para comprobarlo — se sobrescribe. Un curl con
    // `{"nivel":"preparatoria"}` contra un cliente solo_cursos crea igual un
    // alumno 'diplomado'.
    //
    // Y `modalidad` va a null: es la duración del PROGRAMA (3 o 6 meses de
    // secundaria/prepa). El ritmo del diplomado lo fija el curso con
    // `modulos_por_mes`, no el alumno.
    const nivelForzado     = nivelForzadoDeRegistro()
    const nivel            = nivelForzado ?? body.nivel ?? null
    const modalidad        = nivelForzado ? null : (body.modalidad ?? null)

    // `carrera` decide qué catálogo ve el alumno. Este endpoint es PÚBLICO, así
    // que el valor no se guarda tal cual: se contrasta contra el catálogo del
    // config, igual que se hace con `curso_solicitado` unas líneas abajo. Fuera
    // de licenciatura siempre va NULL.
    const carreraPedida = String(body.carrera ?? '').trim()
    const carrera = nivel === 'licenciatura' && getCarreras().some(c => c.slug === carreraPedida)
      ? carreraPedida
      : null

    // Curso de ingreso solicitado. Se pasa por la whitelist de ofertas del
    // config en vez de guardarse tal cual: este endpoint es público, así que
    // sin esto cualquiera podría dejar texto arbitrario en la columna.
    // Desconocido → null, igual que si no hubiera pedido nada.
    const curso_solicitado = getOfertaIngreso(body.curso_solicitado)?.id ?? null

    if (!nombre) {
      return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Misma regla plan-o-curso que valida el formulario, repetida aquí porque
    // el formulario no es la única forma de llamar a este endpoint. Sin nivel
    // ni curso el alumno entraría sin nada que estudiar y sin nada que el admin
    // pueda activarle. En solo_cursos no aplica: el nivel lo pone el servidor.
    if (!nivelForzado && !nivel && !curso_solicitado) {
      return Response.json(
        { error: 'Selecciona tu nivel educativo o un curso de preparación.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // ── 1. Crear / actualizar fila en public.usuarios ──────────────────────────
    const { error: usuarioError } = await admin
      .from('usuarios')
      .upsert(
        { id: user.id, email: user.email, nombre, apellidos, telefono, rol: 'alumno' },
        { onConflict: 'id' }
      )

    if (usuarioError) {
      console.error('[register-complete] usuarios upsert error:', usuarioError)
      return Response.json({ error: usuarioError.message }, { status: 500 })
    }

    // ── 2. Crear fila en public.alumnos ────────────────────────────────────────
    // La matrícula la genera el trigger trg_asignar_matricula automáticamente,
    // leyendo el prefijo de public.ajustes; hay que dejarlo al día ANTES del
    // insert o el trigger usaría el de la corrida anterior. No bloquea el alta.
    await sincronizarPrefijoMatricula(admin)

    const alumnoPayload = {
      id:                  user.id,
      nivel,               // 'secundaria' | 'preparatoria' | 'licenciatura' | 'diplomado' | null
      modalidad,           // ModalidadId | null
      carrera,             // slug de carrera | null (solo licenciatura)
      es_sindicalizado,
      sindicato:           es_sindicalizado ? sindicato : null,
      curso_solicitado,    // id de oferta, no UUID — ver src/lib/cursos/oferta.ts
      inscripcion_pagada:  false,
      meses_desbloqueados: 0,
      activo:              true,
      fecha_inscripcion:   new Date().toISOString(),
    }

    const { error: alumnoError } = await admin
      .from('alumnos')
      .insert(alumnoPayload)

    if (alumnoError) {
      // Conflicto de clave primaria → alumno ya existe, no es error fatal
      if (alumnoError.code === '23505') {
        return Response.json({ ok: true, nota: 'alumno ya existía' })
      }
      console.error('[register-complete] alumnos insert error:', alumnoError)
      return Response.json({ error: alumnoError.message }, { status: 500 })
    }

    // Leer la matrícula asignada por el trigger
    const { data: alumno } = await admin
      .from('alumnos')
      .select('matricula')
      .eq('id', user.id)
      .single()

    return Response.json({ ok: true, matricula: alumno?.matricula })

  } catch (error) {
    console.error('[register-complete] error inesperado:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
