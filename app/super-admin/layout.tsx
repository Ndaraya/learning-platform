import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/types'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile?.role as UserRole) !== 'super_admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <header className="border-b bg-background" role="banner">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between" aria-label="Super admin navigation">
          <span className="font-semibold">LearnPath — Super Admin</span>
          <div className="flex items-center gap-4">
            <Link href="/super-admin/organizations" className="text-sm hover:underline underline-offset-4">Organizations</Link>
            <Link href="/super-admin/users" className="text-sm hover:underline underline-offset-4">Users</Link>
            <Link href="/super-admin/billing" className="text-sm hover:underline underline-offset-4">Billing</Link>
            <Link href="/admin/dashboard" className="text-sm hover:underline underline-offset-4">Admin</Link>
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8" role="main">{children}</main>
    </div>
  )
}
