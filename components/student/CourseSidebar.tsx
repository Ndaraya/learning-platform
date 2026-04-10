'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  order: number
  time_limit_seconds: number | null
}

interface Lesson {
  id: string
  title: string
  order: number
}

interface Module {
  id: string
  title: string
  section: string | null
  order: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  modules: Module[]
  currentLessonId?: string
  /** Passed from task pages to highlight the active task and render task sub-list */
  currentTaskId?: string
  /** Tasks for the current lesson — shown inline under the lesson row */
  tasks?: Task[]
  /** IDs of tasks the student has already submitted */
  submittedTaskIds?: string[]
}

function IconChevronLeft() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const STORAGE_KEY = 'course-sidebar-collapsed'

export function CourseSidebar({
  courseId,
  modules,
  currentLessonId,
  currentTaskId,
  tasks = [],
  submittedTaskIds = [],
}: Props) {
  // Start expanded to match server render; sync from localStorage after hydration
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const collapse = () => {
    setIsCollapsed(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  const expand = () => {
    setIsCollapsed(false)
    localStorage.setItem(STORAGE_KEY, 'false')
  }

  const sorted = [...modules].sort((a, b) => a.order - b.order)
  const submittedSet = new Set(submittedTaskIds)
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order)

  const activeModuleId = currentLessonId
    ? sorted.find((m) => m.lessons?.some((l) => l.id === currentLessonId))?.id
    : sorted[0]?.id

  // Group consecutive modules by section label
  const groups: { section: string | null; items: Module[] }[] = []
  for (const mod of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.section === mod.section) {
      last.items.push(mod)
    } else {
      groups.push({ section: mod.section, items: [mod] })
    }
  }

  // ── Collapsed state ──────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <aside
        className="w-12 shrink-0 border-r bg-white flex flex-col items-center pt-3"
        style={{ minHeight: 'calc(100vh - 4rem)' }}
        aria-label="Course navigation (collapsed)"
      >
        <button
          onClick={expand}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <IconChevronRight />
        </button>
      </aside>
    )
  }

  // ── Expanded state ───────────────────────────────────────────────────────────
  let globalIndex = 0

  return (
    <aside
      className="w-64 border-r bg-white shrink-0 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}
      aria-label="Course navigation"
    >
      {/* Header: logo + collapse button — sticky so it stays visible while scrolling */}
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between sticky top-0 bg-white z-10">
        <Link href={`/courses/${courseId}`} aria-label="Back to course overview">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: 'var(--brand)' }}
            aria-hidden="true"
          >
            ED
          </div>
        </Link>
        <button
          onClick={collapse}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <IconChevronLeft />
        </button>
      </div>

      {/* Module / lesson / task tree */}
      <nav className="flex-1 py-3 px-2" aria-label="Course modules">
        <ol className="space-y-1 list-none p-0 m-0">
          {groups.map((group, groupIdx) => {
            const sectionStart = globalIndex
            globalIndex += group.items.length

            return (
              <li key={groupIdx}>
                {group.section && (
                  <p className="px-2 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400 select-none first:pt-1">
                    {group.section}
                  </p>
                )}

                <ol className="space-y-1 list-none p-0 m-0">
                  {group.items.map((module, i) => {
                    const moduleIdx = sectionStart + i
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
                              {moduleIdx + 1}
                            </span>
                            <span
                              className="flex-1 text-sm font-medium leading-snug"
                              style={isActive ? { color: 'var(--brand)' } : { color: '#374151' }}
                            >
                              {module.title}
                            </span>
                            <span className="shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                              <IconChevronDown />
                            </span>
                          </summary>

                          <ul
                            role="list"
                            className="mt-1 ml-5 mb-2 space-y-0.5 border-l border-gray-100 pl-3 list-none p-0 m-0"
                          >
                            {sortedLessons.map((lesson, j) => {
                              const isCurrent = lesson.id === currentLessonId
                              // Highlight the lesson row differently when we're inside a task vs on the lesson overview
                              const lessonIsActiveWithoutTask = isCurrent && !currentTaskId
                              const lessonIsActiveWithTask = isCurrent && !!currentTaskId

                              return (
                                <li key={lesson.id}>
                                  {/* Lesson row */}
                                  <Link
                                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                                    className="block rounded px-2 py-1.5 text-xs leading-snug transition-colors no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                                    style={
                                      lessonIsActiveWithoutTask
                                        ? { backgroundColor: 'var(--brand)', color: 'white', fontWeight: 600, outlineColor: 'var(--brand)' }
                                        : lessonIsActiveWithTask
                                        ? { color: 'var(--brand)', fontWeight: 600, outlineColor: 'var(--brand)' }
                                        : { color: '#4b5563', outlineColor: 'var(--brand)' }
                                    }
                                    aria-current={lessonIsActiveWithoutTask ? 'page' : undefined}
                                  >
                                    <span className="opacity-50 mr-1">{moduleIdx + 1}.{j + 1}</span>
                                    {lesson.title}
                                  </Link>

                                  {/* Task sub-list — only rendered under the current lesson on task pages */}
                                  {isCurrent && sortedTasks.length > 0 && (
                                    <ul className="mt-0.5 ml-3 border-l border-gray-100 pl-2.5 space-y-0.5 list-none p-0 pb-1">
                                      {sortedTasks.map((task, ti) => {
                                        const isCurrentTask = task.id === currentTaskId
                                        const isSubmitted = submittedSet.has(task.id)

                                        return (
                                          <li key={task.id}>
                                            <Link
                                              href={`/courses/${courseId}/lessons/${lesson.id}/tasks/${task.id}`}
                                              className="flex items-center gap-2 rounded px-2 py-1 text-xs leading-snug transition-colors no-underline"
                                              style={
                                                isCurrentTask
                                                  ? { backgroundColor: 'var(--brand)', color: 'white', fontWeight: 600 }
                                                  : isSubmitted
                                                  ? { color: '#374151' }
                                                  : { color: '#6b7280' }
                                              }
                                              aria-current={isCurrentTask ? 'page' : undefined}
                                            >
                                              <span
                                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                                                style={
                                                  isCurrentTask
                                                    ? { borderColor: 'rgba(255,255,255,0.5)', color: 'white' }
                                                    : isSubmitted
                                                    ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand)', color: 'white' }
                                                    : { borderColor: '#d1d5db', color: '#9ca3af' }
                                                }
                                                aria-hidden="true"
                                              >
                                                {isSubmitted ? '✓' : ti + 1}
                                              </span>
                                              <span className="truncate">{task.title}</span>
                                            </Link>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </details>
                      </li>
                    )
                  })}
                </ol>
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}
