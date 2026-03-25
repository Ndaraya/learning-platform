'use client'

import { useTransition } from 'react'

interface Props {
  onDelete: () => Promise<void>
  label: string
}

export function DeleteButton({ onDelete, label }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return
    startTransition(async () => {
      await onDelete()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={`Delete ${label}`}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
