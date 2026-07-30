import { test, expect } from '@playwright/test'
import {
  ORDEN_SIN_DEFINIR,
  limiteVentana,
  mesDeLiberacion,
  modulosVisibles,
  resolverOrden,
  tieneAccesoModulo,
} from '@/lib/cursos/acceso'

/**
 * Ventana de pago de Solo-Cursos.
 *
 *   módulos visibles = meses_desbloqueados × modulos_por_mes,
 *   como techo absoluto sobre `orden` (0-based).
 *
 * Estas pruebas existen sobre todo para clavar los TRES modos de falla que este
 * candado ya tuvo en el módulo de materias:
 *   1. El ratchet (Bug 61): completar no puede correr la ventana.
 *   2. La divergencia de desempate: `orden` NULL no puede regalar un módulo.
 *   3. Falla abierta: un dato faltante no puede significar pase libre.
 */

const CURSO = { modulos_por_mes: 2, estado: 'publicado' }
const ACTIVA = { meses_desbloqueados: 1, estado: 'activa', fecha_vencimiento: null }

/** Módulos 0-based, como los numera la app: el primero es `orden: 0`. */
const mods = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, orden: i }))

// ── El caso central ─────────────────────────────────────────────────────────

test('0 meses desbloqueados → cero módulos visibles', () => {
  const insc = { ...ACTIVA, meses_desbloqueados: 0 }
  expect(limiteVentana(insc, CURSO)).toBe(0)
  expect(modulosVisibles(mods(5), insc, CURSO)).toHaveLength(0)
})

test('1 mes con modulos_por_mes=2 → módulos 1 y 2, nunca el 3', () => {
  expect(limiteVentana(ACTIVA, CURSO)).toBe(2)

  const visibles = modulosVisibles(mods(5), ACTIVA, CURSO)
  expect(visibles.map(m => m.id)).toEqual(['m1', 'm2'])

  // El tercero (orden 2) queda fuera: la comparación es estricta porque `orden`
  // es 0-based.
  expect(tieneAccesoModulo({ inscripcion: ACTIVA, curso: CURSO, modulo: { orden: 2 } })).toBe(false)
})

test('la ventana crece por mes pagado, no por otra cosa', () => {
  const porMes = (m: number) => modulosVisibles(mods(8), { ...ACTIVA, meses_desbloqueados: m }, CURSO).length
  expect([porMes(0), porMes(1), porMes(2), porMes(3), porMes(4)]).toEqual([0, 2, 4, 6, 8])
})

// ── Modo de falla 1: el ratchet (Bug 61) ────────────────────────────────────

test('RATCHET: completar los módulos 1 y 2 NO revela el 3', () => {
  // El helper ni siquiera acepta progreso: el techo es sobre `orden`. Aunque el
  // llamador crea que "ya no quedan pendientes", el módulo 3 sigue cerrado.
  const conProgreso = mods(5).map(m => ({ ...m, completada: m.orden <= 1 }))

  const visibles = modulosVisibles(conProgreso, ACTIVA, CURSO)
  expect(visibles.map(m => m.id)).toEqual(['m1', 'm2'])
  expect(tieneAccesoModulo({ inscripcion: ACTIVA, curso: CURSO, modulo: conProgreso[2] })).toBe(false)
})

test('RATCHET: un módulo completado sigue ocupando su posición', () => {
  // Si el techo contara pendientes en vez de posiciones, completar los dos
  // primeros dejaría "0 usados" y abriría dos más. Aquí el límite no se mueve.
  expect(limiteVentana(ACTIVA, CURSO)).toBe(2)
  expect(modulosVisibles(mods(5), ACTIVA, CURSO)).toHaveLength(2)
})

// ── Modo de falla 2: la divergencia de desempate ────────────────────────────

test('orden NULL NO concede un módulo extra: va al final y queda bloqueado', () => {
  expect(resolverOrden({ orden: null })).toBe(ORDEN_SIN_DEFINIR)
  expect(resolverOrden({ orden: undefined })).toBe(ORDEN_SIN_DEFINIR)
  expect(resolverOrden(undefined)).toBe(ORDEN_SIN_DEFINIR)

  const conNulo = [{ id: 'm1', orden: 0 }, { id: 'm2', orden: 1 }, { id: 'sinOrden', orden: null }]
  const visibles = modulosVisibles(conNulo, ACTIVA, CURSO)
  expect(visibles.map(m => m.id)).toEqual(['m1', 'm2'])
  expect(visibles.map(m => m.id)).not.toContain('sinOrden')
})

test('orden NULL tampoco se cuela con la ventana abierta de par en par', () => {
  const generosa = { ...ACTIVA, meses_desbloqueados: 999 }
  // Ni siquiera un límite enorme lo alcanza: ORDEN_SIN_DEFINIR es MAX_SAFE_INTEGER.
  expect(tieneAccesoModulo({ inscripcion: generosa, curso: CURSO, modulo: { orden: null } })).toBe(false)
})

// ── Modo de falla 3: falla cerrado ──────────────────────────────────────────

test('inscripción suspendida o cancelada → sin acceso', () => {
  for (const estado of ['suspendida', 'cancelada']) {
    const insc = { ...ACTIVA, meses_desbloqueados: 3, estado }
    expect(limiteVentana(insc, CURSO)).toBe(0)
    expect(modulosVisibles(mods(5), insc, CURSO)).toHaveLength(0)
  }
})

test("inscripción 'completada' conserva lo liberado y no abre más", () => {
  const insc = { ...ACTIVA, meses_desbloqueados: 1, estado: 'completada' }
  expect(limiteVentana(insc, CURSO)).toBe(2)
  expect(modulosVisibles(mods(5), insc, CURSO).map(m => m.id)).toEqual(['m1', 'm2'])
})

test('fecha_vencimiento pasada → sin acceso; futura o NULL → concede', () => {
  const vencida = { ...ACTIVA, fecha_vencimiento: '2020-01-01' }
  expect(limiteVentana(vencida, CURSO)).toBe(0)

  const vigente = { ...ACTIVA, fecha_vencimiento: '2999-12-31' }
  expect(limiteVentana(vigente, CURSO)).toBe(2)

  expect(limiteVentana({ ...ACTIVA, fecha_vencimiento: null }, CURSO)).toBe(2)
})

test('datos faltantes → falla CERRADO, nunca pase libre', () => {
  expect(limiteVentana(null, CURSO)).toBe(0)
  expect(limiteVentana(undefined, CURSO)).toBe(0)
  expect(limiteVentana(ACTIVA, null)).toBe(0)
  expect(limiteVentana(ACTIVA, undefined)).toBe(0)
  // sin meses_desbloqueados
  expect(limiteVentana({ estado: 'activa' }, CURSO)).toBe(0)
  // sin modulos_por_mes
  expect(limiteVentana(ACTIVA, { estado: 'publicado' })).toBe(0)
  // valores basura
  expect(limiteVentana({ ...ACTIVA, meses_desbloqueados: NaN }, CURSO)).toBe(0)
  expect(limiteVentana(ACTIVA, { ...CURSO, modulos_por_mes: 0 })).toBe(0)
  expect(limiteVentana({ ...ACTIVA, meses_desbloqueados: -5 }, CURSO)).toBe(0)
  // sin módulo
  expect(tieneAccesoModulo({ inscripcion: ACTIVA, curso: CURSO, modulo: null })).toBe(false)
})

test('curso no publicado → sin acceso aunque haya meses pagados', () => {
  const borrador = { ...CURSO, estado: 'borrador' }
  expect(limiteVentana({ ...ACTIVA, meses_desbloqueados: 5 }, borrador)).toBe(0)
})

// ── Presentación ────────────────────────────────────────────────────────────

test('mesDeLiberacion es 1-based y coincide con la ventana', () => {
  expect(mesDeLiberacion({ orden: 0 }, CURSO)).toBe(1)
  expect(mesDeLiberacion({ orden: 1 }, CURSO)).toBe(1)
  expect(mesDeLiberacion({ orden: 2 }, CURSO)).toBe(2)
  expect(mesDeLiberacion({ orden: 5 }, CURSO)).toBe(3)
  expect(mesDeLiberacion({ orden: null }, CURSO)).toBeNull()

  // Coherencia: un módulo es visible exactamente cuando su mes de liberación ya
  // está pagado. Si estas dos ideas divergen, la UI miente.
  for (let orden = 0; orden < 10; orden++) {
    for (let meses = 0; meses <= 5; meses++) {
      const insc = { ...ACTIVA, meses_desbloqueados: meses }
      const visible = tieneAccesoModulo({ inscripcion: insc, curso: CURSO, modulo: { orden } })
      expect(visible).toBe(mesDeLiberacion({ orden }, CURSO)! <= meses)
    }
  }
})

// ── El bug que el propio gate introdujo: el denominador que encoge ──────────

test('DENOMINADOR: completar lo desbloqueado NO es completar el curso', () => {
  // Efecto de segundo orden de la RLS de B2: como solo devuelve las lecciones
  // en ventana, contar con la sesión del alumno encoge el denominador. Un
  // alumno con 1 de 6 meses completaría "sus" 2 lecciones y llegaría a 100 %
  // con `completado: true` — y con curso_constancias ya creada, eso acabaría
  // certificando un diplomado pagado a un sexto.
  //
  // La regla: numerador = lo completado (sesión); denominador = curso ENTERO.
  const { porcentajeProgreso, cursoCompletado } = require('@/lib/cursos/progreso')

  const leccionesVisibles = 2   // lo que devuelve la RLS con 1 mes pagado
  const leccionesDelCurso = 12  // lo que realmente tiene el diplomado
  const completadas = 2         // el alumno terminó todo lo que puede ver

  // Con el denominador encogido (el bug): 100 % y "completado" con 1 de 6 meses.
  expect(porcentajeProgreso(completadas, leccionesVisibles)).toBe(100)
  expect(cursoCompletado(completadas, leccionesVisibles)).toBe(true)  // ← miente

  // Con el denominador correcto:
  expect(porcentajeProgreso(completadas, leccionesDelCurso)).toBeLessThan(20)
  expect(cursoCompletado(completadas, leccionesDelCurso)).toBe(false)
})
