import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // `api/health` queda FUERA del matcher a proposito. El middleware redirige a
  // /login todo lo que no este en `publicRoutes`, asi que sin esta exclusion la
  // sonda de vida devolveria 200 con el HTML del login en vez de su JSON — el
  // monitor la leeria como "el cliente no tiene el endpoint" y la sonda seria
  // invisible. Ademas, saltarse el middleware le ahorra a cada sondeo la llamada
  // de red de `auth.getUser()`, que es justo lo que una ruta de salud publica y
  // consultada a diario no debe pagar.
  matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
