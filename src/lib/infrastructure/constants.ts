/**
 * Infrastructure domain vocabularies.
 *
 * The public-infrastructure project domain (Project / Milestone / Evidence /
 * Validation / Validator) is modelled alongside the citizen-transaction Case
 * domain. Both live in the same schema and share the audit chain and the
 * authorization policy, but a project is not a transaction: it has a
 * contractor, a budget, a location and a lifecycle of milestones rather than a
 * workflow definition.
 *
 * As with domain/constants.ts, the Prisma schema stores these as plain strings
 * so the database stays portable across SQLite and PostgreSQL. This module is
 * the single source of truth for the allowed values.
 */

// ---------------------------------------------------------------- project lifecycle

/** Lifecycle states a Project can be in. */
export const PROJECT_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'PENDING_APPROVAL',
  'DELAYED',
  'COMPLETED',
  'ON_HOLD',
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

// ---------------------------------------------------------------- milestone lifecycle

/** Lifecycle states a Milestone can be in. */
export const MILESTONE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'EVIDENCE_REVIEW',
  'VALIDATION',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'PAYMENT_ELIGIBLE',
  'COMPLETED',
  'BLOCKED',
  'RETURNED',
] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

// ---------------------------------------------------------------- evidence

/** Where a piece of evidence stands in its own review cycle. */
export const EVIDENCE_STATUSES = [
  'MISSING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number]

/** The kind of artefact an Evidence record describes. */
export const EVIDENCE_TYPES = [
  'PHOTO',
  'REPORT',
  'INSPECTION_FORM',
  'ENGINEERING_DRAWING',
  'PAYMENT_REQUEST',
  'CONTRACT_AMENDMENT',
  'OTHER',
] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

// ---------------------------------------------------------------- validation

/** Where a Validation record stands. */
export const VALIDATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
] as const
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number]

// ---------------------------------------------------------------- validators

/** Operational state of a Validator. */
export const VALIDATOR_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const
export type ValidatorStatus = (typeof VALIDATOR_STATUSES)[number]

// ---------------------------------------------------------------- event vocabulary

/**
 * Infrastructure event types appended to the shared CaseEvent/AuditRecord
 * spine. Append-only: existing codes must never be renamed, because historical
 * audit hashes cover them.
 */
export const INFRASTRUCTURE_EVENT_TYPES = [
  'PROJECT_CREATED',
  'PROJECT_STATUS_CHANGED',
  'MILESTONE_CREATED',
  'MILESTONE_SUBMITTED',
  'MILESTONE_STATUS_CHANGED',
  'EVIDENCE_SUBMITTED',
  'EVIDENCE_VERIFIED',
  'EVIDENCE_REJECTED',
  'VALIDATION_COMPLETED',
  'VALIDATION_ESCALATED',
  'MILESTONE_APPROVED',
  'MILESTONE_RETURNED',
  'PAYMENT_ELIGIBLE',
  'PAYMENT_RELEASED',
  'PROJECT_COMPLETED',
] as const
export type InfrastructureEventType = (typeof INFRASTRUCTURE_EVENT_TYPES)[number]

// ---------------------------------------------------------------- helpers

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value)
}

export function isMilestoneStatus(value: string): value is MilestoneStatus {
  return (MILESTONE_STATUSES as readonly string[]).includes(value)
}

export function isEvidenceStatus(value: string): value is EvidenceStatus {
  return (EVIDENCE_STATUSES as readonly string[]).includes(value)
}

export function isValidationStatus(value: string): value is ValidationStatus {
  return (VALIDATION_STATUSES as readonly string[]).includes(value)
}

export function isValidatorStatus(value: string): value is ValidatorStatus {
  return (VALIDATOR_STATUSES as readonly string[]).includes(value)
}