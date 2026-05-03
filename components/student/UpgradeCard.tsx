import Link from 'next/link'

interface Props {
  courseId: string
  courseTitle: string
}

export function UpgradeCard({ courseId, courseTitle }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-sm text-gray-900">Pro access required</p>
        <p className="text-xs text-gray-500 mt-1">
          {courseTitle} is included in the Pro plan.
        </p>
      </div>

      <form action="/api/stripe/checkout" method="post">
        <input type="hidden" name="tier" value="pro" />
        <input type="hidden" name="interval" value="monthly" />
        <input type="hidden" name="courseId" value={courseId} />
        <button
          type="submit"
          className="w-full rounded-lg py-2 px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Get Pro — $29 / mo
        </button>
      </form>

      <form action="/api/stripe/checkout" method="post">
        <input type="hidden" name="tier" value="pro" />
        <input type="hidden" name="interval" value="annual" />
        <input type="hidden" name="courseId" value={courseId} />
        <button
          type="submit"
          className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Get Pro — $290 / yr{' '}
          <span className="text-xs font-normal text-green-600">Save $58</span>
        </button>
      </form>

      <p className="text-xs text-center">
        <Link href="/pricing" className="text-gray-400 hover:text-gray-600 underline underline-offset-2">
          See full plan details
        </Link>
      </p>
    </div>
  )
}
