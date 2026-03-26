import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeWrittenResponse } from '@/lib/claude/grader'
import { sendTaskFeedbackEmail, sendCourseCompletionEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { taskId, responses } = await request.json() as {
      taskId: string
      responses: Array<{ questionId: string; answer: string }>
    }

    if (!taskId || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Fetch task and questions
    const { data: task } = await supabase
      .from('tasks')
      .select('id, type, questions(id, prompt, type, correct_answer, points, grading_rubric, options)')
      .eq('id', taskId)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const questions = task.questions as Array<{
      id: string; prompt: string; type: string; correct_answer: string | null
      points: number; grading_rubric: string | null; options: string[] | null
    }>

    // Create submission record
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .insert({ user_id: user.id, task_id: taskId, max_score: maxScore })
      .select('id')
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
    }

    // Grade each response
    const gradePromises = responses.map(async ({ questionId, answer }) => {
      const question = questions.find((q) => q.id === questionId)
      if (!question) return null

      let score = 0
      let feedback: string | null = null
      let aiGraded = false

      if (question.type === 'mcq') {
        // Exact match for MCQ
        score = answer === question.correct_answer ? question.points : 0
        feedback = answer === question.correct_answer
          ? 'Correct!'
          : `The correct answer was: ${question.correct_answer}`
      } else if (question.type === 'written') {
        // AI grading for written responses
        const rubric = question.grading_rubric ?? 'Grade based on accuracy, clarity, and completeness.'
        const result = await gradeWrittenResponse(question.prompt, rubric, answer, question.points)
        score = Math.round((result.score / 100) * question.points)
        feedback = result.feedback
        aiGraded = true
      }

      return supabase.from('question_responses').insert({
        submission_id: submission.id,
        question_id: questionId,
        answer,
        score,
        max_score: question.points,
        feedback,
        ai_graded: aiGraded,
      })
    })

    await Promise.all(gradePromises)

    // Calculate and store total score
    const { data: questionResponses } = await supabase
      .from('question_responses')
      .select('score')
      .eq('submission_id', submission.id)

    const totalScore = (questionResponses ?? []).reduce((sum, r) => sum + (r.score ?? 0), 0)
    const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

    await supabase
      .from('task_submissions')
      .update({ score: scorePercent, graded_at: new Date().toISOString() })
      .eq('id', submission.id)

    // Fetch user email + name for emails
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const userName = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'

    // Fetch task title + lesson_id for emails
    const { data: taskRow } = await supabase
      .from('tasks')
      .select('title, lesson_id')
      .eq('id', taskId)
      .single()

    // Send task feedback email (fire-and-forget)
    if (user.email && taskRow) {
      sendTaskFeedbackEmail(
        user.email, userName, taskRow.title, scorePercent,
        '', taskRow.lesson_id ?? '', taskId
      ).catch(() => {})
    }

    // Mark lesson complete if all tasks for this lesson have been submitted
    if (taskRow?.lesson_id) {
      const lessonId = taskRow.lesson_id

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('lesson_id', lessonId)

      const allTaskIds = (allTasks ?? []).map((t) => t.id)

      const { data: completedSubmissions } = await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('user_id', user.id)
        .in('task_id', allTaskIds)
        .not('graded_at', 'is', null)

      const completedTaskIds = new Set((completedSubmissions ?? []).map((s) => s.task_id))
      completedTaskIds.add(taskId)

      if (allTaskIds.every((id) => completedTaskIds.has(id))) {
        await supabase
          .from('lesson_progress')
          .upsert(
            { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
            { onConflict: 'user_id,lesson_id' }
          )

        // Check if all lessons in the course are now complete → send completion email
        const { data: moduleRow } = await supabase
          .from('lessons')
          .select('modules!inner(course_id, courses(title))')
          .eq('id', lessonId)
          .single()

        const mod = Array.isArray(moduleRow?.modules) ? moduleRow.modules[0] : moduleRow?.modules
        const courseId = (mod as { course_id: string } | null)?.course_id
        const courseTitle = (mod as { courses: { title: string } | null } | null)?.courses?.title

        if (courseId && courseTitle) {
          const { data: allCourseLessons } = await supabase
            .from('lessons')
            .select('id, modules!inner(course_id)')
            .eq('modules.course_id', courseId)

          const allLessonIds = (allCourseLessons ?? []).map((l) => l.id)

          const { data: allCompleted } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .eq('completed', true)
            .in('lesson_id', allLessonIds)

          const doneIds = new Set((allCompleted ?? []).map((l) => l.lesson_id))
          doneIds.add(lessonId)

          if (allLessonIds.length > 0 && allLessonIds.every((id) => doneIds.has(id))) {
            if (user.email) {
              sendCourseCompletionEmail(user.email, userName, courseTitle, courseId).catch(() => {})
            }
          }
        }
      }
    }

    return NextResponse.json({ submissionId: submission.id, score: scorePercent })
  } catch (err) {
    console.error('Grade submission error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
