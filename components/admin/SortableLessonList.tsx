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
import { GripVertical } from 'lucide-react'
import { EditLessonDialog } from '@/components/admin/EditLessonDialog'
import { AddTaskDialog } from '@/components/admin/AddTaskDialog'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { SortableTaskList } from '@/components/admin/SortableTaskList'
import { deleteLesson, reorderLessons } from '@/app/admin/courses/[courseId]/edit/actions'

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

interface Props {
  lessons: Lesson[]
  courseId: string
  moduleId: string
  moduleIndex: number
}

function SortableLessonItem({
  lesson,
  lessonIndex,
  moduleIndex,
  courseId,
  moduleId,
}: {
  lesson: Lesson
  lessonIndex: number
  moduleIndex: number
  courseId: string
  moduleId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const tasks = (lesson.tasks ?? []).slice().sort((a, b) => a.order - b.order)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 space-y-3 bg-card ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary/20 z-10 relative' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Drag to reorder ${lesson.title}`}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0 transition-colors"
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex flex-1 items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">
              {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
            </p>
            {lesson.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{lesson.description}</p>
            )}
            <span className="text-xs text-muted-foreground mt-0.5 capitalize">
              {lesson.lesson_type ?? 'video'}
              {(lesson.content_url || lesson.youtube_url) && (
                <> · <a
                  href={(lesson.content_url ?? lesson.youtube_url) ?? '#'}
                  target="_blank" rel="noopener noreferrer"
                  className="hover:underline underline-offset-2 truncate max-w-xs inline-block align-bottom"
                  onClick={(e) => e.stopPropagation()}
                >link</a></>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <EditLessonDialog
              courseId={courseId}
              lessonId={lesson.id}
              initialTitle={lesson.title}
              initialDescription={lesson.description}
              initialLessonType={(lesson.lesson_type ?? 'video') as 'video' | 'text' | 'pdf' | 'image'}
              initialContentUrl={lesson.content_url ?? lesson.youtube_url ?? null}
              initialContentBody={lesson.content_body ?? null}
              initialImageUrls={lesson.image_urls ?? []}
            />
            <AddTaskDialog courseId={courseId} lessonId={lesson.id} />
            <DeleteButton label={lesson.title} onDelete={deleteLesson.bind(null, courseId, lesson.id)} />
          </div>
        </div>
      </div>

      <SortableTaskList tasks={tasks} courseId={courseId} lessonId={lesson.id} />
    </div>
  )
}

export function SortableLessonList({ lessons, courseId, moduleId, moduleIndex }: Props) {
  const [items, setItems] = useState<Lesson[]>(() => [...lessons].sort((a, b) => a.order - b.order))
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((l) => l.id === active.id)
    const newIndex = items.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const snapshot = items
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    startTransition(async () => {
      try {
        await reorderLessons(courseId, moduleId, reordered.map((l) => l.id))
      } catch {
        setItems(snapshot)
      }
    })
  }

  if (items.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((lesson, lessonIndex) => (
            <SortableLessonItem
              key={lesson.id}
              lesson={lesson}
              lessonIndex={lessonIndex}
              moduleIndex={moduleIndex}
              courseId={courseId}
              moduleId={moduleId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
