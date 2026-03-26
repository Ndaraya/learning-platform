'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/supabase/types'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile?.role as UserRole) !== 'super_admin') throw new Error('Unauthorized')
}

export async function createOrganization(
  name: string,
  type: string,
  subscriptionTier: 'free' | 'pro' | 'enterprise'
) {
  await verifySuperAdmin()

  const { error } = await adminClient()
    .from('organizations')
    .insert({ name, type, subscription_tier: subscriptionTier })

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/organizations')
}

export async function deleteOrganization(orgId: string) {
  await verifySuperAdmin()

  const { error } = await adminClient()
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/organizations')
}
