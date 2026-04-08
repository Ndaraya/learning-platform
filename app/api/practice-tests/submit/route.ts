import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SECTIONS = ['english', 'math', 'reading', 'science'] as const

function lookupScale(scoringTable: Record<string, Record<string, number>>, section: string, raw: number): number {
  const table = scoringTable[section]
  if (!table) return Math.max(1, Math.round((raw / 1) * 36)) // fallback
  const val = table[String(raw)]
  if (val !== undefined) return val
  // If exact raw not in table, find nearest lower key
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= raw) return table[String(keys[i])]
  }
  return 1
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { practiceTestId, courseId, responses } = body as {
      practiceTestId: string
      courseId: string
      responses: Record<string, Record<string, string>>
    }

    if (!practiceTestId || !courseId) {
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

    // Fetch test data
    const { data: test } = await supabase
      .from('practice_tests')
      .select('answer_key, scoring_table, question_counts')
      .eq('id', practiceTestId)
      .eq('published', true)
      .maybeSingle()

    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const answerKey = test.answer_key as Record<string, Record<string, string>>
    const scoringTable = test.scoring_table as Record<string, Record<string, number>>
    const questionCounts = test.question_counts as Record<string, number>

    // Score each section
    const rawScores: Record<string, number> = {}
    const scaleScores: Record<string, number | null> = {}

    for (const section of SECTIONS) {
      const key = answerKey[section] ?? {}
      const studentAnswers = responses[section] ?? {}
      const count = questionCounts[section] ?? 0
      let correct = 0
      for (let q = 1; q <= count; q++) {
        if (key[String(q)] && studentAnswers[String(q)]?.toUpperCase() === key[String(q)].toUpperCase()) {
          correct++
        }
      }
      rawScores[section] = correct
      const hasTable = scoringTable[section] && Object.keys(scoringTable[section]).length > 0
      scaleScores[section] = hasTable ? lookupScale(scoringTable, section, correct) : null
    }

    // Composite = round((E + M + R) / 3) — Science is NOT included
    const compositeInputs = ['english', 'math', 'reading']
      .map((s) => scaleScores[s])
      .filter((v): v is number => v !== null)

    const compositeScore = compositeInputs.length === 3
      ? Math.round(compositeInputs.reduce((a, b) => a + b, 0) / compositeInputs.length)
      : null

    // Insert submission
    const { data: submission, error } = await supabase
      .from('practice_test_submissions')
      .insert({
        user_id: user.id,
        practice_test_id: practiceTestId,
        english_score: scaleScores['english'] ?? null,
        math_score: scaleScores['math'] ?? null,
        reading_score: scaleScores['reading'] ?? null,
        science_score: scaleScores['science'] ?? null,
        composite_score: compositeScore,
        raw_english: rawScores['english'] ?? null,
        raw_math: rawScores['math'] ?? null,
        raw_reading: rawScores['reading'] ?? null,
        raw_science: rawScores['science'] ?? null,
        responses,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ submissionId: submission.id })
  } catch (err) {
    console.error('[practice-tests/submit]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
