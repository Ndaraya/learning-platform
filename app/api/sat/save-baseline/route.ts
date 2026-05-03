import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { courseId, readingWriting, math, total, source } = body

  if (!courseId || !source) {
    return NextResponse.json({ error: 'courseId and source are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('sat_baselines')
    .upsert(
      {
        user_id: user.id,
        course_id: courseId,
        reading_writing_score: readingWriting ?? null,
        math_score: math ?? null,
        total_score: total ?? null,
        source,
      },
      { onConflict: 'user_id,course_id' }
    )

  if (error) {
    console.error('sat save-baseline error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
