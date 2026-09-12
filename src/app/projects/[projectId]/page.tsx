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
import {
  computeMilestoneReadiness,
  formatPeso,
  formatPercent,
  formatPercentPrecise,
  isMilestoneBlocked,
  milestoneStatusLabel,
  pickCurrentMilestone,
  projectStatusLabel,
} from '@/lib/infrastructure/labels'
import { getPendingActionsCount } from '@/lib/infrastructure/queries'
import { ProjectArt } from '@/components/ui/project-art'
import { LifecycleChain, type LifecycleStep } from '@/components/ui/lifecycle'
import { AppShell } from '@/components/AppShell'
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
      <AppShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
        <Card>
          <CardHeader title="Project not found" description={`No synthetic project matches ${projectId}.`} />
          <div className="p-4">
            <Link href="/projects" className="text-xs font-medium text-ink underline">← Back to Projects</Link>
          </div>
        </Card>
      </AppShell>
    )
  }

  const resource = projectResource(project)
  const canRead = can(user, 'project:read', resource).allowed
  if (!canRead) {
    return (
      <AppShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
        <Card><CardHeader title="Access denied" description="You do not have read access to this project." /></Card>
      </AppShell>
    )
  }
  const internal = can(user, 'project:read-internal', resource).allowed
  const canValidate = can(user, 'project:complete-validation', resource).allowed
  const canApprove = can(user, 'project:approve-milestone', resource).allowed

  const currentMilestone = pickCurrentMilestone(project.milestones)
  const completedCount = project.milestones.filter((m) => m.status === 'COMPLETED').length
  const remainingBudget = project.budget - project.fundsDisbursed
  const disbursedPct = project.budget ? (project.fundsDisbursed / project.budget) * 100 : 0

  const audit = internal ? await verifyProjectAuditChain(project.id) : null

  // The connected-records chain: the same Project -> Milestone -> Evidence ->
  // Validation -> Status -> Audit line the dashboard shows, at full detail.
  const readiness = currentMilestone ? computeMilestoneReadiness(currentMilestone) : null
  const blocked = currentMilestone ? isMilestoneBlocked(currentMilestone.status) : false
  const pendingValidation = currentMilestone?.validations.find((v) => v.required && v.status === 'PENDING')

  const chain: LifecycleStep[] = [
    { label: 'Project', value: project.projectId, tone: 'active' },
    {
      label: 'Milestone',
      value: currentMilestone?.name ?? 'None active',
      tone: blocked ? 'blocked' : 'active',
    },
    {
      label: 'Evidence',
      value: readiness && readiness.evidenceTotal > 0 ? `${readiness.evidenceVerified}/${readiness.evidenceTotal}` : '—',
      tone: readiness && readiness.evidenceTotal > 0 && readiness.evidenceVerified === readiness.evidenceTotal ? 'done' : 'idle',
    },
    {
      label: 'Validation',
      value: readiness && readiness.validationsRequired > 0 ? `${readiness.validationsApproved}/${readiness.validationsRequired}` : '—',
      tone: readiness?.allValidationsComplete ? 'done' : blocked ? 'blocked' : 'idle',
    },
    {
      label: 'Status',
      value: currentMilestone ? milestoneStatusLabel(currentMilestone.status) : projectStatusLabel(project.status),
      tone: blocked ? 'blocked' : readiness?.allValidationsComplete ? 'done' : 'idle',
    },
    ...(internal && audit
      ? [
          {
            label: 'Audit',
            value: audit.valid ? `${audit.recordCount} verified` : 'Integrity error',
            tone: (audit.valid ? 'done' : 'blocked') as LifecycleStep['tone'],
          },
        ]
      : []),
  ]

  return (
    <AppShell user={user} active="projects" pendingActionsCount={pendingActionsCount}>
      <nav className="mb-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:underline">
          ← Back to Projects
        </Link>
      </nav>

      <Card className="overflow-hidden">
        {/* Priority 1-3: project identity and state, current milestone, blocking condition. */}
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
          <ProjectArt category={project.category} sector={project.sector} className="h-28 w-full sm:h-full" />
          <div className="min-w-0 space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ca-numeric text-[11px] font-medium text-muted">{project.projectId}</span>
                  <StatusPill status={project.status} label={projectStatusLabel(project.status)} />
                </div>
                <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">{project.name}</h1>
                <p className="text-[11px] text-muted">
                  {project.category.replace(/_/g, ' ')} · {project.sector} · {project.location}, {project.city}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="ca-numeric text-2xl font-semibold leading-none text-ink">
                    {formatPercent(project.progress)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">complete</div>
                </div>
                <ProvenanceBadge classification="SYNTHETIC_DEMO" />
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-navy via-brand-blue to-brand-teal"
                style={{ width: `${project.progress}%` }}
              />
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                Connected records
              </div>
              <LifecycleChain steps={chain} />
            </div>

            {blocked && currentMilestone && (
              <div className="rounded-md border border-critical bg-critical-subtle px-3 py-2 text-xs">
                <div className="font-medium text-ink">
                  {currentMilestone.name} is {milestoneStatusLabel(currentMilestone.status).toLowerCase()}
                </div>
                {pendingValidation && (
                  <div className="mt-0.5 text-ink-secondary">
                    Waiting on <span className="font-medium text-ink">{pendingValidation.validator.name}</span> ·
                    Next action: complete the {pendingValidation.role.toLowerCase()} decision.
                  </div>
                )}
              </div>
            )}
            {!blocked && currentMilestone?.status === 'PENDING_APPROVAL' && (
              <div className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-secondary">
                <span className="font-medium text-ink">{currentMilestone.name}</span> has every required validation.
                Next action: approve the milestone.
              </div>
            )}
          </div>
        </div>

        {project.status === 'DELAYED' && project.delayedReason && (
          <div className="border-t border-hairline bg-critical-subtle px-4 py-2 text-xs text-ink">
            <span className="font-medium">Delay reason: </span>
            {project.delayedReason}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-hairline p-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Budget</div>
            <div className="ca-numeric mt-1 font-medium text-ink">{formatPeso(project.budget)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Disbursed</div>
            <div className="ca-numeric mt-1 font-medium text-ink">{formatPeso(project.fundsDisbursed)}</div>
            <div className="text-[10px] text-muted">{formatPercentPrecise(disbursedPct)} of budget</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Remaining</div>
            <div className="ca-numeric mt-1 font-medium text-ink">{formatPeso(remainingBudget)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Contractor</div>
            <div className="mt-1 truncate font-medium text-ink">{project.contractor}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Oversight office</div>
            <div className="mt-1 truncate font-medium text-ink">
              {project.office?.shortName ?? project.office?.name ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted">Milestones</div>
            <div className="ca-numeric mt-1 font-medium text-ink">
              {completedCount} / {project.milestones.length} complete
            </div>
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
    </AppShell>
  )
}
