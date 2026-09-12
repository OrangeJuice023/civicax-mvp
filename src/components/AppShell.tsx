'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Building2,
  Clock,
  Users,
  FileText,
  Settings,
  Menu,
  X,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { KawingLockup } from '@/components/ui/logo'
import type { SessionUser } from '@/lib/auth/session'

/**
 * The Kawing application shell.
 *
 * Navy brand rail on the left, light workspace on the right - the shape the
 * brand kit's dashboard uses. Every entry in NAV points at a route that
 * exists and works; there is deliberately no "Reports" item, because there is
 * no reporting feature behind it yet and a nav item that goes nowhere is
 * worse than a shorter menu.
 */
const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Building2 },
  { href: '/pending-actions', label: 'Pending Actions', icon: Clock },
  { href: '/validators', label: 'Validators', icon: Users },
  { href: '/audit', label: 'Audit Ledger', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell({
  children,
  user,
  active,
  pendingActionsCount,
}: {
  children: ReactNode
  user: SessionUser | null
  active?: string
  /** Live count for the "Pending Actions" badge - always derived from the database by the calling page, never hard-coded. */
  pendingActionsCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')

  // The drawer closes from the link that navigated (see onClick below) rather
  // than from an effect watching the pathname - same result, no cascading
  // render.
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/projects?q=${encodeURIComponent(q)}` : '/projects')
  }

  function isActive(item: (typeof NAV)[number]) {
    return active === item.label.toLowerCase() || pathname === item.href
  }

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Primary">
      {NAV.map((item) => {
        const current = isActive(item)
        const Icon = item.icon
        const showBadge =
          item.href === '/pending-actions' && typeof pendingActionsCount === 'number' && pendingActionsCount > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
              current ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
            )}
          >
            {current && (
              <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-teal" />
            )}
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{item.label}</span>
            {showBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1.5 text-[10px] font-semibold text-brand-navy">
                {pendingActionsCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const rail = (
    <>
      <div className="px-4 pt-4">
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="block rounded-md focus-visible:outline-none"
        >
          <KawingLockup tagline onDark />
        </Link>
      </div>
      {nav}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/40">Organization</div>
        <div className="mt-0.5 truncate text-xs font-medium text-white/80">
          {user?.officeName ?? 'City Oversight'}
        </div>
        <div className="mt-3 text-[10px] leading-relaxed text-white/40">
          Kawing v0.1 · Synthetic demonstration data. Tamper-evident audit ledger, not a production blockchain
          network.
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Brand rail - desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-navy lg:flex">{rail}</aside>

      {/* Brand rail - mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-brand-navy/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-brand-navy shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-2 rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
            {rail}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface-1 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="rounded p-1.5 text-ink-secondary hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <form onSubmit={onSearch} className="relative min-w-0 flex-1 sm:max-w-sm" role="search">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <label htmlFor="global-search" className="sr-only">
              Search projects
            </label>
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-md border border-hairline bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <ProvenanceBadge classification="SYNTHETIC_DEMO" />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-medium leading-tight text-ink">{user.name}</div>
                  <div className="text-[10px] leading-tight text-muted">{user.officeName ?? user.role}</div>
                </div>
                <div
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white"
                >
                  {user.name.charAt(0)}
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="rounded-md border border-hairline px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname ?? '/dashboard')}`}
                className="rounded-md border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
