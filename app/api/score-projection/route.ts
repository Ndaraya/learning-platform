import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProjection } from '@/lib/claude/projections'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single()

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // Get all lesson IDs for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, modules!inner(course_id)')
      .eq('modules.course_id', courseId)

    const totalLessons = lessons?.length ?? 0

    // Get completed lessons
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('lesson_id', lessons?.map((l) => l.id) ?? [])

    const completionPercent = totalLessons > 0
      ? Math.round(((completedLessons?.length ?? 0) / totalLessons) * 100)
      : 0

    // Get recent task scores
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('score, graded_at')
      .eq('user_id', user.id)
      .not('score', 'is', null)
      .order('graded_at', { ascending: false })
      .limit(10)

    const scores = (submissions ?? []).map((s) => s.score as number)
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    if (scores.length < 2) {
      return NextResponse.json({
        projectedScore: averageScore,
        trend: 'stable',
        narrative: 'Complete more tasks to get your personalized score projection.',
        completionPercent,
      })
    }

    const projection = await generateProjection({
      courseName: course.title,
      completionPercent,
      recentScores: scores.slice(0, 5).reverse(),
      averageScore,
    })

    return NextResponse.json({ ...projection, completionPercent })
  } catch (err) {
    console.error('Score projection error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
