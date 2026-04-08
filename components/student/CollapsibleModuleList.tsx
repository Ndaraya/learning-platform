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
  section: string | null
  order: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  modules: Module[]
  enrolled: boolean
}

export function CollapsibleModuleList({ courseId, modules, enrolled }: Props) {
  // Group consecutive modules that share the same section label
  const groups: { section: string | null; items: Module[] }[] = []
  for (const mod of modules) {
    const last = groups[groups.length - 1]
    if (last && last.section === mod.section) {
      last.items.push(mod)
    } else {
      groups.push({ section: mod.section, items: [mod] })
    }
  }

  let globalModuleIndex = 0

  return (
    <div className="space-y-2">
      {groups.map((group, groupIdx) => {
        const sectionStart = globalModuleIndex
        globalModuleIndex += group.items.length

        return (
          <div key={groupIdx}>
            {/* Section header */}
            {group.section && (
              <div className="flex items-center gap-3 px-1 pt-4 pb-2 first:pt-0">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{group.section}</h3>
                <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
              </div>
            )}

            {/* Modules in this section */}
            <div className="rounded-xl border overflow-hidden divide-y">
              {group.items.map((module, i) => {
                const moduleIndex = sectionStart + i
                const sortedLessons = [...(module.lessons ?? [])].sort((a, b) => a.order - b.order)
                const isFirst = moduleIndex === 0

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
                        {moduleIndex + 1}
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
                        <li key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                          {/* Play or lock icon */}
                          {enrolled ? (
                            <svg className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="11" width="18" height="11" rx="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
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
          </div>
        )
      })}
    </div>
  )
}
