import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CourseSidebar } from '@/components/student/CourseSidebar'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?\s]+)/)
  const videoId = match?.[1]
  if (!videoId) return <p className="text-destructive text-sm">Invalid video URL.</p>

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md">
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

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) redirect(`/courses/${courseId}`)

  const [{ data: lesson }, { data: courseModules }] = await Promise.all([
    supabase
      .from('lessons')
      .select('*, tasks(id, title, type, order)')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('modules')
      .select('id, title, order, lessons(id, title, order)')
      .eq('course_id', courseId)
      .order('order'),
  ])

  if (!lesson) notFound()

  const tasks = (lesson.tasks as Array<{ id: string; title: string; type: string; order: number }>)
    ?.sort((a, b) => a.order - b.order) ?? []

  const modules = (courseModules ?? []) as Array<{
    id: string; title: string; order: number
    lessons: Array<{ id: string; title: string; order: number }>
  }>

  // Find which module this lesson belongs to and its lessons for step nav
  const parentModule = modules.find((m) => m.lessons?.some((l) => l.id === lessonId))
  const moduleLessons = [...(parentModule?.lessons ?? [])].sort((a, b) => a.order - b.order)
  const lessonIndex = moduleLessons.findIndex((l) => l.id === lessonId)

  // Step 1 = overview/video, steps 2+ = tasks
  const totalSteps = 1 + tasks.length
  const currentStep = 1
  const nextTask = tasks[0]

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <CourseSidebar courseId={courseId} modules={modules} currentLessonId={lessonId} />

      <div className="flex-1 overflow-y-auto">
        {/* Top bar: lesson title + step pagination */}
        <div className="border-b bg-white px-8 py-3 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-medium text-gray-700 truncate max-w-md">{lesson.title}</span>
          {totalSteps > 1 && (
            <nav aria-label="Task steps" className="flex items-center gap-1.5 shrink-0">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors"
                  style={
                    i + 1 === currentStep
                      ? { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)', color: 'white' }
                      : { borderColor: '#d1d5db', color: '#9ca3af' }
                  }
                  aria-label={`Step ${i + 1}${i + 1 === currentStep ? ' (current)' : ''}`}
                  aria-current={i + 1 === currentStep ? 'step' : undefined}
                >
                  {i + 1}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">

          {/* Task overview */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Overview</h1>
          </div>

          {/* What you'll learn / do */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>What you&apos;ll learn</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>{lesson.title}</li>
                {lesson.description && <li>{lesson.description}</li>}
              </ul>
            </div>
            <div className="rounded-xl border p-5 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>What you&apos;ll do</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Watch the video introduction</li>
                {tasks.map((t) => (
                  <li key={t.id}>Complete: {t.title}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Video */}
          <section aria-labelledby="video-heading">
            <h2 id="video-heading" className="text-lg font-semibold text-gray-900 mb-3">
              Introduction
            </h2>
            <YouTubeEmbed url={lesson.youtube_url} title={lesson.title} />
            <p className="mt-2 text-xs text-gray-400">Watch this video to get started with the task.</p>
          </section>

          {/* Next button */}
          <div className="flex items-center justify-between pt-4 border-t">
            {lessonIndex > 0 && moduleLessons[lessonIndex - 1] ? (
              <Link
                href={`/courses/${courseId}/lessons/${moduleLessons[lessonIndex - 1].id}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to overview
              </Link>
            )}

            {nextTask ? (
              <Link
                href={`/courses/${courseId}/lessons/${lessonId}/tasks/${nextTask.id}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                Next →
              </Link>
            ) : moduleLessons[lessonIndex + 1] ? (
              <Link
                href={`/courses/${courseId}/lessons/${moduleLessons[lessonIndex + 1].id}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                Next lesson →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
