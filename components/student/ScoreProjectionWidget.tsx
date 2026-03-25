'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectionData {
  projectedScore: number
  trend: 'improving' | 'stable' | 'declining'
  narrative: string
  completionPercent: number
}

const TREND_CONFIG = {
  improving: { label: 'Improving', className: 'text-green-700 dark:text-green-400', arrow: '↑' },
  stable:    { label: 'Stable',    className: 'text-muted-foreground',              arrow: '→' },
  declining: { label: 'Declining', className: 'text-red-600 dark:text-red-400',     arrow: '↓' },
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading score projection">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

interface Props {
  courseId: string
  courseName: string
}

export function ScoreProjectionWidget({ courseId, courseName }: Props) {
  const [data, setData] = useState<ProjectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/score-projection?courseId=${courseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json as ProjectionData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId])

  const scoreColor =
    !data ? '' :
    data.projectedScore >= 80 ? 'text-green-600 dark:text-green-400' :
    data.projectedScore >= 60 ? 'text-yellow-600 dark:text-yellow-500' :
    'text-red-600 dark:text-red-400'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate" title={courseName}>
          {courseName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <LoadingSkeleton />}

        {error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && data && (
          <>
            {/* Score + trend */}
            <div className="flex items-end gap-3">
              <div>
                <span
                  className={`text-4xl font-bold tabular-nums ${scoreColor}`}
                  aria-label={`Projected score: ${data.projectedScore} percent`}
                >
                  {data.projectedScore}
                </span>
                <span className="text-lg text-muted-foreground">%</span>
                <p className="text-xs text-muted-foreground mt-0.5">projected final score</p>
              </div>
              <div className="mb-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${TREND_CONFIG[data.trend].className}`}
                  aria-label={`Trend: ${TREND_CONFIG[data.trend].label}`}
                >
                  {TREND_CONFIG[data.trend].arrow} {TREND_CONFIG[data.trend].label}
                </Badge>
              </div>
            </div>

            {/* Course completion */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Course progress</span>
                <span>{data.completionPercent}%</span>
              </div>
              <Progress
                value={data.completionPercent}
                aria-label={`Course ${data.completionPercent}% complete`}
              />
            </div>

            {/* Claude narrative */}
            {data.narrative && (
              <p
                className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3"
                aria-label="AI-generated progress insight"
              >
                {data.narrative}
              </p>
            )}
          </>
        )}

        {!loading && !error && !data && (
          <p className="text-sm text-muted-foreground">
            Complete your first task to see your score projection.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
