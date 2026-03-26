import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddModuleDialog } from '@/components/admin/AddModuleDialog'
import { AddLessonDialog } from '@/components/admin/AddLessonDialog'
import { AddTaskDialog } from '@/components/admin/AddTaskDialog'
import { AddQuestionDialog } from '@/components/admin/AddQuestionDialog'
import { EditCourseDialog } from '@/components/admin/EditCourseDialog'
import { EditModuleDialog } from '@/components/admin/EditModuleDialog'
import { EditLessonDialog } from '@/components/admin/EditLessonDialog'
import { EditTaskDialog } from '@/components/admin/EditTaskDialog'
import { EditQuestionDialog } from '@/components/admin/EditQuestionDialog'
import { PublishToggle } from '@/components/admin/PublishToggle'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteModule, deleteLesson, deleteTask, deleteQuestion } from './actions'

interface Props {
  params: Promise<{ courseId: string }>
}

type Question = {
  id: string
  prompt: string
  type: 'mcq' | 'written'
  options: string[] | null
  correct_answer: string | null
  points: number
  grading_rubric: string | null
}

type Task = {
  id: string
  title: string
  type: 'quiz' | 'written'
  instructions: string | null
  order: number
  questions: Question[]
}

type Lesson = {
  id: string
  title: string
  description: string | null
  youtube_url: string
  order: number
  tasks: Task[]
}

type Module = {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
}

export default async function EditCoursePage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, published,
      modules (
        id, title, description, order,
        lessons (
          id, title, description, youtube_url, order,
          tasks (
            id, title, type, instructions, order,
            questions (
              id, prompt, type, options, correct_answer, points, grading_rubric
            )
          )
        )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  const modules = ((course.modules ?? []) as Module[]).sort((a, b) => a.order - b.order)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Course header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground mt-1">{course.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={course.published ? 'default' : 'secondary'}>
            {course.published ? 'Published' : 'Draft'}
          </Badge>
          <EditCourseDialog
            courseId={courseId}
            initialTitle={course.title}
            initialDescription={course.description}
          />
          <PublishToggle courseId={courseId} published={course.published} />
        </div>
      </div>

      <Separator />

      {/* Modules */}
      <section aria-labelledby="modules-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modules-heading" className="text-xl font-semibold">Modules</h2>
          <AddModuleDialog courseId={courseId} />
        </div>

        {modules.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No modules yet. Add your first module above.
          </p>
        ) : (
          <div className="space-y-6">
            {modules.map((module, moduleIndex) => {
              const lessons = module.lessons.sort((a, b) => a.order - b.order)

              return (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        Module {moduleIndex + 1}: {module.title}
                      </CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        <EditModuleDialog
                          courseId={courseId}
                          moduleId={module.id}
                          initialTitle={module.title}
                          initialDescription={module.description}
                        />
                        <DeleteButton
                          label={module.title}
                          onDelete={deleteModule.bind(null, courseId, module.id)}
                        />
                      </div>
                    </div>
                    {module.description && (
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Lessons */}
                    {lessons.length > 0 && (
                      <div className="space-y-3">
                        {lessons.map((lesson, lessonIndex) => {
                          const tasks = lesson.tasks.sort((a, b) => a.order - b.order)

                          return (
                            <div key={lesson.id} className="border rounded-lg p-4 space-y-3">
                              {/* Lesson header */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">
                                    {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                  </p>
                                  {lesson.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {lesson.description}
                                    </p>
                                  )}
                                  <a
                                    href={lesson.youtube_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:underline underline-offset-2 mt-0.5 block truncate max-w-xs"
                                    aria-label={`Open YouTube video for ${lesson.title}`}
                                  >
                                    {lesson.youtube_url}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <EditLessonDialog
                                    courseId={courseId}
                                    lessonId={lesson.id}
                                    initialTitle={lesson.title}
                                    initialDescription={lesson.description}
                                    initialYoutubeUrl={lesson.youtube_url}
                                  />
                                  <AddTaskDialog courseId={courseId} lessonId={lesson.id} />
                                  <DeleteButton
                                    label={lesson.title}
                                    onDelete={deleteLesson.bind(null, courseId, lesson.id)}
                                  />
                                </div>
                              </div>

                              {/* Tasks */}
                              {tasks.length > 0 && (
                                <div className="space-y-2 pl-3 border-l-2 border-muted">
                                  {tasks.map((task) => {
                                    const questions = task.questions ?? []

                                    return (
                                      <div key={task.id} className="space-y-2">
                                        {/* Task header */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{task.title}</span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {task.type}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <EditTaskDialog
                                              courseId={courseId}
                                              taskId={task.id}
                                              initialTitle={task.title}
                                              initialInstructions={task.instructions}
                                            />
                                            <AddQuestionDialog
                                              courseId={courseId}
                                              taskId={task.id}
                                              taskType={task.type}
                                            />
                                            <DeleteButton
                                              label={task.title}
                                              onDelete={deleteTask.bind(null, courseId, task.id)}
                                            />
                                          </div>
                                        </div>

                                        {/* Questions */}
                                        {questions.length > 0 && (
                                          <ol className="space-y-1 pl-3" aria-label={`Questions for ${task.title}`}>
                                            {questions.map((q, qi) => (
                                              <li key={q.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                                                <span className="flex-1">
                                                  <span className="font-medium text-foreground mr-1">Q{qi + 1}.</span>
                                                  {q.prompt}
                                                  <span className="ml-1 opacity-60">
                                                    ({q.points}pt · {q.type === 'mcq' ? 'MCQ' : 'written'})
                                                  </span>
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <EditQuestionDialog
                                                    courseId={courseId}
                                                    questionId={q.id}
                                                    initialPrompt={q.prompt}
                                                    initialType={q.type}
                                                    initialOptions={q.options}
                                                    initialCorrectAnswer={q.correct_answer}
                                                    initialPoints={q.points}
                                                    initialRubric={q.grading_rubric}
                                                  />
                                                  <DeleteButton
                                                    label={`Question ${qi + 1}`}
                                                    onDelete={deleteQuestion.bind(null, courseId, q.id)}
                                                  />
                                                </div>
                                              </li>
                                            ))}
                                          </ol>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <AddLessonDialog courseId={courseId} moduleId={module.id} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
