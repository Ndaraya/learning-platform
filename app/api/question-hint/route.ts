import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questionId } = await request.json() as { questionId: string }
    if (!questionId) return NextResponse.json({ error: 'Missing questionId' }, { status: 400 })

    const { data: question } = await supabase
      .from('questions')
      .select('hint')
      .eq('id', questionId)
      .single()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const hint = question.hint ?? 'No hint available for this question.'
    return NextResponse.json({ hint })
  } catch (err) {
    console.error('Question hint error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
