'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/supabase/types'

// Use service role to bypass RLS for privileged profile updates
function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  orgId: string | null
) {
  // Verify caller is super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') throw new Error('Unauthorized')

  const { error } = await adminClient()
    .from('profiles')
    .update({
      role,
      org_id: orgId || null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/users')
}
