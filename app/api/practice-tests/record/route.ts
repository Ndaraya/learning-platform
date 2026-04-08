import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { courseId, english, math, reading, science, composite } = body as {
      courseId: string
      english: number
      math: number
      reading: number
      science: number
      composite: number | null
    }

    if (!courseId || !english || !math || !reading || !science) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

    // Find a "manual record" practice test for this course, or use null practice_test_id
    // We insert with responses = {} and no practice_test_id link.
    // Instead, we look for any published test for this course to associate with.
    const { data: anyTest } = await supabase
      .from('practice_tests')
      .select('id')
      .eq('course_id', courseId)
      .eq('published', true)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    // We need a practice_test_id — if none exists, we can't save via submissions table.
    // The record endpoint creates a "manual" submission without a real test.
    // To support this properly, we store it as an act_baselines update instead if no test exists.
    if (!anyTest) {
      // Fall back: update act_baselines with the scores
      await supabase.from('act_baselines').upsert({
        user_id: user.id,
        course_id: courseId,
        english_score: english,
        math_score: math,
        reading_score: reading,
        science_score: science,
        composite_score: composite,
        source: 'manual',
      }, { onConflict: 'user_id,course_id' })
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase.from('practice_test_submissions').insert({
      user_id: user.id,
      practice_test_id: anyTest.id,
      english_score: english,
      math_score: math,
      reading_score: reading,
      science_score: science,
      composite_score: composite,
      raw_english: null,
      raw_math: null,
      raw_reading: null,
      raw_science: null,
      responses: {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[practice-tests/record]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
