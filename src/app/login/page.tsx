import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { ROLE_LABELS } from '@/lib/domain/constants'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { KawingLockup } from '@/components/ui/logo'
import { LoginForm } from './LoginForm'

/**
 * Sign-in.
 *
 * Kawing v0.1 has one credential type (email + password against a seeded
 * User row - see src/lib/auth/session.ts) and no self-registration: every
 * account is a synthetic demo identity created by prisma/seed.ts. The three
 * roles behave differently by design (src/lib/auth/policy.ts) - an
 * oversight ADMINISTRATOR can read everything and verify the audit chain but
 * cannot validate or approve a milestone; only an OFFICER of the owning
 * office can act on a project. The identity list on this page exists so a
 * reviewer can see that distinction and pick the identity that demonstrates
 * it, rather than guessing an email address.
 */
export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next && next.startsWith('/') ? next : '/dashboard'

  const existing = await readSession()
  if (existing) redirect(target)

  const users = await db.user.findMany({
    include: { office: { select: { shortName: true, name: true } } },
    orderBy: { email: 'asc' },
  })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex justify-center">
          <KawingLockup tagline />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">Sign in to Kawing</h1>
      </div>

      <div className="rounded-lg border border-hairline bg-surface-1 p-4">
        <LoginForm
          next={target}
          demoUsers={users.map((u) => ({
            email: u.email,
            name: u.name,
            role: ROLE_LABELS[u.roleCode as keyof typeof ROLE_LABELS] ?? u.roleCode,
            office: u.office?.shortName ?? u.office?.name ?? null,
            position: u.position,
          }))}
        />
      </div>

      <div className="mt-4 flex items-center justify-center">
        <ProvenanceBadge classification="SYNTHETIC_DEMO" />
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        Kawing v0.1 · Synthetic demonstration prototype
      </p>
    </main>
  )
}
