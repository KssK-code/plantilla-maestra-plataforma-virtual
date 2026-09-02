import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { calcularDisponibilidad, toMateriaVentana, type AlumnoAcceso, type MateriaVentana } from '@/lib/acceso-materias'
import { armarBoletin, normalizarCalificaciones, resumirBoletin } from '@/lib/boletin'

/**
 * Boletín (calificaciones + constancia) — invariante Bug 59 aplicada al boletín
 * (Bug 138):
 *
 *   materia `disponible` en /api/alumno/materias  ⇔  aparece en el boletín,
 *   y toda fila de `calificaciones` es visible SIEMPRE (canon Bug 54).
 *
 * Caso real que lo rompió (renacimiento, IVS-2026-0004, 2026-09-01): alumna de
 * preparatoria, 3 meses × 4 materias, inscripcion_pagada=false, 10 acreditadas
 * → el boletín mostraba "Acreditadas 0 / Pendientes 1 (la demo)". Ningún gate
 * lee inscripcion_pagada; el boletín sí lo hacía.
 */

const raiz = process.cwd()
// Normaliza CRLF → LF antes de mirar el texto (ver corregir-plan.spec.ts).
const leer = (p: string) =>
  readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const RUTAS_BOLETIN = [
  'src/app/api/alumno/calificaciones/route.ts',
  'src/app/api/alumno/constancia/route.ts',
]

// ── Fixtures: el plan de preparatoria del cliente + la demo ──────────────────

// 12 regulares con orden 1..12 y numero_mes 1..6 (dos por mes), más la demo.
const PLAN: MateriaVentana[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `prepa-${i + 1}`,
    nombre: `Materia ${i + 1}`,
    nivel: 'preparatoria',
    orden: i + 1,
    numero_mes: Math.floor(i / 2) + 1,
  })),
  { id: 'demo', nombre: 'Tutoría de Ingreso I', nivel: 'demo', orden: 0, numero_mes: 1 },
]

const mat = (id: string): MateriaVentana => {
  const m = PLAN.find(p => p.id === id)
  if (!m) throw new Error(`fixture sin ${id}`)
  return m
}

// 3_meses del cliente: materiasPorMes = 4 (CONFIG). Si la config de la plantilla
// no trae '3_meses' el helper cae a ceil(12/3) = 4: mismo límite.
const ANAIS: AlumnoAcceso = {
  nivel: 'preparatoria',
  modalidad: '3_meses',
  duracion_meses: 3,
  meses_desbloqueados: 3,
  inscripcion_pagada: false,
}

const califs = (acreditadas: string[], noAcreditadas: string[] = []) => [
  ...acreditadas.map(id => ({ materia_id: id, acreditado: true, materia: mat(id) })),
  ...noAcreditadas.map(id => ({ materia_id: id, acreditado: false, materia: mat(id) })),
]

const setAcreditadas = (cs: { materia_id: string; acreditado: boolean }[]) =>
  new Set(cs.filter(c => c.acreditado).map(c => c.materia_id))

const pendientesDe = (fs: ReturnType<typeof armarBoletin>) =>
  fs.filter(f => f.estado === 'Pendiente').map(f => f.materia.id)

// ── El caso del ticket ───────────────────────────────────────────────────────

test('IVS-2026-0004: 10 acreditadas con inscripcion_pagada=false se ven todas', () => {
  const acreditadas = ['prepa-1', 'prepa-2', 'prepa-3', 'prepa-4', 'prepa-5',
                       'prepa-6', 'prepa-7', 'prepa-8', 'prepa-9', 'prepa-11']
  const cs = califs(acreditadas)
  const filas = armarBoletin(ANAIS, PLAN, cs, setAcreditadas(cs))
  const resumen = resumirBoletin(filas)

  expect(resumen.materias_acreditadas).toBe(10)
  expect(resumen.materias_no_acreditadas).toBe(0)
  // Ventana 3 × 4 = 12: las dos regulares sin calificar (10 y 12). La demo no
  // cuenta como pendiente (no es parte del plan).
  expect(pendientesDe(filas)).toEqual(['prepa-10', 'prepa-12'])
  expect(resumen.total_materias_plan).toBe(12)
})

test('inscripcion_pagada NO decide el universo: mismo boletín con true y con false', () => {
  const cs = califs(['prepa-1'])
  const conPago = armarBoletin({ ...ANAIS, inscripcion_pagada: true }, PLAN, cs, setAcreditadas(cs))
  const sinPago = armarBoletin({ ...ANAIS, inscripcion_pagada: false }, PLAN, cs, setAcreditadas(cs))
  expect(sinPago).toEqual(conPago)
})

// ── Invariante lista ⇔ boletín ───────────────────────────────────────────────

test('Pendientes == disponibles sin calificación, para cualquier número de meses', () => {
  const cs = califs(['prepa-1', 'prepa-2'], ['prepa-3'])
  const acreditadas = setAcreditadas(cs)
  for (const meses of [0, 1, 2, 3, 6]) {
    const alumno = { ...ANAIS, meses_desbloqueados: meses }
    const disponibilidad = calcularDisponibilidad(alumno, PLAN, acreditadas)
    const esperadas = PLAN
      .filter(m => m.nivel !== 'demo')
      .filter(m => disponibilidad.get(m.id) === true && !cs.some(c => c.materia_id === m.id))
      .map(m => m.id)
      .sort()
    const pendientes = pendientesDe(armarBoletin(alumno, PLAN, cs, acreditadas)).sort()
    expect(pendientes, `meses=${meses}`).toEqual(esperadas)
  }
})

test('Pendiente sale por POSICIÓN en la ventana, no por numero_mes crudo', () => {
  // Materia en posición 1 pero con contenido etiquetado como mes 6, y materia
  // en posición 12 con contenido de mes 1. Con 1 mes pagado (4 lugares) la
  // primera abre y la última no — como en Mis Materias. El criterio viejo
  // (`numero_mes <= meses_desbloqueados`) decía exactamente lo contrario.
  const plan: MateriaVentana[] = PLAN.map(m =>
    m.id === 'prepa-1'  ? { ...m, numero_mes: 6 } :
    m.id === 'prepa-12' ? { ...m, numero_mes: 1 } : m
  )
  const filas = armarBoletin({ ...ANAIS, meses_desbloqueados: 1 }, plan, [], new Set())
  const ids = filas.map(f => f.materia.id)
  expect(ids).toContain('prepa-1')
  expect(ids).not.toContain('prepa-12')
  // Y el mes que se pinta es el de la materia, no el de la ventana.
  expect(filas.find(f => f.materia.id === 'prepa-1')?.mes_numero).toBe(6)
})

test('RATCHET (Bug 61): acreditar no revela pendientes nuevas en el boletín', () => {
  const alumno = { ...ANAIS, meses_desbloqueados: 1 }
  const sinAcreditar = armarBoletin(alumno, PLAN, [], new Set())
  const cs = califs(['prepa-1', 'prepa-2', 'prepa-3', 'prepa-4'])
  const conAcreditadas = armarBoletin(alumno, PLAN, cs, setAcreditadas(cs))
  // Antes: 4 regulares pendientes. Después: ninguna — acreditar no abre nada.
  expect(pendientesDe(sinAcreditar)).toEqual(['prepa-1', 'prepa-2', 'prepa-3', 'prepa-4'])
  expect(pendientesDe(conAcreditadas)).toEqual([])
  expect(conAcreditadas.filter(f => f.estado === 'Acreditada')).toHaveLength(4)
})

// ── La demo: nunca Pendiente, sí Acreditada si la presentó ───────────────────

test('la demo (nivel demo) no sale como Pendiente, pero sí con su calificación', () => {
  const sinCalif = armarBoletin(ANAIS, PLAN, [], new Set())
  expect(sinCalif.map(f => f.materia.id)).not.toContain('demo')
  const cs = califs(['demo'])
  const conCalif = armarBoletin(ANAIS, PLAN, cs, setAcreditadas(cs))
  expect(conCalif.find(f => f.materia.id === 'demo')?.estado).toBe('Acreditada')
})

test('la exclusión es por NIVEL demo, no por nombre: la Tutoría de ingreso de prepa sí es del plan', () => {
  // esTutorial() atrapa por nombre ("tutor") y no consume lugar en la ventana,
  // pero la materia es de preparatoria y forma parte del plan: debe listarse.
  const plan = PLAN.map(m => m.id === 'prepa-1' ? { ...m, nombre: 'Tutoría de ingreso I' } : m)
  const filas = armarBoletin({ ...ANAIS, meses_desbloqueados: 1 }, plan, [], new Set())
  expect(filas.find(f => f.materia.id === 'prepa-1')?.estado).toBe('Pendiente')
  expect(filas.map(f => f.materia.id)).not.toContain('demo')
})

// ── Canon Bug 54: la calificación siempre se ve ──────────────────────────────

test('una calificación fuera de la ventana sigue visible', () => {
  const cs = califs(['prepa-12'], ['prepa-11'])
  const filas = armarBoletin({ ...ANAIS, meses_desbloqueados: 1 }, PLAN, cs, setAcreditadas(cs))
  expect(filas.find(f => f.materia.id === 'prepa-12')?.estado).toBe('Acreditada')
  expect(filas.find(f => f.materia.id === 'prepa-11')?.estado).toBe('No acreditada')
})

test('HISTORIAL: una materia archivada (fuera del catálogo activo) conserva su calificación', () => {
  const catalogoActivo = PLAN.filter(m => m.id !== 'prepa-5')
  const cs = califs(['prepa-5'])
  const filas = armarBoletin(ANAIS, catalogoActivo, cs, setAcreditadas(cs))
  const fila = filas.find(f => f.materia.id === 'prepa-5')
  expect(fila?.estado).toBe('Acreditada')
  expect(fila?.mes_numero).toBe(3)
  // …pero una archivada SIN calificación no aparece como pendiente.
  const sinCalif = armarBoletin(ANAIS, catalogoActivo, [], new Set())
  expect(sinCalif.map(f => f.materia.id)).not.toContain('prepa-5')
})

test('HISTORIAL: el mes de una calificada cuenta sus meses ARCHIVADOS; el catálogo no', () => {
  // La materia tiene un solo mes y el admin lo archivó después de acreditarla.
  // En la ventana ese mes ya no cuenta (toMateriaVentana lo descarta: no debe
  // correr posiciones), pero en el boletín la calificación sigue bajo el mes
  // en que se cursó, no bajo "Mes 0".
  const embed = {
    id: 'prepa-3', nombre: 'Materia 3', nivel: 'preparatoria', orden: 3,
    meses_contenido: [{ numero_mes: 2, activa: false }],
  }
  expect(toMateriaVentana(embed).numero_mes).toBeNull()
  const cs = normalizarCalificaciones([{ materia_id: 'prepa-3', acreditado: true, materias: embed }])
  expect(cs[0].materia?.numero_mes).toBe(2)
  // Con la materia todavía en el catálogo (sin meses activos → numero_mes null)…
  const catalogo = PLAN.map(m => m.id === 'prepa-3' ? { ...m, numero_mes: null } : m)
  const enCatalogo = armarBoletin(ANAIS, catalogo, cs, setAcreditadas(cs))
  expect(enCatalogo.find(f => f.materia.id === 'prepa-3')?.mes_numero).toBe(2)
  // …y ya fuera del catálogo (materia archivada), el mismo mes.
  const fuera = armarBoletin(ANAIS, PLAN.filter(m => m.id !== 'prepa-3'), cs, setAcreditadas(cs))
  expect(fuera.find(f => f.materia.id === 'prepa-3')?.mes_numero).toBe(2)
})

test('una entrada por materia aunque tenga varios meses; el mes es el mínimo', () => {
  const rows = [{
    materia_id: 'prepa-1',
    acreditado: true,
    materias: {
      id: 'prepa-1', nombre: 'Materia 1', nivel: 'preparatoria', orden: 1,
      meses_contenido: [{ numero_mes: 4 }, { numero_mes: 2 }],
    },
  }]
  const cs = normalizarCalificaciones(rows)
  expect(cs[0].materia?.numero_mes).toBe(2)
  const filas = armarBoletin(ANAIS, PLAN, cs, setAcreditadas(cs))
  expect(filas.filter(f => f.materia.id === 'prepa-1')).toHaveLength(1)
})

test('acreditado null o ausente NO acredita: falla cerrado', () => {
  const cs = normalizarCalificaciones([{ materia_id: 'prepa-1', acreditado: null, materias: mat('prepa-1') }])
  expect(cs[0].acreditado).toBe(false)
  const filas = armarBoletin(ANAIS, PLAN, cs, new Set())
  expect(filas.find(f => f.materia.id === 'prepa-1')?.estado).toBe('No acreditada')
})

// ── Las rutas consumen el helper y no recalculan nada inline ─────────────────

test('calificaciones y constancia consumen lib/boletin y no leen inscripcion_pagada', () => {
  for (const ruta of RUTAS_BOLETIN) {
    const src = leer(ruta)
    expect(src, `${ruta} no importa lib/boletin`).toMatch(/from '@\/lib\/boletin'/)
    expect(src, `${ruta} no usa cargarContextoAcceso`).toContain('cargarContextoAcceso(')
    expect(src, `${ruta} vuelve a decidir por inscripcion_pagada`).not.toMatch(/inscripcionPagada\s*\?/)
    expect(src, `${ruta} vuelve a usar numero_mes crudo`).not.toMatch(/numero_mes\s*<=|lte\('numero_mes'/)
    expect(src, `${ruta} vuelve a armar el universo desde meses_contenido`).not.toMatch(/from\('meses_contenido'\)/)
  }
})
