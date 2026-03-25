import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: orgs } = await supabase
    .from('organizations').select('id, name, type, subscription_tier, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
      {orgs && orgs.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Plan</TableHead><TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{org.type}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{org.subscription_tier}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No organizations yet.</p>
      )}
    </div>
  )
}
