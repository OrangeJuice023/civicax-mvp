import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

/**
 * Geist for prose and Geist Mono for figures. The mono face matters more than
 * usual here: case numbers, durations and audit hashes are scanned in columns,
 * and a proportional face makes them jitter as values change.
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'CivicaX - Government Workflow Intelligence',
    template: '%s - CivicaX',
  },
  description:
    'CivicaX v0.1 functional prototype: a workflow, interoperability and process-intelligence layer for Philippine government administrative transactions.',
  // A prototype containing synthetic records has no business being indexed.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  )
}
