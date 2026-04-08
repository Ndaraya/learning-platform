import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { AnswerGrid } from '@/components/student/AnswerGrid'

interface Props {
  params: Promise<{ courseId: string; testId: string }>
}

export default async function PracticeTestAnswerGridPage({ params }: Props) {
  const { courseId, testId } = await params
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

  const { data: test } = await supabase
    .from('practice_tests')
    .select('id, title, description, question_counts, answer_format')
    .eq('id', testId)
    .eq('published', true)
    .maybeSingle()

  if (!test) notFound()

  const questionCounts = test.question_counts as Record<string, number>
  const answerFormat = (test.answer_format as 'alternating' | 'uniform') ?? 'alternating'

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}/practice-tests`}
          className="text-sm text-muted-foreground hover:underline underline-offset-4"
        >
          ← Practice Tests
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">{test.title}</h1>
        {test.description && (
          <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Work through the printed test, then bubble in your answers below. Submit when you&apos;re done.
        </p>
      </div>

      <AnswerGrid
        practiceTestId={testId}
        courseId={courseId}
        questionCounts={questionCounts}
        answerFormat={answerFormat}
      />
    </div>
  )
}
