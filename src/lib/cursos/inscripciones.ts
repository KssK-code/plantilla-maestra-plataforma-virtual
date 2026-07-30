/**
 * Traducción de errores de las funciones de B3 a respuestas HTTP.
 *
 * Las funciones de Postgres (curso_abrir_mes, curso_cerrar_mes,
 * curso_registrar_pago, curso_borrar_modulo) lanzan con SQLSTATE explícito y con
 * un mensaje ya redactado para que lo lea un humano. Aquí solo se mapea el
 * código a un status HTTP y se deja pasar el mensaje: reescribirlo aquí sería
 * tener el texto en dos sitios, y el de la función es el que conoce el tope real
 * y el estado real.
 */
import type { PostgrestError } from '@supabase/supabase-js'

/** SQLSTATE → HTTP, con el mensaje que ya trae la función. */
export function errorDeRpcCurso(error: PostgrestError): { status: number; mensaje: string } {
  const mensaje = error.message || 'No se pudo completar la operación'
  switch (error.code) {
    case '42501': // insufficient_privilege — lo lanza la función si no es admin
      return { status: 403, mensaje }
    case 'P0002': // no_data_found — inscripción o módulo inexistente
      return { status: 404, mensaje }
    case '40001': // serialization_failure — el valor esperado no coincide (doble clic)
      return { status: 409, mensaje }
    case '22023': // invalid_parameter_value — tope alcanzado, estado inválido, monto <= 0
      return { status: 422, mensaje }
    default:
      return { status: 500, mensaje }
  }
}

/** Conceptos de pago propios de la vertical de cursos. */
export const CONCEPTOS_CURSO = ['curso_mensualidad', 'curso_inscripcion', 'curso_otro'] as const
export type ConceptoCurso = (typeof CONCEPTOS_CURSO)[number]

/**
 * ⚠️ NO reutilizar 'mensualidad' para un pago de curso.
 *
 * La función estado_cuenta_alumnos() cuenta los meses pagados del PROGRAMA con
 *   WHERE p.concepto = 'mensualidad' ... COUNT(DISTINCT p.mes_desbloqueado)
 * (supabase/migrations/20260716160000_estado_cuenta.sql). Si un pago de
 * diplomado usara ese concepto, el alumno aparecería al corriente del programa
 * tradicional por haber pagado un curso. Verificado en el cluster scratch: con
 * 'curso_mensualidad' la vista reporta meses_con_pago = 0; cambiándolo a
 * 'mensualidad' salta a 1.
 *
 * ⚠️ El blindaje cubre el CONTEO de meses, no todo: la subconsulta
 * fecha_ultimo_pago de esa misma vista no filtra por concepto, así que un pago
 * de curso sí mueve la columna "Último pago" del estado de cuenta del programa.
 */
export const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'] as const

export function esConceptoCurso(v: unknown): v is ConceptoCurso {
  return typeof v === 'string' && (CONCEPTOS_CURSO as readonly string[]).includes(v)
}

export function esMetodoPago(v: unknown): boolean {
  return typeof v === 'string' && (METODOS_PAGO as readonly string[]).includes(v.toUpperCase())
}

/** Estados válidos de una inscripción (CHECK de B1). */
export const ESTADOS_INSCRIPCION = ['activa', 'suspendida', 'completada', 'cancelada'] as const
export type EstadoInscripcion = (typeof ESTADOS_INSCRIPCION)[number]

export function esEstadoInscripcion(v: unknown): v is EstadoInscripcion {
  return typeof v === 'string' && (ESTADOS_INSCRIPCION as readonly string[]).includes(v)
}

/**
 * Valida una fecha YYYY-MM-DD REAL. El regex solo no basta: new Date('2026-02-30')
 * hace roll-over silencioso y Postgres devolvería un 500 críptico. Mismo criterio
 * que api/admin/pagos/route.ts, que ya lo resolvió así.
 */
export function fechaValida(f: unknown): f is string {
  if (typeof f !== 'string') return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f)
  if (!m) return false
  const d = new Date(`${f}T12:00:00`)
  return !Number.isNaN(d.getTime())
    && d.getFullYear() === Number(m[1])
    && d.getMonth() + 1 === Number(m[2])
    && d.getDate() === Number(m[3])
}
