import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OrgAdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('org_id, organizations(name)').eq('id', user.id).single()
  const org = profile?.organizations as unknown as { name: string } | null
  const orgId = profile?.org_id

  const [{ count: studentCount }, { count: enrollmentCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'student'),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{org?.name ?? 'Your Organization'}</h1>
        <p className="text-muted-foreground mt-1">Org admin dashboard</p>
      </div>
      <section aria-labelledby="org-stats-heading">
        <h2 id="org-stats-heading" className="sr-only">Organization statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{studentCount ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total enrollments</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{enrollmentCount ?? 0}</p></CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
