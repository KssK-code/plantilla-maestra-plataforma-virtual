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

  // ⚠️ '/diplomados' es catálogo PÚBLICO (B5): un prospecto sin cuenta abre el
  // link que le mandaron por WhatsApp. Sin esto el middleware lo mandaría a
  // /login — el mismo gotcha que tuvo /api/health, donde una ruta que debía ser
  // pública devolvía el HTML de la pantalla de login.
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/aviso-de-privacidad', '/terminos-y-condiciones', '/diplomados']
  const isPublicRoute = publicRoutes.some(route =>
    route === '/'
      ? request.nextUrl.pathname === '/'
      : request.nextUrl.pathname.startsWith(route)
  )

  // Usuario autenticado intentando acceder a ruta pública → redirigir a su dashboard
  // Excepciones: la landing "/" y el catálogo "/diplomados" son páginas públicas
  // de consulta. Un alumno o un admin con sesión abierta que abre el link de un
  // diplomado quiere VERLO, no que lo boten a su panel — y ese link circula por
  // WhatsApp, así que lo abre gente con y sin sesión indistintamente.
  const isLandingRoot = request.nextUrl.pathname === '/'
  const isCatalogo = request.nextUrl.pathname.startsWith('/diplomados')
  if (user && isPublicRoute && !isLandingRoot && !isCatalogo) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    // Normalizar rol a mayúsculas para soportar 'admin' y 'ADMIN'
    const rol = (usuario?.rol as string | undefined)?.toUpperCase()
    const roleRedirects: Record<string, string> = {
      ADMIN: '/admin',
      SECRETARIO: '/admin/alumnos',
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
  // - /admin/** → requiere rol de staff (ADMIN o SECRETARIO); cada página/API
  //   dentro decide su propio nivel de acceso (verifyAdmin vs verifyStaff)
  // - /alumno/** → requiere rol ALUMNO; el staff es redirigido a su panel
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
    const esStaff = rol === 'ADMIN' || rol === 'SECRETARIO'

    if (isAdminRoute && !esStaff) {
      const url = request.nextUrl.clone()
      url.pathname = rol === 'ALUMNO' ? '/alumno' : '/login'
      return NextResponse.redirect(url)
    }

    if (isAlumnoRoute && esStaff) {
      const url = request.nextUrl.clone()
      url.pathname = rol === 'SECRETARIO' ? '/admin/alumnos' : '/admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
