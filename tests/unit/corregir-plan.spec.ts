import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG } from '@/lib/config'
import { getModalidadesActivas } from '@/lib/modalidades'
import { esTutorial } from '@/lib/acceso-materias'
import {
  validarCorreccionPlan, mensajeCandado, MENSAJES_CANDADO,
  CAMPOS_PERMITIDOS, NIVELES_CORREGIBLES,
} from '@/lib/corregir-plan'

/**
 * Corregir plan de estudio.
 *
 * Los invariantes que protegen estas pruebas:
 *  1. La whitelist del body es estricta: una clave desconocida rechaza TODO.
 *  2. Los seis candados viven en SQL y se re-evalúan dentro de la transacción
 *     del UPDATE — nunca se confía en que la UI escondió el botón.
 *  3. La exclusión de la materia demo es SOLO por nivel='demo'.
 *  4. La matrícula no se toca.
 *  5. Toda migración va también a schema.sql (instalaciones nuevas).
 *
 * La lógica SQL no se puede ejecutar aquí (no hay Postgres en unit); se
 * verifica leyendo la migración como fuente, igual que otros specs de esta
 * suite leen rutas y libs. La verificación en vivo la hace la FASE de port.
 */

const raiz = process.cwd()
// Normaliza los finales de linea a LF antes de que ninguna prueba mire el
// texto. En Windows `core.autocrlf=true` deja los fuentes con CRLF, y una
// prueba que recorte buscando dos saltos de linea seguidos no encuentra
// nada: el `indexOf` devuelve -1, el `slice` entrega el resto del archivo
// entero, y la asercion termina evaluandose sobre texto que no le tocaba.
// Eso tenia roja a cms-contenido-f3 en `main` desde el PR #79, con el
// codigo de la app correcto.
const leer = (p: string) =>
  readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const MIGRACION = 'supabase/migrations/20260817120000_corregir_plan_estudio.sql'
const RUTA_POST = 'src/app/api/admin/alumnos/[id]/corregir-plan/route.ts'
const RUTA_GET  = 'src/app/api/admin/alumnos/[id]/route.ts'
const FICHA     = 'src/app/(dashboard)/admin/alumnos/[id]/page.tsx'

// ─────────────────────────── Whitelist del body (400) ────────────────────────

test('clave fuera de la whitelist rechaza la petición entera', () => {
  const r = validarCorreccionPlan({ nivel: 'secundaria', modalidad: '6_meses', activo: false })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('Campo no permitido: activo')
})

test('la whitelist es exactamente nivel, carrera y modalidad', () => {
  expect([...CAMPOS_PERMITIDOS]).toEqual(['nivel', 'carrera', 'modalidad'])
})

test('body que no es objeto se rechaza', () => {
  for (const body of [null, undefined, 'secundaria', 42, ['nivel']]) {
    expect(validarCorreccionPlan(body).ok).toBe(false)
  }
})

test('nivel fuera del catálogo del alta se rechaza — diplomado incluido', () => {
  // 'diplomado' no está en el select de alta del programa: esa línea no se
  // corrige por aquí.
  expect([...NIVELES_CORREGIBLES]).toEqual(['secundaria', 'preparatoria', 'licenciatura'])
  for (const nivel of ['diplomado', 'demo', 'primaria', '', undefined]) {
    expect(validarCorreccionPlan({ nivel, modalidad: '6_meses' }).ok).toBe(false)
  }
})

test('modalidad se valida con el mismo catálogo del alta', () => {
  const activas = getModalidadesActivas().map(m => m.id)
  expect(activas.length).toBeGreaterThan(0)

  const valida = validarCorreccionPlan({ nivel: 'secundaria', modalidad: activas[0] })
  expect(valida.ok).toBe(true)

  const invalida = validarCorreccionPlan({ nivel: 'secundaria', modalidad: '99_meses' })
  expect(invalida.ok).toBe(false)
})

test('corrección válida: carrera va a NULL fuera de licenciatura aunque venga en el body', () => {
  const modalidad = getModalidadesActivas()[0].id
  const r = validarCorreccionPlan({ nivel: 'preparatoria', carrera: 'derecho', modalidad })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.plan).toEqual({ nivel: 'preparatoria', carrera: null, modalidad })
  }
})

test('licenciatura exige carrera del catálogo (con el add-on apagado no hay ninguna)', () => {
  // La plantilla trae licenciaturas.activas=false y carreras=[]: pedir
  // licenciatura debe fallar SIEMPRE en este estado, igual que en el alta.
  expect(CONFIG.licenciaturas.activas).toBe(false)
  const r = validarCorreccionPlan({ nivel: 'licenciatura', carrera: 'derecho', modalidad: '12_meses' })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.error).toContain('carrera')
})

// ────────────────────────── Mensajes de candado (409) ────────────────────────

test('cada código de candado tiene mensaje en español con el camino de salida', () => {
  const codigos = ['pagos', 'meses_desbloqueados', 'calificaciones', 'progreso', 'intentos', 'quiz']
  expect(Object.keys(MENSAJES_CANDADO).sort()).toEqual([...codigos].sort())
  for (const c of codigos) {
    expect(mensajeCandado(c)).toContain('registrarse como alumno nuevo')
  }
  // Código desconocido: mensaje genérico, nunca undefined
  expect(mensajeCandado('lo_que_sea')).toContain('plan de estudio')
})

// ─────────────────── El endpoint no confía en la UI (403/409) ────────────────

test('la ruta POST valida sesión y verifyAdmin ANTES de tocar la RPC', () => {
  const src = leer(RUTA_POST)
  const posGetUser  = src.indexOf('auth.getUser')
  // El sitio de LLAMADA, no el import del tope del archivo
  const posVerify   = src.indexOf('await verifyAdmin(supabase')
  const posRpc      = src.indexOf("rpc('corregir_plan_estudio'")
  expect(posGetUser).toBeGreaterThan(-1)
  expect(posVerify).toBeGreaterThan(posGetUser)
  expect(posRpc).toBeGreaterThan(posVerify)
  // Candado bloqueante → 409, con el código para la UI
  expect(src).toContain('{ status: 409 }')
  // El actor viaja como parámetro (Bug 83: auth.uid() es NULL con service_role)
  expect(src).toContain('p_actor:')
})

// ────────────────── Los seis candados viven en la migración ──────────────────

test('la migración implementa los seis candados, con tutoriales excluidos en ③④⑤⑥', () => {
  const sql = leer(MIGRACION)
  // ① pagos + inscripcion_pagada — ambos, no solo la tabla
  expect(sql).toContain("FROM public.pagos WHERE alumno_id")
  expect(sql).toContain('inscripcion_pagada')
  // ② meses
  expect(sql).toContain("RETURN 'meses_desbloqueados'")
  // ③–⑥: exclusión vía el predicado central, aplicado a las CUATRO tablas de
  // contenido — ni una más (los candados de dinero no tienen excepción)
  const exclusiones = sql.match(/AND NOT public\.es_materia_tutorial\(m\.nivel, m\.nombre\)/g) ?? []
  expect(exclusiones.length).toBe(4)
  for (const codigo of ['pagos', 'calificaciones', 'progreso', 'intentos', 'quiz']) {
    expect(sql).toContain(`RETURN '${codigo}'`)
  }
  // Los candados de dinero van ANTES de la primera exclusión de tutorial:
  // pagos/inscripción/meses se evalúan sin tocar es_materia_tutorial
  const posPrimeraExclusion = sql.indexOf('AND NOT public.es_materia_tutorial')
  expect(sql.indexOf("RETURN 'pagos'")).toBeLessThan(posPrimeraExclusion)
  expect(sql.indexOf("RETURN 'meses_desbloqueados'")).toBeLessThan(posPrimeraExclusion)
})

test('el predicado SQL es espejo de esTutorial: mismos dos marcadores, NULL bloquea', () => {
  const sql = leer(MIGRACION)
  const fn = sql.match(/CREATE OR REPLACE FUNCTION public\.es_materia_tutorial[\s\S]*?\$\$;/)?.[0] ?? ''
  expect(fn).not.toBe('')
  // Mismos dos marcadores que esTutorial() (acceso-materias.ts:95-97)
  expect(fn).toContain("p_nivel = 'demo'")
  expect(fn).toContain("ILIKE '%tutor%'")
  // COALESCE a false: ante NULL la materia NO es tutorial y la fila bloquea
  expect(fn).toContain('COALESCE')
  // Predicado puro: sin acceso a tablas y estable
  expect(fn).toContain('IMMUTABLE')
  expect(fn).not.toContain('FROM public.')
})

test('caso exacto: alumno de prepa que solo hizo "Tutoría de ingreso I" PASA; con materia normal FALLA', () => {
  // Las filas de los candados ③–⑥ cuentan como avance si y solo si su materia
  // NO es tutorial. esTutorial() es la fuente TS del mismo predicado que la
  // migración aplica en SQL (verificado en el test anterior).
  const cuentaComoAvance = (m: { nivel: string | null; nombre: string }) => !esTutorial(m as never)

  // El seed estándar (scripts/seed-contenido-ivs.sql) trae AMBOS tutoriales,
  // y el gate los abre sin pago (tieneAccesoMateria → motivo 'tutorial'):
  const tutoriaPrepa  = { nivel: 'preparatoria', nombre: 'Tutoría de ingreso I' }   // nivel REAL, tutorial por nombre
  const materiaDemo   = { nivel: 'demo',         nombre: 'Tutoría de Ingreso I' }
  const materiaNormal = { nivel: 'preparatoria', nombre: 'Conocimiento matemático I' }

  // Alumno que SOLO avanzó tutoriales → ninguna fila cuenta → candados en cero
  expect([tutoriaPrepa, materiaDemo].some(cuentaComoAvance)).toBe(false)
  // Alumno con avance en una materia normal → la fila cuenta → candado bloquea
  expect([tutoriaPrepa, materiaDemo, materiaNormal].some(cuentaComoAvance)).toBe(true)
})

test('la referencia cruzada de sincronía existe en los DOS lados del predicado', () => {
  // esTutorial() (TS) debe apuntar al espejo SQL, y la migración a esTutorial.
  const ts  = leer('src/lib/acceso-materias.ts')
  const sql = leer(MIGRACION)
  expect(ts).toContain('es_materia_tutorial')
  expect(ts).toContain('si cambia uno')
  expect(sql).toContain('esTutorial()')
  expect(sql).toContain('si cambia uno, cambia el otro')
  // Y el espejo de schema.sql también lleva la advertencia
  const schema = leer('supabase/schema.sql')
  expect(schema).toContain('sincronía con esTutorial()')
})

test('la corrección es atómica: FOR UPDATE, candados dentro, notas con conteo, bitácora', () => {
  const sql = leer(MIGRACION)
  expect(sql).toContain('FOR UPDATE')
  expect(sql).toContain('candado_corregir_plan(p_alumno)')
  expect(sql).toContain('DELETE FROM public.notas_alumno')
  expect(sql).toContain("'notas_borradas', v_notas")
  expect(sql).toContain('INSERT INTO public.alumno_plan_eventos')
})

test('el UPDATE del plan no toca la matrícula', () => {
  const sql = leer(MIGRACION)
  const update = sql.match(/UPDATE public\.alumnos\s+SET[\s\S]*?WHERE id = p_alumno/)?.[0] ?? ''
  expect(update).not.toBe('')
  expect(update).toContain('nivel')
  expect(update).toContain('carrera')
  expect(update).toContain('modalidad')
  expect(update).not.toContain('matricula')
})

test('las funciones nuevas cierran EXECUTE a PUBLIC, anon y authenticated (Bug 77)', () => {
  const sql = leer(MIGRACION)
  for (const fn of ['candado_corregir_plan', 'corregir_plan_estudio']) {
    const revoke = new RegExp(
      `REVOKE EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\)\\s+FROM PUBLIC, anon, authenticated`,
    )
    expect(sql).toMatch(revoke)
  }
})

test('la RLS de la bitácora no consulta su propia tabla en USING (regla 8)', () => {
  const sql = leer(MIGRACION)
  // La única política es SELECT con es_admin(), que lee `usuarios`, no
  // alumno_plan_eventos: sin recursión. Y no hay política de INSERT: escribe
  // solo la función SECURITY DEFINER.
  const using = sql.match(/CREATE POLICY "alumno_plan_eventos[^;]+;/s)?.[0] ?? ''
  expect(using).toContain('public.es_admin()')
  expect(using).not.toContain('FROM public.alumno_plan_eventos')
  expect(sql).not.toContain('alumno_plan_eventos: escribir')
})

test('toda migración va también a los DOS schema.sql (espejo y el del onboarding)', () => {
  // supabase/schema.sql es el espejo documental; scripts/schema.sql es el que
  // mev-onboarding.py instala en los combos NUEVOS. Una migración que falte en
  // el segundo nace ausente en todo cliente nuevo (deriva del 17-ago-2026).
  for (const archivo of ['supabase/schema.sql', 'scripts/schema.sql']) {
    const schema = leer(archivo)
    for (const pieza of [
      'CREATE TABLE IF NOT EXISTS public.alumno_plan_eventos',
      'FUNCTION public.es_materia_tutorial',
      'FUNCTION public.candado_corregir_plan',
      'FUNCTION public.corregir_plan_estudio',
    ]) {
      expect(schema, `${archivo} sin: ${pieza}`).toContain(pieza)
    }
    // Y con la MISMA exclusión en las cuatro tablas de contenido
    const exclusiones = schema.match(/AND NOT public\.es_materia_tutorial\(m\.nivel, m\.nombre\)/g) ?? []
    expect(exclusiones.length, archivo).toBe(4)
  }
  // Las dependencias de la corrección también viven en el schema del
  // onboarding: sin alumnos.carrera la RPC revienta en instalación nueva.
  const scripts = leer('scripts/schema.sql')
  expect(scripts).toContain('carrera text')
  expect(scripts).toContain('keep_alive_log')
})

// ─────────────────────────── La ficha (botón y texto) ────────────────────────

test('la ficha pinta botón O texto explicativo según los candados del servidor', () => {
  const src = leer(FICHA)
  expect(src).toContain('Corregir plan de estudio')
  expect(src).toContain('Este alumno ya inició su plan de estudio. Para cambiarlo, regístralo como alumno nuevo.')
  // La decisión viene del servidor (plan_correccion), no de un cálculo local
  expect(src).toContain('plan_correccion?.permitida')
})

test('el GET de la ficha resuelve el nombre del plan con getPlanNombre (fix del hardcodeo)', () => {
  const src = leer(RUTA_GET)
  expect(src).toContain('getPlanNombre(')
  // El ternario viejo pintaba 'Secundaria' para licenciatura; no debe volver
  expect(src).not.toMatch(/nombre:\s+a\.nivel === 'preparatoria' \? 'Preparatoria'/)
})
