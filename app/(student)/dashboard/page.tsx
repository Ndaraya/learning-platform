import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScoreProjectionWidget } from '@/components/student/ScoreProjectionWidget'

export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, completed_at, courses(title, description)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  // Count completed lessons per course for progress display
  const courseIds = (enrollments ?? []).map((e) => e.course_id)
  const { data: allLessons } = courseIds.length > 0
    ? await supabase
        .from('lessons')
        .select('id, modules!inner(course_id)')
        .in('modules.course_id', courseIds)
    : { data: [] }

  const { data: completedLessons } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('completed', true)

  const completedSet = new Set((completedLessons ?? []).map((l) => l.lesson_id))

  // Build per-course progress map
  type CourseLesson = { id: string; modules: { course_id: string } | { course_id: string }[] }
  const lessonsByCourse: Record<string, string[]> = {}
  for (const lesson of (allLessons ?? []) as CourseLesson[]) {
    const mod = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules
    const cid = mod?.course_id
    if (!cid) continue
    if (!lessonsByCourse[cid]) lessonsByCourse[cid] = []
    lessonsByCourse[cid].push(lesson.id)
  }

  function courseProgress(courseId: string): number {
    const lessons = lessonsByCourse[courseId] ?? []
    if (lessons.length === 0) return 0
    const done = lessons.filter((id) => completedSet.has(id)).length
    return Math.round((done / lessons.length) * 100)
  }

  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'
  const activeEnrollments = (enrollments ?? []).filter((e) => !e.completed_at)

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s where you stand.</p>
      </div>

      {/* Score projections — one card per active enrolled course */}
      {activeEnrollments.length > 0 && (
        <section aria-labelledby="projections-heading">
          <h2 id="projections-heading" className="text-xl font-semibold mb-4">Progress Forecast</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeEnrollments.map((enrollment) => {
              const course = enrollment.courses as unknown as { title: string; description: string | null } | null
              return (
                <ScoreProjectionWidget
                  key={enrollment.course_id}
                  courseId={enrollment.course_id}
                  courseName={course?.title ?? 'Course'}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Enrolled courses */}
      <section aria-labelledby="courses-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="courses-heading" className="text-xl font-semibold">My Courses</h2>
          <Link href="/courses" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Browse all courses →
          </Link>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses as unknown as { title: string; description: string | null } | null
              const progress = courseProgress(enrollment.course_id)
              const done = !!enrollment.completed_at

              return (
                <Link
                  key={enrollment.id}
                  href={done ? `/courses/${enrollment.course_id}/certificate` : `/courses/${enrollment.course_id}`}
                  className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  role="listitem"
                  aria-label={`${course?.title} — ${done ? 'Completed' : `${progress}% complete`}`}
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{course?.title ?? 'Untitled'}</CardTitle>
                        <Badge variant={done ? 'secondary' : 'outline'} className="shrink-0">
                          {done ? 'Done' : 'Active'}
                        </Badge>
                      </div>
                      {course?.description && (
                        <CardDescription className="line-clamp-2 text-xs">
                          {course.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Lessons completed</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} aria-hidden="true" />
                      </div>
                      {done && (
                        <p className="mt-2 text-xs font-medium" style={{ color: 'var(--brand)' }}>
                          Certificate available →
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                You&apos;re not enrolled in any courses yet.{' '}
                <Link href="/courses" className="underline underline-offset-4">Browse courses</Link>.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
    </div>
  )
}
