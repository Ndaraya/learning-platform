import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TaskRunner } from '@/components/student/TaskRunner'
import { LessonTaskSidebar } from '@/components/student/LessonTaskSidebar'

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

  const [{ data: task }, { data: lessonTasksData }, { data: lesson }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, type, instructions, timed_mode, time_limit_seconds, questions(id, prompt, type, options, points)')
      .eq('id', taskId)
      .single(),
    supabase
      .from('tasks')
      .select('id, title, instructions, order, time_limit_seconds')
      .eq('lesson_id', lessonId)
      .order('order'),
    supabase
      .from('lessons')
      .select('id, title')
      .eq('id', lessonId)
      .single(),
  ])

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

  const questions = task.questions as Array<{
    id: string; prompt: string; type: 'mcq' | 'written'; options: string[] | null; points: number
  }>

  const taskIndex = sortedLessonTasks.findIndex((t) => t.id === taskId)

  // Step 1 = lesson overview, steps 2+ = tasks
  const totalSteps = 1 + sortedLessonTasks.length
  const currentStep = 2 + taskIndex

  const prevTaskId = taskIndex > 0 ? sortedLessonTasks[taskIndex - 1]?.id : null
  const nextTaskId = taskIndex < sortedLessonTasks.length - 1 ? sortedLessonTasks[taskIndex + 1]?.id : null
  const isCurrentTaskSubmitted = submittedTaskIds.includes(taskId)

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

          <TaskRunner
            taskId={taskId}
            courseId={courseId}
            lessonId={lessonId}
            questions={questions}
            existingSubmission={existingSubmission ?? null}
            timeLimitSeconds={(task as { time_limit_seconds?: number | null }).time_limit_seconds ?? null}
            timedMode={((task as { timed_mode?: string }).timed_mode ?? 'untimed') as 'untimed' | 'practice' | 'exam'}
          />

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

            {nextTaskId && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
