'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateUserRole } from '@/app/super-admin/users/actions'
import type { UserRole } from '@/lib/supabase/types'

interface Org {
  id: string
  name: string
}

type TimeAccommodation = 'standard' | 'time_and_half' | 'double'

interface Props {
  userId: string
  userName: string
  currentRole: UserRole
  currentOrgId: string | null
  currentTimeAccommodation: TimeAccommodation
  organizations: Org[]
}

export function EditUserDialog({ userId, userName, currentRole, currentOrgId, currentTimeAccommodation, organizations }: Props) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<UserRole>(currentRole)
  const [orgId, setOrgId] = useState<string>(currentOrgId ?? '')
  const [timeAccommodation, setTimeAccommodation] = useState<TimeAccommodation>(currentTimeAccommodation)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (role === 'org_admin' && !orgId) {
      setError('An organization is required for org admin role.')
      return
    }

    startTransition(async () => {
      try {
        await updateUserRole(userId, role, role === 'org_admin' ? orgId : null, timeAccommodation)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update user')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        Edit
      </DialogTrigger>
      <DialogContent aria-labelledby="edit-user-title">
        <DialogHeader>
          <DialogTitle id="edit-user-title">Edit user — {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="user-role" aria-label="User role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'org_admin' && (
            <div className="space-y-2">
              <Label htmlFor="user-org">Organization</Label>
              <Select value={orgId} onValueChange={(v) => setOrgId(v ?? '')}>
                <SelectTrigger id="user-org" aria-label="Organization">
                  <SelectValue placeholder="Select an organization…" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This user will only see students and data within this organization.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="time-accommodation">Time accommodation</Label>
            <Select value={timeAccommodation} onValueChange={(v) => setTimeAccommodation(v as TimeAccommodation)}>
              <SelectTrigger id="time-accommodation" aria-label="Time accommodation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (1×)</SelectItem>
                <SelectItem value="time_and_half">Time and a half (1.5×)</SelectItem>
                <SelectItem value="double">Double time (2×)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              For students with IEP/504 accommodations. Applies to all timed tasks.
            </p>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
