import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'LearnPath — Skills training with AI-powered feedback',
    template: '%s | LearnPath',
  },
  description:
    'Project-based learning platform with video lessons, auto-graded tasks, and AI feedback. Built for individuals, organizations, and government agencies.',
  keywords: ['e-learning', 'skills training', 'AI grading', 'WCAG', 'Section 508', 'government training'],
  openGraph: {
    type: 'website',
    title: 'LearnPath',
    description: 'Project-based learning with AI-powered feedback.',
    siteName: 'LearnPath',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
