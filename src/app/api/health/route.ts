import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/health — sonda de vida para el monitor central de la flota.
 *
 * POR QUE EXISTE: ni el keep-alive ni el uptime pasan por la app. El latido
 * habla con Supabase directo y el uptime solo comprueba que el ref exista, asi
 * que un cliente con `NEXT_PUBLIC_SUPABASE_URL` mal puesta o la service_role
 * rotada se ve perfecto desde fuera — ref vivo, TLS bueno, deploy verde — y
 * tiene la plataforma inservible. Esta ruta es el unico punto que responde
 * "la app corre Y alcanza su base de datos".
 *
 *   200  { ok: true,  db: true,  ts }
 *   503  { ok: false, db: false, ts }
 *
 * QUE NO DEVUELVE, A PROPOSITO: es publica y sin auth, asi que no expone
 * versiones, refs de proyecto, nombres de tabla, mensajes de error de Postgres
 * ni nada que sirva para reconocimiento. Solo dos booleanos y una marca de
 * tiempo. El detalle del fallo va al log del servidor, que no es publico.
 *
 * BARATA A PROPOSITO: un COUNT con `head: true` no transfiere ni una fila —
 * PostgREST responde solo con la cabecera Content-Range. El cuerpo de la
 * respuesta son ~60 bytes. Se puede sondear a diario sin coste.
 *
 * Se consulta `keep_alive_log` porque es la tabla que existe en TODO cliente
 * (viene del keep-alive, Bug 46) y no contiene datos de nadie. Va con el cliente
 * server-side: la tabla hace `REVOKE ALL FROM anon` y solo concede INSERT, asi
 * que con la anon key un SELECT daria 42501 y la sonda reportaria falso rojo.
 */

// Nunca cachear: una sonda de vida cacheada miente. Fuerza render dinamico.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const sinCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
} as const

export async function GET() {
  const ts = new Date().toISOString()

  try {
    const supabase = createAdminClient()

    // `head: true` -> sin filas; solo queremos saber si Postgres contesta.
    const { error } = await supabase
      .from('keep_alive_log')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('[health] la consulta a Supabase fallo:', error.message)
      return NextResponse.json({ ok: false, db: false, ts }, { status: 503, headers: sinCache })
    }

    return NextResponse.json({ ok: true, db: true, ts }, { status: 200, headers: sinCache })
  } catch (e) {
    // createAdminClient lanza si faltan las env vars: ese es justo el fallo que
    // esta sonda debe delatar, no uno que deba tumbar la ruta con un 500.
    console.error('[health] no se pudo crear el cliente de Supabase:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, db: false, ts }, { status: 503, headers: sinCache })
  }
}
