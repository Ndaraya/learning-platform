import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: orgs } = await supabase
    .from('organizations').select('id, name, subscription_tier, stripe_customer_id')
    .not('stripe_customer_id', 'is', null)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
      <p className="text-muted-foreground">Manage organization subscriptions via Stripe.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs?.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <CardTitle className="text-base">{org.name}</CardTitle>
              <CardDescription className="capitalize">{org.subscription_tier} plan</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-mono truncate">{org.stripe_customer_id}</p>
            </CardContent>
          </Card>
        ))}
        {!orgs?.length && <p className="text-muted-foreground col-span-full">No paying organizations yet.</p>}
      </div>
    </div>
  )
}
