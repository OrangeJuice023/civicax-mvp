import Link from 'next/link'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/policy'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { InfraListShell } from './InfraListShell'

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  PENDING_APPROVAL: 'Pending approval',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
}

export default async function InfrastructurePage() {
  const user = await readSession()
  if (!user) {
    return (
      <InfraListShell>
        <Card><CardHeader title="Sign in required" /></Card>
      </InfraListShell>
    )
  }

  const decision = can(user, 'project:read')
  if (!decision.allowed) {
    return (
      <InfraListShell>
        <Card><CardHeader title="Access denied" description={decision.reason ?? undefined} /></Card>
      </InfraListShell>
    )
  }

  const projects = await db.project.findMany({
    include: {
      office: { select: { id: true, code: true, name: true, shortName: true } },
      milestones: {
        orderBy: { sequence: 'asc' },
        select: { id: true, status: true, progress: true },
      },
    },
    orderBy: { projectId: 'asc' },
  })

  const summary = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    delayed: projects.filter((p) => p.status === 'DELAYED').length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
    onHold: projects.filter((p) => p.status === 'ON_HOLD').length,
  }

  return (
    <InfraListShell>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Total</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Active</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.active}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Delayed</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.delayed}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Completed</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.completed}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">On hold</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.onHold}</div>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader
          title="Public infrastructure projects"
          description="Oversight view of DPWH projects under monitoring. Each row links to the project detail with its milestone chain, evidence and validation panel."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Region</th>
                <th className="px-4 py-2 text-right">Budget</th>
                <th className="px-4 py-2 text-right">Progress</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Office</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const blocked = project.milestones.some((m) => m.status === 'BLOCKED')
                return (
                  <tr key={project.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/infrastructure/${project.projectId}`} className="font-medium text-ink hover:underline">
                        {project.projectId}
                      </Link>
                      <div className="text-[11px] text-muted">{project.name}</div>
                    </td>
                    <td className="px-4 py-2 text-muted">{project.category}</td>
                    <td className="px-4 py-2 text-muted">{project.region}</td>
                    <td className="px-4 py-2 text-right font-mono text-ink">
                      {(project.budget / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full bg-ink"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-ink">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill status={project.status} label={STATUS_LABELS[project.status] ?? project.status} />
                      {blocked && <div className="mt-1"><StatusPill status="BLOCKED" label="Blocked" /></div>}
                    </td>
                    <td className="px-4 py-2 text-muted">{project.office?.shortName ?? project.office?.name ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 text-[11px] text-muted">
          <span>{projects.length} projects · all synthetic demo data</span>
          <span className="inline-flex items-center gap-1.5"><ProvenanceBadge classification="SYNTHETIC_DEMO" /></span>
        </footer>
      </Card>
    </InfraListShell>
  )
}