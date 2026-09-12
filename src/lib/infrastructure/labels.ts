/**
 * Display labels and formatters for the infrastructure domain.
 *
 * This is the SINGLE place that turns a stored status string, a peso amount,
 * or a percentage into what a user reads on screen. Every page that renders a
 * Project, Milestone, Evidence or Validation status imports from here rather
 * than keeping its own copy of the label map - three pages each hand-rolling
 * `{ IN_PROGRESS: 'In progress', ... }` is exactly how "In Progress" on the
 * dashboard and "IN_PROGRESS" on the projects table happen in the same build.
 *
 * Formatting conventions, fixed once and used everywhere:
 *   - currency:   "₱20,000,000" (symbol, thousands separators, no decimals -
 *                 every seeded amount is a whole peso figure)
 *   - percentage: "65%" (no space before the percent sign)
 */

import type { MilestoneStatus, ProjectStatus, EvidenceStatus, ValidationStatus, ValidatorStatus } from './constants'

// ---------------------------------------------------------------- currency & numbers

const PESO_FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

/** "₱20,000,000" - the one peso format used everywhere in the UI. */
export function formatPeso(amount: number): string {
  return PESO_FORMATTER.format(amount)
}

/** "₱20.0M" - compact form for dense tables and KPI tiles. */
export function formatPesoCompact(amount: number): string {
  const millions = amount / 1_000_000
  const digits = Number.isInteger(millions) ? 0 : 1
  return `₱${millions.toFixed(digits)}M`
}

/** "65%" - never "65 %". Rounds to the nearest whole percent. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** "76.2%" - one decimal place, for disbursement ratios where the extra precision matters. */
export function formatPercentPrecise(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`
}

// ---------------------------------------------------------------- project status

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In progress',
  ACTIVE: 'In progress',
  PENDING_APPROVAL: 'Pending approval',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
}

export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status
}

// ---------------------------------------------------------------- milestone status

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_PROGRESS: 'In progress',
  EVIDENCE_REVIEW: 'Evidence review',
  BLOCKED_ON_EVIDENCE: 'Blocked on evidence',
  VALIDATION: 'In validation',
  BLOCKED_ON_VALIDATION: 'Blocked on validation',
  // Milestone-level wording is "ready for approval" - the project-level
  // PENDING_APPROVAL status (see PROJECT_STATUS_LABELS) reads "Pending
  // approval" instead. Same stored string, two contextual labels.
  PENDING_APPROVAL: 'Ready for approval',
  APPROVED: 'Approved',
  PAYMENT_ELIGIBLE: 'Payment eligible',
  COMPLETED: 'Completed',
  RETURNED: 'Returned',
}

export function milestoneStatusLabel(status: string): string {
  return MILESTONE_STATUS_LABELS[status as MilestoneStatus] ?? status
}

/** Statuses that represent the milestone actually blocking further progress. */
const BLOCKED_MILESTONE_STATUSES: readonly string[] = ['BLOCKED_ON_EVIDENCE', 'BLOCKED_ON_VALIDATION']

export function isMilestoneBlocked(status: string): boolean {
  return BLOCKED_MILESTONE_STATUSES.includes(status)
}

// ---------------------------------------------------------------- evidence & validation status

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  MISSING: 'Missing',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
}

export function evidenceStatusLabel(status: string): string {
  return EVIDENCE_STATUS_LABELS[status as EvidenceStatus] ?? status
}

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
}

export function validationStatusLabel(status: string): string {
  return VALIDATION_STATUS_LABELS[status as ValidationStatus] ?? status
}

export const VALIDATOR_STATUS_LABELS: Record<ValidatorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
}

export function validatorStatusLabel(status: string): string {
  return VALIDATOR_STATUS_LABELS[status as ValidatorStatus] ?? status
}

// ---------------------------------------------------------------- audit event labels

/**
 * Human copy for infrastructure CaseEvent.type values. Shared by the audit
 * ledger page and the dashboard's "latest activity" panel so the two never
 * describe the same event type differently.
 */
export const INFRASTRUCTURE_EVENT_LABELS: Record<string, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_STATUS_CHANGED: 'Project status changed',
  MILESTONE_CREATED: 'Milestone created',
  MILESTONE_SUBMITTED: 'Milestone submitted',
  MILESTONE_STATUS_CHANGED: 'Milestone status changed',
  EVIDENCE_SUBMITTED: 'Evidence submitted',
  EVIDENCE_VERIFIED: 'Evidence verified',
  EVIDENCE_REJECTED: 'Evidence rejected',
  VALIDATION_COMPLETED: 'Validation completed',
  VALIDATION_ESCALATED: 'Validation escalated',
  MILESTONE_APPROVED: 'Milestone approved',
  MILESTONE_RETURNED: 'Milestone returned',
  PAYMENT_ELIGIBLE: 'Payment eligible',
  PAYMENT_RELEASED: 'Payment released',
  PROJECT_COMPLETED: 'Project completed',
}

export function infrastructureEventLabel(type: string): string {
  return INFRASTRUCTURE_EVENT_LABELS[type] ?? type
}

// ---------------------------------------------------------------- current milestone

/**
 * The milestone a project is actually working on right now: the first one in
 * sequence that is neither finished nor still a draft. Falls back to the last
 * milestone so a fully-completed project still reports something.
 *
 * One definition, used by the dashboard, the projects table and the project
 * detail page - "current milestone" meaning three slightly different things
 * on three screens is how a portfolio view and a detail view end up
 * contradicting each other.
 */
export function pickCurrentMilestone<M extends { status: string }>(milestones: readonly M[]): M | null {
  if (milestones.length === 0) return null
  return milestones.find((m) => m.status !== 'COMPLETED' && m.status !== 'DRAFT') ?? milestones[milestones.length - 1]
}

// ---------------------------------------------------------------- derived milestone readiness

/**
 * The structural minimum this module needs from a milestone to compute a
 * readiness summary. Kept structural (not the Prisma type) so it can be used
 * from a server component's mapped DTO, an API route, or a test fixture.
 */
export type ReadinessInput = {
  status: string
  evidence: readonly { status: string }[]
  validations: readonly { status: string; required: boolean }[]
}

export type MilestoneReadiness = {
  /** Evidence items verified, out of total evidence items on the milestone. */
  evidenceVerified: number
  evidenceTotal: number
  /** Required validations approved, out of total required validations. */
  validationsApproved: number
  validationsRequired: number
  /** True when every required validation is APPROVED. Server-computed - never trust a client's copy of this. */
  allValidationsComplete: boolean
  /** True when the milestone's own status names it as blocked. */
  isBlocked: boolean
  /** Human copy for "what happens next", or null when nothing is currently pending. */
  nextAction: string | null
}

/**
 * Compute the readiness summary for one milestone from its own evidence and
 * validation rows. This is display logic only - it does not decide whether a
 * transition is ALLOWED (that is entirely the job of
 * src/lib/infrastructure/engine.ts, re-checked server-side on every request)
 * but it is the one place that decides how the numbers are counted, so the
 * dashboard, the projects table and the milestone panel cannot disagree about
 * what "3/4 complete" means.
 */
export function computeMilestoneReadiness(milestone: ReadinessInput): MilestoneReadiness {
  const evidenceVerified = milestone.evidence.filter((e) => e.status === 'VERIFIED').length
  const evidenceTotal = milestone.evidence.length

  const required = milestone.validations.filter((v) => v.required)
  const validationsApproved = required.filter((v) => v.status === 'APPROVED').length
  const validationsRequired = required.length
  const allValidationsComplete = validationsRequired > 0 && validationsApproved === validationsRequired

  const isBlocked = isMilestoneBlocked(milestone.status)

  let nextAction: string | null = null
  if (milestone.status === 'BLOCKED_ON_EVIDENCE') {
    nextAction = 'Submit and verify the missing evidence.'
  } else if (milestone.status === 'BLOCKED_ON_VALIDATION') {
    const pending = milestone.validations.find((v) => v.required && v.status === 'PENDING')
    nextAction = pending ? 'Complete the outstanding validation.' : 'Resolve the outstanding validation.'
  } else if (milestone.status === 'PENDING_APPROVAL') {
    nextAction = 'Approve this milestone.'
  }

  return {
    evidenceVerified,
    evidenceTotal,
    validationsApproved,
    validationsRequired,
    allValidationsComplete,
    isBlocked,
    nextAction,
  }
}
