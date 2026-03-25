import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const formData = await request.formData()
  const courseId = formData.get('courseId')?.toString()

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // Verify the course exists and is published
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('published', true)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found or not available' }, { status: 404 })
  }

  // Get the user's org_id to attach to the enrollment
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  // Upsert — safe to call multiple times (no duplicate enrollments)
  const { error } = await supabase
    .from('enrollments')
    .upsert(
      { user_id: user.id, course_id: courseId, org_id: profile?.org_id ?? null },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL(`/courses/${courseId}`, request.url))
}
