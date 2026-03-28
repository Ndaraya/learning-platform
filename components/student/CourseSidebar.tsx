import Link from 'next/link'

interface Lesson {
  id: string
  title: string
  order: number
}

interface Module {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  modules: Module[]
  currentLessonId?: string
}

export function CourseSidebar({ courseId, modules, currentLessonId }: Props) {
  const sorted = [...modules].sort((a, b) => a.order - b.order)

  const activeModuleId = currentLessonId
    ? sorted.find((m) => m.lessons?.some((l) => l.id === currentLessonId))?.id
    : sorted[0]?.id

  return (
    <aside
      className="w-64 border-r bg-white shrink-0 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}
      aria-label="Course navigation"
    >
      {/* Logo area */}
      <div className="p-4 border-b shrink-0">
        <Link href={`/courses/${courseId}`} aria-label="Back to course overview">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: 'var(--brand)' }}
            aria-hidden="true"
          >
            ED
          </div>
        </Link>
      </div>

      {/* Module list */}
      <nav className="flex-1 py-3 px-2" aria-label="Course modules">
        <ol className="space-y-1 list-none p-0 m-0">
          {sorted.map((module, i) => {
            const isActive = module.id === activeModuleId
            const sortedLessons = [...(module.lessons ?? [])].sort((a, b) => a.order - b.order)

            return (
              <li key={module.id}>
                <details open={isActive} className="group">
                  <summary
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 cursor-pointer list-none select-none transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    style={{ outlineColor: 'var(--brand)' }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
                      style={
                        isActive
                          ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand)', color: 'white' }
                          : { borderColor: '#d1d5db', color: '#6b7280' }
                      }
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span
                      className="flex-1 text-sm font-medium leading-snug"
                      style={isActive ? { color: 'var(--brand)' } : { color: '#374151' }}
                    >
                      {module.title}
                    </span>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <ul role="list" className="mt-1 ml-5 mb-2 space-y-0.5 border-l border-gray-100 pl-3 list-none p-0 m-0">
                    {sortedLessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/courses/${courseId}/lessons/${lesson.id}`}
                            className="block rounded px-2 py-1.5 text-xs leading-snug transition-colors no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                            style={
                              isCurrent
                                ? { backgroundColor: 'var(--brand)', color: 'white', fontWeight: 600, outlineColor: 'var(--brand)' }
                                : { color: '#4b5563', outlineColor: 'var(--brand)' }
                            }
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            {lesson.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}
