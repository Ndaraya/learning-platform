import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function PracticeTestsPage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) redirect(`/courses/${courseId}`)

  const [{ data: tests }, { data: submissions }] = await Promise.all([
    supabase
      .from('practice_tests')
      .select('id, title, description, question_counts')
      .eq('course_id', courseId)
      .eq('published', true)
      .order('display_order'),
    supabase
      .from('practice_test_submissions')
      .select('id, practice_test_id, composite_score, english_score, math_score, reading_score, science_score, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false }),
  ])

  // Most recent submission per test
  const latestByTest = new Map<string, {
    id: string
    composite_score: number | null
    english_score: number | null
    math_score: number | null
    reading_score: number | null
    science_score: number | null
    submitted_at: string
  }>()
  for (const sub of submissions ?? []) {
    if (!latestByTest.has(sub.practice_test_id)) latestByTest.set(sub.practice_test_id, sub)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Practice Tests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Take a full-length ACT practice test on paper, then enter your answers here for scoring.
            </p>
          </div>
        </div>
        <Link href={`/courses/${courseId}/practice-tests/record`} className="block">
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors px-4 py-3 flex items-center justify-between gap-3 group">
            <div>
              <p className="text-sm font-semibold text-foreground">Already have a score?</p>
              <p className="text-xs text-muted-foreground">Record a score from an outside test manually — no answer entry needed.</p>
            </div>
            <span className="text-sm font-medium shrink-0 group-hover:underline underline-offset-4" style={{ color: 'var(--brand)' }}>
              Record score →
            </span>
          </div>
        </Link>
      </div>

      {!tests || tests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">No practice tests available yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const latest = latestByTest.get(test.id)
            const totalQ = Object.values((test.question_counts as Record<string, number>) ?? {}).reduce((a, b) => a + b, 0)

            return (
              <Card key={test.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{test.title}</CardTitle>
                      {test.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{totalQ} questions</p>
                    </div>
                    {latest && (
                      <div className="text-center shrink-0">
                        <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>
                          {latest.composite_score ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">Composite</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {latest && (
                    <div className="flex gap-4 mb-3">
                      {[
                        { label: 'E', score: latest.english_score, name: 'English' },
                        { label: 'M', score: latest.math_score, name: 'Math' },
                        { label: 'R', score: latest.reading_score, name: 'Reading' },
                        { label: 'S', score: latest.science_score, name: 'Science' },
                      ].map(({ label, score, name }) => (
                        <div key={label} className="text-center" aria-label={`${name}: ${score ?? 'N/A'}`}>
                          <p className="text-sm font-semibold text-gray-700">{score ?? '—'}</p>
                          <p className="text-xs text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/courses/${courseId}/practice-tests/${test.id}`}
                      className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'var(--brand)' }}
                    >
                      {latest ? 'Retake' : 'Start'} →
                    </Link>
                    {latest && (
                      <Badge variant="outline" className="text-xs">
                        Last taken {new Date(latest.submitted_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
