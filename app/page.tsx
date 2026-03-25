import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ── Static data ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '▶',
    title: 'Video lessons',
    description:
      'Structured courses with embedded YouTube videos, organized into modules and lessons.',
  },
  {
    icon: '✓',
    title: 'Auto-graded tasks',
    description:
      'Multiple-choice quizzes are graded instantly. Written responses are scored by Claude AI using your rubric.',
  },
  {
    icon: '📈',
    title: 'Score projections',
    description:
      'AI tracks your progress and forecasts your final score with a personalized insight each session.',
  },
  {
    icon: '🏛',
    title: 'Section 508 compliant',
    description:
      'Built to WCAG 2.1 AA and Section 508 standards from day one — ready for federal, state, and local procurement.',
  },
  {
    icon: '🏢',
    title: 'Organization management',
    description:
      'Org admins enroll cohorts, track team progress, and pull reports — without touching course content.',
  },
  {
    icon: '🔒',
    title: 'Role-based access',
    description:
      'Students, admins, org admins, and super admins each see only what they need — enforced at the database level.',
  },
]

const STEPS = [
  { n: '1', title: 'Enroll in a course', body: 'Browse the catalog and enroll in minutes. Your org admin can also add you directly.' },
  { n: '2', title: 'Watch & complete tasks', body: 'Follow the video lessons, then answer quizzes and written prompts to test your understanding.' },
  { n: '3', title: 'Get instant feedback', body: 'MCQ answers are graded immediately. Written responses get scored and commented on by AI — no waiting.' },
]

const USE_CASES = [
  { label: 'Government agencies', description: 'Meet Section 508 accessibility requirements and respond to workforce training RFPs.' },
  { label: 'Enterprise teams', description: 'Onboard employees and upskill teams with trackable, measurable outcomes.' },
  { label: 'Schools & universities', description: 'Run project-based assessments at scale with AI-assisted grading.' },
  { label: 'Individual learners', description: 'Build job-ready skills with structured courses and real feedback.' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to main content
      </a>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60" role="banner">
        <nav
          className="container mx-auto px-4 h-14 flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="font-semibold text-lg tracking-tight" aria-label="LearnPath home">
            LearnPath
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Pricing
            </Link>
            <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" role="main">

        {/* ── Hero ── */}
        <section
          className="container mx-auto px-4 py-24 text-center max-w-3xl"
          aria-labelledby="hero-heading"
        >
          <Badge variant="outline" className="mb-6">
            WCAG 2.1 AA · Section 508 compliant
          </Badge>
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6"
          >
            Skills training with{' '}
            <span className="text-primary">AI-powered feedback</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Project-based courses with video lessons, auto-graded tasks, and personalized score
            projections — built for individuals, organizations, and government agencies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: 'lg' }) + ' min-w-40'}>
              Start for free
            </Link>
            <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' min-w-40'}>
              See pricing
            </Link>
          </div>
        </section>

        <Separator />

        {/* ── Features ── */}
        <section
          className="container mx-auto px-4 py-20 max-w-5xl"
          aria-labelledby="features-heading"
        >
          <div className="text-center mb-12">
            <h2 id="features-heading" className="text-3xl font-bold tracking-tight mb-3">
              Everything you need to run effective training
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From content delivery to grading to reporting — one platform, fully accessible.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                role="listitem"
                className="rounded-xl border bg-card p-6 space-y-2"
              >
                <div className="text-2xl" aria-hidden="true">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="bg-muted/40">
          <Separator />

          {/* ── How it works ── */}
          <section
            className="container mx-auto px-4 py-20 max-w-4xl"
            aria-labelledby="how-heading"
          >
            <div className="text-center mb-12">
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight mb-3">
                How it works
              </h2>
              <p className="text-muted-foreground">Up and learning in three steps.</p>
            </div>
            <ol className="grid gap-8 sm:grid-cols-3" aria-label="Steps to get started">
              {STEPS.map((step) => (
                <li key={step.n} className="flex flex-col gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0"
                    aria-hidden="true"
                  >
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <Separator />
        </div>

        {/* ── Use cases ── */}
        <section
          className="container mx-auto px-4 py-20 max-w-5xl"
          aria-labelledby="usecases-heading"
        >
          <div className="text-center mb-12">
            <h2 id="usecases-heading" className="text-3xl font-bold tracking-tight mb-3">
              Built for every type of learner
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you&apos;re an individual upskilling or an agency running a workforce program,
              LearnPath fits your workflow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2" role="list">
            {USE_CASES.map((uc) => (
              <div
                key={uc.label}
                role="listitem"
                className="rounded-xl border bg-card p-6 flex gap-4"
              >
                <div className="w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold mb-1">{uc.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Accessibility callout ── */}
        <div className="bg-muted/40">
          <Separator />
          <section
            className="container mx-auto px-4 py-16 max-w-3xl text-center"
            aria-labelledby="a11y-heading"
          >
            <h2 id="a11y-heading" className="text-2xl font-bold tracking-tight mb-3">
              Accessibility-first, from the ground up
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              LearnPath is designed to meet <strong>WCAG 2.1 AA</strong> and{' '}
              <strong>Section 508</strong> requirements — including screen reader support, keyboard
              navigation, Braille display compatibility, and color-contrast ratios that exceed
              minimum thresholds. Suitable for federal, state, and local government procurement.
            </p>
            <Link href="/pricing" className={buttonVariants({ variant: 'outline' })}>
              Request a compliance package
            </Link>
          </section>
          <Separator />
        </div>

        {/* ── CTA ── */}
        <section
          className="container mx-auto px-4 py-24 max-w-xl text-center"
          aria-labelledby="cta-heading"
        >
          <h2 id="cta-heading" className="text-3xl font-bold tracking-tight mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Free to try. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: 'lg' }) + ' min-w-40'}>
              Create free account
            </Link>
            <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' min-w-40'}>
              View plans
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t py-8" role="contentinfo">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LearnPath. All rights reserved.</p>
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-4 list-none">
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
              <li><a href="mailto:sales@learnpath.com" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  )
}
