import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface GradeResult {
  score: number        // 0–100
  feedback: string     // Shown to student
}

/**
 * Grade a written response using a rubric defined by the course admin.
 * Returns a score (0–100) and personalized feedback.
 */
export async function gradeWrittenResponse(
  question: string,
  rubric: string,
  studentAnswer: string,
  maxPoints: number
): Promise<GradeResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are grading a student's written response. Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.

Question: ${question}

Grading Rubric: ${rubric}

Student Answer: ${studentAnswer}

Score the response from 0 to ${maxPoints} based strictly on the rubric. Provide brief, constructive feedback (1–2 sentences).

Respond with this exact JSON format:
{"score": <number>, "feedback": "<string>"}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const parsed = JSON.parse(raw)
    const score = Math.min(Math.max(Math.round(parsed.score), 0), maxPoints)
    const normalizedScore = Math.round((score / maxPoints) * 100)
    return { score: normalizedScore, feedback: parsed.feedback ?? '' }
  } catch {
    return { score: 0, feedback: 'Unable to grade response automatically. Please contact your instructor.' }
  }
}
