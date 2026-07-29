/**
 * Bug 61 — Simulación del ratchet de la ventana deslizante.
 *
 * Compara el algoritmo VIEJO (inline en /api/alumno/materias, donde las
 * acreditadas hacían `continue` sin consumir lugar) contra el helper NUEVO
 * (lib/acceso-materias, donde consumen su posición absoluta).
 *
 * Escenario: catálogo de 11 materias regulares + 2 tutoriales, plan de 6 meses
 * (materiasPorMes = 2 en CONFIG) y 1 mes pagado.
 *
 *   VIEJO → el alumno acredita las 11 (cada acreditación revela la siguiente).
 *   NUEVO → exactamente 1 × 2 = 2.
 *
 * Ejecutar:
 *   npx tsc scripts/simulacion-bug-61.ts --outDir .sim --module commonjs \
 *     --target es2022 --moduleResolution node --skipLibCheck
 *   node .sim/scripts/simulacion-bug-61.js
 */

import {
  calcularDisponibilidad,
  materiasPorMesDePlan,
  type AlumnoAcceso,
  type MateriaVentana,
} from '../src/lib/acceso-materias'

// ── Catálogo de prueba ────────────────────────────────────────────────────────

const REGULARES = 11

const catalogo: MateriaVentana[] = [
  ...Array.from({ length: REGULARES }, (_, i) => ({
    id: `mat-${i + 1}`,
    nombre: `Materia ${i + 1}`,
    nivel: 'preparatoria' as string | null,
    orden: i + 1,
    numero_mes: Math.floor(i / 2) + 1,
  })),
  { id: 'tut-1', nombre: 'Tutorial de Ingreso', nivel: 'demo', orden: 0, numero_mes: null },
  { id: 'tut-2', nombre: 'Tutoría de Plataforma', nivel: 'preparatoria', orden: 99, numero_mes: null },
]

const alumnoBase: AlumnoAcceso = {
  nivel: 'preparatoria',
  modalidad: '6_meses',
  duracion_meses: 6,
  meses_desbloqueados: 1,
  inscripcion_pagada: true,
}

// ── Algoritmo VIEJO (copia literal del inline que se elimina) ─────────────────

function disponibilidadVieja(
  alumno: AlumnoAcceso,
  materias: MateriaVentana[],
  acreditadas: Set<string>,
  materiasPorMes: number
): Map<string, boolean> {
  const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0
  const limiteMaterias = Math.max(0, mesesDesbloqueados * materiasPorMes)
  const sorted = [...materias].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const out = new Map<string, boolean>()
  let idxPendiente = 0
  for (const mat of sorted) {
    const esTut = mat.nivel === 'demo' || mat.nombre.toLowerCase().includes('tutor')
    if (esTut || acreditadas.has(mat.id)) {
      out.set(mat.id, true)
      continue // ← el ratchet: no incrementa idxPendiente
    }
    out.set(mat.id, mesesDesbloqueados > 0 && idxPendiente < limiteMaterias)
    idxPendiente++
  }
  return out
}

// ── Explotación: acreditar todo lo alcanzable, en bucle, hasta punto fijo ─────

type Modelo = (acreditadas: Set<string>) => Map<string, boolean>

function acreditarHastaPuntoFijo(modelo: Modelo): Set<string> {
  const acreditadas = new Set<string>()
  const regulares = catalogo.filter(
    m => !(m.nivel === 'demo' || m.nombre.toLowerCase().includes('tutor'))
  )

  for (let vuelta = 0; vuelta < REGULARES + 2; vuelta++) {
    const disp = modelo(acreditadas)
    const nuevas = regulares.filter(m => disp.get(m.id) === true && !acreditadas.has(m.id))
    if (nuevas.length === 0) break
    // El alumno presenta y aprueba cada materia que la plataforma le deja abrir.
    for (const m of nuevas) acreditadas.add(m.id)
  }
  return acreditadas
}

// ── Ejecución ─────────────────────────────────────────────────────────────────

const materiasPorMes = materiasPorMesDePlan(alumnoBase, REGULARES)
const esperadoNuevo = alumnoBase.meses_desbloqueados * materiasPorMes

const viejo = acreditarHastaPuntoFijo(a =>
  disponibilidadVieja(alumnoBase, catalogo, a, materiasPorMes)
)
const nuevo = acreditarHastaPuntoFijo(a => calcularDisponibilidad(alumnoBase, catalogo, a))

console.log('══ Bug 61 — ratchet de la ventana deslizante ══')
console.log(`Catálogo: ${REGULARES} materias regulares + 2 tutoriales`)
console.log(`Plan: ${alumnoBase.duracion_meses} meses · materiasPorMes = ${materiasPorMes} (CONFIG)`)
console.log(`Meses pagados: ${alumnoBase.meses_desbloqueados}`)
console.log('')
console.log(`  ANTES (ratchet)  → acredita ${viejo.size}/${REGULARES} materias`)
console.log(`  DESPUÉS (helper) → acredita ${nuevo.size}/${REGULARES} materias  (esperado ${esperadoNuevo})`)
console.log('')

const fallos: string[] = []

if (viejo.size !== REGULARES) {
  fallos.push(`El modelo viejo debía acreditar las ${REGULARES}; acreditó ${viejo.size}`)
}
if (nuevo.size !== esperadoNuevo) {
  fallos.push(`El modelo nuevo debía acreditar ${esperadoNuevo}; acreditó ${nuevo.size}`)
}

// Acreditar no debe mover la frontera: con las 2 primeras acreditadas, la 3ª
// sigue cerrada mientras no se pague el mes 2.
const trasAcreditar = calcularDisponibilidad(alumnoBase, catalogo, new Set(['mat-1', 'mat-2']))
if (trasAcreditar.get('mat-3') !== false) {
  fallos.push('Acreditar mat-1 y mat-2 abrió mat-3 (la frontera se movió)')
}
if (trasAcreditar.get('mat-1') !== true || trasAcreditar.get('mat-2') !== true) {
  fallos.push('Las acreditadas dejaron de estar disponibles (rompe constancias)')
}

// Pagar el mes 2 mueve el límite a 4 posiciones absolutas.
const dosMeses = calcularDisponibilidad(
  { ...alumnoBase, meses_desbloqueados: 2 },
  catalogo,
  new Set(['mat-1', 'mat-2'])
)
const abiertasDosMeses = catalogo.filter(m => dosMeses.get(m.id) === true).map(m => m.id)
const esperadoDosMeses = ['tut-1', 'mat-1', 'mat-2', 'mat-3', 'mat-4', 'tut-2']
if (JSON.stringify([...abiertasDosMeses].sort()) !== JSON.stringify([...esperadoDosMeses].sort())) {
  fallos.push(`Con 2 meses pagados se esperaba ${esperadoDosMeses.join(', ')}; se obtuvo ${abiertasDosMeses.join(', ')}`)
}

// Plan completo pagado → todo el catálogo abierto.
const planCompleto = calcularDisponibilidad(
  { ...alumnoBase, meses_desbloqueados: 6 },
  catalogo,
  new Set()
)
const abiertasTodo = catalogo.filter(m => planCompleto.get(m.id) === true).length
if (abiertasTodo !== catalogo.length) {
  fallos.push(`Con el plan completo pagado se esperaban ${catalogo.length} disponibles; hubo ${abiertasTodo}`)
}

// Los tutoriales nunca consumen lugar ni dependen del pago.
const sinPagar = calcularDisponibilidad(
  { ...alumnoBase, meses_desbloqueados: 0 },
  catalogo,
  new Set()
)
const abiertasSinPagar = catalogo.filter(m => sinPagar.get(m.id) === true).map(m => m.id)
if (JSON.stringify(abiertasSinPagar.sort()) !== JSON.stringify(['tut-1', 'tut-2'])) {
  fallos.push(`Sin meses pagados solo deben abrir los tutoriales; abrieron ${abiertasSinPagar.join(', ')}`)
}

console.log('Comprobaciones:')
console.log(`  · ratchet reproducido en el modelo viejo ......... ${viejo.size === REGULARES ? 'OK' : 'FALLA'}`)
console.log(`  · ventana respetada en el modelo nuevo ........... ${nuevo.size === esperadoNuevo ? 'OK' : 'FALLA'}`)
console.log(`  · acreditar no mueve la frontera ................. ${trasAcreditar.get('mat-3') === false ? 'OK' : 'FALLA'}`)
console.log(`  · acreditadas siguen disponibles ................. ${trasAcreditar.get('mat-1') === true ? 'OK' : 'FALLA'}`)
console.log(`  · pagar mes 2 abre posiciones 1-4 ................ ${abiertasDosMeses.length === 6 ? 'OK' : 'FALLA'}`)
console.log(`  · plan completo abre todo ....................... ${abiertasTodo === catalogo.length ? 'OK' : 'FALLA'}`)
console.log(`  · tutoriales siempre abiertos ................... ${abiertasSinPagar.length === 2 ? 'OK' : 'FALLA'}`)
console.log('')

if (fallos.length > 0) {
  console.error('SIMULACIÓN FALLIDA:')
  for (const f of fallos) console.error(`  ✗ ${f}`)
  process.exit(1)
}

console.log('Simulación OK — el ratchet queda cerrado y las acreditadas siguen accesibles.')
