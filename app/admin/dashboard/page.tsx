import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ count: courseCount }, { count: studentCount }, { count: submissionCount }] =
    await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('task_submissions').select('*', { count: 'exact', head: true }),
    ])

  const stats = [
    { label: 'Published courses', value: courseCount ?? 0 },
    { label: 'Total students', value: studentCount ?? 0 },
    { label: 'Task submissions', value: submissionCount ?? 0 },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Platform statistics</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" aria-label={`${stat.value} ${stat.label}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
