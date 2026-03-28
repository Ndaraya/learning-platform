import Link from 'next/link'

interface Lesson {
  id: string
  title: string
  order: number
}

interface Module {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  modules: Module[]
  enrolled: boolean
}

export function CollapsibleModuleList({ courseId, modules, enrolled }: Props) {
  return (
    <div className="rounded-xl border overflow-hidden divide-y">
      {modules.map((module, i) => {
        const sortedLessons = [...(module.lessons ?? [])].sort((a, b) => a.order - b.order)
        const isFirst = i === 0

        return (
          <details key={module.id} open={isFirst} className="group">
            <summary
              className="flex items-center gap-4 p-4 cursor-pointer list-none select-none bg-gray-50 hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              style={{ outlineColor: 'var(--brand)' }}
            >
              {/* Module number */}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--brand)', borderColor: 'var(--brand)' }}
                aria-hidden="true"
              >
                {i + 1}
              </span>

              {/* Module title + lesson count */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{module.title}</p>
                {module.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{module.description}</p>
                )}
              </div>

              <span className="text-xs text-gray-400 shrink-0">
                {sortedLessons.length} lesson{sortedLessons.length !== 1 ? 's' : ''}
              </span>

              {/* Chevron */}
              <svg
                className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            {/* Lesson list */}
            <ul role="list" className="divide-y bg-white list-none p-0 m-0">
              {sortedLessons.map((lesson, j) => (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-gray-400 w-8 text-right shrink-0 font-mono" aria-hidden="true">
                    {i + 1}.{j + 1}
                  </span>
                  {enrolled ? (
                    <Link
                      href={`/courses/${courseId}/lessons/${lesson.id}`}
                      className="text-sm hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 rounded"
                      style={{ color: 'var(--brand)', outlineColor: 'var(--brand)' }}
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400" aria-label={`${lesson.title} — enroll to access`}>
                      {lesson.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
