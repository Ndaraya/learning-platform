import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('*, modules(id, title, description, order, lessons(id, title, order))')
    .eq('id', courseId)
    .eq('published', true)
    .single()

  if (!course) notFound()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  const modules = (course.modules as Array<{
    id: string; title: string; description: string | null; order: number;
    lessons: Array<{ id: string; title: string; order: number }>
  }>)?.sort((a, b) => a.order - b.order) ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground mt-2">{course.description}</p>
        )}
      </div>

      {!enrollment && (
        <form action={`/api/enroll`} method="post">
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" size="lg">Enroll in this course</Button>
        </form>
      )}

      <Separator />

      <section aria-labelledby="curriculum-heading">
        <h2 id="curriculum-heading" className="text-xl font-semibold mb-4">Curriculum</h2>
        {modules.length > 0 ? (
          <div className="space-y-4">
            {modules.map((module, moduleIndex) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Module {moduleIndex + 1}: {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2" aria-label={`Lessons in ${module.title}`}>
                    {module.lessons
                      ?.sort((a, b) => a.order - b.order)
                      .map((lesson, lessonIndex) => (
                        <li key={lesson.id} className="flex items-center gap-3">
                          <Badge variant="outline" aria-hidden="true">
                            {moduleIndex + 1}.{lessonIndex + 1}
                          </Badge>
                          {enrollment ? (
                            <Link
                              href={`/courses/${courseId}/lessons/${lesson.id}`}
                              className="text-sm hover:underline underline-offset-4"
                            >
                              {lesson.title}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">{lesson.title}</span>
                          )}
                        </li>
                      ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No content yet.</p>
        )}
      </section>
    </div>
  )
}
