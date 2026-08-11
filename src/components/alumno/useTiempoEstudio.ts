'use client'

import { useCallback, useEffect, useRef } from 'react'

/** Cada cuánto suma un minuto (solo con la pestaña visible). */
const TICK_MS = 60_000
/** Minutos acumulados antes de mandar. Evita una petición por minuto. */
const LOTE_MINUTOS = 5
/** Tope del endpoint; no se manda más que esto de una vez. */
const MAX_POR_LLAMADA = 15

/**
 * Acumula el tiempo real que el alumno pasa en una semana y lo envía por lotes.
 *
 * Cómo cuenta: un minuto por cada tick de 60 s **con la pestaña visible**. Si el
 * alumno deja la pestaña de fondo, no suma. Es tiempo de permanencia, no de
 * atención — no pretende ser más de lo que es.
 *
 * Por qué guarda pendientes por semana: el endpoint NO crea la fila de
 * `progreso_semanas` (crearla rompería el goteo de desbloqueo). Mientras el
 * alumno no marque la semana, el servidor responde `aplicado: false` y estos
 * minutos se conservan aquí hasta que la marque — así el tiempo de lectura
 * previo al marcado no se pierde. Si se va antes de marcarla, se pierde: es el
 * precio de no falsear el desbloqueo, y es el lado correcto del trade-off.
 */
export function useTiempoEstudio(semanaId: string | null) {
  // semana_id -> minutos pendientes de enviar
  const pendientes = useRef<Map<string, number>>(new Map())
  const enviando = useRef(false)
  const semanaActual = useRef<string | null>(semanaId)

  useEffect(() => { semanaActual.current = semanaId }, [semanaId])

  const enviar = useCallback(async (soloSiHayLote: boolean) => {
    if (enviando.current) return
    const entradas = [...pendientes.current.entries()].filter(([, m]) => m > 0)
    if (entradas.length === 0) return
    if (soloSiHayLote && !entradas.some(([, m]) => m >= LOTE_MINUTOS)) return

    enviando.current = true
    try {
      for (const [id, minutos] of entradas) {
        const envio = Math.min(minutos, MAX_POR_LLAMADA)
        const r = await fetch('/api/alumno/progreso/tiempo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semana_id: id, minutos: envio }),
        })
        if (!r.ok) continue                       // se reintenta en el próximo lote
        const d = await r.json().catch(() => ({}))
        if (d?.aplicado) {
          const resto = (pendientes.current.get(id) ?? 0) - envio
          if (resto > 0) pendientes.current.set(id, resto)
          else pendientes.current.delete(id)
        }
        // aplicado === false -> la semana aún no se marcó: se conservan
      }
    } catch {
      // silencioso: el tiempo de estudio nunca debe estorbarle al alumno
    } finally {
      enviando.current = false
    }
  }, [])

  useEffect(() => {
    if (!semanaId) return
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      const id = semanaActual.current
      if (!id) return
      pendientes.current.set(id, (pendientes.current.get(id) ?? 0) + 1)
      void enviar(true)
    }, TICK_MS)
    return () => clearInterval(t)
  }, [semanaId, enviar])

  // Al salir de la página se intenta un último envío de lo que quede.
  useEffect(() => {
    return () => { void enviar(false) }
  }, [enviar])

  /** Fuerza el envío de lo pendiente. La página lo llama tras marcar la semana. */
  const descargar = useCallback(() => enviar(false), [enviar])

  return { descargar }
}
