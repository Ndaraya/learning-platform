import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ProjectionData {
  projectedScore: number    // 0–100 estimate at course completion
  trend: 'improving' | 'stable' | 'declining'
  narrative: string         // Claude-generated insight paragraph
}

/**
 * Generate a score projection for a student based on their submission history.
 */
export async function generateProjection(params: {
  courseName: string
  completionPercent: number      // 0–100
  recentScores: number[]         // last N task scores (0–100 each)
  averageScore: number           // overall average so far
}): Promise<ProjectionData> {
  const { courseName, completionPercent, recentScores, averageScore } = params

  // Calculate trend from recent scores
  const trend: ProjectionData['trend'] =
    recentScores.length < 2
      ? 'stable'
      : recentScores[recentScores.length - 1] > recentScores[0]
      ? 'improving'
      : recentScores[recentScores.length - 1] < recentScores[0]
      ? 'declining'
      : 'stable'

  // Simple projection: weighted average trending toward trend direction
  const trendAdjustment = trend === 'improving' ? 5 : trend === 'declining' ? -5 : 0
  const projectedScore = Math.min(100, Math.max(0, Math.round(averageScore + trendAdjustment)))

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Write a 2–3 sentence personalized learning insight for a student. Be encouraging and specific. Do not use lists or headers — plain prose only.

Course: ${courseName}
Progress: ${completionPercent}% complete
Current average score: ${averageScore}%
Recent scores: ${recentScores.join(', ')}%
Score trend: ${trend}
Projected final score: ${projectedScore}%

Keep it concise and motivating.`,
      },
    ],
  })

  const narrative =
    message.content[0].type === 'text'
      ? message.content[0].text
      : 'Keep up the great work — your progress is on track!'

  return { projectedScore, trend, narrative }
}
