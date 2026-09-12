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
    default: 'KAWING — See how systems connect.',
    template: 'KAWING — %s',
  },
  description:
    'Kawing is a public infrastructure systems platform that connects project activity, evidence, validation, approvals, and audit history. Synthetic demonstration prototype.',
  applicationName: 'Kawing',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#07193b] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
