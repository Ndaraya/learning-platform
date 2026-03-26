'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { updateQuestion } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  questionId: string
  initialPrompt: string
  initialType: 'mcq' | 'written'
  initialOptions: string[] | null
  initialCorrectAnswer: string | null
  initialPoints: number
  initialRubric: string | null
}

export function EditQuestionDialog({
  courseId, questionId,
  initialPrompt, initialType, initialOptions,
  initialCorrectAnswer, initialPoints, initialRubric,
}: Props) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [type] = useState<'mcq' | 'written'>(initialType) // type not editable after creation
  const [options, setOptions] = useState<string[]>(() => {
    const base = initialOptions ?? ['', '', '', '']
    // Pad to 4 slots
    return [...base, '', '', '', ''].slice(0, Math.max(4, base.length))
  })
  const [correctAnswer, setCorrectAnswer] = useState(initialCorrectAnswer ?? '')
  const [points, setPoints] = useState(initialPoints)
  const [rubric, setRubric] = useState(initialRubric ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (type === 'mcq') {
      const filled = options.filter((o) => o.trim())
      if (filled.length < 2) { setError('Provide at least 2 answer options.'); return }
      if (!correctAnswer.trim()) { setError('Select the correct answer.'); return }
    }

    startTransition(async () => {
      try {
        await updateQuestion(
          courseId, questionId, prompt, type,
          options.filter((o) => o.trim()),
          correctAnswer, points, rubric
        )
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update question')
      }
    })
  }

  const filledOptions = options.filter((o) => o.trim())

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-labelledby="edit-question-title">
        <DialogHeader>
          <DialogTitle id="edit-question-title">Edit question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-q-prompt">Question prompt</Label>
            <Textarea
              id="edit-q-prompt"
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-q-points">Points</Label>
            <Input
              id="edit-q-points"
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
              className="w-24"
            />
          </div>

          {type === 'mcq' && (
            <>
              <Separator />
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Answer options</legend>
                {options.map((opt, i) => (
                  <div key={i} className="space-y-1">
                    <Label htmlFor={`edit-option-${i}`} className="text-xs text-muted-foreground">
                      Option {i + 1}
                    </Label>
                    <Input
                      id={`edit-option-${i}`}
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                ))}
              </fieldset>

              {filledOptions.length >= 2 && (
                <div className="space-y-2">
                  <Label htmlFor="edit-correct-answer">Correct answer</Label>
                  <Select value={correctAnswer} onValueChange={(v) => setCorrectAnswer(v ?? '')}>
                    <SelectTrigger id="edit-correct-answer" aria-label="Correct answer">
                      <SelectValue placeholder="Select the correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {filledOptions.map((opt, i) => (
                        <SelectItem key={i} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {type === 'written' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="edit-rubric">Grading rubric</Label>
                <Textarea
                  id="edit-rubric"
                  rows={4}
                  placeholder="Describe what a correct answer should include."
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  aria-describedby="edit-rubric-hint"
                />
                <p id="edit-rubric-hint" className="text-xs text-muted-foreground">
                  Plain English is fine. E.g. &ldquo;A strong answer identifies 3 key risks and explains the impact of each.&rdquo;
                </p>
              </div>
            </>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !prompt.trim()} aria-busy={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
