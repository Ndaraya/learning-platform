'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateLesson } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  lessonId: string
  initialTitle: string
  initialDescription: string | null
  initialYoutubeUrl: string
}

export function EditLessonDialog({ courseId, lessonId, initialTitle, initialDescription, initialYoutubeUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateLesson(courseId, lessonId, title, description, youtubeUrl)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update lesson')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        Edit
      </DialogTrigger>
      <DialogContent aria-labelledby="edit-lesson-title">
        <DialogHeader>
          <DialogTitle id="edit-lesson-title">Edit lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-lesson-title-input">Title</Label>
            <Input
              id="edit-lesson-title-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lesson-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="edit-lesson-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lesson-url">YouTube URL</Label>
            <Input
              id="edit-lesson-url"
              type="url"
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim() || !youtubeUrl.trim()} aria-busy={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
