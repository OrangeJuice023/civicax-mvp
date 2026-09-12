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
import { verifyProjectAuditChain } from '@/lib/audit'
import { pickCurrentMilestone } from './labels'

// ---------------------------------------------------------------- dashboard KPIs

export type DashboardKpis = {
  projects: number
  /** Projects whose timeline has slipped OR whose current milestone is blocked. */
  projectsAtRisk: number
  pendingApprovals: number
  completedMilestones: number
  activeValidators: number
  totalValidators: number
  blockedMilestones: number
}

/**
 * Every headline figure on the dashboard, counted once, here. The dashboard
 * renders what this returns and computes nothing of its own - a KPI tile with
 * its own inline count is how "18 projects" on one screen becomes "17" on
 * another.
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const [projects, pendingApprovals, completedMilestones, blockedMilestones, validators, delayedProjects, projectsWithBlockedMilestone] =
    await Promise.all([
      db.project.count(),
      db.milestone.count({ where: { status: 'PENDING_APPROVAL' } }),
      db.milestone.count({ where: { status: 'COMPLETED' } }),
      db.milestone.count({ where: { status: { in: ['BLOCKED_ON_VALIDATION', 'BLOCKED_ON_EVIDENCE'] } } }),
      db.validator.findMany({ select: { status: true } }),
      db.project.findMany({ where: { status: 'DELAYED' }, select: { id: true } }),
      db.project.findMany({
        where: { milestones: { some: { status: { in: ['BLOCKED_ON_VALIDATION', 'BLOCKED_ON_EVIDENCE'] } } } },
        select: { id: true },
      }),
    ])

  // A project can be both delayed and blocked; it is one project at risk.
  const atRisk = new Set([...delayedProjects.map((p) => p.id), ...projectsWithBlockedMilestone.map((p) => p.id)])

  return {
    projects,
    projectsAtRisk: atRisk.size,
    pendingApprovals,
    completedMilestones,
    activeValidators: validators.filter((v) => v.status === 'ACTIVE').length,
    totalValidators: validators.length,
    blockedMilestones,
  }
}

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

export type AttentionKind = 'BLOCKED_VALIDATION' | 'BLOCKED_EVIDENCE' | 'AWAITING_APPROVAL' | 'DELAYED'

export type AttentionItem = {
  key: string
  projectId: string
  projectName: string
  milestoneName: string | null
  kind: AttentionKind
  /** What is actually holding it, in the words of the record - never an invented label. */
  detail: string
}

const ATTENTION_ORDER: Record<AttentionKind, number> = {
  BLOCKED_VALIDATION: 0,
  BLOCKED_EVIDENCE: 1,
  AWAITING_APPROVAL: 2,
  DELAYED: 3,
}

/**
 * Everything waiting on a person, as rows a reader can act on: which project,
 * which milestone, and who or what it is waiting for. Every field is read
 * from the record - the "awaiting X" line names the validator whose
 * Validation row is still PENDING, not a guess about who ought to act.
 */
export async function getNeedsAttention(limit = 6): Promise<AttentionItem[]> {
  const [milestones, delayed] = await Promise.all([
    db.milestone.findMany({
      where: { status: { in: ['BLOCKED_ON_VALIDATION', 'BLOCKED_ON_EVIDENCE', 'PENDING_APPROVAL'] } },
      include: {
        project: { select: { projectId: true, name: true } },
        evidence: { select: { status: true, title: true } },
        validations: {
          where: { required: true, status: 'PENDING' },
          include: { validator: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.project.findMany({
      where: { status: 'DELAYED' },
      select: {
        projectId: true,
        name: true,
        delayedReason: true,
        milestones: {
          where: { status: { notIn: ['COMPLETED', 'DRAFT'] } },
          orderBy: { sequence: 'asc' },
          take: 1,
          select: { name: true },
        },
      },
    }),
  ])

  const items: AttentionItem[] = []

  for (const m of milestones) {
    const kind: AttentionKind =
      m.status === 'BLOCKED_ON_VALIDATION'
        ? 'BLOCKED_VALIDATION'
        : m.status === 'BLOCKED_ON_EVIDENCE'
          ? 'BLOCKED_EVIDENCE'
          : 'AWAITING_APPROVAL'

    let detail: string
    if (kind === 'BLOCKED_VALIDATION') {
      const waiting = m.validations[0]?.validator.name
      detail = waiting ? `Awaiting ${waiting}` : 'Awaiting validation'
    } else if (kind === 'BLOCKED_EVIDENCE') {
      const missing = m.evidence.find((e) => e.status !== 'VERIFIED')
      detail = missing ? `Missing ${missing.title}` : 'Missing evidence'
    } else {
      detail = 'Ready for approval'
    }

    items.push({
      key: m.id,
      projectId: m.project.projectId,
      projectName: m.project.name,
      milestoneName: m.name,
      kind,
      detail,
    })
  }

  for (const p of delayed) {
    items.push({
      key: `delayed-${p.projectId}`,
      projectId: p.projectId,
      projectName: p.name,
      milestoneName: p.milestones[0]?.name ?? null,
      kind: 'DELAYED',
      detail: p.delayedReason ?? 'Timeline has slipped',
    })
  }

  items.sort(
    (a, b) => ATTENTION_ORDER[a.kind] - ATTENTION_ORDER[b.kind] || a.projectId.localeCompare(b.projectId),
  )
  return items.slice(0, limit)
}

export type CategoryBudget = { category: string; total: number }

/** Portfolio budget by category, summed from the project rows themselves. */
export async function getBudgetByCategory(): Promise<{ rows: CategoryBudget[]; total: number }> {
  const grouped = await db.project.groupBy({ by: ['category'], _sum: { budget: true } })
  const rows = grouped
    .map((g) => ({ category: g.category, total: g._sum.budget ?? 0 }))
    .sort((a, b) => b.total - a.total)
  return { rows, total: rows.reduce((sum, r) => sum + r.total, 0) }
}

export type LatestProjectEvent = {
  id: string
  sequence: number
  projectId: string
  projectName: string
  type: string
  actorRole: string | null
  actorLabel: string | null
  occurredAt: Date
  hash: string | null
}

/** Most recent project-domain events, across every project, for the dashboard's activity panel. */
export async function getLatestProjectEvents(limit = 8): Promise<LatestProjectEvent[]> {
  const events = await db.caseEvent.findMany({
    where: { projectId: { not: null } },
    include: {
      project: { select: { projectId: true, name: true } },
      auditRecord: { select: { hash: true, sequence: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
  return events
    .filter((e) => e.project)
    .map((e) => ({
      id: e.id,
      sequence: e.auditRecord?.sequence ?? e.sequence,
      projectId: e.project!.projectId,
      projectName: e.project!.name,
      type: e.type,
      actorRole: e.actorRole,
      actorLabel: e.actorLabel,
      occurredAt: e.occurredAt,
      hash: e.auditRecord?.hash ?? null,
    }))
}

// ---------------------------------------------------------------- projects at a glance

export type ProjectGlance = {
  id: string
  projectId: string
  name: string
  category: string
  sector: string
  city: string
  status: string
  progress: number
  budget: number
  fundsDisbursed: number
  delayedReason: string | null
  currentMilestone: { id: string; name: string; code: string; status: string; sequence: number } | null
  evidenceVerified: number
  evidenceTotal: number
  validationsApproved: number
  validationsRequired: number
  /** The validator the current milestone is waiting on, when it is waiting on one. */
  nextValidator: string | null
  /** Lower sorts first: 0 blocked, 1 delayed project, 2 awaiting approval, 3 moving normally. */
  attentionRank: number
}

const ATTENTION_BLOCKED = 0
const ATTENTION_DELAYED = 1
const ATTENTION_APPROVAL = 2
const ATTENTION_NONE = 3

/**
 * The portfolio, projected into what the dashboard's "Projects at a Glance"
 * panel shows: where each project is in its lifecycle, and whether anything
 * is holding it there.
 *
 * Sorted so the projects that need a human come first - blocked, then
 * delayed, then awaiting approval, then everything moving normally - and
 * within each group by progress, so the nearly-finished item that is stuck
 * outranks the one that just started. Ties break on projectId so the order
 * is stable between renders rather than dependent on row order.
 */
export async function getProjectsAtAGlance(limit?: number): Promise<ProjectGlance[]> {
  const projects = await db.project.findMany({
    include: {
      milestones: {
        orderBy: { sequence: 'asc' },
        include: {
          evidence: { select: { status: true } },
          validations: {
            select: { status: true, required: true, validator: { select: { name: true, role: true } } },
          },
        },
      },
    },
    orderBy: { projectId: 'asc' },
  })

  const rows: ProjectGlance[] = projects.map((project) => {
    const current = pickCurrentMilestone(project.milestones)
    const evidence = current?.evidence ?? []
    const required = (current?.validations ?? []).filter((v) => v.required)
    const pending = required.find((v) => v.status === 'PENDING')

    const blocked = current ? current.status === 'BLOCKED_ON_VALIDATION' || current.status === 'BLOCKED_ON_EVIDENCE' : false
    const attentionRank = blocked
      ? ATTENTION_BLOCKED
      : project.status === 'DELAYED'
        ? ATTENTION_DELAYED
        : current?.status === 'PENDING_APPROVAL'
          ? ATTENTION_APPROVAL
          : ATTENTION_NONE

    return {
      id: project.id,
      projectId: project.projectId,
      name: project.name,
      category: project.category,
      sector: project.sector,
      city: project.city,
      status: project.status,
      progress: project.progress,
      budget: project.budget,
      fundsDisbursed: project.fundsDisbursed,
      delayedReason: project.delayedReason,
      currentMilestone: current
        ? { id: current.id, name: current.name, code: current.code, status: current.status, sequence: current.sequence }
        : null,
      evidenceVerified: evidence.filter((e) => e.status === 'VERIFIED').length,
      evidenceTotal: evidence.length,
      validationsApproved: required.filter((v) => v.status === 'APPROVED').length,
      validationsRequired: required.length,
      nextValidator: pending?.validator.name ?? null,
      attentionRank,
    }
  })

  rows.sort(
    (a, b) =>
      a.attentionRank - b.attentionRank ||
      b.progress - a.progress ||
      a.projectId.localeCompare(b.projectId),
  )

  return typeof limit === 'number' ? rows.slice(0, limit) : rows
}

// ---------------------------------------------------------------- validation health

export type ValidationHealth = {
  activeValidators: number
  totalValidators: number
  /** Required validations that have been decided one way or the other. */
  decided: number
  approved: number
  pending: number
}

/**
 * Validator participation, stated as what it is: how many named review roles
 * are active, and how their recorded decisions came out. NOT a consensus
 * metric - nothing here is voting, and the UI must not imply that it is.
 */
export async function getValidationHealth(): Promise<ValidationHealth> {
  const [validators, approved, rejected, pending] = await Promise.all([
    db.validator.findMany({ select: { status: true } }),
    db.validation.count({ where: { required: true, status: 'APPROVED' } }),
    db.validation.count({ where: { required: true, status: { in: ['REJECTED', 'ESCALATED'] } } }),
    db.validation.count({ where: { required: true, status: 'PENDING' } }),
  ])

  return {
    activeValidators: validators.filter((v) => v.status === 'ACTIVE').length,
    totalValidators: validators.length,
    decided: approved + rejected,
    approved,
    pending,
  }
}

// ---------------------------------------------------------------- audit integrity

export type AuditIntegritySummary = {
  verifiedProjects: number
  totalProjects: number
  totalRecords: number
}

/**
 * Recompute every project's hash chain and report how many verify.
 *
 * Genuinely recomputed on each call, not cached and not stored: a dashboard
 * badge reading "verified" has to mean the check just ran, or it is
 * decoration. Cheap at this scale (18 chains of ~30 records); if the
 * portfolio grew, this belongs behind a scheduled job with a recorded
 * timestamp rather than being quietly dropped.
 */
export async function getAuditIntegritySummary(): Promise<AuditIntegritySummary> {
  const projects = await db.project.findMany({ select: { id: true } })
  const results = await Promise.all(projects.map((p) => verifyProjectAuditChain(p.id)))
  return {
    verifiedProjects: results.filter((r) => r.valid).length,
    totalProjects: projects.length,
    totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0),
  }
}
