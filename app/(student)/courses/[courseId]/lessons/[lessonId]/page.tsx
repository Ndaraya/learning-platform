import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CourseSidebar } from '@/components/student/CourseSidebar'
import { VideoEmbed } from '@/components/VideoEmbed'
import { MarkdownContent } from '@/components/MarkdownContent'
import { ImageGallery } from '@/components/ImageGallery'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
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

  const [{ data: lesson }, { data: courseModules }, { data: firstTask }] = await Promise.all([
    supabase
      .from('lessons')
      .select('*, tasks(id, title, type, order)')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('modules')
      .select('id, title, section, order, lessons(id, title, order)')
      .eq('course_id', courseId)
      .order('order'),
    supabase
      .from('tasks')
      .select('id, order')
      .eq('lesson_id', lessonId)
      .order('order')
      .limit(1)
      .maybeSingle(),
  ])

  if (!lesson) notFound()

  const hasContent = !!(lesson.youtube_url ?? (lesson as { content_url?: string | null }).content_url ?? (lesson as { content_body?: string | null }).content_body ?? (lesson as { image_urls?: string[] }).image_urls?.length)
  if (!hasContent && firstTask) {
    redirect(`/courses/${courseId}/lessons/${lessonId}/tasks/${firstTask.id}`)
  }

  const lessonType = (lesson as { lesson_type?: string }).lesson_type ?? 'video'
  const contentUrl = (lesson as { content_url?: string | null }).content_url ?? lesson.youtube_url ?? null
  const contentBody = (lesson as { content_body?: string | null }).content_body ?? null
  const imageUrls = (lesson as { image_urls?: string[] }).image_urls ?? []

  const tasks = (lesson.tasks as Array<{ id: string; title: string; type: string; order: number }>)
    ?.sort((a, b) => a.order - b.order) ?? []

  const modules = (courseModules ?? []) as Array<{
    id: string; title: string; section: string | null; order: number
    lessons: Array<{ id: string; title: string; order: number }>
  }>

  const parentModule = modules.find((m) => m.lessons?.some((l) => l.id === lessonId))
  const moduleLessons = [...(parentModule?.lessons ?? [])].sort((a, b) => a.order - b.order)
  const lessonIndex = moduleLessons.findIndex((l) => l.id === lessonId)

  const parentModuleIndex = modules.findIndex((m) => m.id === parentModule?.id)
  const nextModule = parentModuleIndex >= 0 ? modules[parentModuleIndex + 1] : null
  const nextModuleFirstLesson = nextModule
    ? [...(nextModule.lessons ?? [])].sort((a, b) => a.order - b.order)[0]
    : null

  const totalSteps = 1 + tasks.length
  const currentStep = 1
  const nextTask = tasks[0]

  const contentTypeLabel: Record<string, string> = {
    video: 'Introduction video',
    text: 'Reading',
    pdf: 'Document',
    image: 'Visual reference',
  }

  const taskVerb: Record<string, string> = {
    video: 'Watch the video introduction',
    text: 'Read the lesson content',
    pdf: 'Review the document',
    image: 'Study the images',
  }

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
      <CourseSidebar courseId={courseId} modules={modules} currentLessonId={lessonId} />

      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="border-b bg-white px-8 py-3 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-medium text-gray-700 truncate max-w-md">{lesson.title}</span>
          {totalSteps > 1 && (
            <nav aria-label="Task steps" className="flex items-center gap-1.5 shrink-0">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const stepNum = i + 1
                const isActive = stepNum === currentStep
                const href =
                  stepNum === 1
                    ? `/courses/${courseId}/lessons/${lessonId}`
                    : `/courses/${courseId}/lessons/${lessonId}/tasks/${tasks[stepNum - 2]?.id}`
                return (
                  <Link
                    key={i}
                    href={href}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors no-underline"
                    style={
                      isActive
                        ? { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)', color: 'white' }
                        : { borderColor: '#d1d5db', color: '#9ca3af' }
                    }
                    aria-label={`Step ${stepNum}${isActive ? ' (current)' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {stepNum}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">

          {!isQuestionBank && (
            <>
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
                    <li>{taskVerb[lessonType] ?? 'Review the lesson content'}</li>
                    {tasks.map((t) => (
                      <li key={t.id}>Complete: {t.title}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Lesson content — type-specific */}
          <section aria-labelledby="lesson-content-heading">
            <h2 id="lesson-content-heading" className="text-lg font-semibold text-gray-900 mb-3">
              {contentTypeLabel[lessonType] ?? 'Content'}
            </h2>

            {lessonType === 'video' && contentUrl && (
              <VideoEmbed url={contentUrl} title={lesson.title} />
            )}

            {lessonType === 'text' && (
              <div className="space-y-4">
                {contentBody && (
                  <div className="rounded-xl border p-6 bg-white">
                    <MarkdownContent body={contentBody} />
                  </div>
                )}
                {contentUrl && (
                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Read full article →
                  </a>
                )}
              </div>
            )}

            {lessonType === 'pdf' && contentUrl && (
              <iframe
                src={contentUrl}
                title={`${lesson.title} — PDF`}
                className="w-full rounded-xl border"
                style={{ height: '70vh' }}
              />
            )}

            {lessonType === 'image' && imageUrls.length > 0 && (
              <ImageGallery urls={imageUrls} altPrefix={lesson.title} />
            )}
          </section>

          {/* Next button */}
          <div className="flex items-center justify-between pt-4 border-t">
            {lessonIndex > 0 && moduleLessons[lessonIndex - 1] ? (
              <Link href={`/courses/${courseId}/lessons/${moduleLessons[lessonIndex - 1].id}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                ← Back
              </Link>
            ) : (
              <Link href={`/courses/${courseId}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
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
              <Link href={`/courses/${courseId}/lessons/${moduleLessons[lessonIndex + 1].id}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand)' }}>
                Next lesson →
              </Link>
            ) : nextModuleFirstLesson ? (
              <Link href={`/courses/${courseId}/lessons/${nextModuleFirstLesson.id}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand)' }}>
                Next section: {nextModule!.title} →
              </Link>
            ) : (
              <Link href={`/courses/${courseId}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand)' }}>
                Back to overview →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
