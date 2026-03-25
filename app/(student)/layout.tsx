import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <header className="border-b" role="banner">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between" aria-label="Main navigation">
          <Link href="/dashboard" className="font-semibold text-lg" aria-label="Home — Learning Platform">
            LearnPath
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/courses" className="text-sm hover:underline underline-offset-4">
              Courses
            </Link>
            <Link href="/dashboard" className="text-sm hover:underline underline-offset-4">
              Dashboard
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-sm hover:underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8" role="main">
        {children}
      </main>
      <footer role="contentinfo" className="border-t py-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} LearnPath. All rights reserved.</p>
      </footer>
    </div>
  )
}
