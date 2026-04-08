import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EditUserDialog } from '@/components/admin/EditUserDialog'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_VARIANTS: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default', admin: 'secondary', org_admin: 'outline', student: 'outline',
}

export default async function UsersPage() {
  const supabase = await createClient()

  const [{ data: users }, { data: orgs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, role, org_id, time_accommodation, created_at, organizations(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('id, name')
      .order('name'),
  ])

  const organizations = (orgs ?? []) as Array<{ id: string; name: string }>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">All Users</h1>
      {users && users.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const org = u.organizations as unknown as { name: string } | null
                const role = u.role as UserRole
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[role]} className="capitalize">
                        {role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <EditUserDialog
                        userId={u.id}
                        userName={u.display_name ?? u.email}
                        currentRole={role}
                        currentOrgId={u.org_id ?? null}
                        currentTimeAccommodation={(u.time_accommodation as 'standard' | 'time_and_half' | 'double') ?? 'standard'}
                        organizations={organizations}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No users yet.</p>
      )}
    </div>
  )
}
