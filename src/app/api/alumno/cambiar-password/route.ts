import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Se requieren contraseña actual y nueva contraseña' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Verificar contraseña actual intentando re-autenticar
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    // Actualizar a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar la contraseña: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
