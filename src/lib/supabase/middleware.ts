import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { destinoSiEsRutaDeProgama, aterrizajeAlumno } from '@/lib/modo'

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

  // Un fallo de RED contra Supabase (ECONNRESET, timeout) dejaba `user` en null
  // y se leia como "no hay sesion", expulsando al alumno a /login desde donde
  // estuviera. Se distingue "no hay sesion" de "no se pudo comprobar".
  let user = null
  let sesionIndeterminada = false
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    sesionIndeterminada = true
  }

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
    // B7 — el alumno aterriza en sus diplomados si el cliente es solo_cursos.
    // `aterrizajeAlumno()` devuelve '/alumno' en tradicional, así que este mapa
    // queda idéntico al de antes para los 144.
    const roleRedirects: Record<string, string> = {
      ADMIN: '/admin',
      SECRETARIO: '/admin/alumnos',
      ALUMNO: aterrizajeAlumno(),
    }

    const destination = rol ? (roleRedirects[rol] ?? '/alumno') : '/alumno'
    const url = request.nextUrl.clone()
    url.pathname = destination
    return NextResponse.redirect(url)
  }

  // Usuario no autenticado intentando acceder a ruta protegida → redirigir a login
  if (!user && !isPublicRoute) {
    // No se pudo comprobar la sesion por un fallo de red: no se expulsa. Se deja
    // continuar y que la propia ruta responda (401 si toca).
    if (sesionIndeterminada) return supabaseResponse

    // A una ruta de API se le responde 401, NO un 307 hacia una pagina HTML.
    // Las pantallas hacen fetch + r.json() sobre estos endpoints: al seguir el
    // redirect recibian HTML, json() lanzaba y se caia la vista entera.
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // ── B7: rutas del PROGRAMA en modo solo_cursos ──────────────────────────
    // Ocultar la entrada del menú es UX; la URL sigue existiendo y circula por
    // WhatsApp o en un favorito viejo. Aquí se ataja server-side para que un
    // enlace directo a /alumno/materias no aterrice en una pantalla que
    // consulta materias que este cliente nunca sembró.
    //
    // Va DESPUÉS de la comprobación de rol a propósito: primero se decide si la
    // persona puede estar en esa zona, y solo entonces si la ruta aplica a este
    // cliente. Al revés, un alumno que pisara /admin/contenido se llevaría un
    // redirect a /admin (zona que no le corresponde) en vez del de rol.
    //
    // En modo tradicional `destinoSiEsRutaDeProgama` devuelve null siempre y
    // este bloque no hace absolutamente nada.
    const destinoModo = destinoSiEsRutaDeProgama(request.nextUrl.pathname)
    if (destinoModo) {
      const url = request.nextUrl.clone()
      url.pathname = destinoModo
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
