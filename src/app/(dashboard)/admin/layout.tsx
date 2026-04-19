import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellidos, rol')
    .eq('id', user.id)
    .single()

  // Normalizar rol a mayúsculas para comparación robusta (soporta 'admin' y 'ADMIN')
  const rol = (usuario?.rol as string | undefined)?.toUpperCase()
  if (!usuario || rol !== 'ADMIN') redirect('/login')

  const userName = [usuario.nombre, usuario.apellidos].filter(Boolean).join(' ') || user.email || 'Admin'

  return (
    <DashboardLayout
      role="ADMIN"
      userName={userName}
      pageTitle="Panel de Administración"
      theme="light"
    >
      {children}
    </DashboardLayout>
  )
}
