import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OnboardingFlow } from './OnboardingFlow'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function OnboardingPage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must be enrolled
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) redirect(`/courses/${courseId}`)

  // Detect exam type from course title
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .maybeSingle()

  const examType: 'sat' | 'act' = /sat/i.test(course?.title ?? '') ? 'sat' : 'act'

  // If baseline already exists for this exam type, skip onboarding
  const baselineTable = examType === 'sat' ? 'sat_baselines' : 'act_baselines'
  const { data: baseline } = await supabase
    .from(baselineTable)
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (baseline) redirect(`/courses/${courseId}`)

  // Look up the diagnostic lesson + first task
  const { data: diagnosticModule } = await supabase
    .from('modules')
    .select('id, lessons(id, order, tasks(id, order))')
    .eq('course_id', courseId)
    .eq('title', 'Diagnostic Assessment')
    .maybeSingle()

  let diagnosticTaskPath: string | null = null
  if (diagnosticModule) {
    const lessons = (diagnosticModule.lessons as Array<{
      id: string
      order: number
      tasks: Array<{ id: string; order: number }>
    }>)?.sort((a, b) => a.order - b.order)
    const firstLesson = lessons?.[0]
    if (firstLesson) {
      const firstTask = [...(firstLesson.tasks ?? [])].sort((a, b) => a.order - b.order)[0]
      if (firstTask) {
        diagnosticTaskPath = `/courses/${courseId}/lessons/${firstLesson.id}/tasks/${firstTask.id}`
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <OnboardingFlow courseId={courseId} examType={examType} diagnosticTaskPath={diagnosticTaskPath} />
    </div>
  )
}
