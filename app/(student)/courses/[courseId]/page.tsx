import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CourseSidebar } from '@/components/student/CourseSidebar'

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
    id: string
    title: string
    description: string | null
    order: number
    lessons: Array<{ id: string; title: string; order: number }>
  }>)?.sort((a, b) => a.order - b.order) ?? []

  const firstLesson = modules[0]?.lessons?.sort((a, b) => a.order - b.order)[0]

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Left sidebar */}
      <CourseSidebar courseId={courseId} modules={modules} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero banner */}
        <div
          className="relative overflow-hidden"
          style={{
            background: course.thumbnail_url
              ? undefined
              : 'linear-gradient(135deg, #003d2e 0%, #007053 60%, #00a878 100%)',
            minHeight: '280px',
          }}
        >
          {course.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnail_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,30,20,0.55)' }}
            aria-hidden="true"
          />

          {/* Course info */}
          <div className="relative z-10 p-8 pb-12 max-w-2xl">
            <h1 className="text-3xl font-bold text-white leading-tight">{course.title}</h1>
            {course.description && (
              <p className="mt-3 text-white/80 text-sm leading-relaxed">{course.description}</p>
            )}
            <div className="mt-4 flex items-center gap-3 text-white/60 text-xs">
              <span>{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
              {modules.length > 0 && <span>·</span>}
              <span>Self-paced</span>
            </div>
          </div>

          {/* Enroll / Continue card */}
          <div className="absolute right-8 top-8 bg-white rounded-xl shadow-lg p-5 w-56 z-10">
            {enrollment ? (
              <>
                <p className="font-semibold text-sm text-gray-900">You&apos;re enrolled!</p>
                <p className="text-xs text-gray-500 mt-1">Keep going with your tasks.</p>
                {firstLesson && (
                  <Link
                    href={`/courses/${courseId}/lessons/${firstLesson.id}`}
                    className="mt-3 block w-full rounded-lg py-2 px-4 text-sm font-semibold text-white text-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: 'var(--brand)' }}
                  >
                    Continue →
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-sm text-gray-900">You can do it!</p>
                <p className="text-xs text-gray-500 mt-1">Start working through the tasks at your own pace.</p>
                <form action="/api/enroll" method="post" className="mt-3">
                  <input type="hidden" name="courseId" value={courseId} />
                  <button
                    type="submit"
                    className="w-full rounded-lg py-2 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: 'var(--brand)' }}
                  >
                    Enroll now
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Content below hero */}
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-12">

          {/* Why complete */}
          <section aria-labelledby="why-heading">
            <h2 id="why-heading" className="text-2xl font-bold text-gray-900">
              Why complete this program?
            </h2>
            <p className="mt-3 text-gray-600 leading-relaxed">
              {course.description
                ? course.description
                : 'Work through real-world tasks and build skills you can speak to in interviews and on your resume. All self-paced, no live sessions required.'}
            </p>
          </section>

          {/* How it works */}
          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-2xl font-bold text-gray-900">How it works</h2>
            <div className="mt-4 space-y-4">
              {[
                { icon: '▶', text: 'Complete tasks guided by video lessons and written instructions. No live sessions — all self-paced.' },
                { icon: '✓', text: 'Each task is graded automatically. Written responses are reviewed by AI for instant feedback.' },
                { icon: '★', text: 'Finish the program to earn a certificate you can add to your resume and LinkedIn profile.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: 'var(--brand)' }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mt-2">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tasks in this program */}
          {modules.length > 0 && (
            <section aria-labelledby="tasks-heading">
              <h2 id="tasks-heading" className="text-2xl font-bold text-gray-900">
                Tasks in this program
              </h2>
              <div className="mt-4 rounded-xl border overflow-hidden">
                {modules.map((module, i) => {
                  const sortedLessons = [...(module.lessons ?? [])].sort((a, b) => a.order - b.order)
                  return (
                    <div
                      key={module.id}
                      className="flex border-b last:border-b-0"
                    >
                      {/* Left: task number + name */}
                      <div className="w-48 shrink-0 border-r p-4 bg-gray-50 flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--brand)', borderColor: 'var(--brand)' }}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{module.title}</span>
                      </div>

                      {/* Right: description + lessons */}
                      <div className="flex-1 p-4">
                        {module.description && (
                          <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        )}
                        {sortedLessons.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lessons</p>
                            <ul className="space-y-1 list-none p-0 m-0">
                              {sortedLessons.map((lesson) => (
                                <li key={lesson.id}>
                                  {enrollment ? (
                                    <Link
                                      href={`/courses/${courseId}/lessons/${lesson.id}`}
                                      className="text-sm hover:underline underline-offset-4"
                                      style={{ color: 'var(--brand)' }}
                                    >
                                      {lesson.title}
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-gray-400">{lesson.title}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
