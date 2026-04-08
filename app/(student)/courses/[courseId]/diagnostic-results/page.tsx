import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ courseId: string }>
}

function toActScale(rawCorrect: number, total: number): number {
  return Math.max(1, Math.round((rawCorrect / total) * 36))
}

function label(score: number): { text: string; color: string } {
  if (score >= 28) return { text: 'Strength', color: '#16a34a' }
  if (score >= 20) return { text: 'On track', color: '#ca8a04' }
  return { text: 'Focus area', color: '#dc2626' }
}

export default async function DiagnosticResultsPage({ params }: Props) {
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

  // Get the 4 diagnostic task IDs (from "Diagnostic Assessment" module)
  const { data: diagnosticModule } = await supabase
    .from('modules')
    .select('id, lessons(id, tasks(id, title, order))')
    .eq('course_id', courseId)
    .eq('title', 'Diagnostic Assessment')
    .maybeSingle()

  if (!diagnosticModule) notFound()

  const lessons = diagnosticModule.lessons as Array<{
    id: string
    tasks: Array<{ id: string; title: string; order: number }>
  }>

  const allTasks = lessons.flatMap((l) => l.tasks).sort((a, b) => a.order - b.order)
  const taskIds = allTasks.map((t) => t.id)

  if (taskIds.length === 0) notFound()

  // Get the most recent submission per task for this user
  const { data: submissions } = await supabase
    .from('task_submissions')
    .select('task_id, score, max_score, graded_at')
    .eq('user_id', user.id)
    .in('task_id', taskIds)
    .order('created_at', { ascending: false })

  // Deduplicate: keep most recent submission per task
  const latestByTask = new Map<string, { score: number; max_score: number }>()
  for (const sub of submissions ?? []) {
    if (!latestByTask.has(sub.task_id) && sub.score != null && sub.max_score != null) {
      latestByTask.set(sub.task_id, { score: sub.score, max_score: sub.max_score })
    }
  }

  const sectionNames = ['English', 'Math', 'Reading', 'Science'] as const
  type Section = typeof sectionNames[number]
  const sectionScores: Partial<Record<Section, number>> = {}

  allTasks.forEach((task, i) => {
    const sub = latestByTask.get(task.id)
    if (sub && sub.max_score > 0) {
      const rawCorrect = Math.round((sub.score / sub.max_score) * 10)
      const sectionName = sectionNames[i]
      if (sectionName) sectionScores[sectionName] = toActScale(rawCorrect, 10)
    }
  })

  const completedSections = Object.keys(sectionScores).length
  const compositeScore = completedSections > 0
    ? Math.round(Object.values(sectionScores).reduce((a, b) => a + b, 0) / completedSections)
    : null

  // Auto-save the baseline as soon as the results page is visited — no extra button click needed.
  // Uses upsert so re-visiting never overwrites a manually-entered official score.
  const { data: existingBaseline } = await supabase
    .from('act_baselines')
    .select('source')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  // Only auto-save if no baseline exists or the existing one is already 'diagnostic'
  // (don't overwrite a manually-entered official score)
  if (!existingBaseline || existingBaseline.source === 'diagnostic') {
    await supabase
      .from('act_baselines')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          english_score: sectionScores['English'] ?? null,
          math_score: sectionScores['Math'] ?? null,
          reading_score: sectionScores['Reading'] ?? null,
          science_score: sectionScores['Science'] ?? null,
          composite_score: compositeScore,
          source: 'diagnostic',
        },
        { onConflict: 'user_id,course_id' }
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border max-w-lg w-full p-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-6"
          style={{ backgroundColor: 'var(--brand)' }}
          aria-hidden="true"
        >
          ED
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Your diagnostic results</h1>
        <p className="mt-1 text-sm text-gray-500">
          Based on your responses, here&apos;s your estimated starting ACT score. Results saved automatically.
        </p>

        {/* Score cards */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {sectionNames.map((section) => {
            const score = sectionScores[section]
            const { text: lbl, color } = score ? label(score) : { text: 'Not completed', color: '#9ca3af' }
            return (
              <div key={section} className="rounded-xl border p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{section}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: score ? 'var(--brand)' : '#d1d5db' }}>
                  {score ?? '—'}
                </p>
                <p className="text-xs font-medium mt-1" style={{ color }}>{lbl}</p>
              </div>
            )
          })}
        </div>

        {/* Composite */}
        {compositeScore && (
          <div className="mt-4 rounded-xl border-2 p-4 flex items-center gap-4" style={{ borderColor: 'var(--brand)' }}>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Composite</p>
              <p className="text-4xl font-bold" style={{ color: 'var(--brand)' }}>{compositeScore}</p>
            </div>
            <p className="text-sm text-gray-500 flex-1">
              Your estimated composite starting score. The average ACT score is 21.
            </p>
          </div>
        )}

        {completedSections < 4 && (
          <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
            {4 - completedSections} section{4 - completedSections !== 1 ? 's' : ''} not yet completed. Finish all four for a full baseline.
          </p>
        )}

        <div className="mt-6">
          <Link
            href={`/courses/${courseId}`}
            className="block w-full rounded-xl py-2.5 px-4 text-sm font-semibold text-white text-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: 'var(--brand)', outlineColor: 'var(--brand)' }}
          >
            Start your prep →
          </Link>
        </div>
      </div>
    </div>
  )
}
