'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RecordPracticeTestScorePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()

  const [english, setEnglish] = useState('')
  const [math, setMath] = useState('')
  const [reading, setReading] = useState('')
  const [science, setScience] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const e = parseInt(english) || null
  const m = parseInt(math) || null
  const r = parseInt(reading) || null
  const s = parseInt(science) || null

  const compositeInputs = [e, m, r].filter((v): v is number => v !== null)
  const composite = compositeInputs.length === 3
    ? Math.round(compositeInputs.reduce((a, b) => a + b, 0) / 3)
    : null

  function valid(val: number | null): boolean {
    return val === null || (val >= 1 && val <= 36)
  }

  function handleSubmit(e_: React.FormEvent) {
    e_.preventDefault()
    setError(null)

    if (!e || !m || !r || !s) {
      setError('Please enter all four section scores.')
      return
    }
    if (![e, m, r, s].every(valid)) {
      setError('Scores must be between 1 and 36.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/practice-tests/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, english: e, math: m, reading: r, science: s, composite }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Failed to record score')
        }
        router.push(`/courses/${courseId}/practice-tests`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}/practice-tests`}
          className="text-sm text-muted-foreground hover:underline underline-offset-4"
        >
          ← Practice Tests
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Record a practice test score</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Took an official ACT practice test elsewhere? Enter your scaled section scores below to track your progress.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'english', label: 'English', value: english, set: setEnglish },
            { id: 'math', label: 'Math', value: math, set: setMath },
            { id: 'reading', label: 'Reading', value: reading, set: setReading },
            { id: 'science', label: 'Science', value: science, set: setScience },
          ].map(({ id, label, value, set }) => (
            <div key={id} className="space-y-1">
              <Label htmlFor={id}>{label} <span className="text-muted-foreground text-xs">(1–36)</span></Label>
              <Input
                id={id}
                type="number"
                min={1}
                max={36}
                placeholder="—"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
        </div>

        {composite !== null && (
          <div className="rounded-xl border-2 p-4 flex items-center gap-4" style={{ borderColor: 'var(--brand)' }}>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Composite</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>{composite}</p>
            </div>
            <p className="text-sm text-gray-500 flex-1">
              Composite = (English + Math + Reading) ÷ 3. Science is reported separately.
            </p>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full text-white"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {isPending ? 'Saving…' : 'Save score'}
        </Button>
      </form>
    </div>
  )
}
