'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 no-print"
      style={{ backgroundColor: 'var(--brand)' }}
    >
      Download as PDF
    </button>
  )
}
