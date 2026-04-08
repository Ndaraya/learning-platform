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
import { Badge } from '@/components/ui/badge'
import { EditTaskDialog } from '@/components/admin/EditTaskDialog'
import { AddQuestionDialog } from '@/components/admin/AddQuestionDialog'
import { EditQuestionDialog } from '@/components/admin/EditQuestionDialog'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteTask, deleteQuestion, reorderTasks } from '@/app/admin/courses/[courseId]/edit/actions'

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

interface Props {
  tasks: Task[]
  courseId: string
  lessonId: string
}

function SortableTaskItem({ task, courseId, lessonId }: { task: Task; courseId: string; lessonId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const questions = (task.questions ?? []).slice()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-2 ${isDragging ? 'opacity-50 shadow-md ring-2 ring-primary/20 rounded-md' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label={`Drag to reorder ${task.title}`}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
          >
            <GripVertical className="size-3.5" />
          </button>
          <span className="text-xs font-medium">{task.title}</span>
          <Badge variant="outline" className="text-xs capitalize">{task.type}</Badge>
          {task.timed_mode !== 'untimed' && (
            <Badge variant="secondary" className="text-xs">
              {task.timed_mode === 'exam' ? '⏱ Exam' : '⏱ Practice'}
              {task.time_limit_seconds && ` · ${Math.round(task.time_limit_seconds / 60)}min`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <EditTaskDialog
            courseId={courseId}
            taskId={task.id}
            initialTitle={task.title}
            initialInstructions={task.instructions}
            initialTimedMode={task.timed_mode ?? 'untimed'}
            initialTimeLimitSeconds={task.time_limit_seconds ?? null}
            initialVideoUrl={task.video_url ?? null}
            initialContentBody={task.content_body ?? null}
            initialImageUrls={task.image_urls ?? []}
            taskType={task.type}
          />
          {(task.type === 'quiz' || task.type === 'written') && (
            <AddQuestionDialog courseId={courseId} taskId={task.id} taskType={task.type} />
          )}
          <DeleteButton label={task.title} onDelete={deleteTask.bind(null, courseId, task.id)} />
        </div>
      </div>

      {questions.length > 0 && (
        <ol className="space-y-1 pl-3" aria-label={`Questions for ${task.title}`}>
          {questions.map((q, qi) => (
            <li key={q.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex-1">
                <span className="font-medium text-foreground mr-1">Q{qi + 1}.</span>
                {q.image_url && <span className="mr-1 opacity-60" title="Has image">🖼</span>}
                {q.prompt || <span className="italic opacity-50">image only</span>}
                <span className="ml-1 opacity-60">({q.points}pt · {q.type === 'mcq' ? 'MCQ' : 'written'})</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <EditQuestionDialog
                  courseId={courseId}
                  questionId={q.id}
                  initialPrompt={q.prompt}
                  initialType={q.type}
                  initialOptions={q.options}
                  initialCorrectAnswer={q.correct_answer}
                  initialPoints={q.points}
                  initialRubric={q.grading_rubric}
                  initialImageUrl={q.image_url}
                />
                <DeleteButton label={`Question ${qi + 1}`} onDelete={deleteQuestion.bind(null, courseId, q.id)} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function SortableTaskList({ tasks, courseId, lessonId }: Props) {
  const [items, setItems] = useState<Task[]>(() => [...tasks].sort((a, b) => a.order - b.order))
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((t) => t.id === active.id)
    const newIndex = items.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const snapshot = items
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    startTransition(async () => {
      try {
        await reorderTasks(courseId, lessonId, reordered.map((t) => t.id))
      } catch {
        setItems(snapshot)
      }
    })
  }

  if (items.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 pl-3 border-l-2 border-muted">
          {items.map((task) => (
            <SortableTaskItem key={task.id} task={task} courseId={courseId} lessonId={lessonId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
