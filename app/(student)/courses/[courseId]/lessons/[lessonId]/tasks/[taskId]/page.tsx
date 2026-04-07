import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TaskRunner } from '@/components/student/TaskRunner'
import { LessonTaskSidebar } from '@/components/student/LessonTaskSidebar'
import { VideoEmbed } from '@/components/VideoEmbed'
import { VideoTaskCompleteButton } from '@/components/student/VideoTaskCompleteButton'
import { MarkdownContent } from '@/components/MarkdownContent'
import { ImageGallery } from '@/components/ImageGallery'

interface Props {
  params: Promise<{ courseId: string; lessonId: string; taskId: string }>
}

export default async function TaskPage({ params }: Props) {
  const { courseId, lessonId, taskId } = await params
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

  const [{ data: task }, { data: lessonTasksData }, { data: lesson }, { data: profile }, { data: courseModules }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, type, instructions, video_url, content_body, image_urls, timed_mode, time_limit_seconds, questions(id, prompt, type, options, points, image_url)')
      .eq('id', taskId)
      .single(),
    supabase
      .from('tasks')
      .select('id, title, instructions, order, time_limit_seconds')
      .eq('lesson_id', lessonId)
      .order('order'),
    supabase
      .from('lessons')
      .select('id, title, module_id')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('profiles')
      .select('time_accommodation')
      .eq('id', user.id)
      .single(),
    supabase
      .from('modules')
      .select('id, order, lessons(id, order)')
      .eq('course_id', courseId)
      .order('order'),
  ])

  const ACCOMMODATION_MULTIPLIER: Record<string, number> = {
    standard: 1,
    time_and_half: 1.5,
    double: 2,
  }
  const accommodationMultiplier = ACCOMMODATION_MULTIPLIER[(profile as { time_accommodation?: string } | null)?.time_accommodation ?? 'standard'] ?? 1

  if (!task) notFound()

  const sortedLessonTasks = [...(lessonTasksData ?? [])].sort((a, b) => a.order - b.order)
  const taskIds = sortedLessonTasks.map((t) => t.id)

  const [{ data: existingSubmission }, { data: allSubmissions }] = await Promise.all([
    supabase
      .from('task_submissions')
      .select('id, score, graded_at, question_responses(question_id, answer, score, max_score, feedback, ai_graded)')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('task_submissions')
      .select('task_id')
      .eq('user_id', user.id)
      .in('task_id', taskIds),
  ])

  const submittedTaskIds = (allSubmissions ?? []).map((s) => s.task_id as string)

  const taskType = (task as { type?: string }).type ?? 'quiz'
  const taskContentBody = (task as { content_body?: string | null }).content_body ?? null
  const taskImageUrls = (task as { image_urls?: string[] }).image_urls ?? []
  const taskContentUrl = (task as { video_url?: string | null }).video_url ?? null
  const questions = task.questions as Array<{
    id: string; prompt: string; type: 'mcq' | 'written'; options: string[] | null; points: number; image_url?: string | null
  }>

  const taskIndex = sortedLessonTasks.findIndex((t) => t.id === taskId)

  // Step 1 = lesson overview, steps 2+ = tasks
  const totalSteps = 1 + sortedLessonTasks.length
  const currentStep = 2 + taskIndex

  const prevTaskId = taskIndex > 0 ? sortedLessonTasks[taskIndex - 1]?.id : null
  const nextTaskId = taskIndex < sortedLessonTasks.length - 1 ? sortedLessonTasks[taskIndex + 1]?.id : null
  const isCurrentTaskSubmitted = submittedTaskIds.includes(taskId)

  // Compute next-lesson href for end-of-lesson navigation
  const moduleId = (lesson as { module_id?: string } | null)?.module_id
  const modules = ((courseModules ?? []) as Array<{ id: string; order: number; lessons: Array<{ id: string; order: number }> }>)
    .sort((a, b) => a.order - b.order)
  const parentModule = modules.find((m) => m.id === moduleId)
  const sortedModuleLessons = [...(parentModule?.lessons ?? [])].sort((a, b) => a.order - b.order)
  const lessonIndexInModule = sortedModuleLessons.findIndex((l) => l.id === lessonId)
  const nextLessonInModule = sortedModuleLessons[lessonIndexInModule + 1]
  const parentModuleIndex = modules.findIndex((m) => m.id === moduleId)
  const nextModule = modules[parentModuleIndex + 1]
  const nextModuleFirstLesson = nextModule
    ? [...(nextModule.lessons ?? [])].sort((a, b) => a.order - b.order)[0]
    : null
  const nextLessonId = nextLessonInModule?.id ?? nextModuleFirstLesson?.id ?? null
  const nextLessonHref = nextLessonId ? `/courses/${courseId}/lessons/${nextLessonId}` : null

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <LessonTaskSidebar
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lesson?.title ?? 'Lesson'}
        tasks={sortedLessonTasks as Array<{ id: string; title: string; instructions: string | null; order: number; time_limit_seconds: number | null }>}
        currentTaskId={taskId}
        submittedTaskIds={submittedTaskIds}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Top bar: task title + step pagination */}
        <div className="border-b bg-white px-8 py-3 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-medium text-gray-700 truncate max-w-md">{task.title}</span>
          <nav aria-label="Task steps" className="flex items-center gap-1.5 shrink-0">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const stepNum = i + 1
              const isActive = stepNum === currentStep
              const href =
                stepNum === 1
                  ? `/courses/${courseId}/lessons/${lessonId}`
                  : `/courses/${courseId}/lessons/${lessonId}/tasks/${sortedLessonTasks[stepNum - 2]?.id}`

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
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Here is your task</h1>
            {task.instructions && (
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">{task.instructions}</p>
            )}
          </div>

          {(task as { video_url?: string | null }).video_url && (
            <VideoEmbed
              url={(task as { video_url: string }).video_url}
              title={task.title}
            />
          )}

          {taskType === 'video' || taskType === 'pdf' || taskType === 'text' || taskType === 'image' ? (
            <>
              {taskType === 'pdf' && taskContentUrl && (
                <iframe
                  src={taskContentUrl}
                  title={`${task.title} PDF`}
                  className="w-full rounded-md border"
                  style={{ height: '70vh' }}
                />
              )}

              {taskType === 'text' && (
                <div className="space-y-4">
                  {taskContentBody && (
                    <div className="rounded-xl border p-6 bg-white">
                      <MarkdownContent body={taskContentBody} />
                    </div>
                  )}
                  {taskContentUrl && (
                    <a
                      href={taskContentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Read full article →
                    </a>
                  )}
                </div>
              )}

              {taskType === 'image' && taskImageUrls.length > 0 && (
                <ImageGallery urls={taskImageUrls} altPrefix={task.title} />
              )}

              {!isCurrentTaskSubmitted && (
                <VideoTaskCompleteButton
                  taskId={taskId}
                  courseId={courseId}
                  lessonId={lessonId}
                  nextHref={
                    nextTaskId
                      ? `/courses/${courseId}/lessons/${lessonId}/tasks/${nextTaskId}`
                      : nextLessonHref
                  }
                  fallbackHref={`/courses/${courseId}/lessons/${lessonId}`}
                />
              )}
            </>
          ) : (
            <TaskRunner
              taskId={taskId}
              courseId={courseId}
              lessonId={lessonId}
              questions={questions}
              existingSubmission={existingSubmission ?? null}
              timeLimitSeconds={(() => {
                const raw = (task as { time_limit_seconds?: number | null }).time_limit_seconds ?? null
                return raw !== null ? Math.round(raw * accommodationMultiplier) : null
              })()}
              timedMode={((task as { timed_mode?: string }).timed_mode ?? 'untimed') as 'untimed' | 'practice' | 'exam'}
              nextHref={
                nextTaskId
                  ? `/courses/${courseId}/lessons/${lessonId}/tasks/${nextTaskId}`
                  : nextLessonHref ?? `/courses/${courseId}`
              }
              nextLabel={nextTaskId ? 'Next task' : nextLessonHref ? 'Next lesson' : 'Back to course'}
            />
          )}

          {/* Back / Next navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            {prevTaskId ? (
              <Link
                href={`/courses/${courseId}/lessons/${lessonId}/tasks/${prevTaskId}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}/lessons/${lessonId}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to overview
              </Link>
            )}

            {/* For quiz/written tasks, TaskRunner shows its own Next button in the results view */}
            {taskType !== 'video' && taskType !== 'pdf' && taskType !== 'text' && taskType !== 'image' ? null : nextTaskId ? (
              isCurrentTaskSubmitted ? (
                <Link
                  href={`/courses/${courseId}/lessons/${lessonId}/tasks/${nextTaskId}`}
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  Next →
                </Link>
              ) : (
                <span
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white cursor-not-allowed opacity-40"
                  style={{ backgroundColor: 'var(--brand)' }}
                  title="Submit this task to continue"
                  aria-disabled="true"
                >
                  Next →
                </span>
              )
            ) : lesson?.title === 'ACT Diagnostic' ? (
              isCurrentTaskSubmitted ? (
                <Link
                  href={`/courses/${courseId}/diagnostic-results`}
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  View my diagnostic results →
                </Link>
              ) : (
                <span
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white cursor-not-allowed opacity-40"
                  style={{ backgroundColor: 'var(--brand)' }}
                  title="Submit this section to view results"
                  aria-disabled="true"
                >
                  View my diagnostic results →
                </span>
              )
            ) : nextLessonHref ? (
              isCurrentTaskSubmitted ? (
                <Link
                  href={nextLessonHref}
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  Next lesson →
                </Link>
              ) : (
                <span
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white cursor-not-allowed opacity-40"
                  style={{ backgroundColor: 'var(--brand)' }}
                  title="Complete this task to continue"
                  aria-disabled="true"
                >
                  Next lesson →
                </span>
              )
            ) : isCurrentTaskSubmitted ? (
              <Link
                href={`/courses/${courseId}`}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                Back to overview →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
