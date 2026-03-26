import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function OrgStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id
  if (!orgId) redirect('/org-admin/dashboard')

  const [{ data: students }, { data: enrollments }, { data: submissions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, created_at')
      .eq('org_id', orgId)
      .eq('role', 'student')
      .order('display_name', { ascending: true }),
    supabase
      .from('enrollments')
      .select('user_id, course_id')
      .eq('org_id', orgId),
    // RLS filters to org students automatically
    supabase
      .from('task_submissions')
      .select('user_id, score')
      .not('score', 'is', null),
  ])

  // Build per-student stats
  const enrollmentsByStudent = (enrollments ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] ?? 0) + 1
    return acc
  }, {})

  const scoresByStudent = (submissions ?? []).reduce<Record<string, number[]>>((acc, s) => {
    if (s.score !== null) {
      acc[s.user_id] = [...(acc[s.user_id] ?? []), s.score]
    }
    return acc
  }, {})

  const avgScore = (userId: string) => {
    const scores = scoresByStudent[userId]
    if (!scores?.length) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">{students?.length ?? 0} student{students?.length !== 1 ? 's' : ''} in your organization</p>
        </div>
      </div>

      {students && students.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Courses</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const courses = enrollmentsByStudent[s.id] ?? 0
                const avg = avgScore(s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.display_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-center">{courses > 0 ? courses : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">
                      {avg !== null ? (
                        <Badge
                          variant={avg >= 80 ? 'default' : avg >= 60 ? 'secondary' : 'outline'}
                          className="tabular-nums"
                        >
                          {avg}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/org-admin/students/${s.id}`}
                        className="text-sm font-medium hover:underline underline-offset-4"
                        style={{ color: 'var(--brand)' }}
                      >
                        View progress →
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No students enrolled in your organization yet.</p>
      )}
    </div>
  )
}
