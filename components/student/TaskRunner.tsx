'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface Question {
  id: string
  prompt: string
  type: 'mcq' | 'written'
  options: string[] | null
  points: number
}

interface QuestionResponse {
  question_id: string
  answer: string
  score: number | null
  max_score: number
  feedback: string | null
  ai_graded: boolean
}

interface ExistingSubmission {
  id: string
  score: number | null
  graded_at: string | null
  question_responses: QuestionResponse[]
}

interface Props {
  taskId: string
  courseId: string
  lessonId: string
  questions: Question[]
  existingSubmission: ExistingSubmission | null
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-yellow-600' :
    'text-red-600'

  return (
    <div className={`text-5xl font-bold tabular-nums ${color}`} aria-label={`Score: ${score} out of 100`}>
      {score}<span className="text-2xl text-muted-foreground">%</span>
    </div>
  )
}

export function TaskRunner({
  taskId, courseId, lessonId, questions, existingSubmission
}: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!existingSubmission) return {}
    return Object.fromEntries(
      existingSubmission.question_responses.map((r) => [r.question_id, r.answer])
    )
  })
  const [submission, setSubmission] = useState<ExistingSubmission | null>(existingSubmission)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answered = questions.filter((q) => answers[q.id]?.trim()).length
  const allAnswered = answered === questions.length
  const hasResults = submission !== null

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          responses: questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id] ?? '',
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Submission failed')
      }

      // Reload to pick up the saved submission + responses from the server
      router.refresh()

      // Optimistically show score from response
      const { submissionId, score } = await res.json()
      setSubmission({
        id: submissionId,
        score,
        graded_at: new Date().toISOString(),
        question_responses: questions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] ?? '',
          score: null,
          max_score: q.points,
          feedback: null,
          ai_graded: false,
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Results view ─────────────────────────────────────────
  if (hasResults && submission.graded_at) {
    const responseMap = Object.fromEntries(
      (submission.question_responses ?? []).map((r) => [r.question_id, r])
    )

    return (
      <div className="space-y-6" role="region" aria-label="Task results">
        {/* Score summary */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
            <ScoreRing score={submission.score ?? 0} />
            <Progress
              value={submission.score ?? 0}
              className="w-48"
              aria-label="Score progress bar"
            />
            <p className="text-sm text-muted-foreground">
              {(submission.score ?? 0) >= 80
                ? 'Great work! You passed this task.'
                : (submission.score ?? 0) >= 60
                ? 'Good effort — review the feedback below to improve.'
                : 'Keep practicing — review the feedback and try again.'}
            </p>
          </CardContent>
        </Card>

        {/* Per-question breakdown */}
        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-lg font-semibold mb-3">Question breakdown</h2>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const response = responseMap[q.id]
              const earned = response?.score ?? null
              const scoreLabel = earned !== null
                ? `${earned} / ${response.max_score} pts`
                : 'Grading…'
              const correct = earned !== null && earned >= response.max_score

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-sm font-medium leading-snug">
                        Q{i + 1}. {q.prompt}
                      </CardTitle>
                      <Badge
                        variant={correct ? 'default' : 'secondary'}
                        className="shrink-0"
                        aria-label={`Score: ${scoreLabel}`}
                      >
                        {scoreLabel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground font-medium">Your answer: </span>
                      <span>{response?.answer || '—'}</span>
                    </div>
                    {q.type === 'mcq' && !correct && (
                      <div>
                        <span className="text-muted-foreground font-medium">Correct answer: </span>
                        <span className="text-green-700 dark:text-green-400">
                          {response?.feedback?.replace('The correct answer was: ', '') ?? ''}
                        </span>
                      </div>
                    )}
                    {response?.feedback && q.type === 'written' && (
                      <div
                        className="mt-2 rounded-md bg-muted p-3 text-sm"
                        role="note"
                        aria-label="AI feedback"
                      >
                        <span className="font-medium">Feedback: </span>
                        {response.feedback}
                        {response.ai_graded && (
                          <span className="ml-2 text-xs text-muted-foreground">(AI-graded)</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <Separator />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}`)}
          >
            Back to lesson
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSubmission(null)
              setAnswers({})
            }}
          >
            Retake task
          </Button>
        </div>
      </div>
    )
  }

  // ── Question form ─────────────────────────────────────────
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
      noValidate
      aria-label="Task questions"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
          <span>{answered} of {questions.length} answered</span>
          <Progress value={(answered / questions.length) * 100} className="w-32" aria-hidden="true" />
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-sm font-medium leading-snug" id={`q-${q.id}-label`}>
                Q{i + 1}. {q.prompt}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({q.points} pt{q.points !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === 'mcq' && q.options ? (
                <fieldset aria-labelledby={`q-${q.id}-label`}>
                  <legend className="sr-only">Question {i + 1}</legend>
                  <div className="space-y-2">
                    {q.options.map((option, oi) => {
                      const inputId = `q-${q.id}-opt-${oi}`
                      return (
                        <label
                          key={oi}
                          htmlFor={inputId}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted ${
                            answers[q.id] === option ? 'border-ring bg-muted' : ''
                          }`}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={`question-${q.id}`}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={() => setAnswer(q.id, option)}
                            className="accent-primary"
                            aria-label={option}
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : (
                <div className="space-y-2">
                  <label htmlFor={`q-${q.id}-text`} className="sr-only">
                    Your answer for question {i + 1}
                  </label>
                  <Textarea
                    id={`q-${q.id}-text`}
                    rows={5}
                    placeholder="Write your response here…"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    aria-required="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(answers[q.id] ?? '').trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}`)}
          >
            ← Back to lesson
          </Button>
          <Button
            type="submit"
            disabled={!allAnswered || loading}
            aria-busy={loading}
            aria-disabled={!allAnswered}
          >
            {loading ? 'Grading…' : 'Submit answers'}
          </Button>
        </div>
      </div>
    </form>
  )
}
