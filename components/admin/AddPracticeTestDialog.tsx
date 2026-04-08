'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addPracticeTest } from '@/app/admin/courses/[courseId]/edit/practice-test-actions'

interface Props {
  courseId: string
}

const DEFAULT_COUNTS = { english: 75, math: 60, reading: 40, science: 40 }

export function AddPracticeTestDialog({ courseId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [counts, setCounts] = useState(DEFAULT_COUNTS)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addPracticeTest(courseId, title, description, counts)
        setTitle('')
        setDescription('')
        setCounts(DEFAULT_COUNTS)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add practice test')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        Add practice test
      </DialogTrigger>
      <DialogContent aria-labelledby="add-pt-title">
        <DialogHeader>
          <DialogTitle id="add-pt-title">Add practice test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pt-title">Title</Label>
            <Input
              id="pt-title"
              required
              placeholder="e.g. ACT Form J08 (October 2025)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="pt-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Question counts per section</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['english', 'math', 'reading', 'science'] as const).map((section) => (
                <div key={section} className="space-y-1">
                  <Label htmlFor={`pt-count-${section}`} className="text-xs capitalize">{section}</Label>
                  <Input
                    id={`pt-count-${section}`}
                    type="number"
                    min={1}
                    max={200}
                    value={counts[section]}
                    onChange={(e) => setCounts((prev) => ({ ...prev, [section]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} aria-busy={isPending}>
              {isPending ? 'Adding…' : 'Add practice test'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
