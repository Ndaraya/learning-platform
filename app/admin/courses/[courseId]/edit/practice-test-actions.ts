'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPracticeTest(
  courseId: string,
  title: string,
  description: string,
  questionCounts: Record<string, number>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('practice_tests').insert({
    course_id: courseId,
    title,
    description: description || null,
    question_counts: questionCounts,
    answer_key: {},
    scoring_table: {},
    published: false,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function updatePracticeTest(
  courseId: string,
  testId: string,
  title: string,
  description: string,
  questionCounts: Record<string, number>,
  answerKey: Record<string, Record<string, string>>,
  scoringTable: Record<string, Record<string, number>>
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('practice_tests')
    .update({
      title,
      description: description || null,
      question_counts: questionCounts,
      answer_key: answerKey,
      scoring_table: scoringTable,
    })
    .eq('id', testId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deletePracticeTest(courseId: string, testId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('practice_tests').delete().eq('id', testId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function togglePracticeTestPublish(courseId: string, testId: string, published: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('practice_tests')
    .update({ published })
    .eq('id', testId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/courses/${courseId}/edit`)
}
