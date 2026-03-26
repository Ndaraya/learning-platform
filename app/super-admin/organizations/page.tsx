import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CreateOrgDialog } from '@/components/admin/CreateOrgDialog'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteOrganization } from './actions'

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, type, subscription_tier, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <CreateOrgDialog />
      </div>

      {orgs && orgs.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{org.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{org.subscription_tier}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      label={org.name}
                      onDelete={deleteOrganization.bind(null, org.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No organizations yet. Create one to get started.</p>
      )}
    </div>
  )
}
