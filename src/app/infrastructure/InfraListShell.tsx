import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * Minimal shell for the infrastructure section while the shared AppShell is
 * being introduced. Deliberately flat: no sidebar, no header bar, just a
 * constrained width with a back link and a heading slot.
 *
 * This exists only so the infrastructure pages can be built and reviewed
 * before the layout migration lands. It is the single place that sets the
 * page chrome for the section, so swapping it for the real AppShell later
 * is a one-file change.
 */
export function InfraListShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <nav className="mb-4">
        <Link
          href="/infrastructure"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary',
            'hover:text-ink hover:underline',
          )}
        >
          ← Infrastructure
        </Link>
      </nav>
      <div className="space-y-4">{children}</div>
    </main>
  )
}