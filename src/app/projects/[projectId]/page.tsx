import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can, type ProjectResource } from '@/lib/auth/policy'
import { verifyProjectAuditChain } from '@/lib/audit'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'
import { formatPeso, formatPercent, formatPercentPrecise, projectStatusLabel, milestoneStatusLabel } from '@/lib/infrastructure/labels'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { DashboardShell } from '../../dashboard/DashboardShell'
import { MilestoneReadiness } from './MilestoneReadiness'

function projectResource(project: { officeId: string | null }): ProjectResource {
  return { kind: 'project', officeId: project.officeId, contractorOfficeId: null }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}): Promise<Metadata> {
  const { projectId } = await params
  const project = await db.project.findUnique({ where: { projectId }, select: { name: true } })
  return { title: project ? project.name : projectId }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const user = await readSession()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/projects/${projectId}`)}`)
  }

  const pendingActionsCount = await getPendingActionsCount()

  const project = await db.project.findUnique({
    where: { projectId },
    include: {
      office: { select: { id: true, code: true, name: true, shortName: true } },
      milestones: {
        orderBy: { sequence: 'asc' },
        include: {
          evidence: true,
          validations: { include: { validator: { select: { id: true, code: true, name: true, department: true, role: true, status: true } } } },
        },
      },
    },
  })

  if (!project) {
    return (
      <DashboardShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
        <Card>
          <CardHeader title="Project not found" description={`No synthetic project matches ${projectId}.`} />
          <div className="p-4">
            <Link href="/projects" className="text-xs font-medium text-ink underline">← Back to Projects</Link>
          </div>
        </Card>
      </DashboardShell>
    )
  }

  const resource = projectResource(project)
  const canRead = can(user, 'project:read', resource).allowed
  if (!canRead) {
    return (
      <DashboardShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
        <Card><CardHeader title="Access denied" description="You do not have read access to this project." /></Card>
      </DashboardShell>
    )
  }
  const internal = can(user, 'project:read-internal', resource).allowed
  const canValidate = can(user, 'project:complete-validation', resource).allowed
  const canApprove = can(user, 'project:approve-milestone', resource).allowed

  const currentMilestone = project.milestones.find((m) => m.status !== 'COMPLETED' && m.status !== 'DRAFT') ?? project.milestones[project.milestones.length - 1]
  const completedCount = project.milestones.filter((m) => m.status === 'COMPLETED').length
  const remainingBudget = project.budget - project.fundsDisbursed
  const disbursedPct = project.budget ? (project.fundsDisbursed / project.budget) * 100 : 0

  const audit = internal ? await verifyProjectAuditChain(project.id) : null

  return (
    <DashboardShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
      <nav className="mb-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:underline">
          ← Back to Projects
        </Link>
      </nav>

      <Card className="overflow-hidden">
        <CardHeader
          title={<span className="flex items-center gap-2">{project.projectId} <StatusPill status={project.status} label={projectStatusLabel(project.status)} /></span>}
          description={project.name}
          actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
        />

        {/* Priority 1-3: project state, current milestone, blocking condition - above everything else on this page. */}
        {currentMilestone && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hairline bg-surface-2 px-4 py-3 text-xs">
            <div>
              <div className="text-muted">Project status</div>
              <div className="mt-0.5"><StatusPill status={project.status} label={projectStatusLabel(project.status)} /></div>
            </div>
            <div>
              <div className="text-muted">Current milestone</div>
              <div className="mt-0.5 font-medium text-ink">{currentMilestone.name}</div>
            </div>
            <div>
              <div className="text-muted">Milestone status</div>
              <div className="mt-0.5"><StatusPill status={currentMilestone.status} label={milestoneStatusLabel(currentMilestone.status)} /></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Category</div>
            <div className="mt-1 text-sm text-ink">{project.category.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Location</div>
            <div className="mt-1 text-sm text-ink">{project.location}, {project.city}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Contractor</div>
            <div className="mt-1 text-sm text-ink">{project.contractor}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Oversight office</div>
            <div className="mt-1 text-sm text-ink">{project.office?.shortName ?? project.office?.name ?? '—'}</div>
          </div>
        </div>
        {project.status === 'DELAYED' && project.delayedReason && (
          <div className="mx-4 mb-4 rounded border border-critical bg-critical-subtle px-3 py-2 text-xs text-ink">
            <span className="font-medium">Delay reason: </span>{project.delayedReason}
          </div>
        )}
        <div className="space-y-3 border-t border-hairline p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progress</span>
            <span className="ca-numeric font-medium text-ink">{formatPercent(project.progress)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-ink" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><div className="text-muted">Budget</div><div className="ca-numeric font-medium text-ink">{formatPeso(project.budget)}</div></div>
            <div><div className="text-muted">Disbursed</div><div className="ca-numeric font-medium text-ink">{formatPeso(project.fundsDisbursed)}</div></div>
            <div><div className="text-muted">Remaining</div><div className="ca-numeric font-medium text-ink">{formatPeso(remainingBudget)}</div></div>
            <div><div className="text-muted">Disbursed %</div><div className="ca-numeric font-medium text-ink">{formatPercentPrecise(disbursedPct)}</div></div>
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 text-[11px] text-muted">
          <span>{completedCount} of {project.milestones.length} milestones complete</span>
          <span>Started {new Date(project.startDate).toLocaleDateString()} · target {new Date(project.targetCompletion).toLocaleDateString()}</span>
        </footer>
      </Card>

      <section className="mt-4 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Milestone readiness</h2>
        {project.milestones.map((milestone) => (
          <MilestoneReadiness
            key={milestone.id}
            milestone={milestone}
            internal={internal}
            projectId={project.projectId}
            canValidate={canValidate}
            canApprove={canApprove}
          />
        ))}
      </section>

      {/* Lowest visual priority: cryptographic / ledger detail, internal-only. */}
      {internal && audit && (
        <Card className="mt-4">
          <CardHeader
            title="Audit integrity"
            description="Recomputed from the underlying event history, not cached."
            actions={
              <Link href={`/audit?project=${encodeURIComponent(project.projectId)}`} className="text-xs font-medium text-ink hover:underline">
                View full ledger →
              </Link>
            }
          />
          <div className="flex flex-wrap items-center gap-4 p-4 text-xs">
            <StatusPill status={audit.valid ? 'VERIFIED' : 'REJECTED'} label={audit.valid ? 'Audit verified' : 'Integrity error'} />
            <span className="text-muted">{audit.recordCount} records on this project&apos;s chain</span>
            {audit.reason && <span className="text-ink-secondary">{audit.reason}</span>}
          </div>
        </Card>
      )}
    </DashboardShell>
  )
}
