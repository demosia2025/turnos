// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas protegidas (requieren autenticación)
  const protectedRoutes = ['/dashboard', '/configuracion', '/empleados', '/permisos', '/ambientes', '/bloques', '/asignaciones', '/reportes', '/usuarios', '/rotacion', '/respaldos']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Si no hay usuario y la ruta está protegida, redirigir a login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Si hay usuario, verificar permisos de rol
  if (user && isProtectedRoute) {
    // Obtener el perfil del usuario
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    // Rutas que solo el admin puede acceder
    const adminOnlyRoutes = ['/configuracion', '/usuarios', '/respaldos']
    const isAdminRoute = adminOnlyRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    // Si es supervisor e intenta acceder a ruta de admin, redirigir a dashboard
    if (profile?.rol === 'supervisor' && isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Si hay usuario y está en login, redirigir a dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'  // ← AQUÍ debe ser /dashboard
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}