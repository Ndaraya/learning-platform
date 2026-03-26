import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  params: Promise<{ studentId: string }>
}

export default async function StudentProgressPage({ params }: Props) {
  const { studentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify org admin and get orgId
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.org_id) redirect('/org-admin/dashboard')

  // Verify student belongs to this org
  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name, email, created_at, org_id')
    .eq('id', studentId)
    .eq('org_id', adminProfile.org_id)
    .eq('role', 'student')
    .single()

  if (!student) notFound()

  // Fetch enrollments with course + module + lesson structure
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, enrolled_at, completed_at,
      courses (
        id, title,
        modules (
          id,
          lessons ( id )
        )
      )
    `)
    .eq('user_id', studentId)
    .order('enrolled_at', { ascending: false })

  // Fetch lesson progress for this student
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', studentId)
    .eq('completed', true)

  // Fetch all task submissions for this student
  const { data: submissions } = await supabase
    .from('task_submissions')
    .select('id, task_id, score, graded_at, tasks(title, lesson_id)')
    .eq('user_id', studentId)
    .not('graded_at', 'is', null)
    .order('graded_at', { ascending: false })

  const completedLessonIds = new Set((lessonProgress ?? []).map((p) => p.lesson_id))

  type CourseRow = {
    id: string
    title: string
    modules: Array<{ id: string; lessons: Array<{ id: string }> }>
  }

  type EnrollmentRow = {
    id: string
    enrolled_at: string
    completed_at: string | null
    courses: CourseRow | null
  }

  const enrollmentList = (enrollments ?? []) as unknown as EnrollmentRow[]

  // Build per-course stats
  const courseStats = enrollmentList.map((enrollment) => {
    const course = enrollment.courses
    if (!course) return null

    const allLessonIds = (course.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id))
    const completedCount = allLessonIds.filter((id) => completedLessonIds.has(id)).length
    const totalLessons = allLessonIds.length

    // Submissions for lessons in this course
    const courseSubmissions = (submissions ?? []).filter((s) => {
      const task = s.tasks as unknown as { lesson_id: string } | null
      return task && allLessonIds.includes(task.lesson_id)
    })

    const scores = courseSubmissions.map((s) => s.score).filter((sc): sc is number => sc !== null)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

    return {
      courseId: course.id,
      courseTitle: course.title,
      enrolledAt: enrollment.enrolled_at,
      completedAt: enrollment.completed_at,
      completedLessons: completedCount,
      totalLessons,
      avgScore,
      submissionCount: courseSubmissions.length,
    }
  }).filter(Boolean)

  // Overall stats
  const allScores = (submissions ?? []).map((s) => s.score).filter((sc): sc is number => sc !== null)
  const overallAvg = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null

  const recentSubmissions = (submissions ?? []).slice(0, 8) as unknown as Array<{
    id: string
    score: number | null
    graded_at: string | null
    tasks: { title: string; lesson_id: string } | null
  }>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/org-admin/students"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block"
          >
            ← Back to students
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{student.display_name ?? student.email}</h1>
          <p className="text-muted-foreground mt-1">{student.email} · Joined {new Date(student.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Courses enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrollmentList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{submissions?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall avg score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {overallAvg !== null ? (
                <span style={{ color: overallAvg >= 80 ? '#007053' : overallAvg >= 60 ? '#d97706' : '#dc2626' }}>
                  {overallAvg}%
                </span>
              ) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course progress table */}
      <section aria-labelledby="course-progress-heading">
        <h2 id="course-progress-heading" className="text-xl font-semibold mb-4">Course progress</h2>
        {courseStats.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-center">Lessons complete</TableHead>
                  <TableHead className="text-center">Avg score</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseStats.map((cs) => {
                  if (!cs) return null
                  const pct = cs.totalLessons > 0
                    ? Math.round((cs.completedLessons / cs.totalLessons) * 100)
                    : 0
                  return (
                    <TableRow key={cs.courseId}>
                      <TableCell className="font-medium">{cs.courseTitle}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(cs.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {cs.completedLessons} / {cs.totalLessons}
                        {cs.totalLessons > 0 && (
                          <span className="text-muted-foreground ml-1">({pct}%)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cs.avgScore !== null ? (
                          <Badge
                            variant={cs.avgScore >= 80 ? 'default' : cs.avgScore >= 60 ? 'secondary' : 'outline'}
                            className="tabular-nums"
                          >
                            {cs.avgScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cs.completedAt ? (
                          <Badge variant="default">Completed</Badge>
                        ) : cs.completedLessons > 0 ? (
                          <Badge variant="secondary">In progress</Badge>
                        ) : (
                          <Badge variant="outline">Not started</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground">No enrollments yet.</p>
        )}
      </section>

      {/* Recent submissions */}
      {recentSubmissions.length > 0 && (
        <section aria-labelledby="recent-submissions-heading">
          <h2 id="recent-submissions-heading" className="text-xl font-semibold mb-4">Recent task submissions</h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.tasks?.title ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {sub.score !== null ? (
                        <Badge
                          variant={sub.score >= 80 ? 'default' : sub.score >= 60 ? 'secondary' : 'outline'}
                          className="tabular-nums"
                        >
                          {sub.score}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.graded_at ? new Date(sub.graded_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  )
}
