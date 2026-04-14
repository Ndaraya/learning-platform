import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Generate a brief explanation of why an MCQ answer is correct or incorrect.
 * Called on-demand when the student clicks "Why?" in the results view.
 */
export async function generateMCQFeedback(
  question: string,
  options: string[],
  correctAnswer: string,
  studentAnswer: string,
  isCorrect: boolean
): Promise<string> {
  const prompt = isCorrect
    ? `You are an ACT tutor. Briefly explain (1-2 sentences) why the following answer is correct.

Question: ${question}
Answer choices: ${options.join(', ')}
Correct answer: ${correctAnswer}

Explain why this answer is correct. Be concise and educational.`
    : `You are an ACT tutor. Briefly explain (1-2 sentences) why the student's answer is wrong and why the correct answer is right.

Question: ${question}
Answer choices: ${options.join(', ')}
Student's answer: ${studentAnswer}
Correct answer: ${correctAnswer}

Explain the error and the reasoning. Be concise, clear, and encouraging.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return text || 'No explanation available.'
  } catch {
    return 'Unable to generate explanation. Please review your notes or ask your tutor.'
  }
}

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
