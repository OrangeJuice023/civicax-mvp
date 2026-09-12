/**
 * Read-only query helpers for the infrastructure domain.
 *
 * Nothing here mutates anything - see src/lib/infrastructure/engine.ts for
 * that. This module exists so the dashboard, the pending-actions page and the
 * sidebar badge compute the SAME counts the same way. Three call sites each
 * writing their own `db.milestone.count({ where: { status: '...' } })` is
 * exactly how a dashboard KPI and a work-queue count quietly drift apart.
 */

import { db } from '@/lib/db'

/**
 * Everything currently waiting on a person, summed across every category the
 * pending-actions page shows: milestones ready for approval, milestones
 * blocked on a validator or on evidence, and projects that have slipped their
 * timeline. This is the number shown as the "Pending Actions" sidebar badge -
 * always a live count, never a hard-coded figure.
 */
export async function getPendingActionsCount(): Promise<number> {
  const [pendingApproval, blockedValidation, blockedEvidence, delayed] = await Promise.all([
    db.milestone.count({ where: { status: 'PENDING_APPROVAL' } }),
    db.milestone.count({ where: { status: 'BLOCKED_ON_VALIDATION' } }),
    db.milestone.count({ where: { status: 'BLOCKED_ON_EVIDENCE' } }),
    db.project.count({ where: { status: 'DELAYED' } }),
  ])
  return pendingApproval + blockedValidation + blockedEvidence + delayed
}

export type AtRiskMilestone = {
  milestoneId: string
  milestoneName: string
  milestoneStatus: string
  projectId: string
  projectName: string
  reason: 'BLOCKED_ON_VALIDATION' | 'BLOCKED_ON_EVIDENCE' | 'DELAYED_PROJECT'
}

/**
 * Milestones worth flagging on the dashboard's "Milestones at risk" panel.
 * Three conditions, each a real, queryable fact - never an invented label:
 *   - the milestone itself is blocked on validation or on evidence
 *   - the milestone's project has slipped its timeline (status DELAYED)
 */
export async function getAtRiskMilestones(limit = 6): Promise<AtRiskMilestone[]> {
  const blocked = await db.milestone.findMany({
    where: { status: { in: ['BLOCKED_ON_VALIDATION', 'BLOCKED_ON_EVIDENCE'] } },
    include: { project: { select: { projectId: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  const delayedProjects = await db.project.findMany({
    where: { status: 'DELAYED' },
    include: {
      milestones: {
        where: { status: { notIn: ['COMPLETED', 'DRAFT'] } },
        orderBy: { sequence: 'asc' },
        take: 1,
      },
    },
  })

  const fromBlocked: AtRiskMilestone[] = blocked.map((m) => ({
    milestoneId: m.id,
    milestoneName: m.name,
    milestoneStatus: m.status,
    projectId: m.project.projectId,
    projectName: m.project.name,
    reason: m.status === 'BLOCKED_ON_EVIDENCE' ? 'BLOCKED_ON_EVIDENCE' : 'BLOCKED_ON_VALIDATION',
  }))

  const fromDelayed: AtRiskMilestone[] = delayedProjects
    .filter((p) => p.milestones[0])
    .map((p) => ({
      milestoneId: p.milestones[0].id,
      milestoneName: p.milestones[0].name,
      milestoneStatus: p.milestones[0].status,
      projectId: p.projectId,
      projectName: p.name,
      reason: 'DELAYED_PROJECT' as const,
    }))

  // De-duplicate by milestoneId - a milestone can be both blocked AND belong
  // to a delayed project; it should appear once, with the blocked reason
  // taking priority since it is the more specific fact.
  const seen = new Set<string>()
  const combined: AtRiskMilestone[] = []
  for (const item of [...fromBlocked, ...fromDelayed]) {
    if (seen.has(item.milestoneId)) continue
    seen.add(item.milestoneId)
    combined.push(item)
  }
  return combined.slice(0, limit)
}

export type LatestProjectEvent = {
  id: string
  projectId: string
  projectName: string
  type: string
  actorRole: string | null
  occurredAt: Date
  hash: string | null
}

/** Most recent project-domain events, across every project, for the dashboard's activity panel. */
export async function getLatestProjectEvents(limit = 8): Promise<LatestProjectEvent[]> {
  const events = await db.caseEvent.findMany({
    where: { projectId: { not: null } },
    include: {
      project: { select: { projectId: true, name: true } },
      auditRecord: { select: { hash: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
  return events
    .filter((e) => e.project)
    .map((e) => ({
      id: e.id,
      projectId: e.project!.projectId,
      projectName: e.project!.name,
      type: e.type,
      actorRole: e.actorRole,
      occurredAt: e.occurredAt,
      hash: e.auditRecord?.hash ?? null,
    }))
}
