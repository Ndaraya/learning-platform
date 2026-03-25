import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TaskRunner } from '@/components/student/TaskRunner'

interface Props {
  params: Promise<{ courseId: string; lessonId: string; taskId: string }>
}

export default async function TaskPage({ params }: Props) {
  const { courseId, lessonId, taskId } = await params
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

  // Load task + questions
  const { data: task } = await supabase
    .from('tasks')
    .select(`
      id, title, type, instructions,
      questions ( id, prompt, type, options, points )
    `)
    .eq('id', taskId)
    .single()

  if (!task) notFound()

  // Check if already submitted
  const { data: existingSubmission } = await supabase
    .from('task_submissions')
    .select(`
      id, score, graded_at,
      question_responses ( question_id, answer, score, max_score, feedback, ai_graded )
    `)
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const questions = (task.questions as Array<{
    id: string
    prompt: string
    type: 'mcq' | 'written'
    options: string[] | null
    points: number
  }>)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground list-none">
          <li><Link href={`/courses/${courseId}`} className="hover:underline underline-offset-4">Course</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/courses/${courseId}/lessons/${lessonId}`} className="hover:underline underline-offset-4">Lesson</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">{task.title}</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
        {task.instructions && (
          <p className="text-muted-foreground mt-2">{task.instructions}</p>
        )}
      </div>

      <TaskRunner
        taskId={taskId}
        courseId={courseId}
        lessonId={lessonId}
        questions={questions}
        existingSubmission={existingSubmission ?? null}
      />
    </div>
  )
}
