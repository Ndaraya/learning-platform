import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    annual:  process.env.STRIPE_PRO_ANNUAL_PRICE_ID  ?? '',
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const formData = await request.formData()
  const tier     = formData.get('tier')?.toString() ?? 'pro'
  const interval = formData.get('interval')?.toString() ?? 'monthly'

  const priceId = PRICE_IDS[tier]?.[interval]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, display_name')
    .eq('id', user.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  console.log('[checkout] priceId:', priceId, 'appUrl:', appUrl, 'user:', user.id)

  let session
  try {
    // Re-use existing Stripe customer or create one
    let customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? '',
        name:  (profile as { display_name?: string | null } | null)?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      console.log('[checkout] created customer:', customerId)

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url:  `${appUrl}/pricing`,
      metadata: { supabase_user_id: user.id, tier },
      subscription_data: {
        metadata: { supabase_user_id: user.id, tier },
      },
      allow_promotion_codes: true,
    })
    console.log('[checkout] session created:', session.id, 'url:', session.url)
  } catch (err) {
    console.error('[checkout] error:', err)
    return NextResponse.redirect(new URL(`/pricing?error=checkout_failed`, request.url))
  }

  return NextResponse.redirect(new URL(session.url!))
}
