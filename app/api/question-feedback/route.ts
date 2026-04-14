import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMCQFeedback } from '@/lib/claude/grader'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionId, studentAnswer } = await request.json() as {
      questionId: string
      studentAnswer: string
    }

    if (!questionId || studentAnswer === undefined) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { data: question } = await supabase
      .from('questions')
      .select('prompt, options, correct_answer, type')
      .eq('id', questionId)
      .single()

    if (!question || question.type !== 'mcq') {
      return NextResponse.json({ error: 'Question not found or not MCQ' }, { status: 404 })
    }

    const isCorrect = studentAnswer === question.correct_answer
    const feedback = await generateMCQFeedback(
      question.prompt,
      (question.options as string[]) ?? [],
      question.correct_answer ?? '',
      studentAnswer,
      isCorrect
    )

    return NextResponse.json({ feedback })
  } catch (err) {
    console.error('Question feedback error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
