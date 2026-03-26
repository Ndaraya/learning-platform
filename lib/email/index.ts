import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'LearnPath <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Shared styles ─────────────────────────────────────────────────────────────
const brand = '#007053'
const baseStyle = `font-family: Inter, -apple-system, sans-serif; color: #111827; line-height: 1.6;`
const btnStyle = `display: inline-block; background: ${brand}; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;`
const cardStyle = `background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; max-width: 560px; margin: 0 auto;`

function wrap(body: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="background: #f9fafb; padding: 40px 16px; ${baseStyle}">
      <div style="${cardStyle}">
        <div style="margin-bottom: 24px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: ${brand}; border-radius: 8px; color: white; font-weight: 700; font-size: 16px;">LP</div>
        </div>
        ${body}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          LearnPath · You're receiving this because you have an account at
          <a href="${APP_URL}" style="color: ${brand};">${APP_URL.replace(/https?:\/\//, '')}</a>
        </p>
      </div>
    </body>
    </html>
  `
}

// ── Send helpers ──────────────────────────────────────────────────────────────

export async function sendEnrollmentEmail(
  to: string,
  name: string,
  courseTitle: string,
  courseId: string
) {
  if (!process.env.RESEND_API_KEY) return

  const courseUrl = `${APP_URL}/courses/${courseId}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You're enrolled in ${courseTitle}`,
    html: wrap(`
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">You're enrolled! 🎉</h1>
      <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, welcome to <strong>${courseTitle}</strong>. You can start at any time — it's completely self-paced.</p>
      <a href="${courseUrl}" style="${btnStyle}">Start learning →</a>
      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
        Complete all lessons to earn your certificate of completion.
      </p>
    `),
  })
}

export async function sendTaskFeedbackEmail(
  to: string,
  name: string,
  taskTitle: string,
  score: number,
  courseId: string,
  lessonId: string,
  taskId: string
) {
  if (!process.env.RESEND_API_KEY) return

  const taskUrl = `${APP_URL}/courses/${courseId}/lessons/${lessonId}/tasks/${taskId}`
  const scoreColor = score >= 80 ? '#15803d' : score >= 60 ? '#b45309' : '#b91c1c'
  const scoreLabel = score >= 80 ? 'Great work!' : score >= 60 ? 'Good effort — keep going.' : 'Keep practicing — you\'ve got this.'

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your score for "${taskTitle}"`,
    html: wrap(`
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Task graded ✓</h1>
      <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, your submission for <strong>${taskTitle}</strong> has been graded.</p>
      <div style="text-align: center; padding: 24px; background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <p style="font-size: 48px; font-weight: 700; color: ${scoreColor}; margin: 0;">${score}%</p>
        <p style="color: #6b7280; margin: 8px 0 0; font-size: 14px;">${scoreLabel}</p>
      </div>
      <a href="${taskUrl}" style="${btnStyle}">View feedback →</a>
    `),
  })
}

export async function sendCourseCompletionEmail(
  to: string,
  name: string,
  courseTitle: string,
  courseId: string
) {
  if (!process.env.RESEND_API_KEY) return

  const certUrl = `${APP_URL}/courses/${courseId}/certificate`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You completed ${courseTitle} 🎓`,
    html: wrap(`
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Course complete! 🎓</h1>
      <p style="color: #6b7280; margin: 0 0 24px;">
        Congratulations, ${name}! You've completed all lessons in <strong>${courseTitle}</strong>.
        Your certificate of completion is ready.
      </p>
      <a href="${certUrl}" style="${btnStyle}">View your certificate →</a>
      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
        You can download your certificate as a PDF to add to your resume or LinkedIn profile.
      </p>
    `),
  })
}
