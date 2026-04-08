'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  courseId: string
  diagnosticTaskPath: string | null
}

interface Scores {
  english: string
  math: string
  reading: string
  science: string
  composite: string
}

type Step = 'start' | 'upload-or-manual' | 'no-score'
type ScoreTab = 'upload' | 'manual'

const emptyScores: Scores = { english: '', math: '', reading: '', science: '', composite: '' }

export function OnboardingFlow({ courseId, diagnosticTaskPath }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('start')
  const [scoreTab, setScoreTab] = useState<ScoreTab>('upload')
  const [scores, setScores] = useState<Scores>(emptyScores)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/act/extract-scores', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      setScores({
        english: data.english != null ? String(data.english) : '',
        math: data.math != null ? String(data.math) : '',
        reading: data.reading != null ? String(data.reading) : '',
        science: data.science != null ? String(data.science) : '',
        composite: data.composite != null ? String(data.composite) : '',
      })
      setScoreTab('manual') // switch to manual to let user review/correct
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read scores from image')
    } finally {
      setUploading(false)
    }
  }

  function parseScore(val: string): number | null {
    const n = parseInt(val, 10)
    return isNaN(n) ? null : Math.min(36, Math.max(1, n))
  }

  async function saveBaseline(source: string, overrideScores?: Partial<Scores>) {
    setSaving(true)
    const s = overrideScores ? { ...emptyScores, ...overrideScores } : scores
    await fetch('/api/act/save-baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        english: parseScore(s.english),
        math: parseScore(s.math),
        reading: parseScore(s.reading),
        science: parseScore(s.science),
        composite: parseScore(s.composite),
        source,
      }),
    })
    setSaving(false)
    router.push(`/courses/${courseId}`)
  }

  // ── Step: start ──────────────────────────────────────────────────────────────
  if (step === 'start') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border max-w-lg w-full p-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-6"
          style={{ backgroundColor: 'var(--brand)' }}
          aria-hidden="true"
        >
          ED
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Before you begin — let&apos;s establish your baseline</h1>
        <p className="mt-2 text-sm text-gray-500">
          Knowing your starting point helps you track progress and focus on the right areas.
        </p>
        <p className="mt-6 text-sm font-medium text-gray-700">Have you taken an official ACT in the last 6 months?</p>
        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={() => setStep('upload-or-manual')}
            className="w-full rounded-xl border-2 px-4 py-3 text-sm font-semibold text-left transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
          >
            Yes — I have recent scores
          </button>
          <button
            onClick={() => setStep('no-score')}
            className="w-full rounded-xl border px-4 py-3 text-sm font-semibold text-left text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-gray-200"
          >
            No — I haven&apos;t tested recently
          </button>
        </div>
      </div>
    )
  }

  // ── Step: upload or manual ───────────────────────────────────────────────────
  if (step === 'upload-or-manual') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border max-w-lg w-full p-8">
        <button
          onClick={() => setStep('start')}
          className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 rounded"
          style={{ outlineColor: 'var(--brand)' }}
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Enter your ACT scores</h1>
        <p className="mt-1 text-sm text-gray-500">Upload your score report or type them in manually.</p>

        {/* Tabs */}
        <div className="mt-5 flex border-b" role="tablist">
          {(['upload', 'manual'] as ScoreTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={scoreTab === tab}
              onClick={() => setScoreTab(tab)}
              className="px-4 pb-2 text-sm font-medium capitalize focus-visible:outline focus-visible:outline-2 rounded-t"
              style={
                scoreTab === tab
                  ? { color: 'var(--brand)', borderBottom: '2px solid var(--brand)', outlineColor: 'var(--brand)' }
                  : { color: '#6b7280', outlineColor: 'var(--brand)' }
              }
            >
              {tab === 'upload' ? 'Upload report' : 'Enter manually'}
            </button>
          ))}
        </div>

        {scoreTab === 'upload' && (
          <div className="mt-5">
            <label
              htmlFor="score-upload"
              className="block w-full rounded-xl border-2 border-dashed border-gray-200 p-8 text-center cursor-pointer hover:border-gray-300 transition-colors"
            >
              <p className="text-sm font-medium text-gray-700">Click to upload your ACT score report</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — screenshot or photo of the official report</p>
              {uploading && <p className="text-xs mt-3" style={{ color: 'var(--brand)' }}>Reading scores from image...</p>}
              {uploadError && <p className="text-xs mt-3 text-red-600">{uploadError}</p>}
            </label>
            <input
              id="score-upload"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Upload ACT score report image"
            />
            <p className="mt-3 text-xs text-gray-400 text-center">
              After upload, scores will auto-fill and you can correct any errors.
            </p>
          </div>
        )}

        {scoreTab === 'manual' && (
          <div className="mt-5 space-y-4">
            {(['english', 'math', 'reading', 'science', 'composite'] as (keyof Scores)[]).map((field) => (
              <div key={field} className="flex items-center gap-4">
                <label htmlFor={`score-${field}`} className="w-28 text-sm font-medium text-gray-700 capitalize">
                  {field}
                </label>
                <input
                  id={`score-${field}`}
                  type="number"
                  min={1}
                  max={36}
                  placeholder="1–36"
                  value={scores[field]}
                  onChange={(e) => setScores((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand)' } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => saveBaseline('manual')}
          disabled={saving}
          className="mt-6 w-full rounded-xl py-2.5 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand)', outlineColor: 'var(--brand)' }}
        >
          {saving ? 'Saving...' : 'Save & Start Course →'}
        </button>
      </div>
    )
  }

  // ── Step: no recent score ────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm border max-w-lg w-full p-8">
      <button
        onClick={() => setStep('start')}
        className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 rounded"
        style={{ outlineColor: 'var(--brand)' }}
      >
        ← Back
      </button>
      <h1 className="text-xl font-bold text-gray-900">No recent score? No problem.</h1>
      <p className="mt-2 text-sm text-gray-500">
        Take our 40-question diagnostic to get an estimated starting score across all four ACT sections, or skip and jump straight into the curriculum.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {diagnosticTaskPath ? (
          <Link
            href={diagnosticTaskPath}
            className="w-full rounded-xl py-3 px-4 text-sm font-semibold text-white text-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: 'var(--brand)', outlineColor: 'var(--brand)' }}
          >
            Take the 40-question diagnostic →
          </Link>
        ) : (
          <p className="text-sm text-red-500">Diagnostic not available. Please contact your instructor.</p>
        )}

        <button
          onClick={() => saveBaseline('skipped')}
          disabled={saving}
          className="w-full rounded-xl border border-gray-200 py-3 px-4 text-sm font-semibold text-gray-700 text-center transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          style={{ outlineColor: 'var(--brand)' }}
        >
          {saving ? 'Saving...' : 'Skip for now — start the course'}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        You can always revisit your baseline score from your dashboard.
      </p>
    </div>
  )
}
