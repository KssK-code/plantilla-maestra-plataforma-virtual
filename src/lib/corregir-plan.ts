// ─── Corrección de plan de estudio (captura equivocada en el alta) ────────────
// La validación del body vive aquí, fuera de la ruta, para poder probarla como
// función pura. La decisión de producto: esto corrige una CAPTURA, no cambia a
// un alumno de carrera — solo procede si el alumno no ha comenzado (los seis
// candados, que revalida el servidor SQL en la misma transacción del UPDATE).

import { getCarreras } from '@/lib/licenciatura-utils'
import { getModalidadesActivas, getModalidadesLicenciatura } from '@/lib/modalidades'

export const CAMPOS_PERMITIDOS = ['nivel', 'carrera', 'modalidad'] as const

// Los mismos valores del select de alta (admin/alumnos). 'diplomado' NO entra:
// esa línea no usa plan de programa y su captura no se corrige por aquí.
export const NIVELES_CORREGIBLES = ['secundaria', 'preparatoria', 'licenciatura'] as const
export type NivelCorregible = (typeof NIVELES_CORREGIBLES)[number]

export interface CorreccionPlan {
  nivel: NivelCorregible
  /** Slug de carrera. Solo licenciatura; null en el resto. */
  carrera: string | null
  modalidad: string
}

export type ResultadoValidacion =
  | { ok: true; plan: CorreccionPlan }
  | { ok: false; error: string }

/**
 * Valida el body del POST corregir-plan. Whitelist estricta: cualquier clave
 * fuera de nivel/carrera/modalidad rechaza la petición entera — el patrón del
 * PATCH de alumnos, endurecido: aquí una clave desconocida es señal de un
 * llamador que espera escribir algo que este endpoint jamás va a escribir.
 */
export function validarCorreccionPlan(body: unknown): ResultadoValidacion {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la petición debe ser un objeto con nivel, carrera y modalidad.' }
  }

  const extras = Object.keys(body).filter(
    k => !(CAMPOS_PERMITIDOS as readonly string[]).includes(k),
  )
  if (extras.length > 0) {
    return { ok: false, error: `Campo no permitido: ${extras.join(', ')}. Solo se aceptan nivel, carrera y modalidad.` }
  }

  const { nivel, carrera, modalidad } = body as Record<string, unknown>

  if (typeof nivel !== 'string' || !(NIVELES_CORREGIBLES as readonly string[]).includes(nivel)) {
    return { ok: false, error: `nivel es requerido (${NIVELES_CORREGIBLES.join(', ')})` }
  }
  const nivelValido = nivel as NivelCorregible

  // La carrera decide qué catálogo ve el alumno; se valida contra el catálogo
  // real del CONFIG, nunca texto libre — misma regla del alta. Fuera de
  // licenciatura el valor se ignora y va a NULL, también como el alta.
  let carreraNormalizada: string | null = null
  if (nivelValido === 'licenciatura') {
    const validas = getCarreras().map(c => c.slug)
    const pedida = String(carrera ?? '').trim()
    if (!pedida || !validas.includes(pedida)) {
      return { ok: false, error: `carrera es requerida para licenciatura (${validas.join(', ')})` }
    }
    carreraNormalizada = pedida
  }

  // Mismas funciones que el select de alta: el catálogo de modalidades depende
  // del nivel elegido.
  const modalidadesValidas = (
    nivelValido === 'licenciatura' ? getModalidadesLicenciatura() : getModalidadesActivas()
  ).map(m => m.id)
  if (typeof modalidad !== 'string' || !modalidadesValidas.includes(modalidad)) {
    return { ok: false, error: `modalidad es requerida (${modalidadesValidas.join(', ')})` }
  }

  return { ok: true, plan: { nivel: nivelValido, carrera: carreraNormalizada, modalidad } }
}

// Códigos que devuelve public.corregir_plan_estudio() / candado_corregir_plan()
// cuando un candado bloquea. El mensaje le habla al admin del cliente, que no
// es técnico: dice QUÉ lo bloqueó y cuál es el camino (alta nueva).
export const MENSAJES_CANDADO: Record<string, string> = {
  pagos:               'Este alumno ya registró pagos. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
  meses_desbloqueados: 'Este alumno ya tiene meses desbloqueados. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
  calificaciones:      'Este alumno ya tiene materias calificadas. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
  progreso:            'Este alumno ya registró avance en sus semanas de estudio. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
  intentos:            'Este alumno ya presentó evaluaciones. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
  quiz:                'Este alumno ya respondió quizzes de sus semanas. Para cambiar su plan de estudio debe registrarse como alumno nuevo.',
}

/** Mensaje para un código de candado que el servidor no reconoce. */
export function mensajeCandado(candado: string): string {
  return MENSAJES_CANDADO[candado]
    ?? 'Este alumno ya inició su plan de estudio. Para cambiarlo debe registrarse como alumno nuevo.'
}
