'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'

export type DemoUser = {
  email: string
  name: string
  role: string
  office: string | null
  position: string | null
}

/**
 * The sign-in form plus the "demo identities" picker, as one client
 * component so picking an identity can fill the email field and hand focus
 * to the password box. Real submission still goes through /api/auth/login -
 * the picker only saves typing the address, it never signs anyone in on its
 * own.
 */
export function LoginForm({ next, demoUsers }: { next: string; demoUsers: DemoUser[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Sign in failed.')
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Sign in failed. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-hairline bg-surface-1 px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-secondary">
            Password
          </label>
          <input
            id="password"
            ref={passwordRef}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-hairline bg-surface-1 px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
        {error && (
          <p role="alert" className="rounded border border-critical bg-critical-subtle px-3 py-2 text-xs text-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full rounded bg-ink px-3 py-2 text-sm font-medium text-ink-inverse',
            'hover:opacity-90',
            loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="border-t border-hairline pt-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Demo identities</h2>
        <p className="mb-3 text-[11px] text-muted">
          Every seeded account shares the demo password{' '}
          <code className="rounded bg-surface-2 px-1">DemoPass123!</code>. Pick one to fill the email field.
        </p>
        <ul className="space-y-1.5">
          {demoUsers.map((u) => (
            <li key={u.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(u.email)
                  passwordRef.current?.focus()
                }}
                className="flex w-full items-center justify-between gap-2 rounded border border-hairline bg-surface-1 px-3 py-2 text-left text-xs hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{u.name}</span>
                  <span className="block truncate text-muted">
                    {u.role}
                    {u.office ? ` · ${u.office}` : ''}
                    {u.position ? ` · ${u.position}` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted">{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
