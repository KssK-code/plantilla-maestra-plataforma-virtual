import type { SupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from '@/lib/config'

/**
 * Deja `public.ajustes.prefijo_matricula` igual a CONFIG.prefijoMatricula.
 *
 * La matrícula la arma `generar_matricula()` en un trigger BEFORE INSERT, y una
 * función de Postgres no puede leer el config del front. Antes el prefijo iba
 * literal dentro del SQL, así que cada cliente nuevo heredaba el del anterior:
 * plataformas que se llamaban ANGELOPOLIS o EVOCONTUCER emitían matrículas
 * `IVS-2026-0001`. Nadie lo notaba hasta que un alumno preguntaba.
 *
 * Se llama justo antes de insertar en `alumnos`, no en un paso de despliegue,
 * para que no exista un paso manual que se pueda olvidar al aprovisionar: el
 * primer alumno del cliente ya sale con el prefijo correcto.
 *
 * Nunca lanza. Si el upsert falla —la tabla no existe porque falta la
 * migración, o la red se cayó— el alta del alumno debe continuar: perder una
 * matrícula bonita es mucho menos grave que perder un registro. En ese caso
 * `generar_matricula()` cae a su default y se corrige en el siguiente intento.
 *
 * Requiere un cliente con service role: `ajustes` tiene RLS sin políticas.
 */
export async function sincronizarPrefijoMatricula(admin: SupabaseClient): Promise<void> {
  const prefijo = String(CONFIG.prefijoMatricula ?? '').trim()
  if (!prefijo) return

  try {
    const { error } = await admin
      .from('ajustes')
      .upsert(
        { clave: 'prefijo_matricula', valor: prefijo, updated_at: new Date().toISOString() },
        { onConflict: 'clave' },
      )
    if (error) console.error('[matricula] no se pudo sincronizar el prefijo:', error.message)
  } catch (err) {
    console.error('[matricula] excepción al sincronizar el prefijo:', err)
  }
}
