import Link from 'next/link'
import { db } from '@/lib/db'
import { readSession } from '@/lib/auth/session'
import { can, type ProjectResource } from '@/lib/auth/policy'
import { Card, CardHeader } from '@/components/ui/primitives'
import { StatusPill } from '@/components/ui/status'
import { ProvenanceBadge } from '@/components/ui/provenance'

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', EVIDENCE_REVIEW: 'Evidence review',
  VALIDATION: 'Validation', READY_FOR_APPROVAL: 'Ready for approval',
  APPROVED: 'Approved', PAYMENT_ELIGIBLE: 'Payment eligible', COMPLETED: 'Completed',
  BLOCKED: 'Blocked', RETURNED: 'Returned',
}
const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  MISSING: 'Missing', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified', REJECTED: 'Rejected',
}
const VALIDATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', ESCALATED: 'Escalated',
}

function projectResource(project: { officeId: string | null }): ProjectResource {
  return { kind: 'project', officeId: project.officeId, contractorOfficeId: null }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const user = await readSession()
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6"><Card><CardHeader title="Sign in required" /></Card></main>
    )
  }

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
      <main className="mx-auto w-full max-w-6xl px-4 py-6"><Card><CardHeader title="Project not found" /></Card></main>
    )
  }

  const internal = can(user, 'project:read-internal', projectResource(project)).allowed
  const canRead = can(user, 'project:read', projectResource(project)).allowed
  if (!canRead) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Card><CardHeader title="Access denied" description="You do not have read access to this project." /></Card>
      </main>
    )
  }

  const totalBudget = project.budget
  const spentPct = project.progress
  const blockedMilestones = project.milestones.filter((m) => m.status === 'BLOCKED')
  const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED')

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <nav>
        <Link href="/infrastructure" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:underline">
          ← Infrastructure
        </Link>
      </nav>

      <Card>
        <CardHeader
          title={project.projectId}
          description={project.name}
          actions={<ProvenanceBadge classification="SYNTHETIC_DEMO" />}
        />
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Category</div>
            <div className="mt-1 text-sm text-ink">{project.category}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Location</div>
            <div className="mt-1 text-sm text-ink">{project.location}, {project.city}, {project.region}</div>
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
        <div className="border-t border-hairline p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progress</span>
            <span className="ca-numeric font-medium text-ink">{spentPct}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-ink" style={{ width: `${spentPct}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>Budget {(totalBudget / 1_000_000).toFixed(1)}M PHP</span>
            <span>Target completion {new Date(project.targetCompletion).toLocaleDateString()}</span>
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2 text-[11px] text-muted">
          <span>{project.milestones.length} milestones · {completedMilestones.length} complete · {blockedMilestones.length} blocked</span>
          <span>Started {new Date(project.startDate).toLocaleDateString()}</span>
        </footer>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Milestones</h2>
        <div className="space-y-3">
          {project.milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardHeader
                title={<span className="flex items-center gap-2">{milestone.code} <StatusPill status={milestone.status} label={MILESTONE_STATUS_LABELS[milestone.status] ?? milestone.status} /></span>}
                description={milestone.name}
              />
              <div className="space-y-3 p-4">
                {milestone.description && <p className="text-sm text-ink-secondary">{milestone.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Progress</span>
                  <span className="ca-numeric font-medium text-ink">{milestone.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-ink" style={{ width: `${milestone.progress}%` }} />
                </div>
                {milestone.evidence.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-ink">Evidence</h3>
                    <ul className="mt-1 space-y-1">
                      {milestone.evidence.map((evidence) => (
                        <li key={evidence.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-ink-secondary">{evidence.title}</span>
                          <StatusPill status={evidence.status} label={EVIDENCE_STATUS_LABELS[evidence.status] ?? evidence.status} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {milestone.validations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-ink">Validations</h3>
                    <ul className="mt-1 space-y-1">
                      {milestone.validations.map((validation) => (
                        <li key={validation.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-ink-secondary">
                            {internal ? validation.validator.name : validation.validator.code}
                            {validation.note && <span className="text-muted"> — {validation.note}</span>}
                          </span>
                          <StatusPill status={validation.status} label={VALIDATION_STATUS_LABELS[validation.status] ?? validation.status} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}