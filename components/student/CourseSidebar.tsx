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
    : null

  return (
    <aside
      className="w-56 border-r bg-white shrink-0 flex flex-col overflow-y-auto"
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
            LP
          </div>
        </Link>
      </div>

      {/* Module list */}
      <nav className="flex-1 py-4 px-3" aria-label="Modules">
        <ol className="space-y-0.5 list-none p-0 m-0">
          {sorted.map((module, i) => {
            const isActive = module.id === activeModuleId
            const firstLesson = [...(module.lessons ?? [])].sort(
              (a, b) => a.order - b.order
            )[0]

            return (
              <li key={module.id}>
                {firstLesson ? (
                  <Link
                    href={`/courses/${courseId}/lessons/${firstLesson.id}`}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors no-underline"
                    style={
                      isActive
                        ? { backgroundColor: '#007053' + '1a' }
                        : undefined
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
                      style={
                        isActive
                          ? {
                              borderColor: 'var(--brand)',
                              backgroundColor: 'var(--brand)',
                              color: 'white',
                            }
                          : { borderColor: '#d1d5db', color: '#6b7280' }
                      }
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span
                      className="font-medium leading-snug"
                      style={
                        isActive ? { color: 'var(--brand)' } : { color: '#374151' }
                      }
                    >
                      {module.title}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-2 py-2.5 text-sm text-gray-400">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-xs">
                      {i + 1}
                    </span>
                    <span className="font-medium leading-snug">{module.title}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}
