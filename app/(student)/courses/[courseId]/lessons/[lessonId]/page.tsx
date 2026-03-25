import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  // Extract YouTube video ID from URL
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?\s]+)/)
  const videoId = match?.[1]
  if (!videoId) return <p className="text-destructive text-sm">Invalid video URL.</p>

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        aria-label={`Video: ${title}`}
      />
    </div>
  )
}

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) redirect(`/courses/${courseId}`)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, tasks(id, title, type, order)')
    .eq('id', lessonId)
    .single()

  if (!lesson) notFound()

  const tasks = (lesson.tasks as Array<{ id: string; title: string; type: string; order: number }>)
    ?.sort((a, b) => a.order - b.order) ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
        {lesson.description && (
          <p className="text-muted-foreground mt-1">{lesson.description}</p>
        )}
      </div>

      <section aria-labelledby="video-heading">
        <h2 id="video-heading" className="sr-only">Lesson video</h2>
        <YouTubeEmbed url={lesson.youtube_url} title={lesson.title} />
      </section>

      {tasks.length > 0 && (
        <>
          <Separator />
          <section aria-labelledby="tasks-heading">
            <h2 id="tasks-heading" className="text-xl font-semibold mb-4">Tasks</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <a
                  key={task.id}
                  href={`/courses/${courseId}/lessons/${lessonId}/tasks/${task.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{task.title}</span>
                    <span className="text-sm text-muted-foreground capitalize">{task.type}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
