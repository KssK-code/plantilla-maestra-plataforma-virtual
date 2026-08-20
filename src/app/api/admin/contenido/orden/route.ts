import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { validarOrden, type TipoOrden } from '@/lib/estructura-contenido'

/**
 * Reordenar en lote materias, meses o semanas.
 *
 * `validarOrden` (lib/estructura-contenido) mira la FORMA del lote: tipo
 * conocido, ids sin repetir, posiciones enteras y sin repetir. Lo que solo se
 * puede comprobar aquí —y es lo que de verdad importa— es que todos los ids
 * cuelguen del MISMO padre: sin esa verificación, un lote con un id colado de
 * otra materia reescribiría el `numero_semana` de semanas ajenas y le
 * descolocaría el temario a alumnos que ni siquiera cursan esta materia. Se
 * comprueba ANTES de escribir nada.
 */

/**
 * Cada tipo, su tabla y su columna de orden.
 *
 * `padre` es la columna que tiene que coincidir en todo el lote. `materias` no
 * cuelga de nadie, así que su ámbito es el par (nivel, carrera): es dentro de
 * ese grupo donde `orden` significa algo —para licenciatura, además, decide el
 * cuatrimestre (`getCuatrimestreDeOrden`)—, y mezclar niveles en un lote
 * barajaría el catálogo de alumnos de otro programa.
 *
 * `unico` marca las tablas con UNIQUE (padre, número): `meses_contenido`
 * (materia_id, numero_mes) y `semanas` (mes_id, numero_semana).
 */
const TABLAS: Record<TipoOrden, {
  tabla: string
  columna: string
  padre: string | null
  etiqueta: string
  unico: boolean
}> = {
  materia: { tabla: 'materias',         columna: 'orden',         padre: null,         etiqueta: 'materia', unico: false },
  mes:     { tabla: 'meses_contenido',  columna: 'numero_mes',    padre: 'materia_id', etiqueta: 'mes',     unico: true  },
  semana:  { tabla: 'semanas',          columna: 'numero_semana', padre: 'mes_id',     etiqueta: 'semana',  unico: true  },
}

type Fila = Record<string, unknown>

/** Clave de agrupación: la columna padre, o el ámbito (nivel, carrera) de una
 *  materia, que no tiene padre. `null` = fila huérfana. */
function claveDePadre(fila: Fila, padre: string | null): string | null {
  if (padre) {
    const v = fila[padre]
    return typeof v === 'string' && v ? v : null
  }
  const nivel = fila.nivel
  if (typeof nivel !== 'string' || !nivel) return null
  return `${nivel}|${typeof fila.carrera === 'string' ? fila.carrera : ''}`
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const validacion = validarOrden(await request.json())
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: 400 })

    const { tipo, orden } = validacion.datos
    const { tabla, columna, padre, etiqueta, unico } = TABLAS[tipo]
    const admin = createAdminClient()
    const ids = orden.map(o => o.id)

    // ── 1. Las filas del lote, tal como están HOY ────────────────────────────
    const columnasPadre = padre ? `, ${padre}` : ', nivel, carrera'
    const { data: filasCrudas, error: errLeer } = await admin
      .from(tabla)
      .select(`id, ${columna}${columnasPadre}`)
      .in('id', ids)

    if (errLeer) {
      // Lo normal aquí es un id que ni siquiera es un uuid (22P02): es un lote
      // mal formado, no un fallo del servidor.
      return NextResponse.json(
        { error: `No se pudo verificar el lote: ${errLeer.message}` }, { status: 400 })
    }

    // El doble cast es por el parser de tipos del `select()` de Supabase: no
    // puede leer una lista de columnas armada en tiempo de ejecución.
    const filas = (filasCrudas ?? []) as unknown as Fila[]
    const porId = new Map(filas.map(f => [String(f.id), f]))

    // ── 2. Todos tienen que EXISTIR ──────────────────────────────────────────
    const faltan = ids.filter(id => !porId.has(id))
    if (faltan.length > 0) {
      return NextResponse.json({
        error: `El lote trae ${faltan.length} ${etiqueta}(s) que ya no existen: ${faltan.slice(0, 5).join(', ')}. Recarga la pantalla antes de reordenar.`,
      }, { status: 409 })
    }

    // ── 3. Y todos tienen que ser del MISMO padre ────────────────────────────
    // Esta es la verificación que evita que un lote reescriba el orden de otra
    // materia. Va antes de cualquier escritura, a propósito.
    const claves = new Set<string>()
    for (const id of ids) {
      const clave = claveDePadre(porId.get(id)!, padre)
      if (clave === null) {
        return NextResponse.json({
          error: `El ${etiqueta} ${id} no cuelga de ningún padre: no se puede reordenar hasta asignárselo.`,
        }, { status: 409 })
      }
      claves.add(clave)
    }
    if (claves.size > 1) {
      return NextResponse.json({
        error: padre
          ? `El lote mezcla ${etiqueta}s de ${claves.size} padres distintos (${padre}). Un reordenamiento solo puede tocar los hijos de UN padre; si no, renumeraría contenido de otra materia.`
          : `El lote mezcla materias de ${claves.size} programas distintos (nivel/carrera). Reordena un programa a la vez.`,
      }, { status: 409 })
    }
    const clavePadre = [...claves][0]

    // ── 4. Nadie de FUERA del lote ocupa una posición destino ────────────────
    // `meses_contenido` y `semanas` tienen UNIQUE (padre, número). Si el lote
    // es parcial y un hermano que no viene en él se queda con una posición que
    // el lote quiere, el UPDATE reventaría con 23505 a mitad de camino, ya con
    // parte del árbol renumerado. Mejor un 409 antes de tocar nada.
    let hermanos: Fila[] = []
    if (unico && padre) {
      const { data, error } = await admin
        .from(tabla).select(`id, ${columna}`).eq(padre, clavePadre)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      hermanos = (data ?? []) as unknown as Fila[]

      const enLote = new Set(ids)
      const ocupadas = new Map<number, string>()
      for (const h of hermanos) {
        const hid = String(h.id)
        if (enLote.has(hid)) continue
        ocupadas.set(Number(h[columna]), hid)
      }
      const choque = orden.find(o => ocupadas.has(o.posicion))
      if (choque) {
        return NextResponse.json({
          error: `La posición ${choque.posicion} ya la ocupa otro ${etiqueta} del mismo padre que no viene en el lote. Manda el orden COMPLETO del padre.`,
        }, { status: 409 })
      }
    }

    // ── 5. Escritura ─────────────────────────────────────────────────────────
    // ⚠️ SIN TRANSACCIÓN: el cliente JS de Supabase no expone BEGIN/COMMIT, así
    // que esto son N (o 2N) viajes independientes. Si uno falla a mitad, lo ya
    // escrito se queda escrito y se devuelve `aplicados` para que la pantalla
    // recargue y muestre el estado real. Envolverlo de verdad exigiría una
    // función SQL (RPC), que la plantilla no puede dar por desplegada en los
    // ~100 clientes.
    //
    // Y por el UNIQUE (padre, número) no se puede escribir a lo bruto: el caso
    // más común de la UI es intercambiar dos vecinos con las flechas ↑/↓, y
    // poner el primero en el sitio del segundo choca contra el índice. Por eso
    // primero se APARCA en negativo lo que cambia —ningún número real es
    // negativo— y después se escriben los definitivos.
    const cambian = orden.filter(o => {
      const actual = Number(porId.get(o.id)![columna])
      return actual !== o.posicion
    })

    if (cambian.length === 0) return NextResponse.json({ ok: true, aplicados: 0, sinCambios: true })

    let aplicados = 0
    const fallo = (mensaje: string) =>
      NextResponse.json({
        error: `Se quedó a medias tras ${aplicados} de ${cambian.length} ${etiqueta}s: ${mensaje}. Recarga la pantalla para ver cómo quedó.`,
        aplicados,
      }, { status: 500 })

    if (unico) {
      for (const [i, o] of cambian.entries()) {
        const { error } = await admin
          .from(tabla).update({ [columna]: -(i + 1) }).eq('id', o.id)
        if (error) return fallo(error.message)
      }
    }

    for (const o of cambian) {
      const { error } = await admin
        .from(tabla).update({ [columna]: o.posicion }).eq('id', o.id)
      if (error) return fallo(error.message)
      aplicados++
    }

    return NextResponse.json({ ok: true, aplicados })
  } catch (err) {
    console.error('[PATCH /api/admin/contenido/orden]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
