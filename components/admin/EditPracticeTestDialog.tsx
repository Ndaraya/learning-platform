'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updatePracticeTest } from '@/app/admin/courses/[courseId]/edit/practice-test-actions'
import type { PracticeTest } from '@/lib/supabase/types'

interface Props {
  courseId: string
  test: PracticeTest
}

const SECTIONS = ['english', 'math', 'reading', 'science'] as const
type Section = typeof SECTIONS[number]

const CHOICES = ['A', 'B', 'C', 'D', 'E']

export function EditPracticeTestDialog({ courseId, test }: Props) {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('english')
  const [title, setTitle] = useState(test.title)
  const [description, setDescription] = useState(test.description ?? '')
  const [counts, setCounts] = useState<Record<string, number>>(test.question_counts)
  const [answerKey, setAnswerKey] = useState<Record<string, Record<string, string>>>(
    () => JSON.parse(JSON.stringify(test.answer_key || {}))
  )
  const [scoringTableJson, setScoringTableJson] = useState(
    () => JSON.stringify(test.scoring_table || {}, null, 2)
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setAnswer(section: Section, num: number, value: string) {
    setAnswerKey((prev) => ({
      ...prev,
      [section]: { ...(prev[section] ?? {}), [String(num)]: value },
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let parsedScoring: Record<string, Record<string, number>> = {}
    try {
      parsedScoring = JSON.parse(scoringTableJson)
    } catch {
      setError('Scoring table is not valid JSON')
      return
    }

    startTransition(async () => {
      try {
        await updatePracticeTest(courseId, test.id, title, description, counts, answerKey, parsedScoring)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update practice test')
      }
    })
  }

  const sectionCount = counts[activeSection] ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="edit-pt-title">
        <DialogHeader>
          <DialogTitle id="edit-pt-title">Edit practice test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Metadata */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ept-title">Title</Label>
              <Input id="ept-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ept-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="ept-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Question counts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Question counts</Label>
            <div className="grid grid-cols-4 gap-2">
              {SECTIONS.map((section) => (
                <div key={section} className="space-y-1">
                  <Label htmlFor={`ept-count-${section}`} className="text-xs capitalize">{section}</Label>
                  <Input
                    id={`ept-count-${section}`}
                    type="number"
                    min={1}
                    max={200}
                    value={counts[section] ?? ''}
                    onChange={(e) => setCounts((prev) => ({ ...prev, [section]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Answer key editor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Answer key</Label>
            {/* Section tabs */}
            <div className="flex gap-1 border-b">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSection(s)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t transition-colors ${
                    activeSection === s
                      ? 'border border-b-white bg-white text-gray-900 -mb-px'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1 max-h-64 overflow-y-auto pr-1">
              {Array.from({ length: sectionCount }, (_, i) => {
                const num = i + 1
                const current = answerKey[activeSection]?.[String(num)] ?? ''
                return (
                  <div key={num} className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 w-5 text-right shrink-0">{num}.</span>
                    <select
                      value={current}
                      onChange={(e) => setAnswer(activeSection, num, e.target.value)}
                      className="flex-1 text-xs border rounded px-1 py-0.5 bg-white"
                      aria-label={`Question ${num} answer`}
                    >
                      <option value="">—</option>
                      {CHOICES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scoring table (JSON) */}
          <div className="space-y-1">
            <Label htmlFor="ept-scoring">
              Scoring table <span className="text-muted-foreground text-xs">(JSON: {`{"english":{"40":36,...},...}`})</span>
            </Label>
            <Textarea
              id="ept-scoring"
              rows={6}
              value={scoringTableJson}
              onChange={(e) => setScoringTableJson(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} aria-busy={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
