import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/types'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/students', label: 'Students' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role as UserRole | undefined
  if (!role || !['admin', 'super_admin'].includes(role)) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <header className="border-b bg-background" role="banner">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold">LearnPath Admin</span>
          <nav aria-label="Admin navigation">
            <ul className="flex items-center gap-4 list-none">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm hover:underline underline-offset-4">{item.label}</Link>
                </li>
              ))}
              {role === 'super_admin' && (
                <li>
                  <Link href="/super-admin/organizations" className="text-sm hover:underline underline-offset-4">Super Admin</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8" role="main">
        {children}
      </main>
    </div>
  )
}
