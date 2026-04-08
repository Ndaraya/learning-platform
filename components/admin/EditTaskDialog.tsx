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

type TaskType = 'quiz' | 'written' | 'video' | 'pdf' | 'text' | 'image'

interface Props {
  courseId: string
  taskId: string
  initialTitle: string
  initialInstructions: string | null
  initialTimedMode: 'untimed' | 'practice' | 'exam'
  initialTimeLimitSeconds: number | null
  initialVideoUrl: string | null
  initialContentBody: string | null
  initialImageUrls: string[]
  taskType: TaskType
}

export function EditTaskDialog({
  courseId, taskId,
  initialTitle, initialInstructions,
  initialTimedMode, initialTimeLimitSeconds,
  initialVideoUrl, initialContentBody, initialImageUrls,
  taskType,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [instructions, setInstructions] = useState(initialInstructions ?? '')
  const [timedMode, setTimedMode] = useState<'untimed' | 'practice' | 'exam'>(initialTimedMode)
  const [minutes, setMinutes] = useState<number>(initialTimeLimitSeconds ? Math.round(initialTimeLimitSeconds / 60) : 30)
  const [videoUrl, setVideoUrl] = useState(taskType === 'video' ? (initialVideoUrl ?? '') : '')
  const [existingPdfUrl, setExistingPdfUrl] = useState(taskType === 'pdf' ? (initialVideoUrl ?? null) : null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [contentBody, setContentBody] = useState(initialContentBody ?? '')
  const [contentUrl, setContentUrl] = useState(taskType === 'text' ? (initialVideoUrl ?? '') : '')
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(taskType === 'image' ? initialImageUrls : [])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isContentTask = taskType === 'video' || taskType === 'pdf' || taskType === 'text' || taskType === 'image'

  function addImages(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files)
    setNewImageFiles((prev) => [...prev, ...arr])
    setNewImagePreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const timeLimitSeconds = timedMode !== 'untimed' ? minutes * 60 : null
    startTransition(async () => {
      try {
        let finalVideoUrl: string | null = null
        let finalContentBody: string | null = contentBody || null
        let finalImageUrls: string[] | null = null

        if (taskType === 'video') {
          finalVideoUrl = videoUrl || null
        } else if (taskType === 'pdf') {
          if (pdfFile) {
            const form = new FormData()
            form.append('pdf', pdfFile)
            const res = await fetch('/api/tasks/upload-pdf', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'PDF upload failed')
            finalVideoUrl = data.url
          } else {
            finalVideoUrl = existingPdfUrl
          }
        } else if (taskType === 'text') {
          finalVideoUrl = contentUrl || null
        } else if (taskType === 'image') {
          const uploadedUrls = await Promise.all(
            newImageFiles.map(async (file) => {
              const form = new FormData()
              form.append('image', file)
              const res = await fetch('/api/content/upload-image', { method: 'POST', body: form })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Image upload failed')
              return data.url as string
            })
          )
          finalImageUrls = [...existingImageUrls, ...uploadedUrls]
        }

        await updateTask(
          courseId, taskId, title, instructions,
          timedMode, timeLimitSeconds,
          finalVideoUrl, finalContentBody, finalImageUrls
        )
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
      <DialogContent aria-labelledby="edit-task-title" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="edit-task-title">Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title-input">Title</Label>
            <Input id="edit-task-title-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task-instructions">Instructions <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="edit-task-instructions" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          {/* Assessment timing — directly below instructions, prominent for quiz */}
          {!isContentTask && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Time limit</Label>
                <Select value={timedMode} onValueChange={(v) => setTimedMode(v as typeof timedMode)}>
                  <SelectTrigger aria-label="Timing mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="untimed">Untimed — no time limit</SelectItem>
                    <SelectItem value="practice">Practice — student can start/stop timer</SelectItem>
                    <SelectItem value="exam">Exam — mandatory timer, auto-submits</SelectItem>
                  </SelectContent>
                </Select>
                {timedMode === 'practice' && (
                  <p className="text-xs text-muted-foreground">Students choose whether to use the timer.</p>
                )}
                {timedMode === 'exam' && (
                  <p className="text-xs text-muted-foreground">Timer is mandatory. Task auto-submits when time expires.</p>
                )}
                {timedMode !== 'untimed' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={1} max={360} value={minutes}
                      onChange={(e) => setMinutes(parseInt(e.target.value) || 30)}
                      className="w-24" aria-label="Time limit in minutes"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Content task fields */}
          {taskType === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="edit-task-video-url">Video URL</Label>
              <Input id="edit-task-video-url" type="url"
                placeholder="https://vimeo.com/123456789 or https://youtu.be/..."
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
          )}

          {taskType === 'pdf' && (
            <div className="space-y-2">
              <Label>PDF file</Label>
              {existingPdfUrl && !pdfFile && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate flex-1">Current PDF on file</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setExistingPdfUrl(null)}>Remove</Button>
                </div>
              )}
              {pdfFileName ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate flex-1">{pdfFileName}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setPdfFile(null); setPdfFileName(null) }}>Remove</Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/60 transition-colors">
                  <span className="text-xs text-muted-foreground">{existingPdfUrl ? 'Upload replacement' : 'Click to upload a PDF'}</span>
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setPdfFile(f); setPdfFileName(f.name) }} />
                </label>
              )}
            </div>
          )}

          {taskType === 'text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-task-body">Content <span className="text-muted-foreground">(optional if URL provided)</span></Label>
                <Textarea id="edit-task-body" rows={5}
                  placeholder="Supports **bold**, *italic*, headings (#), and lists (- item)."
                  value={contentBody} onChange={(e) => setContentBody(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-content-url">External article URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="edit-task-content-url" type="url" placeholder="https://example.com/article"
                  value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
              </div>
            </>
          )}

          {taskType === 'image' && (
            <div className="space-y-2">
              <Label>Images</Label>
              {existingImageUrls.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">Existing images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImageUrls.map((src, i) => (
                      <div key={i} className="relative group aspect-video bg-gray-100 rounded overflow-hidden border">
                        <img src={src} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                        <button type="button"
                          onClick={() => setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {newImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newImagePreviews.map((src, i) => (
                    <div key={i} className="relative group aspect-video bg-gray-100 rounded overflow-hidden border">
                      <img src={src} alt={`New image ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => { setNewImageFiles((p) => p.filter((_, idx) => idx !== i)); setNewImagePreviews((p) => p.filter((_, idx) => idx !== i)) }}
                        className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/60 transition-colors">
                <span className="text-xs text-muted-foreground">
                  {(existingImageUrls.length + newImagePreviews.length) > 0 ? 'Add more images' : 'Click to upload images'}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </label>
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
