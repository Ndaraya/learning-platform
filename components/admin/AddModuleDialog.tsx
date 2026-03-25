'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addModule } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
}

export function AddModuleDialog({ courseId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addModule(courseId, title, description)
        setTitle('')
        setDescription('')
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add module')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        Add module
      </DialogTrigger>
      <DialogContent aria-labelledby="add-module-title">
        <DialogHeader>
          <DialogTitle id="add-module-title">Add module</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Title</Label>
            <Input
              id="module-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-describedby={error ? 'module-error' : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="module-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p id="module-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} aria-busy={isPending}>
              {isPending ? 'Adding…' : 'Add module'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
