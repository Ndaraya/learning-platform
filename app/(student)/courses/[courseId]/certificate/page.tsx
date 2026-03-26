import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PrintButton } from '@/components/student/PrintButton'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function CertificatePage({ params }: Props) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, enrolled_at')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) redirect(`/courses/${courseId}`)

  const [{ data: course }, { data: profile }, { data: allLessons }, { data: completedLessons }] =
    await Promise.all([
      supabase.from('courses').select('title, description').eq('id', courseId).single(),
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase
        .from('lessons')
        .select('id, modules!inner(course_id)')
        .eq('modules.course_id', courseId),
      supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true),
    ])

  if (!course) notFound()

  const totalLessons = (allLessons ?? []).length
  const completedSet = new Set((completedLessons ?? []).map((l) => l.lesson_id))
  const completedCount = (allLessons ?? []).filter((l) => completedSet.has(l.id)).length
  const isComplete = totalLessons > 0 && completedCount >= totalLessons

  if (!isComplete) redirect(`/courses/${courseId}`)

  const studentName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Student'
  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  // Deterministic certificate ID from user + course IDs
  const certId = `LP-${user.id.slice(0, 6).toUpperCase()}-${courseId.slice(0, 6).toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">

      {/* Controls — hidden on print */}
      <div className="flex items-center gap-4 mb-8 no-print">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to course
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div
        className="bg-white w-full max-w-3xl certificate-page"
        style={{
          border: '2px solid #e5e7eb',
          borderRadius: '16px',
          padding: '64px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        }}
      >
        {/* Inner border */}
        <div
          style={{
            border: '4px solid var(--brand)',
            borderRadius: '8px',
            padding: '48px',
            position: 'relative',
          }}
        >
          {/* Corner accents */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
            <div
              key={pos}
              className={`absolute ${pos} w-6 h-6`}
              style={{ backgroundColor: 'var(--brand)', opacity: 0.15, borderRadius: '2px' }}
              aria-hidden="true"
            />
          ))}

          {/* Header */}
          <div className="text-center space-y-2 mb-10">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-white font-bold text-2xl mb-4"
              style={{ backgroundColor: 'var(--brand)' }}
              aria-label="LearnPath"
            >
              LP
            </div>
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--brand)' }}
            >
              LearnPath
            </p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Certificate of Completion
            </h1>
          </div>

          {/* Body */}
          <div className="text-center space-y-6">
            <p className="text-gray-500 text-sm">This certifies that</p>
            <p
              className="text-4xl font-bold"
              style={{ color: 'var(--brand)', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}
            >
              {studentName}
            </p>
            <p className="text-gray-500 text-sm">has successfully completed</p>
            <p className="text-2xl font-semibold text-gray-900">{course.title}</p>
            {course.description && (
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 flex items-end justify-between">
            <div className="text-center">
              <div
                className="w-40 border-b-2 mb-1"
                style={{ borderColor: 'var(--brand)' }}
                aria-hidden="true"
              />
              <p className="text-xs text-gray-500">Date of Completion</p>
              <p className="text-sm font-medium text-gray-700">{completionDate}</p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: 'var(--brand)', opacity: 0.1 }}
                aria-hidden="true"
              />
              <p className="text-xs text-gray-400">Certificate ID</p>
              <p className="text-xs font-mono text-gray-500">{certId}</p>
            </div>

            <div className="text-center">
              <div
                className="w-40 border-b-2 mb-1"
                style={{ borderColor: 'var(--brand)' }}
                aria-hidden="true"
              />
              <p className="text-xs text-gray-500">Issued by</p>
              <p className="text-sm font-medium text-gray-700">LearnPath</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
