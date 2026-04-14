import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionId, studentAnswer, taskId } = await request.json() as {
      questionId: string
      studentAnswer: string
      taskId: string
    }

    if (!questionId || !taskId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Server-side verify: student has at least 3 failed attempts on this question
    const { data: failedResponses } = await supabase
      .from('question_responses')
      .select('id, score, max_score, task_submissions!inner(user_id, task_id)')
      .eq('question_id', questionId)
      .eq('task_submissions.user_id', user.id)
      .eq('task_submissions.task_id', taskId)

    const failCount = (failedResponses ?? []).filter((r) => (r.score ?? 0) < r.max_score).length
    if (failCount < 2) {
      return NextResponse.json({ error: 'Not enough attempts' }, { status: 403 })
    }

    const { data: question } = await supabase
      .from('questions')
      .select('prompt, options, correct_answer, type, grading_rubric')
      .eq('id', questionId)
      .single()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    // Use the author-written explanation if available — no API call needed
    if (question.grading_rubric) {
      return NextResponse.json({ explanation: question.grading_rubric })
    }

    const optionsList = question.type === 'mcq' && question.options
      ? `\nAnswer choices:\n${(question.options as string[]).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
      : ''

    const studentAnswerLine = studentAnswer
      ? `\nStudent's latest answer: ${studentAnswer}`
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a patient ACT tutor. A student has attempted this question multiple times and is still struggling. Walk them through it step by step.

Question: ${question.prompt}${optionsList}${studentAnswerLine}
Correct answer: ${question.correct_answer ?? '(see explanation)'}

Please:
1. Explain what the question is asking in plain terms
2. Briefly explain why the wrong answer choices don't work
3. Explain clearly why the correct answer is right
4. Give a short tip for recognizing similar questions on the ACT

Use simple, encouraging language for a high school student. Be thorough but not overwhelming.`,
      }],
    })

    const explanation = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : 'Unable to generate explanation. Please review your notes or ask your tutor.'

    return NextResponse.json({ explanation })
  } catch (err) {
    console.error('Question explanation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
