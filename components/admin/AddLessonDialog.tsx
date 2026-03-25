'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addLesson } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  moduleId: string
}

export function AddLessonDialog({ courseId, moduleId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addLesson(courseId, moduleId, title, description, youtubeUrl)
        setTitle('')
        setDescription('')
        setYoutubeUrl('')
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add lesson')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Add lesson
      </DialogTrigger>
      <DialogContent aria-labelledby="add-lesson-title">
        <DialogHeader>
          <DialogTitle id="add-lesson-title">Add lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-youtube">YouTube URL</Label>
            <Input
              id="lesson-youtube"
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              aria-describedby="lesson-youtube-hint"
            />
            <p id="lesson-youtube-hint" className="text-xs text-muted-foreground">
              Paste any YouTube video URL or share link.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="lesson-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim() || !youtubeUrl.trim()} aria-busy={isPending}>
              {isPending ? 'Adding…' : 'Add lesson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
