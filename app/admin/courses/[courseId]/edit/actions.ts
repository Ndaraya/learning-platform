'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Modules ──────────────────────────────────────────────────

export async function addModule(courseId: string, title: string, description: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('modules')
    .select('order')
    .eq('course_id', courseId)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.order ?? -1) + 1

  const { error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, title, description: description || null, order: nextOrder })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deleteModule(courseId: string, moduleId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('modules').delete().eq('id', moduleId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Lessons ──────────────────────────────────────────────────

export async function addLesson(
  courseId: string,
  moduleId: string,
  title: string,
  description: string,
  lessonType: 'video' | 'text' | 'pdf' | 'image' = 'video',
  contentUrl: string | null = null,
  contentBody: string | null = null,
  imageUrls: string[] = []
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('lessons')
    .select('order')
    .eq('module_id', moduleId)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.order ?? -1) + 1

  const { error } = await supabase.from('lessons').insert({
    module_id: moduleId,
    title,
    description: description || null,
    lesson_type: lessonType,
    youtube_url: lessonType === 'video' ? contentUrl : null,
    content_url: contentUrl,
    content_body: contentBody,
    image_urls: imageUrls,
    order: nextOrder,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Tasks ────────────────────────────────────────────────────

export async function addTask(
  courseId: string,
  lessonId: string,
  title: string,
  type: 'quiz' | 'written' | 'video' | 'pdf' | 'text' | 'image',
  instructions: string,
  timedMode: 'untimed' | 'practice' | 'exam' = 'untimed',
  timeLimitSeconds: number | null = null,
  videoUrl: string | null = null,
  contentBody: string | null = null,
  imageUrls: string[] = []
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('tasks')
    .select('order')
    .eq('lesson_id', lessonId)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.order ?? -1) + 1
  const isContentTask = type === 'video' || type === 'pdf' || type === 'text' || type === 'image'

  const { error } = await supabase.from('tasks').insert({
    lesson_id: lessonId,
    title,
    type,
    instructions: instructions || null,
    video_url: videoUrl || null,
    content_body: contentBody,
    image_urls: imageUrls,
    order: nextOrder,
    timed_mode: isContentTask ? 'untimed' : timedMode,
    time_limit_seconds: isContentTask || timedMode === 'untimed' ? null : timeLimitSeconds,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deleteTask(courseId: string, taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Questions ────────────────────────────────────────────────

export async function addQuestion(
  courseId: string,
  taskId: string,
  prompt: string,
  type: 'mcq' | 'written',
  options: string[],
  correctAnswer: string,
  points: number,
  gradingRubric: string,
  imageUrl: string | null = null
) {
  const supabase = await createClient()

  const { error } = await supabase.from('questions').insert({
    task_id: taskId,
    prompt,
    type,
    options: type === 'mcq' && options.length > 0 ? options : null,
    correct_answer: type === 'mcq' ? correctAnswer : null,
    points,
    grading_rubric: type === 'written' ? gradingRubric || null : null,
    image_url: imageUrl,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deleteQuestion(courseId: string, questionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('questions').delete().eq('id', questionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Update actions ───────────────────────────────────────────

export async function updateCourse(courseId: string, title: string, description: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('courses')
    .update({ title, description: description || null })
    .eq('id', courseId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
  revalidatePath('/admin/courses')
}

export async function updateModule(courseId: string, moduleId: string, title: string, description: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('modules')
    .update({ title, description: description || null })
    .eq('id', moduleId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function updateLesson(
  courseId: string, lessonId: string,
  title: string, description: string,
  lessonType: 'video' | 'text' | 'pdf' | 'image' = 'video',
  contentUrl: string | null = null,
  contentBody: string | null = null,
  imageUrls: string[] = []
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lessons')
    .update({
      title,
      description: description || null,
      lesson_type: lessonType,
      youtube_url: lessonType === 'video' ? contentUrl : null,
      content_url: contentUrl,
      content_body: contentBody,
      image_urls: imageUrls,
    })
    .eq('id', lessonId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function updateTask(
  courseId: string, taskId: string,
  title: string, instructions: string,
  timedMode: 'untimed' | 'practice' | 'exam' = 'untimed',
  timeLimitSeconds: number | null = null,
  videoUrl: string | null = null,
  contentBody: string | null = null,
  imageUrls: string[] | null = null
) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = {
    title,
    instructions: instructions || null,
    video_url: videoUrl || null,
    content_body: contentBody,
    timed_mode: timedMode,
    time_limit_seconds: timedMode !== 'untimed' ? timeLimitSeconds : null,
  }
  if (imageUrls !== null) updates.image_urls = imageUrls
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function updateQuestion(
  courseId: string, questionId: string,
  prompt: string, type: 'mcq' | 'written',
  options: string[], correctAnswer: string,
  points: number, gradingRubric: string,
  imageUrl: string | null = null
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({
      prompt, type,
      options: type === 'mcq' && options.length > 0 ? options : null,
      correct_answer: type === 'mcq' ? correctAnswer : null,
      points,
      grading_rubric: type === 'written' ? gradingRubric || null : null,
      image_url: imageUrl,
    })
    .eq('id', questionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Reorder ──────────────────────────────────────────────────

export async function reorderModules(courseId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('modules').update({ order: index }).eq('id', id).eq('course_id', courseId)
    )
  )
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function reorderLessons(courseId: string, moduleId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('lessons').update({ order: index }).eq('id', id).eq('module_id', moduleId)
    )
  )
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function reorderTasks(courseId: string, lessonId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('tasks').update({ order: index }).eq('id', id).eq('lesson_id', lessonId)
    )
  )
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

// ── Publish toggle ───────────────────────────────────────────

export async function togglePublish(courseId: string, published: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('courses')
    .update({ published })
    .eq('id', courseId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
  revalidatePath('/admin/courses')
}
