import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ courseId: string; testId: string; submissionId: string }>
}

const SECTION_META: Array<{ key: string; label: string; short: string }> = [
  { key: 'english',  label: 'English',     short: 'ENG'  },
  { key: 'math',     label: 'Mathematics', short: 'MATH' },
  { key: 'reading',  label: 'Reading',     short: 'READ' },
  { key: 'science',  label: 'Science',     short: 'SCI'  },
]

function benchmarkStatus(key: string, score: number | null): { met: boolean; benchmark: number } | null {
  // ACT College Readiness Benchmarks
  const benchmarks: Record<string, number> = { english: 18, math: 22, reading: 22, science: 23 }
  const b = benchmarks[key]
  if (!b || score == null) return null
  return { met: score >= b, benchmark: b }
}

export default async function PracticeTestResultsPage({ params }: Props) {
  const { courseId, testId, submissionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: submission }, { data: test }, { data: baseline }] = await Promise.all([
    supabase
      .from('practice_test_submissions')
      .select('id, english_score, math_score, reading_score, science_score, composite_score, raw_english, raw_math, raw_reading, raw_science, submitted_at, practice_test_id')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('practice_tests')
      .select('id, title, question_counts')
      .eq('id', testId)
      .maybeSingle(),
    supabase
      .from('act_baselines')
      .select('composite_score, english_score, math_score, reading_score, science_score')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle(),
  ])

  if (!submission || !test || submission.practice_test_id !== testId) notFound()

  const questionCounts = test.question_counts as Record<string, number>

  type ScoreKey = 'english_score' | 'math_score' | 'reading_score' | 'science_score'
  type RawKey = 'raw_english' | 'raw_math' | 'raw_reading' | 'raw_science'

  const sections = SECTION_META.map(({ key, label, short }) => {
    const scoreKey = `${key}_score` as ScoreKey
    const rawKey = `raw_${key}` as RawKey
    const scale = submission[scoreKey]
    const raw = submission[rawKey]
    const total = questionCounts[key] ?? 0
    const baselineScore = baseline ? (baseline[scoreKey] ?? null) : null
    const delta = scale != null && baselineScore != null ? scale - baselineScore : null
    const pct = raw != null && total > 0 ? Math.round((raw / total) * 100) : null
    const bench = benchmarkStatus(key, scale)
    return { key, label, short, scale, raw, total, baselineScore, delta, pct, bench }
  })

  const compositeBaseline = baseline?.composite_score ?? null
  const compositeDelta = submission.composite_score != null && compositeBaseline != null
    ? submission.composite_score - compositeBaseline
    : null

  const dateStr = new Date(submission.submitted_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Score header card ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {/* Top stripe: title + date */}
          <div className="px-8 pt-6 pb-4 border-b">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Student Score Report</p>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">{test.title}</h1>
            <p className="text-sm text-gray-500">Test Date: {dateStr}</p>
          </div>

          {/* Score boxes */}
          <div className="px-8 py-6">
            <div className="flex items-end gap-4 flex-wrap">
              {/* Composite — large */}
              <div
                className="flex flex-col items-center justify-center rounded-xl px-7 py-5 shrink-0 text-white"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                <span
                  className="text-6xl font-black leading-none tabular-nums"
                  aria-label={`Composite score: ${submission.composite_score ?? 'not available'}`}
                >
                  {submission.composite_score ?? '—'}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest mt-1.5 opacity-80">Composite</span>
              </div>

              {/* Section score boxes */}
              <div className="flex gap-3 flex-wrap">
                {sections.map(({ key, short, scale }) => (
                  <div
                    key={key}
                    className="flex flex-col items-center justify-center rounded-xl border-2 px-5 py-4 min-w-[5rem]"
                    style={{ borderColor: 'var(--brand)' }}
                  >
                    <span
                      className="text-3xl font-extrabold tabular-nums"
                      style={{ color: scale ? 'var(--brand)' : '#d1d5db' }}
                      aria-label={`${key} score: ${scale ?? 'not available'}`}
                    >
                      {scale ?? '—'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">{short}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Composite baseline delta */}
            {compositeDelta !== null && (
              <div className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                compositeDelta > 0
                  ? 'bg-green-50 text-green-700'
                  : compositeDelta < 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {compositeDelta > 0
                  ? `↑ +${compositeDelta} pts from baseline (${compositeBaseline})`
                  : compositeDelta < 0
                  ? `↓ ${compositeDelta} pts from baseline (${compositeBaseline})`
                  : `No change from baseline (${compositeBaseline})`}
              </div>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Composite = (English + Math + Reading) ÷ 3 &nbsp;·&nbsp; Scale: 1–36
            </p>
          </div>
        </div>

        {/* ── Detailed Results card ─────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border px-8 py-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-5">Detailed Results</h2>

          <div className="space-y-5">
            {sections.map(({ key, label, scale, raw, total, delta, pct, bench }) => (
              <div key={key}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-sm text-gray-800 w-28 shrink-0">{label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: scale ? 'var(--brand)' : '#9ca3af' }}>
                      {scale ?? '—'}<span className="text-xs font-normal text-gray-400">/36</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                    {raw != null && total > 0 && (
                      <span className="tabular-nums">{raw}/{total} correct ({pct}%)</span>
                    )}
                    {delta !== null && (
                      <span className={`font-semibold ${
                        delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : '→ 0'} vs baseline
                      </span>
                    )}
                    {bench && (
                      <span className={`font-semibold ${bench.met ? 'text-green-600' : 'text-gray-400'}`}
                        title={`ACT College Readiness Benchmark: ${bench.benchmark}`}
                      >
                        {bench.met ? '✓ Benchmark met' : `Benchmark: ${bench.benchmark}`}
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${scale != null ? Math.round((scale / 36) * 100) : 0}%`,
                      backgroundColor: 'var(--brand)',
                    }}
                    role="meter"
                    aria-valuenow={scale ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={36}
                    aria-label={`${label} scale score`}
                  />
                </div>
                {/* ACT Readiness range indicator */}
                {bench && (
                  <div className="mt-1 relative h-1">
                    <div
                      className="absolute top-0 w-0.5 h-3 -mt-1 bg-gray-300 rounded-full"
                      style={{ left: `${Math.round((bench.benchmark / 36) * 100)}%` }}
                      title={`Benchmark: ${bench.benchmark}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-gray-400 leading-relaxed">
            ACT College Readiness Benchmarks represent the minimum score associated with a 50% chance of earning a B
            or higher in corresponding first-year college courses: English 18, Math 22, Reading 22, Science 23.
          </p>
        </div>

        {/* ── Score range note ──────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border px-8 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Your Score Range</strong> &mdash; Test scores are estimates of your
            educational development. Your true achievement on this test is within a range that extends approximately
            ±1 point for the Composite and ±2 points for each section score.
          </p>
        </div>

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border px-8 py-5 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/courses/${courseId}/practice-tests/${testId}`}
            className="flex-1 text-center rounded-xl py-2.5 px-4 text-sm font-semibold border-2 transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
          >
            Retake this test
          </Link>
          <Link
            href={`/courses/${courseId}/practice-tests`}
            className="flex-1 text-center rounded-xl py-2.5 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            View all practice tests →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">
          <Link href="/dashboard" className="hover:underline underline-offset-2">Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
