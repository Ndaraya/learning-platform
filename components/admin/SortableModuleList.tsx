'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EditModuleDialog } from '@/components/admin/EditModuleDialog'
import { AddLessonDialog } from '@/components/admin/AddLessonDialog'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { SortableLessonList } from '@/components/admin/SortableLessonList'
import { deleteModule, reorderModules } from '@/app/admin/courses/[courseId]/edit/actions'

type Question = {
  id: string
  prompt: string
  type: 'mcq' | 'written'
  options: string[] | null
  correct_answer: string | null
  points: number
  grading_rubric: string | null
  image_url: string | null
}

type Task = {
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
  questions: Question[]
}

type Lesson = {
  id: string
  title: string
  description: string | null
  lesson_type: 'video' | 'text' | 'pdf' | 'image'
  youtube_url: string | null
  content_url: string | null
  content_body: string | null
  image_urls: string[]
  order: number
  tasks: Task[]
}

type Module = {
  id: string
  title: string
  description: string | null
  section: string | null
  order: number
  lessons: Lesson[]
}

interface Props {
  modules: Module[]
  courseId: string
}

function SortableModuleItem({
  module,
  moduleIndex,
  courseId,
}: {
  module: Module
  moduleIndex: number
  courseId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const lessons = (module.lessons ?? []).slice().sort((a, b) => a.order - b.order)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary/20 rounded-lg z-10 relative' : ''}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button
                type="button"
                {...listeners}
                {...attributes}
                aria-label={`Drag to reorder module ${module.title}`}
                className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0 transition-colors"
              >
                <GripVertical className="size-4" />
              </button>
              <CardTitle className="text-base">
                Module {moduleIndex + 1}: {module.title}
              </CardTitle>
            </div>
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
            <p className="text-sm text-muted-foreground pl-6">{module.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <SortableLessonList
            lessons={lessons}
            courseId={courseId}
            moduleId={module.id}
            moduleIndex={moduleIndex}
          />
          <AddLessonDialog courseId={courseId} moduleId={module.id} />
        </CardContent>
      </Card>
    </div>
  )
}

// Groups consecutive modules by section label
function groupBySection(modules: Module[]): { section: string | null; items: Module[] }[] {
  const groups: { section: string | null; items: Module[] }[] = []
  for (const mod of modules) {
    const last = groups[groups.length - 1]
    if (last && last.section === mod.section) {
      last.items.push(mod)
    } else {
      groups.push({ section: mod.section, items: [mod] })
    }
  }
  return groups
}

export function SortableModuleList({ modules, courseId }: Props) {
  const [items, setItems] = useState<Module[]>(() => [...modules].sort((a, b) => a.order - b.order))
  const [, startTransition] = useTransition()

  const hasSections = items.some((m) => m.section !== null)

  // Track which sections are open (default: all open)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const m of items) {
      const key = m.section ?? '__none__'
      init[key] = true
    }
    return init
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((m) => m.id === active.id)
    const newIndex = items.findIndex((m) => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const snapshot = items
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    startTransition(async () => {
      try {
        await reorderModules(courseId, reordered.map((m) => m.id))
      } catch {
        setItems(snapshot)
      }
    })
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No modules yet. Add your first module above.</p>
  }

  const groups = groupBySection(items)
  let globalModuleIndex = 0

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {groups.map((group, groupIdx) => {
            const sectionKey = group.section ?? '__none__'
            const isOpen = openSections[sectionKey] ?? true
            const sectionStart = globalModuleIndex
            globalModuleIndex += group.items.length
            const lessonCount = group.items.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0)

            return (
              <div key={groupIdx}>
                {/* Section accordion header */}
                {hasSections && group.section && (
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center gap-3 px-1 py-2 text-left hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
                  >
                    <h3 className="text-base font-bold text-foreground">{group.section}</h3>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} module{group.items.length !== 1 ? 's' : ''} · {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-border" aria-hidden="true" />
                    <ChevronDown
                      className="size-4 text-muted-foreground shrink-0 transition-transform"
                      style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                      aria-hidden="true"
                    />
                  </button>
                )}

                {/* Module cards — hidden (not unmounted) when collapsed so DnD refs stay valid */}
                <div
                  className="space-y-6"
                  style={
                    hasSections && group.section && !isOpen
                      ? { display: 'none' }
                      : hasSections && group.section
                      ? { marginTop: '0.5rem' }
                      : undefined
                  }
                >
                  {group.items.map((module, i) => (
                    <SortableModuleItem
                      key={module.id}
                      module={module}
                      moduleIndex={sectionStart + i}
                      courseId={courseId}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
