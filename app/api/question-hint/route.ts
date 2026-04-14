import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionId } = await request.json() as { questionId: string }
    if (!questionId) return NextResponse.json({ error: 'Missing questionId' }, { status: 400 })

    const { data: question } = await supabase
      .from('questions')
      .select('prompt, options, type, hint')
      .eq('id', questionId)
      .single()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    // Return cached hint if available
    if (question.hint) return NextResponse.json({ hint: question.hint })

    const optionsList = question.type === 'mcq' && question.options
      ? `\nAnswer choices: ${(question.options as string[]).join(', ')}`
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are an ACT tutor helping a high school student who is stuck. Give a brief hint (1-2 sentences) that helps them think through this question WITHOUT revealing the answer. Guide their reasoning strategy, not the solution.

Question: ${question.prompt}${optionsList}

Provide only the hint — no preamble or labels.`,
      }],
    })

    const hint = message.content[0].type === 'text' ? message.content[0].text.trim() : 'Think carefully about what the question is asking and eliminate answers you know are wrong.'

    // Cache the hint on the question record for future requests
    await supabase
      .from('questions')
      .update({ hint })
      .eq('id', questionId)

    return NextResponse.json({ hint })
  } catch (err) {
    console.error('Question hint error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
