'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addTask } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  lessonId: string
}

export function AddTaskDialog({ courseId, lessonId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'quiz' | 'written'>('quiz')
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addTask(courseId, lessonId, title, type, instructions)
        setTitle('')
        setType('quiz')
        setInstructions('')
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add task')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Add task
      </DialogTrigger>
      <DialogContent aria-labelledby="add-task-title">
        <DialogHeader>
          <DialogTitle id="add-task-title">Add task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'quiz' | 'written')}>
              <SelectTrigger id="task-type" aria-label="Task type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiz">Quiz (multiple choice)</SelectItem>
                <SelectItem value="written">Written response</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-instructions">Instructions <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="task-instructions"
              rows={3}
              placeholder="What should students do in this task?"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} aria-busy={isPending}>
              {isPending ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
