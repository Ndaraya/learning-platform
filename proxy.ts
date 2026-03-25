import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_ROUTES: Record<string, UserRole[]> = {
  '/dashboard':     ['student'],
  '/courses':       ['student'],
  '/admin':         ['admin', 'super_admin'],
  '/org-admin':     ['org_admin', 'super_admin'],
  '/super-admin':   ['super_admin'],
}

export async function proxy(request: NextRequest) {
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
  const pathname = request.nextUrl.pathname

  // Redirect logged-in users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check protected routes
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Fetch role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role as UserRole | undefined

      if (!role || !allowedRoles.includes(role)) {
        // Redirect to the correct home for the user's role
        const roleHome: Record<UserRole, string> = {
          student:     '/dashboard',
          admin:       '/admin/dashboard',
          org_admin:   '/org-admin/dashboard',
          super_admin: '/super-admin/organizations',
        }
        const home = role ? roleHome[role] : '/login'
        return NextResponse.redirect(new URL(home, request.url))
      }

      break
    }
  }

  return supabaseResponse
}

export const config: { matcher: string[] } = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
