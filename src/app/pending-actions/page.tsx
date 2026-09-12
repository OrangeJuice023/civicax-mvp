import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { milestoneStatusLabel } from '@/lib/infrastructure/labels'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { AppShell } from '@/components/AppShell'

/**
 * Everything currently waiting on a person: milestones ready for governance
 * sign-off, milestones a validator is holding up, and projects whose
 * timeline has slipped. Every row here links to the project that needs the
 * action - this page is a work queue, not a report.
 */
export const metadata: Metadata = { title: 'Pending Actions' }

export default async function PendingActionsPage() {
  const user = await readSession()

  const [pendingApprovals, blockedOnValidation, blockedOnEvidence, delayed, pendingActionsCount] = await Promise.all([
    db.milestone.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: { project: { select: { projectId: true, name: true, status: true } } },
      orderBy: { sequence: 'asc' },
    }),
    db.milestone.findMany({
      where: { status: 'BLOCKED_ON_VALIDATION' },
      include: {
        project: { select: { projectId: true, name: true, status: true } },
        validations: { where: { required: true, status: 'PENDING' }, include: { validator: { select: { name: true } } } },
      },
      orderBy: { sequence: 'asc' },
    }),
    db.milestone.findMany({
      where: { status: 'BLOCKED_ON_EVIDENCE' },
      include: { project: { select: { projectId: true, name: true, status: true } } },
      orderBy: { sequence: 'asc' },
    }),
    db.project.findMany({
      where: { status: 'DELAYED' },
      select: { projectId: true, name: true, status: true, progress: true, delayedReason: true },
    }),
    getPendingActionsCount(),
  ])

  return (
    <AppShell user={user} active="pending actions" pendingActionsCount={pendingActionsCount}>
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Pending approvals"
            description="Milestones ready for governance sign-off."
            actions={<span className="text-xs font-medium text-ink">{pendingApprovals.length}</span>}
          />
          {pendingApprovals.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No pending approvals.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {pendingApprovals.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${m.project.projectId}`} className="font-medium text-ink hover:underline">
                      {m.project.name}
                    </Link>
                    <div className="text-[11px] text-muted">{m.name}</div>
                  </div>
                  <StatusPill status={m.status} label={milestoneStatusLabel(m.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Blocked on validation"
            description="Milestones held open by at least one outstanding validation."
            actions={<span className="text-xs font-medium text-ink">{blockedOnValidation.length}</span>}
          />
          {blockedOnValidation.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No blocked milestones.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {blockedOnValidation.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${m.project.projectId}`} className="font-medium text-ink hover:underline">
                      {m.project.name}
                    </Link>
                    <div className="text-[11px] text-muted">
                      {m.name}
                      {m.validations[0] && ` · Awaiting ${m.validations[0].validator.name}`}
                    </div>
                  </div>
                  <StatusPill status={m.status} label={milestoneStatusLabel(m.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Blocked on evidence"
            description="Milestones missing a required piece of documentary evidence."
            actions={<span className="text-xs font-medium text-ink">{blockedOnEvidence.length}</span>}
          />
          {blockedOnEvidence.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No milestones blocked on evidence.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {blockedOnEvidence.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${m.project.projectId}`} className="font-medium text-ink hover:underline">
                      {m.project.name}
                    </Link>
                    <div className="text-[11px] text-muted">{m.name}</div>
                  </div>
                  <StatusPill status={m.status} label={milestoneStatusLabel(m.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Delayed projects"
            description="Projects whose activity has slipped the configured timeline."
            actions={<span className="text-xs font-medium text-ink">{delayed.length}</span>}
          />
          {delayed.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No delayed projects.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {delayed.map((p) => (
                <li key={p.projectId} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.projectId}`} className="font-medium text-ink hover:underline">
                      {p.name}
                    </Link>
                    {p.delayedReason && <div className="text-[11px] text-muted">{p.delayedReason}</div>}
                  </div>
                  <StatusPill status="DELAYED" label="Delayed" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-hairline px-1 pt-3 text-[11px] text-muted">
        <span>All values derived from the seeded database.</span>
        <span className="inline-flex items-center gap-1.5"><ProvenanceBadge classification="SYNTHETIC_DEMO" /></span>
      </footer>
    </AppShell>
  )
}
