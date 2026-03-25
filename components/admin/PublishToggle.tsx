'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { togglePublish } from '@/app/admin/courses/[courseId]/edit/actions'

interface Props {
  courseId: string
  published: boolean
}

export function PublishToggle({ courseId, published }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await togglePublish(courseId, !published)
    })
  }

  return (
    <Button
      variant={published ? 'outline' : 'default'}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      aria-busy={isPending}
      aria-pressed={published}
    >
      {isPending ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
    </Button>
  )
}
