import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route =>
    route === '/'
      ? request.nextUrl.pathname === '/'
      : request.nextUrl.pathname.startsWith(route)
  )

  // Usuario autenticado intentando acceder a ruta pública → redirigir a su dashboard
  // Excepción: "/" es la landing pública, no se redirige aunque esté autenticado
  const isLandingRoot = request.nextUrl.pathname === '/'
  if (user && isPublicRoute && !isLandingRoot) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    // Normalizar rol a mayúsculas para soportar 'admin' y 'ADMIN'
    const rol = (usuario?.rol as string | undefined)?.toUpperCase()
    const roleRedirects: Record<string, string> = {
      ADMIN: '/admin',
      ALUMNO: '/alumno',
    }

    const destination = rol ? (roleRedirects[rol] ?? '/alumno') : '/alumno'
    const url = request.nextUrl.clone()
    url.pathname = destination
    return NextResponse.redirect(url)
  }

  // Usuario no autenticado intentando acceder a ruta protegida → redirigir a login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protección de rutas por rol:
  // - /admin/** → requiere rol ADMIN; si es ALUMNO → redirigir a /alumno
  // - /alumno/** → requiere rol ALUMNO; si es ADMIN → redirigir a /admin
  const isAdminRoute  = request.nextUrl.pathname.startsWith('/admin')
  const isAlumnoRoute = request.nextUrl.pathname.startsWith('/alumno')

  if (user && (isAdminRoute || isAlumnoRoute)) {
    const { data: usuarioRol } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    // Normalizar rol a mayúsculas
    const rol = (usuarioRol?.rol as string | undefined)?.toUpperCase()

    if (isAdminRoute && rol !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = rol === 'ALUMNO' ? '/alumno' : '/login'
      return NextResponse.redirect(url)
    }

    if (isAlumnoRoute && rol === 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
