import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Verifica que el usuario autenticado tiene rol ADMIN.
 * Retorna un NextResponse 403 si no lo es, o null si la verificación pasa.
 */
export async function verifyAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single()

  if (!usuario || (usuario.rol as string | undefined)?.toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado. Se requiere rol ADMIN.' }, { status: 403 })
  }
  return null
}
