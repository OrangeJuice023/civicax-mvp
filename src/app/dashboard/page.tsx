import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'
import {
  formatPeso,
  formatPercent,
  projectStatusLabel,
  milestoneStatusLabel,
  infrastructureEventLabel,
} from '@/lib/infrastructure/labels'
import { getPendingActionsCount, getAtRiskMilestones, getLatestProjectEvents } from '@/lib/infrastructure/queries'
import { DashboardShell } from './DashboardShell'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await readSession()

  const [
    projects,
    validators,
    pendingApprovals,
    completedMilestones,
    blockedMilestones,
    pendingActionsCount,
    atRisk,
    latestEvents,
  ] = await Promise.all([
    db.project.findMany({
      include: {
        office: { select: { id: true, code: true, name: true, shortName: true } },
        milestones: { orderBy: { sequence: 'asc' }, select: { id: true, name: true, status: true, progress: true } },
      },
      orderBy: { projectId: 'asc' },
    }),
    db.validator.findMany({ orderBy: { code: 'asc' } }),
    db.milestone.count({ where: { status: 'PENDING_APPROVAL' } }),
    db.milestone.count({ where: { status: 'COMPLETED' } }),
    db.milestone.count({ where: { status: { in: ['BLOCKED_ON_VALIDATION', 'BLOCKED_ON_EVIDENCE'] } } }),
    getPendingActionsCount(),
    getAtRiskMilestones(6),
    getLatestProjectEvents(8),
  ])

  const activeProjects = projects.filter((p) => p.status !== 'COMPLETED').length
  const activeValidators = validators.filter((v) => v.status === 'ACTIVE').length

  const categoryTotals = await db.project.groupBy({
    by: ['category'],
    _sum: { budget: true },
  })
  const totalBudget = categoryTotals.reduce((s, r) => s + (r._sum.budget ?? 0), 0)

  return (
    <DashboardShell user={user} active="dashboard" pendingActionsCount={pendingActionsCount}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Projects</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{projects.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Active</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{activeProjects}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Pending approvals</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{pendingApprovals}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Completed milestones</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{completedMilestones}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Validating nodes</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{activeValidators}/{validators.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Blocked</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{blockedMilestones}</div>
        </Card>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Project portfolio" description="Synthetic demonstration data. All values derived from the seeded database." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Budget</th>
                  <th className="px-4 py-2 text-right">Progress</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${project.projectId}`} className="font-medium text-ink hover:underline">
                        {project.projectId}
                      </Link>
                      <div className="text-[11px] text-muted">{project.name}</div>
                    </td>
                    <td className="px-4 py-2 text-muted">{project.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-right font-mono text-ink">{formatPeso(project.budget)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-ink" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="font-mono text-ink">{formatPercent(project.progress)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill status={project.status} label={projectStatusLabel(project.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Budget distribution" description="Synthetic demonstration allocation" />
          <div className="space-y-3 p-4">
            {categoryTotals.map((row) => {
              const pct = totalBudget ? Math.round(((row._sum.budget ?? 0) / totalBudget) * 100) : 0
              return (
                <div key={row.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{row.category.replace(/_/g, ' ')}</span>
                    <span className="ca-numeric text-ink">{formatPercent(pct)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="border-t border-hairline pt-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Total</span>
                <span className="ca-numeric font-medium text-ink">{formatPeso(totalBudget)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Milestones at risk"
            description="Blocked on validation, blocked on evidence, or belonging to a delayed project."
          />
          {atRisk.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No milestones currently at risk.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {atRisk.map((m) => (
                <li key={m.milestoneId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/projects/${m.projectId}`} className="font-medium text-ink hover:underline">
                      {m.projectName}
                    </Link>
                    <div className="text-[11px] text-muted">{m.milestoneName}</div>
                  </div>
                  <StatusPill
                    status={m.reason === 'DELAYED_PROJECT' ? 'DELAYED' : m.milestoneStatus}
                    label={m.reason === 'DELAYED_PROJECT' ? 'Delayed project' : milestoneStatusLabel(m.milestoneStatus)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Validation health" description="Prototype validation activity, not a production blockchain network." />
          <div className="space-y-3 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Active validators</span>
              <span className="ca-numeric font-medium text-ink">{activeValidators} / {validators.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Blocked milestones</span>
              <span className="ca-numeric font-medium text-ink">{blockedMilestones}</span>
            </div>
            <p className="text-[11px] text-muted">
              Validators are named review roles (engineering, finance, oversight, independent) recorded in the
              database - not distributed consensus nodes.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Latest audit events" description="Most recent tamper-evident ledger entries across all projects." actions={<Link href="/audit" className="text-xs font-medium text-ink hover:underline">View audit ledger →</Link>} />
        {latestEvents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No audit events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {latestEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <Link href={`/projects/${e.projectId}`} className="font-medium text-ink hover:underline">
                    {e.projectName}
                  </Link>
                  <span className="ml-2 text-ink-secondary">{infrastructureEventLabel(e.type)}</span>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{new Date(e.occurredAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-hairline px-1 pt-3 text-[11px] text-muted">
        <span>Synthetic demonstration data · {projects.length} projects · {validators.length} validators</span>
        <span className="inline-flex items-center gap-1.5"><ProvenanceBadge classification="SYNTHETIC_DEMO" /></span>
      </footer>
    </DashboardShell>
  )
}
