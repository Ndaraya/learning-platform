'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  taskId: string
  courseId: string
  lessonId: string
  nextHref: string | null
  fallbackHref: string
}

export function VideoTaskCompleteButton({ taskId, courseId, lessonId, nextHref, fallbackHref }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/grade-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, responses: [] }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to mark complete')
        }
        router.push(nextHref ?? fallbackHref)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleComplete}
        disabled={isPending}
        className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        {isPending ? 'Marking complete…' : 'Mark as complete →'}
      </button>
    </div>
  )
}
