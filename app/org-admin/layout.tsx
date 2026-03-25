import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/types'

export default async function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole | undefined
  if (!role || !['org_admin', 'super_admin'].includes(role)) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <header className="border-b" role="banner">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between" aria-label="Org admin navigation">
          <span className="font-semibold">LearnPath — Org Admin</span>
          <div className="flex items-center gap-4">
            <Link href="/org-admin/dashboard" className="text-sm hover:underline underline-offset-4">Dashboard</Link>
            <Link href="/org-admin/students" className="text-sm hover:underline underline-offset-4">Students</Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-sm hover:underline underline-offset-4">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8" role="main">{children}</main>
    </div>
  )
}
