'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import katex from 'katex'

interface Question {
  id: string
  prompt: string
  type: 'mcq' | 'written'
  options: string[] | null
  points: number
  image_url?: string | null
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
  timeLimitSeconds: number | null
  timedMode: 'untimed' | 'practice' | 'exam'
  nextHref: string | null
  nextLabel: string
  attemptNumber?: number
  previouslyWrongQuestionIds?: string[]
  cycleComplete?: boolean
  previousAnswersByQuestionId?: Record<string, string>
}

/** Renders a KaTeX expression; falls back to the raw string on error */
function KaTeXSpan({ latex, display = false }: { latex: string; display?: boolean }) {
  try {
    const html = katex.renderToString(latex, { displayMode: display, throwOnError: false })
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  } catch {
    return <span>{latex}</span>
  }
}

/** Renders an HTML table converted from markdown by the import script */
function PromptHtmlTable({ html }: { html: string }) {
  const rows: { cells: string[]; isHeader: boolean }[] = []
  const trPattern = /<tr>([\s\S]*?)<\/tr>/g
  let trMatch
  while ((trMatch = trPattern.exec(html)) !== null) {
    const rowHtml = trMatch[1]
    const isHeader = rowHtml.includes('<th>')
    const cellPattern = /<t[hd]>([\s\S]*?)<\/t[hd]>/g
    const cells: string[] = []
    let cellMatch
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1])
    }
    rows.push({ cells, isHeader })
  }
  return (
    <div className="overflow-x-auto my-3">
      <table className="border-collapse text-xs">
        <tbody>
          {rows.map((row, ri) =>
            row.isHeader ? (
              <tr key={ri} className="bg-gray-100">
                {row.cells.map((cell, ci) => (
                  <th key={ci} className="border border-gray-300 px-2 py-1 font-semibold text-left">{cell}</th>
                ))}
              </tr>
            ) : (
              <tr key={ri} className="even:bg-gray-50">
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="border border-gray-300 px-2 py-1">{cell}</td>
                ))}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Renders inline content: $$...$$ (display math), $...$ (inline math),
 * <u>...</u> (underline), and plain text.
 */
function PromptInline({ text }: { text: string }) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|<u>[\s\S]*?<\/u>)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$'))
          return <KaTeXSpan key={i} latex={part.slice(2, -2)} display />
        if (part.startsWith('$') && part.endsWith('$'))
          return <KaTeXSpan key={i} latex={part.slice(1, -1)} />
        const uMatch = part.match(/^<u>([\s\S]*?)<\/u>$/)
        if (uMatch) return <u key={i}>{uMatch[1]}</u>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Top-level prompt renderer: handles <table> blocks then delegates inline content */
function PromptText({ text }: { text: string }) {
  if (text.includes('<table>')) {
    const parts = text.split(/(<table>[\s\S]*?<\/table>)/)
    return (
      <span style={{ whiteSpace: 'pre-line' }}>
        {parts.map((part, i) =>
          part.startsWith('<table>')
            ? <PromptHtmlTable key={i} html={part} />
            : <PromptInline key={i} text={part} />
        )}
      </span>
    )
  }
  return (
    <span style={{ whiteSpace: 'pre-line' }}>
      <PromptInline text={text} />
    </span>
  )
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const STORAGE_KEY = (taskId: string) => `lp-task-start-${taskId}`

const DISPLAY_LETTERS = ['A', 'B', 'C', 'D', 'E']

/**
 * Deterministic shuffle using a string seed.
 * Same seed always produces the same order, different seeds produce different orders.
 * Used to shuffle MCQ options per question per attempt without storing shuffle state.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i
    hash |= 0
    const j = Math.abs(hash) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function TaskRunner({
  taskId, courseId, lessonId, questions, existingSubmission,
  timeLimitSeconds, timedMode, nextHref, nextLabel,
  attemptNumber = 1,
  previouslyWrongQuestionIds = [],
  cycleComplete = false,
  previousAnswersByQuestionId = {},
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

  const [hints, setHints] = useState<Record<string, { open: boolean; loading: boolean; text: string | null }>>({})
  const [explanations, setExplanations] = useState<Record<string, { loading: boolean; text: string | null }>>({})
  const [retakeMode, setRetakeMode] = useState<null | 'missed' | 'newCycle'>(null)

  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(timedMode === 'exam')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [timeExpired, setTimeExpired] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasSubmitted = useRef(false)

  const shouldShowTimer = timeLimitSeconds !== null && timedMode !== 'untimed' && timerEnabled

  const visibleQuestions = retakeMode === 'missed'
    ? questions.filter((q) => previouslyWrongQuestionIds.includes(q.id))
    : questions

  const showCycleEndResults = cycleComplete || retakeMode === 'missed'

  // Initialize timer from localStorage or fresh
  useEffect(() => {
    if (!timeLimitSeconds || timedMode === 'untimed' || !timerEnabled || submission) return

    const key = STORAGE_KEY(taskId)
    const stored = localStorage.getItem(key)
    let startTime: number

    if (stored) {
      startTime = parseInt(stored)
    } else {
      startTime = Date.now()
      localStorage.setItem(key, String(startTime))
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const remaining = timeLimitSeconds - elapsed

    if (remaining <= 0) {
      setTimeLeft(0)
      setTimeExpired(true)
    } else {
      setTimeLeft(remaining)
    }
  }, [taskId, timeLimitSeconds, timedMode, timerEnabled, submission])

  // Countdown interval
  useEffect(() => {
    if (!shouldShowTimer || timeLeft === null || submission) return

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!)
          setTimeExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current!)
  }, [shouldShowTimer, timeLeft, submission])

  async function toggleHint(questionId: string) {
    const current = hints[questionId]
    if (current?.open) {
      setHints((prev) => ({ ...prev, [questionId]: { ...prev[questionId], open: false } }))
      return
    }
    if (current?.text) {
      setHints((prev) => ({ ...prev, [questionId]: { ...prev[questionId], open: true } }))
      return
    }
    setHints((prev) => ({ ...prev, [questionId]: { open: true, loading: true, text: null } }))
    try {
      const res = await fetch('/api/question-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      const data = await res.json()
      setHints((prev) => ({ ...prev, [questionId]: { open: true, loading: false, text: data.hint ?? 'No hint available.' } }))
    } catch {
      setHints((prev) => ({ ...prev, [questionId]: { open: true, loading: false, text: 'Unable to load hint. Try again.' } }))
    }
  }

  async function fetchExplanation(questionId: string, studentAnswer: string) {
    if (explanations[questionId]?.text) return
    setExplanations((prev) => ({ ...prev, [questionId]: { loading: true, text: null } }))
    try {
      const res = await fetch('/api/question-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, studentAnswer, taskId }),
      })
      if (res.status === 403) {
        setExplanations((prev) => ({ ...prev, [questionId]: { loading: false, text: 'Try this question one more time before the full walkthrough unlocks.' } }))
        return
      }
      const data = await res.json()
      setExplanations((prev) => ({ ...prev, [questionId]: { loading: false, text: data.explanation ?? 'No explanation available.' } }))
    } catch {
      setExplanations((prev) => ({ ...prev, [questionId]: { loading: false, text: 'Unable to load explanation. Try again.' } }))
    }
  }

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          cycleStart: retakeMode === 'newCycle',
          responses: questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id] ?? previousAnswersByQuestionId[q.id] ?? '',
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Submission failed')
      }

      localStorage.removeItem(STORAGE_KEY(taskId))

      const { submissionId, score, questionResponses } = await res.json()

      setSubmission({
        id: submissionId,
        score,
        graded_at: new Date().toISOString(),
        question_responses: questionResponses,
      })
      router.refresh()
    } catch (err) {
      hasSubmitted.current = false
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [taskId, questions, answers, router, retakeMode, previousAnswersByQuestionId])

  useEffect(() => {
    if (timeExpired && timedMode === 'exam' && !submission && !hasSubmitted.current) {
      handleSubmit(true)
    }
  }, [timeExpired, timedMode, submission, handleSubmit])

  useEffect(() => {
    if (!showCycleEndResults || !submission?.graded_at) return
    const map = Object.fromEntries(
      (submission.question_responses ?? []).map((r) => [r.question_id, r])
    )
    const wrongMcqs = questions.filter((q) => {
      if (q.type !== 'mcq') return false
      const r = map[q.id]
      return r && (r.score ?? 0) < r.max_score
    })
    if (wrongMcqs.length === 0) return
    for (const q of wrongMcqs) {
      fetchExplanation(q.id, map[q.id].answer ?? '')
    }
  }, [submission?.id, retakeMode, cycleComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  const answered = visibleQuestions.filter((q) => answers[q.id]?.trim()).length
  const allAnswered = answered === visibleQuestions.length
  const hasResults = submission !== null

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleEnableTimer() {
    setTimerEnabled(true)
    localStorage.setItem(STORAGE_KEY(taskId), String(Date.now()))
    setTimeLeft(timeLimitSeconds!)
  }

  function resetForRetake(mode: 'missed' | 'newCycle') {
    hasSubmitted.current = false
    setSubmission(null)
    setAnswers({})
    setExplanations({})
    setHints({})
    setRetakeMode(mode)
    if (timeLimitSeconds && timedMode !== 'untimed') {
      localStorage.removeItem(STORAGE_KEY(taskId))
      setTimeLeft(timeLimitSeconds)
      setTimeExpired(false)
      setTimerEnabled(timedMode === 'exam')
    }
  }

  const timerColor =
    timeLeft !== null && timeLimitSeconds !== null
      ? timeLeft <= 60 ? 'text-red-600'
      : timeLeft <= timeLimitSeconds * 0.2 ? 'text-yellow-600'
      : 'text-green-700'
      : 'text-green-700'

  // ── Results view ─────────────────────────────────────────────
  if (hasResults && submission.graded_at) {
    const responseMap = Object.fromEntries(
      (submission.question_responses ?? []).map((r) => [r.question_id, r])
    )

    return (
      <div className="space-y-6" role="region" aria-label="Task results">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
            <ScoreRing score={submission.score ?? 0} />
            <Progress value={submission.score ?? 0} className="w-48" aria-label="Score progress bar" />
            <p className="text-sm text-muted-foreground">
              {(submission.score ?? 0) >= 80
                ? 'Great work! You passed this task.'
                : (submission.score ?? 0) >= 60
                ? 'Good effort — review the feedback below to improve.'
                : 'Keep practicing — review the feedback and try again.'}
            </p>
          </CardContent>
        </Card>

        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-lg font-semibold mb-3">Question breakdown</h2>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const response = responseMap[q.id]
              const earned = response?.score ?? null
              const scoreLabel = earned !== null ? `${earned} / ${response.max_score} pts` : 'Grading…'
              const correct = earned !== null && earned >= response.max_score

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt={`Question ${i + 1} image`}
                        className="rounded-md border max-w-full mb-2"
                      />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-sm font-medium leading-snug">
                        Q{i + 1}. <PromptText text={q.prompt} />
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-semibold ${
                          earned === null
                            ? 'border-gray-300 text-gray-500'
                            : correct
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                        }`}
                        aria-label={`Score: ${scoreLabel}`}
                      >
                        {scoreLabel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground font-medium">Your answer: </span>
                      <PromptInline text={response?.answer?.replace(/^[A-D]\)\s*/, '') || '—'} />
                    </div>
                    {q.type === 'mcq' && !correct && showCycleEndResults && (
                      <div>
                        <span className="text-muted-foreground font-medium">Correct answer: </span>
                        <span className="text-green-700 dark:text-green-400">
                          <PromptInline text={(response?.feedback?.replace('The correct answer was: ', '') ?? '').replace(/^[A-D]\)\s*/, '')} />
                        </span>
                      </div>
                    )}
                    {response?.feedback && q.type === 'written' && (
                      <div className="mt-2 rounded-md bg-muted p-3 text-sm" role="note" aria-label="AI feedback">
                        <span className="font-medium">Feedback: </span>
                        {response.feedback}
                        {response.ai_graded && (
                          <span className="ml-2 text-xs text-muted-foreground">(AI-graded)</span>
                        )}
                      </div>
                    )}
                    {showCycleEndResults && q.type === 'mcq' && !correct && (
                      <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="note" aria-label="Full tutor explanation">
                        {explanations[q.id]?.text ? (
                          <>
                            <p className="font-semibold mb-1">Let&apos;s work through this together</p>
                            <PromptText text={explanations[q.id].text ?? ''} />
                          </>
                        ) : (
                          <div className="h-4 w-48 animate-pulse rounded bg-blue-200" aria-label="Loading explanation…" />
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

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}`)}>
              Back to lesson
            </Button>
            {showCycleEndResults ? (
              <Button variant="ghost" onClick={() => resetForRetake('newCycle')}>
                Start over
              </Button>
            ) : previouslyWrongQuestionIds.length > 0 ? (
              <Button variant="outline" onClick={() => resetForRetake('missed')}>
                Retake missed questions
              </Button>
            ) : null}
          </div>
          {nextHref && (
            <Button
              onClick={() => router.push(nextHref)}
              style={{ backgroundColor: 'var(--brand)' }}
              className="text-white hover:opacity-90"
            >
              {nextLabel} →
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Question form ──────────────────────────────────────────
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} noValidate aria-label="Task questions">
      <div className="space-y-6">

        {/* Timer bar */}
        {timeLimitSeconds !== null && timedMode !== 'untimed' && (
          <div className="rounded-xl border p-4 space-y-2">
            {timerEnabled ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {timedMode === 'exam' ? '⏱ Exam timer' : '⏱ Practice timer'}
                  </span>
                  <span
                    className={`text-2xl font-bold tabular-nums ${timerColor}`}
                    aria-live="polite"
                    aria-label={`Time remaining: ${timeLeft !== null ? formatTime(timeLeft) : '—'}`}
                  >
                    {timeLeft !== null ? formatTime(timeLeft) : formatTime(timeLimitSeconds)}
                  </span>
                </div>
                {timeLeft !== null && (
                  <Progress
                    value={(timeLeft / timeLimitSeconds) * 100}
                    className="h-1.5"
                    aria-hidden="true"
                  />
                )}
                {timeLeft !== null && timeLeft <= timeLimitSeconds * 0.2 && timeLeft > 0 && (
                  <p className="text-xs font-medium text-yellow-700" role="alert" aria-live="assertive">
                    Less than 20% of time remaining — wrap up soon.
                  </p>
                )}
                {timeExpired && (
                  <p className="text-xs font-medium text-red-600" role="alert" aria-live="assertive">
                    {timedMode === 'exam' ? 'Time is up — submitting your answers…' : 'Time is up.'}
                  </p>
                )}
                {timedMode === 'practice' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTimerEnabled(false)
                      clearInterval(intervalRef.current!)
                      localStorage.removeItem(STORAGE_KEY(taskId))
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Disable timer
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Timer available</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(timeLimitSeconds / 60)} minutes · optional for practice mode
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleEnableTimer}>
                  Start timer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
          <span>{answered} of {visibleQuestions.length} answered</span>
          <Progress value={visibleQuestions.length > 0 ? (answered / visibleQuestions.length) * 100 : 0} className="w-32" aria-hidden="true" />
        </div>

        {/* Questions */}
        {visibleQuestions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              {q.image_url && (
                <img
                  src={q.image_url}
                  alt={`Question ${i + 1} image`}
                  className="rounded-md border max-w-full mb-2"
                />
              )}
              <CardTitle className="text-sm font-medium leading-snug" id={`q-${q.id}-label`}>
                Q{i + 1}. <PromptText text={q.prompt} />
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({q.points} pt{q.points !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {retakeMode === 'missed' && previouslyWrongQuestionIds.includes(q.id) && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => toggleHint(q.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                    aria-expanded={hints[q.id]?.open ?? false}
                  >
                    <span>{hints[q.id]?.open ? '▾' : '▸'}</span>
                    <span>Need a hint?</span>
                  </button>
                  {hints[q.id]?.open && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
                      {hints[q.id]?.loading ? 'Loading hint…' : hints[q.id]?.text}
                    </div>
                  )}
                </div>
              )}
              {q.type === 'mcq' && q.options ? (
                <fieldset aria-labelledby={`q-${q.id}-label`}>
                  <legend className="sr-only">Question {i + 1}</legend>
                  <div className="space-y-2">
                    {seededShuffle(q.options, `${q.id}-${attemptNumber}`).map((option, oi) => {
                      const content = option.replace(/^[A-D]\)\s*/, '')
                      const displayText = `${DISPLAY_LETTERS[oi]}) ${content}`
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
                            aria-label={displayText}
                          />
                          <span className="text-sm"><PromptInline text={displayText} /></span>
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

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

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
            disabled={!allAnswered || loading || (timedMode === 'exam' && timeExpired)}
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
