import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// Supabase needs the service-role key for webhook writes (bypasses RLS)
async function getServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await getServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const userId   = session.metadata?.supabase_user_id ?? null
      const tier     = session.metadata?.tier ?? 'pro'
      const courseId = session.metadata?.course_id ?? null

      if (!userId) break

      await supabase.from('profiles').update({
        subscription_tier:    tier,
        subscription_status:  'active',
        subscription_id:      session.subscription as string,
        stripe_customer_id:   session.customer as string,
        ...(courseId ? { subscribed_course_id: courseId } : {}),
      }).eq('id', userId)

      // Auto-enroll in the subscribed course so they don't have to click Enroll
      if (courseId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', userId)
          .single()
        await supabase.from('enrollments').upsert(
          { user_id: userId, course_id: courseId, org_id: (profile as { org_id?: string | null } | null)?.org_id ?? null },
          { onConflict: 'user_id,course_id', ignoreDuplicates: true }
        )
      }

      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id

      if (!userId) {
        // Fall back to looking up by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer as string)
          .single()
        if (!profile) break

        await supabase.from('profiles').update({
          subscription_status: sub.status,
          subscription_tier:   sub.status === 'active' ? (sub.metadata?.tier ?? 'pro') : 'free',
        }).eq('id', profile.id)
      } else {
        await supabase.from('profiles').update({
          subscription_status: sub.status,
          subscription_tier:   sub.status === 'active' ? (sub.metadata?.tier ?? 'pro') : 'free',
        }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', sub.customer as string)
        .single()

      if (profile) {
        await supabase.from('profiles').update({
          subscription_tier:   'free',
          subscription_status: 'canceled',
          subscription_id:     null,
        }).eq('id', profile.id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase.from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', profile.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
