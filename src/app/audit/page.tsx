import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/policy'
import { verifyProjectAuditChain } from '@/lib/audit'
import { Card, CardHeader } from '@/components/ui/primitives'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { DashboardShell } from '../dashboard/DashboardShell'
import { AuditLedgerClient, type LedgerRow } from './AuditLedgerClient'

const LEDGER_PAGE_SIZE = 200

function parseMilestoneCode(metadataJson: string | null): string | null {
  if (!metadataJson) return null
  try {
    const parsed = JSON.parse(metadataJson) as Record<string, unknown>
    return typeof parsed.milestoneCode === 'string' ? parsed.milestoneCode : null
  } catch {
    return null
  }
}

export const metadata: Metadata = { title: 'Audit Ledger' }

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectFilter } = await searchParams
  const user = await readSession()
  const decision = can(user, 'audit:verify')
  const pendingActionsCount = await getPendingActionsCount()

  if (!decision.allowed) {
    return (
      <DashboardShell user={user} active="audit ledger" pendingActionsCount={pendingActionsCount}>
        <Card>
          <CardHeader title="Audit ledger" description="Tamper-evident record of project lifecycle events." />
          <div className="space-y-3 p-4 text-sm text-ink-secondary">
            <p>{decision.reason}</p>
            {!user && (
              <Link href="/login?next=/audit" className="font-medium text-ink underline">
                Sign in as an administrator to view the audit ledger →
              </Link>
            )}
          </div>
        </Card>
      </DashboardShell>
    )
  }

  const events = await db.caseEvent.findMany({
    where: { projectId: { not: null } },
    select: {
      id: true,
      projectId: true,
      sequence: true,
      type: true,
      actorRole: true,
      actorLabel: true,
      occurredAt: true,
      metadataJson: true,
      project: { select: { projectId: true, name: true } },
      auditRecord: { select: { hash: true, sequence: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: LEDGER_PAGE_SIZE,
  })

  const rows: LedgerRow[] = events
    .filter((e) => e.project)
    .map((e) => ({
      id: e.id,
      sequence: e.auditRecord?.sequence ?? e.sequence,
      // The internal Project.id (cuid) - what CaseEvent.projectId actually
      // stores, and what the verify endpoint expects. Kept distinct from the
      // human-readable projectId below, which is what search/display use.
      projectInternalId: e.projectId!,
      projectId: e.project!.projectId,
      projectName: e.project!.name,
      milestoneCode: parseMilestoneCode(e.metadataJson),
      type: e.type,
      actorLabel: e.actorLabel,
      occurredAt: e.occurredAt.toISOString(),
      hash: e.auditRecord?.hash ?? null,
    }))

  // Aggregate chain integrity across every project - cheap at this scale
  // (18 projects) and honest: a single "verified" badge for the whole ledger
  // would hide a break in any one project's chain.
  const allProjects = await db.project.findMany({ select: { id: true, projectId: true } })
  const verifications = await Promise.all(allProjects.map((p) => verifyProjectAuditChain(p.id)))
  const verifiedCount = verifications.filter((v) => v.valid).length
  const totalRecords = verifications.reduce((sum, v) => sum + v.recordCount, 0)
  const broken = allProjects
    .map((p, i) => ({ p, v: verifications[i] }))
    .filter(({ v }) => !v.valid)

  return (
    <DashboardShell user={user} active="audit ledger" pendingActionsCount={pendingActionsCount}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Audit ledger"
              description="Project lifecycle events with recomputable hash links."
              actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
            />
            <AuditLedgerClient rows={rows} initialProjectFilter={projectFilter ?? ''} />
          </Card>
        </div>

        <Card>
          <CardHeader title="Chain integrity" description="Recomputed from underlying event rows, per project." />
          <div className="space-y-3 p-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Projects verified</div>
              <div className="ca-numeric mt-1 text-2xl font-semibold text-ink">
                {verifiedCount} / {allProjects.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Total audit records</div>
              <div className="ca-numeric mt-1 text-lg font-medium text-ink">{totalRecords}</div>
            </div>
            {broken.length > 0 && (
              <div className="rounded border border-critical bg-critical-subtle px-3 py-2 text-xs">
                <div className="font-medium text-ink">Integrity error</div>
                {broken.map(({ p, v }) => (
                  <div key={p.projectId} className="mt-1 text-ink-secondary">
                    {p.projectId}: {v.reason}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted">
              Each project keeps its own hash chain, recomputed on demand from its stored events - never
              cached, never trusted from a prior check.
            </p>
          </div>
        </Card>
      </div>
      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-hairline px-1 pt-3 text-[11px] text-muted">
        <span>Showing the {rows.length} most recent events across all projects.</span>
        <span className="inline-flex items-center gap-1.5"><ProvenanceBadge classification="SYNTHETIC_DEMO" /></span>
      </footer>
    </DashboardShell>
  )
}
