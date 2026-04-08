import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScoreProjectionWidget } from '@/components/student/ScoreProjectionWidget'

interface Props {
  searchParams: Promise<{ upgraded?: string }>
}

export default async function StudentDashboardPage({ searchParams }: Props) {
  const { upgraded } = await searchParams
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
    .select('id, course_id, completed_at, courses!inner(title, description)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  const courseIds = (enrollments ?? []).map((e) => e.course_id)

  // Identify ACT course IDs early so we can scope queries
  const actCourseIds = (enrollments ?? [])
    .filter((e) => {
      const c = e.courses as unknown as { title: string } | null
      return c?.title?.includes('ACT')
    })
    .map((e) => e.course_id)

  // ── Run all data fetches in parallel ────────────────────────────────────────
  const [
    { data: allLessons },
    { data: completedLessons },
    { data: actBaselines },
    { data: latestPracticeScores },
  ] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('lessons').select('id, modules!inner(course_id)').in('modules.course_id', courseIds)
      : Promise.resolve({ data: [] }),
    supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true),
    courseIds.length > 0
      ? supabase.from('act_baselines')
          .select('course_id, english_score, math_score, reading_score, science_score, composite_score, source')
          .eq('user_id', user.id).in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
    actCourseIds.length > 0
      ? supabase.from('practice_test_submissions')
          .select('english_score, math_score, reading_score, science_score, composite_score, submitted_at, practice_tests!inner(course_id)')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // ── Build per-course progress ────────────────────────────────────────────────
  const completedSet = new Set((completedLessons ?? []).map((l) => l.lesson_id))
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
    return Math.round((lessons.filter((id) => completedSet.has(id)).length / lessons.length) * 100)
  }

  // ── Build baseline map ───────────────────────────────────────────────────────
  const baselineByCourse = new Map((actBaselines ?? []).map((b) => [b.course_id, b]))

  // ── Build latest practice score map (most recent per course) ────────────────
  type PracticeScore = {
    english_score: number | null
    math_score: number | null
    reading_score: number | null
    science_score: number | null
    composite_score: number | null
    submitted_at: string
    practice_tests: { course_id: string } | { course_id: string }[]
  }
  const latestPracticeByCourse = new Map<string, PracticeScore>()
  for (const row of (latestPracticeScores ?? []) as PracticeScore[]) {
    const pt = Array.isArray(row.practice_tests) ? row.practice_tests[0] : row.practice_tests
    const cid = pt?.course_id
    if (!cid || latestPracticeByCourse.has(cid)) continue
    latestPracticeByCourse.set(cid, row)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'
  const activeEnrollments = (enrollments ?? []).filter((e) => !e.completed_at)
  const actEnrollments = activeEnrollments.filter((e) => {
    const c = e.courses as unknown as { title: string } | null
    return c?.title?.includes('ACT')
  })
  const hasActSection = actEnrollments.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="space-y-10">
      {upgraded === 'true' && (
        <div
          className="rounded-xl p-4 text-white text-sm font-medium flex items-center gap-3"
          style={{ backgroundColor: 'var(--brand)' }}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">🎉</span>
          <span>You&apos;re now on Pro — all courses and AI feedback are unlocked.</span>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s where you stand.</p>
      </div>

      {/* Top row: ACT Baseline (left) + My Courses (right) side-by-side on desktop */}
      <div className={`grid gap-8 items-start ${hasActSection ? 'lg:grid-cols-2' : ''}`}>

        {/* ACT Baseline & Practice Test */}
        {hasActSection && (
          <section aria-labelledby="baseline-heading">
            <h2 id="baseline-heading" className="text-xl font-semibold mb-4">Your ACT Baseline &amp; Progress</h2>
            <div className="grid gap-4">
              {actEnrollments.map((enrollment) => {
                const baseline = baselineByCourse.get(enrollment.course_id)
                const sourceLabel = baseline?.source === 'diagnostic' ? 'Diagnostic'
                  : baseline?.source === 'upload' || baseline?.source === 'manual' ? 'Official'
                  : baseline?.source === 'skipped' ? 'Not set'
                  : null

                if (!baseline || baseline.source === 'skipped') {
                  return (
                    <Card key={enrollment.course_id}>
                      <CardContent className="pt-5">
                        <p className="text-sm font-medium text-gray-700">No baseline yet</p>
                        <p className="text-xs text-gray-400 mt-1">Establish your starting ACT score to track improvement.</p>
                        <Link
                          href={`/courses/${enrollment.course_id}/onboarding`}
                          className="mt-3 inline-block text-sm font-semibold focus-visible:outline focus-visible:outline-2 rounded underline-offset-4 hover:underline"
                          style={{ color: 'var(--brand)', outlineColor: 'var(--brand)' }}
                        >
                          Establish your baseline →
                        </Link>
                      </CardContent>
                    </Card>
                  )
                }

                const latest = latestPracticeByCourse.get(enrollment.course_id)
                const latestComposite = latest?.composite_score ?? null
                const baselineComposite = baseline.composite_score
                const delta = latestComposite != null && baselineComposite != null
                  ? latestComposite - baselineComposite
                  : 0

                const displayScores = [
                  { label: 'E', score: latest?.english_score ?? baseline.english_score,  name: 'English' },
                  { label: 'M', score: latest?.math_score ?? baseline.math_score,         name: 'Math' },
                  { label: 'R', score: latest?.reading_score ?? baseline.reading_score,   name: 'Reading' },
                  { label: 'S', score: latest?.science_score ?? baseline.science_score,   name: 'Science' },
                ]

                return (
                  <Card key={enrollment.course_id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">ACT Baseline &amp; Progress</CardTitle>
                        {sourceLabel && (
                          <Badge variant="outline" className="shrink-0 text-xs">{sourceLabel}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-4 mb-4">
                        {latestComposite != null && (
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-0.5">Starting</p>
                            <p className="text-2xl font-semibold text-gray-400">{baselineComposite}</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">{latestComposite != null ? 'Latest' : 'Composite'}</p>
                          <p className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>
                            {latestComposite ?? baselineComposite ?? '—'}
                          </p>
                        </div>
                        {delta !== 0 && (
                          <Badge
                            variant="outline"
                            className={`mb-1 text-xs font-semibold ${delta > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}
                          >
                            {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`} pts
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4">
                        {displayScores.map(({ label, score, name: sname }) => (
                          <div key={label} className="text-center" aria-label={`${sname}: ${score ?? 'N/A'}`}>
                            <p className="text-sm font-semibold text-gray-700">{score ?? '—'}</p>
                            <p className="text-xs text-gray-400">{label}</p>
                          </div>
                        ))}
                      </div>
                      <Link
                        href={`/courses/${enrollment.course_id}/practice-tests`}
                        className="mt-3 block text-xs hover:underline focus-visible:outline focus-visible:outline-2 rounded"
                        style={{ color: 'var(--brand)', outlineColor: 'var(--brand)' }}
                      >
                        {latestComposite != null ? 'View practice tests →' : 'Record practice test score →'}
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* My Courses */}
        <section aria-labelledby="courses-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="courses-heading" className="text-xl font-semibold">My Courses</h2>
            <Link href="/courses" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Browse all courses →
            </Link>
          </div>

          {enrollments && enrollments.length > 0 ? (
            <div className="grid gap-4" role="list">
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

      {/* Score Forecast — below the top row */}
      {activeEnrollments.length > 0 && (
        <section aria-labelledby="projections-heading">
          <h2 id="projections-heading" className="text-xl font-semibold mb-4">Progress Tracker</h2>
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
    </div>
    </div>
  )
}
