import Link from 'next/link'

interface Task {
  id: string
  title: string
  instructions: string | null
  order: number
  time_limit_seconds: number | null
}

interface Props {
  courseId: string
  lessonId: string
  lessonTitle: string
  tasks: Task[]
  currentTaskId: string
  submittedTaskIds: string[]
}

export function LessonTaskSidebar({
  courseId, lessonId, lessonTitle, tasks, currentTaskId, submittedTaskIds,
}: Props) {
  const sorted = [...tasks].sort((a, b) => a.order - b.order)
  const submittedSet = new Set(submittedTaskIds)

  return (
    <nav
      aria-label="Lesson tasks"
      className="w-72 shrink-0 border-r bg-white overflow-y-auto"
      style={{ minHeight: 'calc(100vh - 4rem)' }}
    >
      {/* Lesson back-link header */}
      <div className="px-5 py-4 border-b">
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}`}
          className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors no-underline"
          aria-label={`Back to ${lessonTitle}`}
        >
          ← {lessonTitle}
        </Link>
      </div>

      <ol className="p-5 space-y-0" aria-label="Task list">
        {sorted.map((task, index) => {
          const isActive = task.id === currentTaskId
          const isSubmitted = submittedSet.has(task.id)
          const isLast = index === sorted.length - 1

          const circleStyle: React.CSSProperties =
            isActive || isSubmitted
              ? { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)', color: 'white' }
              : { backgroundColor: 'white', borderColor: '#d1d5db', color: '#9ca3af' }

          const timeLabel = task.time_limit_seconds
            ? `${Math.round(task.time_limit_seconds / 60)} min`
            : null

          return (
            <li key={task.id} className="relative list-none">
              {/* Dotted connector line between circles */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="absolute"
                  style={{
                    left: '1.2rem',
                    top: '2.25rem',
                    bottom: '-0.25rem',
                    borderLeft: '2px dotted #d1d5db',
                  }}
                />
              )}

              <Link
                href={`/courses/${courseId}/lessons/${lessonId}/tasks/${task.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={`flex gap-3 py-3 px-2 rounded-lg transition-colors no-underline ${
                  isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Numbered / check circle */}
                <div className="shrink-0 relative z-10 mt-0.5">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors"
                    style={circleStyle}
                    aria-hidden="true"
                  >
                    {isSubmitted ? '✓' : index + 1}
                  </div>
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: isActive ? 'var(--brand)' : isSubmitted ? '#374151' : '#6b7280' }}
                  >
                    {task.title}
                  </p>
                  {task.instructions && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                      {task.instructions}
                    </p>
                  )}
                  {timeLabel && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span aria-hidden="true">⏱</span>
                      <span>{timeLabel}</span>
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
