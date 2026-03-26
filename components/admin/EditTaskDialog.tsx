'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { updateTask } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  taskId: string
  initialTitle: string
  initialInstructions: string | null
  initialTimedMode: 'untimed' | 'practice' | 'exam'
  initialTimeLimitSeconds: number | null
}

export function EditTaskDialog({
  courseId, taskId,
  initialTitle, initialInstructions,
  initialTimedMode, initialTimeLimitSeconds,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [instructions, setInstructions] = useState(initialInstructions ?? '')
  const [timedMode, setTimedMode] = useState<'untimed' | 'practice' | 'exam'>(initialTimedMode)
  const [minutes, setMinutes] = useState<number>(
    initialTimeLimitSeconds ? Math.round(initialTimeLimitSeconds / 60) : 30
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const timeLimitSeconds = timedMode !== 'untimed' ? minutes * 60 : null
    startTransition(async () => {
      try {
        await updateTask(courseId, taskId, title, instructions, timedMode, timeLimitSeconds)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        Edit
      </DialogTrigger>
      <DialogContent aria-labelledby="edit-task-title">
        <DialogHeader>
          <DialogTitle id="edit-task-title">Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title-input">Title</Label>
            <Input
              id="edit-task-title-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task-instructions">Instructions <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="edit-task-instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="edit-task-timed-mode">Timing mode</Label>
            <Select value={timedMode} onValueChange={(v) => setTimedMode(v as typeof timedMode)}>
              <SelectTrigger id="edit-task-timed-mode" aria-label="Timing mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="untimed">Untimed — no time limit</SelectItem>
                <SelectItem value="practice">Practice — timer optional (student can toggle)</SelectItem>
                <SelectItem value="exam">Exam — timer mandatory, auto-submits</SelectItem>
              </SelectContent>
            </Select>
            {timedMode === 'practice' && (
              <p className="text-xs text-muted-foreground">Students can choose to enable or disable the timer.</p>
            )}
            {timedMode === 'exam' && (
              <p className="text-xs text-muted-foreground">Timer is required. Task auto-submits when time expires.</p>
            )}
          </div>

          {timedMode !== 'untimed' && (
            <div className="space-y-2">
              <Label htmlFor="edit-task-minutes">Time limit (minutes)</Label>
              <Input
                id="edit-task-minutes"
                type="number"
                min={1}
                max={360}
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 30)}
                className="w-28"
              />
            </div>
          )}

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
