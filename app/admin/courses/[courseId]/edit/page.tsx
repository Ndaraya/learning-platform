import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddModuleDialog } from '@/components/admin/AddModuleDialog'
import { EditCourseDialog } from '@/components/admin/EditCourseDialog'
import { PublishToggle } from '@/components/admin/PublishToggle'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { SortableModuleList } from '@/components/admin/SortableModuleList'
import { deletePracticeTest, togglePracticeTestPublish } from './practice-test-actions'
import { Button } from '@/components/ui/button'
import { AddPracticeTestDialog } from '@/components/admin/AddPracticeTestDialog'
import { EditPracticeTestDialog } from '@/components/admin/EditPracticeTestDialog'
import type { PracticeTest } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ courseId: string }>
}

type Module = {
  id: string
  title: string
  description: string | null
  section: string | null
  order: number
  lessons: {
    id: string
    title: string
    description: string | null
    lesson_type: 'video' | 'text' | 'pdf' | 'image'
    youtube_url: string | null
    content_url: string | null
    content_body: string | null
    image_urls: string[]
    order: number
    tasks: {
      id: string
      title: string
      type: 'quiz' | 'written' | 'video' | 'pdf' | 'text' | 'image'
      instructions: string | null
      video_url: string | null
      content_body: string | null
      image_urls: string[]
      order: number
      timed_mode: 'untimed' | 'practice' | 'exam'
      time_limit_seconds: number | null
      questions: {
        id: string
        prompt: string
        type: 'mcq' | 'written'
        options: string[] | null
        correct_answer: string | null
        points: number
        grading_rubric: string | null
        image_url: string | null
      }[]
    }[]
  }[]
}

export default async function EditCoursePage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, published,
      modules (
        id, title, description, section, order,
        lessons (
          id, title, description, lesson_type, youtube_url, content_url, content_body, image_urls, order,
          tasks (
            id, title, type, instructions, video_url, content_body, image_urls, order, timed_mode, time_limit_seconds,
            questions (
              id, prompt, type, options, correct_answer, points, grading_rubric, image_url
            )
          )
        )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  const modules = ((course.modules ?? []) as Module[]).sort((a, b) => a.order - b.order)

  const { data: practiceTests } = await supabase
    .from('practice_tests')
    .select('id, title, description, published, question_counts, answer_key, scoring_table, created_at')
    .eq('course_id', courseId)
    .order('display_order')

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

        <SortableModuleList modules={modules} courseId={courseId} />
      </section>

      <Separator />

      {/* Practice Tests */}
      <section aria-labelledby="practice-tests-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="practice-tests-heading" className="text-xl font-semibold">Practice Tests</h2>
          <AddPracticeTestDialog courseId={courseId} />
        </div>

        {!practiceTests || practiceTests.length === 0 ? (
          <p className="text-muted-foreground text-sm">No practice tests yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {(practiceTests as PracticeTest[]).map((test) => {
              const answerCount = Object.values(test.answer_key ?? {}).reduce(
                (sum, section) => sum + Object.keys(section).length, 0
              )
              const totalQuestions = Object.values(test.question_counts ?? {}).reduce((a, b) => a + b, 0)
              return (
                <Card key={test.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{test.title}</p>
                          <Badge variant={test.published ? 'default' : 'secondary'} className="text-xs">
                            {test.published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {answerCount}/{totalQuestions} answers
                          </Badge>
                        </div>
                        {test.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <EditPracticeTestDialog courseId={courseId} test={test} />
                        <form action={togglePracticeTestPublish.bind(null, courseId, test.id, !test.published)}>
                          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            {test.published ? 'Unpublish' : 'Publish'}
                          </Button>
                        </form>
                        <DeleteButton
                          label={test.title}
                          onDelete={deletePracticeTest.bind(null, courseId, test.id)}
                        />
                      </div>
                    </div>
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
