import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/lib/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const PLANS = [
  {
    name: 'Free',
    price: { monthly: '$0', annual: '$0' },
    description: 'Get started with one course at no cost.',
    features: [
      'Access to 1 course',
      'Video lessons',
      'Multiple-choice quizzes',
      'Basic progress tracking',
    ],
    cta: 'Get started',
    href: '/signup',
    tier: 'free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: { monthly: '$29', annual: '$290' },
    description: 'Unlimited learning with AI-powered feedback.',
    features: [
      'Unlimited courses',
      'AI-graded written responses',
      'Score projections & insights',
      'Full progress dashboard',
      'Priority support',
    ],
    cta: 'Start Pro',
    tier: 'pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 'Custom', annual: 'Custom' },
    description: 'For organizations, schools, and government agencies.',
    features: [
      'Everything in Pro',
      'Org admin dashboard',
      'Bulk student enrollment',
      'Organization-level analytics',
      'WCAG 2.1 AA / Section 508 compliant',
      'Dedicated onboarding & support',
      'Custom invoicing',
    ],
    cta: 'Contact sales',
    href: 'mailto:sales@learnpath.com',
    tier: 'enterprise',
    highlight: false,
  },
]

const ANNUAL_SAVINGS: Record<string, string | null> = {
  free: null,
  pro: 'Save $58/yr',
  enterprise: null,
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentTier: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    currentTier = profile?.subscription_tier ?? 'free'
  }

  return (
    <main className="min-h-screen" role="main">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready. All plans include WCAG&nbsp;2.1&nbsp;AA accessibility.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 md:grid-cols-3" role="list">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier
            const savings = ANNUAL_SAVINGS[plan.tier]

            return (
              <div
                key={plan.name}
                role="listitem"
                className={`relative rounded-xl border bg-card ${
                  plan.highlight ? 'border-ring ring-2 ring-ring/20 shadow-lg' : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most popular</Badge>
                  </div>
                )}

                <CardHeader className="pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && <Badge variant="secondary">Current plan</Badge>}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price.monthly}</span>
                    {plan.price.monthly !== 'Custom' && (
                      <span className="text-muted-foreground">/mo</span>
                    )}
                    {savings && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{savings} billed annually</p>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-2" aria-label={`${plan.name} plan features`}>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Separator />

                  {isCurrent ? (
                    <Link
                      href="/api/stripe/portal"
                      className={buttonVariants({ variant: 'outline' }) + ' w-full text-center'}
                    >
                      Manage subscription
                    </Link>
                  ) : plan.href ? (
                    <Link
                      href={plan.href}
                      className={buttonVariants({ variant: plan.highlight ? 'default' : 'outline' }) + ' w-full text-center'}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <form action="/api/stripe/checkout" method="POST">
                      <input type="hidden" name="tier" value={plan.tier} />
                      <input type="hidden" name="interval" value="monthly" />
                      <button
                        type="submit"
                        className={buttonVariants({ variant: plan.highlight ? 'default' : 'outline' }) + ' w-full'}
                      >
                        {plan.cta}
                      </button>
                    </form>
                  )}
                </CardContent>
              </div>
            )
          })}
        </div>

        {/* Government / compliance note */}
        <div className="mt-12 rounded-lg border bg-muted/40 p-6 text-sm text-muted-foreground text-center">
          <p className="font-medium text-foreground mb-1">Government &amp; institutional procurement</p>
          <p>
            LearnPath meets WCAG&nbsp;2.1&nbsp;AA and Section&nbsp;508 accessibility requirements.
            We support government purchase orders, invoicing, and RFP/RFI responses.{' '}
            <a href="mailto:sales@learnpath.com" className="underline underline-offset-4 hover:text-foreground">
              Contact our team
            </a>{' '}
            for a compliance package and custom quote.
          </p>
        </div>
      </div>
    </main>
  )
}
