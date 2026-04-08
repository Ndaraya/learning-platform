'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateLesson } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  lessonId: string
  initialTitle: string
  initialDescription: string | null
  initialLessonType: 'video' | 'text' | 'pdf' | 'image'
  initialContentUrl: string | null
  initialContentBody: string | null
  initialImageUrls: string[]
}

export function EditLessonDialog({
  courseId, lessonId,
  initialTitle, initialDescription,
  initialLessonType, initialContentUrl, initialContentBody, initialImageUrls,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [lessonType, setLessonType] = useState<'video' | 'text' | 'pdf' | 'image'>(initialLessonType)
  const [description, setDescription] = useState(initialDescription ?? '')
  // video
  const [videoUrl, setVideoUrl] = useState(lessonType === 'video' ? (initialContentUrl ?? '') : '')
  // text
  const [contentBody, setContentBody] = useState(initialContentBody ?? '')
  const [contentUrl, setContentUrl] = useState(lessonType === 'text' ? (initialContentUrl ?? '') : '')
  // pdf — keep existing URL, allow re-upload
  const [existingPdfUrl, setExistingPdfUrl] = useState(lessonType === 'pdf' ? (initialContentUrl ?? null) : null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  // image gallery
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialLessonType === 'image' ? initialImageUrls : [])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addImages(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files)
    setNewImageFiles((prev) => [...prev, ...arr])
    setNewImagePreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))])
  }

  function removeNewImage(i: number) {
    setNewImageFiles((prev) => prev.filter((_, idx) => idx !== i))
    setNewImagePreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  function isSubmitEnabled() {
    if (!title.trim()) return false
    if (lessonType === 'video') return !!videoUrl.trim()
    if (lessonType === 'text') return !!(contentBody.trim() || contentUrl.trim())
    if (lessonType === 'pdf') return !!(pdfFile || existingPdfUrl)
    if (lessonType === 'image') return (existingImageUrls.length + newImageFiles.length) > 0
    return false
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        let finalContentUrl: string | null = null
        let finalImageUrls: string[] = existingImageUrls

        if (lessonType === 'video') {
          finalContentUrl = videoUrl || null
        } else if (lessonType === 'text') {
          finalContentUrl = contentUrl || null
        } else if (lessonType === 'pdf') {
          if (pdfFile) {
            const form = new FormData()
            form.append('pdf', pdfFile)
            const res = await fetch('/api/tasks/upload-pdf', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'PDF upload failed')
            finalContentUrl = data.url
          } else {
            finalContentUrl = existingPdfUrl
          }
        } else if (lessonType === 'image') {
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

        await updateLesson(
          courseId, lessonId, title, description,
          lessonType, finalContentUrl, contentBody || null, finalImageUrls
        )
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
      <DialogContent aria-labelledby="edit-lesson-title" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="edit-lesson-title">Edit lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-lesson-title-input">Title</Label>
            <Input id="edit-lesson-title-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lesson-type">Lesson type</Label>
            <Select value={lessonType} onValueChange={(v) => setLessonType(v as typeof lessonType)}>
              <SelectTrigger id="edit-lesson-type" aria-label="Lesson type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image gallery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {lessonType === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-video-url">Video URL</Label>
              <Input
                id="edit-lesson-video-url"
                type="url"
                placeholder="https://youtu.be/... or https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Supports YouTube and Vimeo URLs.</p>
            </div>
          )}

          {lessonType === 'text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-body">Content <span className="text-muted-foreground">(optional if URL provided)</span></Label>
                <Textarea
                  id="edit-lesson-body"
                  rows={6}
                  placeholder="Write lesson content here. Supports **bold**, *italic*, headings (#), and lists (- item)."
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-content-url">External article URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="edit-lesson-content-url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                />
              </div>
            </>
          )}

          {lessonType === 'pdf' && (
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
                  <span className="text-xs text-muted-foreground">
                    {existingPdfUrl ? 'Upload a replacement PDF' : 'Click to upload a PDF'}
                  </span>
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setPdfFile(f); setPdfFileName(f.name)
                    }} />
                </label>
              )}
            </div>
          )}

          {lessonType === 'image' && (
            <div className="space-y-2">
              <Label>Images</Label>
              {existingImageUrls.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">Existing images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImageUrls.map((src, i) => (
                      <div key={i} className="relative group aspect-video bg-gray-100 rounded overflow-hidden border">
                        <img src={src} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {newImagePreviews.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">New images to upload</p>
                  <div className="grid grid-cols-3 gap-2">
                    {newImagePreviews.map((src, i) => (
                      <div key={i} className="relative group aspect-video bg-gray-100 rounded overflow-hidden border">
                        <img src={src} alt={`New image ${i + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(i)}
                          className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/60 transition-colors">
                <span className="text-xs text-muted-foreground">
                  {existingImageUrls.length + newImagePreviews.length > 0 ? 'Add more images' : 'Click to upload images'}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-lesson-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="edit-lesson-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !isSubmitEnabled()} aria-busy={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
