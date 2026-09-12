'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { KawingLockup } from '@/components/ui/logo'
import type { SessionUser } from '@/lib/auth/session'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/pending-actions', label: 'Pending Actions' },
  { href: '/validators', label: 'Validators' },
  { href: '/audit', label: 'Audit Ledger' },
  { href: '/settings', label: 'Settings' },
]

export function DashboardShell({
  children,
  user,
  active,
  pendingActionsCount,
}: {
  children: ReactNode
  user: SessionUser | null
  active?: string
  /** Live count for the "Pending Actions" nav badge - always derived from the database by the calling page, never hard-coded. */
  pendingActionsCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-hairline bg-surface-1">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <KawingLockup tagline />
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted sm:inline">Synthetic Demo Data</span>
            <ProvenanceBadge classification="SYNTHETIC_DEMO" />
            {user ? (
              <div className="ml-2 flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-medium text-ink">{user.name}</div>
                  <div className="text-[10px] text-muted">{user.officeName ?? user.role}</div>
                </div>
                <div
                  title={user.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium text-ink-secondary"
                >
                  {user.name.charAt(0)}
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="rounded border border-hairline px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname ?? '/dashboard')}`}
                className="ml-2 rounded border border-hairline px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 sm:px-6">
          {NAV.map((item) => {
            const isActive = active === item.label.toLowerCase() || pathname === item.href
            const showBadge = item.href === '/pending-actions' && typeof pendingActionsCount === 'number' && pendingActionsCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium',
                  isActive ? 'text-ink' : 'text-ink-secondary hover:text-ink',
                )}
              >
                {item.label}
                {showBadge && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
                    {pendingActionsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-hairline px-4 py-3 text-center text-[11px] text-muted">
        Kawing v0.1 · Synthetic demonstration prototype · Tamper-evident audit ledger, not a production blockchain network
      </footer>
    </div>
  )
}
