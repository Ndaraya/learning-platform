'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  practiceTestId: string
  courseId: string
  questionCounts: Record<string, number>
  answerFormat?: 'alternating' | 'uniform'
}

const SECTIONS = ['english', 'math', 'reading', 'science'] as const
type Section = typeof SECTIONS[number]

// Traditional ACT: odd questions → A B C D, even questions → F G H J
const ODD_CHOICES      = ['A', 'B', 'C', 'D'] as const
const EVEN_CHOICES     = ['F', 'G', 'H', 'J'] as const
const UNIFORM_CHOICES  = ['A', 'B', 'C', 'D'] as const
function choicesFor(questionNum: number, answerFormat: 'alternating' | 'uniform') {
  if (answerFormat === 'uniform') return UNIFORM_CHOICES
  return questionNum % 2 === 1 ? ODD_CHOICES : EVEN_CHOICES
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function AnswerGrid({ practiceTestId, courseId, questionCounts, answerFormat = 'alternating' }: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<Section>('english')
  const [responses, setResponses] = useState<Record<string, Record<string, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sectionIndex = SECTIONS.indexOf(activeSection)
  const prevSection = sectionIndex > 0 ? SECTIONS[sectionIndex - 1] : null
  const nextSection = sectionIndex < SECTIONS.length - 1 ? SECTIONS[sectionIndex + 1] : null
  const isLast = nextSection === null

  function setAnswer(section: Section, questionNum: number, choice: string) {
    setResponses((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [String(questionNum)]: prev[section]?.[String(questionNum)] === choice ? '' : choice,
      },
    }))
  }

  function answeredCount(section: Section): number {
    return Object.values(responses[section] ?? {}).filter(Boolean).length
  }

  function totalAnswered(): number {
    return SECTIONS.reduce((sum, s) => sum + answeredCount(s), 0)
  }

  function totalQuestions(): number {
    return SECTIONS.reduce((sum, s) => sum + (questionCounts[s] ?? 0), 0)
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/practice-tests/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ practiceTestId, courseId, responses }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Submission failed')
        }
        const { submissionId } = await res.json()
        router.push(`/courses/${courseId}/practice-tests/${practiceTestId}/results/${submissionId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const sectionCount = questionCounts[activeSection] ?? 0
  const answered = totalAnswered()
  const total = totalQuestions()

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{answered} of {total} answered</span>
        <div className="flex gap-1 flex-wrap justify-end">
          {SECTIONS.map((s) => {
            const count = questionCounts[s] ?? 0
            const done = answeredCount(s)
            const complete = done === count && count > 0
            const active = s === activeSection
            return (
              <span
                key={s}
                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize cursor-pointer transition-colors ${
                  complete
                    ? 'bg-green-100 text-green-700'
                    : active
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
                onClick={() => setActiveSection(s)}
              >
                {s} {done}/{count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b">
        {SECTIONS.map((s, i) => {
          const count = questionCounts[s] ?? 0
          const done = answeredCount(s)
          const complete = done === count && count > 0
          return (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeSection === s
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              aria-selected={activeSection === s}
              role="tab"
            >
              {i + 1}. {s}
              {complete && <span className="ml-1 text-green-500">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Bubble grid — 4 choices per row; odd Qs: A B C D, even Qs: F G H J */}
      <div
        className="grid gap-y-1"
        style={{ gridTemplateColumns: '2rem repeat(4, 2.25rem)' }}
        role="group"
        aria-label={`${activeSection} answers`}
      >
        {/* Header */}
        <div />
        {(answerFormat === 'uniform' ? ['A', 'B', 'C', 'D'] : ['A/F', 'B/G', 'C/H', 'D/J']).map((h) => (
          <div key={h} className="text-center text-xs font-semibold text-gray-400 pb-1">{h}</div>
        ))}

        {/* Question rows */}
        {Array.from({ length: sectionCount }, (_, i) => {
          const num = i + 1
          const choices = choicesFor(num, answerFormat)
          const current = responses[activeSection]?.[String(num)] ?? ''
          return (
            <div key={num} className="contents" role="row" aria-label={`Question ${num}`}>
              <div className="text-xs text-gray-500 text-right pr-2 flex items-center justify-end w-8 shrink-0">
                {num}
              </div>
              {choices.map((choice) => {
                const selected = current === choice
                return (
                  <div key={choice} className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setAnswer(activeSection, num, choice)}
                      aria-pressed={selected}
                      aria-label={`Question ${num}, choice ${choice}`}
                      className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-all ${
                        selected
                          ? 'text-white border-[var(--brand)]'
                          : 'border-gray-300 text-gray-400 hover:border-gray-400'
                      }`}
                      style={selected ? { backgroundColor: 'var(--brand)' } : {}}
                    >
                      {choice}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {/* Section-by-section footer navigation */}
      <div className="pt-4 flex items-center justify-between border-t">
        {/* Left: back button or hint text */}
        {prevSection ? (
          <button
            type="button"
            onClick={() => setActiveSection(prevSection)}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← {capitalize(prevSection)}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Unanswered questions are marked incorrect.
          </p>
        )}

        {/* Right: next section or submit */}
        {nextSection ? (
          <Button
            type="button"
            onClick={() => setActiveSection(nextSection)}
            style={{ backgroundColor: 'var(--brand)' }}
            className="text-white hover:opacity-90"
          >
            Next: {capitalize(nextSection)} →
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            aria-busy={isPending}
            style={{ backgroundColor: 'var(--brand)' }}
            className="text-white hover:opacity-90"
          >
            {isPending ? 'Scoring…' : 'Submit all answers →'}
          </Button>
        )}
      </div>
    </div>
  )
}
