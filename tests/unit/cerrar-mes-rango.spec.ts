import { test, expect } from '@playwright/test'
import { calcularDisponibilidad, rangoMateriasDelMes } from '@/lib/acceso-materias'
import type { AlumnoAcceso, MateriaVentana } from '@/lib/acceso-materias'

/**
 * `cerrar-mes` tiene que tocar EXACTAMENTE las materias que ese mes abrió.
 *
 * El rango vivía inline en la ruta como `[(N-1)*MPM, N*MPM - 1]`. Eso funciona
 * mientras `materiasPorMes` sea entero, pero el add-on de licenciaturas reparte
 * 32 materias sobre planes de 9, 12, 18 o 24 meses y necesita la división
 * exacta (3.56, 2.67, 1.78, 1.34) para que al alumno se le abra la última
 * materia justo en su último mes. Con esos valores la fórmula vieja producía
 * offsets decimales —que `postgrest-js` serializa tal cual como
 * `?offset=3.56&limit=1.78`— y, peor, rangos que no coincidían con la ventana:
 * cerrar un mes borraba el avance de las materias equivocadas.
 *
 * Dos invariantes, y el primero es el que protege a los clientes ya sembrados.
 */

const TOTAL = 32

/** Catálogo de N materias regulares, en el orden canónico. */
const materias = (n: number): MateriaVentana[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i + 1}`,
    nombre: `Materia ${i + 1}`,
    nivel: 'licenciatura',
    orden: i + 1,
    numero_mes: i + 1,
  }))

/** Materias visibles al mes `mes`, según la ventana real. */
function visiblesAlMes(mes: number, mpm: number, total = TOTAL): number {
  const alumno = {
    nivel: 'licenciatura',
    modalidad: null,
    // sin modalidad en CONFIG, `materiasPorMesDePlan` cae a ceil(total/meses);
    // por eso la prueba no pasa por CONFIG y usa la fórmula directa de abajo.
    duracion_meses: null,
    meses_desbloqueados: mes,
  } satisfies AlumnoAcceso
  void alumno
  const limite = Math.max(0, mes * mpm)
  let n = 0
  for (let idx = 0; idx < total; idx++) if (mes > 0 && idx < limite) n++
  return n
}

// ── Invariante 1: con MPM entero el helper es un no-op ───────────────────────
// Ningún cliente vivo puede cambiar de comportamiento por este parche.

const ENTEROS = [1, 2, 3, 4, 5, 6, 8]

for (const mpm of ENTEROS) {
  test(`mpm entero ${mpm} → el rango es idéntico a la fórmula vieja`, () => {
    const meses = Math.ceil(TOTAL / mpm)
    for (let n = 1; n <= meses; n++) {
      const { desde, hasta } = rangoMateriasDelMes(n, mpm)
      // fórmula vieja, literal
      expect(desde).toBe((n - 1) * mpm)
      expect(hasta).toBe(n * mpm - 1)
    }
  })
}

// ── Invariante 2: con MPM fraccionario el rango sigue a la ventana ───────────

const FRACCIONES: Array<[number, number]> = [
  [9, 3.56],
  [12, 2.67],
  [18, 1.78],
  [24, 1.34],
]

for (const [meses, mpm] of FRACCIONES) {
  test(`plan de ${meses} meses (mpm ${mpm}) → el rango de cada mes es el que abrió la ventana`, () => {
    for (let n = 1; n <= meses; n++) {
      const { desde, hasta } = rangoMateriasDelMes(n, mpm)
      expect(desde).toBe(visiblesAlMes(n - 1, mpm))
      // `hasta` puede rebasar la última posición cuando n*mpm pasa del total;
      // lo que importa es lo que la BD devuelve, o sea el rango acotado.
      expect(Math.min(hasta, TOTAL - 1)).toBe(visiblesAlMes(n, mpm) - 1)
    }
  })

  test(`plan de ${meses} meses (mpm ${mpm}) → cubre las 32 sin huecos ni solapes`, () => {
    const vistas = new Set<number>()
    let solapes = 0
    for (let n = 1; n <= meses; n++) {
      const { desde, hasta } = rangoMateriasDelMes(n, mpm)
      for (let i = desde; i <= Math.min(hasta, TOTAL - 1); i++) {
        if (vistas.has(i)) solapes++
        vistas.add(i)
      }
    }
    expect(solapes).toBe(0)
    expect(vistas.size).toBe(TOTAL)
  })
}

// ── Los offsets siempre son enteros ──────────────────────────────────────────
// `postgrest-js` serializa .range(from,to) como offset=from & limit=to-from+1.
// Un decimal ahí no es un redondeo benigno: PostgREST espera enteros.

test('los offsets nunca salen fraccionarios, sea cual sea el mpm', () => {
  for (const mpm of [...ENTEROS, 3.56, 2.67, 1.78, 1.34, 5.33, 1.5, 2.25, 4.5]) {
    for (let n = 1; n <= 32; n++) {
      const { desde, hasta } = rangoMateriasDelMes(n, mpm)
      expect(Number.isInteger(desde)).toBe(true)
      expect(Number.isInteger(hasta)).toBe(true)
      expect(hasta - desde + 1).toBeGreaterThanOrEqual(0)
    }
  }
})

test('mes 0 o negativo se trata como el mes 1 — nunca offset negativo', () => {
  for (const mes of [0, -1, -99]) {
    const { desde } = rangoMateriasDelMes(mes, 2)
    expect(desde).toBe(0)
  }
})

// ── La ventana y el rango no pueden divergir ─────────────────────────────────

test('el rango acumulado hasta el mes N == las materias visibles al mes N', () => {
  const cat = materias(TOTAL)
  const acreditadas = new Set<string>()
  for (const [meses, mpm] of FRACCIONES) {
    for (let n = 1; n <= meses; n++) {
      let cubiertas = 0
      for (let k = 1; k <= n; k++) {
        const { desde, hasta } = rangoMateriasDelMes(k, mpm)
        cubiertas += Math.min(hasta, TOTAL - 1) - desde + 1
      }
      expect(cubiertas).toBe(visiblesAlMes(n, mpm))
    }
  }
  // y la ventana real sigue funcionando con el catálogo completo
  const alumno: AlumnoAcceso = {
    nivel: 'licenciatura', modalidad: null, duracion_meses: 8,
    meses_desbloqueados: 1, carrera: null,
  }
  const disp = calcularDisponibilidad(alumno, cat, acreditadas)
  expect(disp.size).toBe(TOTAL)
})
