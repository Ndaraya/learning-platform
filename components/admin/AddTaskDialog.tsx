'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { addTask } from '@/app/admin/courses/[courseId]/edit/actions'

type TaskType = 'quiz' | 'written' | 'video' | 'pdf' | 'text' | 'image'

interface Props {
  courseId: string
  lessonId: string
}

export function AddTaskDialog({ courseId, lessonId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('quiz')
  const [instructions, setInstructions] = useState('')

  // assessment timing
  const [timedMode, setTimedMode] = useState<'untimed' | 'practice' | 'exam'>('untimed')
  const [minutes, setMinutes] = useState<number>(30)

  // video
  const [videoUrl, setVideoUrl] = useState('')

  // pdf
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)

  // text
  const [contentBody, setContentBody] = useState('')
  const [contentUrl, setContentUrl] = useState('')

  // image gallery
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isContentTask = type === 'video' || type === 'pdf' || type === 'text' || type === 'image'

  function addImages(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files)
    setImageFiles((prev) => [...prev, ...arr])
    setImagePreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))])
  }

  function removeImage(i: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i))
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  function reset() {
    setTitle(''); setType('quiz'); setInstructions('')
    setTimedMode('untimed'); setMinutes(30)
    setVideoUrl(''); setPdfFile(null); setPdfFileName(null)
    setContentBody(''); setContentUrl('')
    setImageFiles([]); setImagePreviews([])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const timeLimitSeconds = timedMode !== 'untimed' ? minutes * 60 : null
    startTransition(async () => {
      try {
        let contentUrl_final: string | null = null
        let finalImageUrls: string[] = []

        if (type === 'video') {
          contentUrl_final = videoUrl || null
        } else if (type === 'text') {
          contentUrl_final = contentUrl || null
        } else if (type === 'pdf' && pdfFile) {
          const form = new FormData()
          form.append('pdf', pdfFile)
          const res = await fetch('/api/tasks/upload-pdf', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'PDF upload failed')
          contentUrl_final = data.url
        } else if (type === 'image' && imageFiles.length > 0) {
          finalImageUrls = await Promise.all(
            imageFiles.map(async (file) => {
              const form = new FormData()
              form.append('image', file)
              const res = await fetch('/api/content/upload-image', { method: 'POST', body: form })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Image upload failed')
              return data.url as string
            })
          )
        }

        await addTask(
          courseId, lessonId, title, type, instructions,
          timedMode, timeLimitSeconds, contentUrl_final,
          contentBody || null, finalImageUrls
        )
        reset()
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
      <DialogContent aria-labelledby="add-task-title" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="add-task-title">Add task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger id="task-type" aria-label="Task type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiz">Quiz (multiple choice)</SelectItem>
                <SelectItem value="written">Written response</SelectItem>
                <SelectItem value="video">Video — watch only</SelectItem>
                <SelectItem value="pdf">PDF — view a document</SelectItem>
                <SelectItem value="text">Text — read content</SelectItem>
                <SelectItem value="image">Image gallery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-instructions">Instructions <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="task-instructions" rows={3} placeholder="What should students do in this task?" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          {/* Quiz / written: timing section directly below instructions */}
          {(type === 'quiz' || type === 'written') && (
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
                      className="w-24"
                      aria-label="Time limit in minutes"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Content task fields */}
          {type === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="task-video-url">Video URL</Label>
              <Input
                id="task-video-url" type="url"
                placeholder="https://vimeo.com/123456789 or https://youtu.be/..."
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          )}

          {type === 'pdf' && (
            <div className="space-y-2">
              <Label>PDF file</Label>
              {pdfFileName ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate flex-1">{pdfFileName}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setPdfFile(null); setPdfFileName(null) }}>Remove</Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/60 transition-colors">
                  <span className="text-xs text-muted-foreground">Click to upload a PDF</span>
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setPdfFile(f); setPdfFileName(f.name) }} />
                </label>
              )}
            </div>
          )}

          {type === 'text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="task-body">Content <span className="text-muted-foreground">(optional if URL provided)</span></Label>
                <Textarea
                  id="task-body" rows={5}
                  placeholder="Write content here. Supports **bold**, *italic*, headings (#), and lists (- item)."
                  value={contentBody} onChange={(e) => setContentBody(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-content-url">External article URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="task-content-url" type="url" placeholder="https://example.com/article"
                  value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
              </div>
            </>
          )}

          {type === 'image' && (
            <div className="space-y-2">
              <Label>Images</Label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group aspect-video bg-gray-100 rounded overflow-hidden border">
                      <img src={src} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/60 transition-colors">
                <span className="text-xs text-muted-foreground">
                  {imagePreviews.length > 0 ? 'Add more images' : 'Click to upload images'}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </label>
            </div>
          )}

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
