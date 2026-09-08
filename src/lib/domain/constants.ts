/**
 * CivicaX domain vocabularies.
 *
 * The Prisma schema stores these as plain strings so it stays portable across
 * SQLite and PostgreSQL (SQLite has no native enum type). This module is the
 * single source of truth for the allowed values, and the place to look when
 * adding a new service, event type, or role.
 */

// ---------------------------------------------------------------- roles

export const ROLES = ['CITIZEN', 'OFFICER', 'ADMINISTRATOR'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  CITIZEN: 'Citizen',
  OFFICER: 'Government Officer',
  ADMINISTRATOR: 'Administrator',
}

// ---------------------------------------------------------------- case lifecycle

export const CASE_STATUSES = [
  'ACTIVE',
  'RETURNED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

/** Statuses that mean the transaction is no longer moving through the workflow. */
export const TERMINAL_CASE_STATUSES: readonly CaseStatus[] = [
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]

// ---------------------------------------------------------------- transitions

/**
 * The verbs a workflow transition can express. Philippine administrative
 * practice distinguishes ENDORSE (hand off to another office for its own
 * review) from a plain ADVANCE within the same office, and RETURN (send back
 * to the applicant or a prior office for correction) is what generates rework.
 */
export const TRANSITION_ACTIONS = [
  'ADVANCE',
  'ENDORSE',
  'RETURN',
  'APPROVE',
  'REJECT',
  'CANCEL',
] as const
export type TransitionAction = (typeof TRANSITION_ACTIONS)[number]

// ---------------------------------------------------------------- events

/**
 * Every state change appends one CaseEvent. This list is append-only: existing
 * codes must never be renamed, because historical audit hashes cover them.
 */
export const EVENT_TYPES = [
  'CASE_SUBMITTED',
  'STEP_ENTERED',
  'STEP_COMPLETED',
  'ENDORSED',
  'RETURNED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'DOCUMENT_SUBMITTED',
  'DOCUMENT_VERIFIED',
  'DOCUMENT_REJECTED',
  'NOTE_ADDED',
  'ASSIGNED',
  'RECOMMENDATION_CREATED',
  'RECOMMENDATION_APPROVED',
  'RECOMMENDATION_REJECTED',
  'CASE_COMPLETED',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

// ---------------------------------------------------------------- documents

export const DOCUMENT_STATUSES = [
  'MISSING',
  'SUBMITTED',
  'VERIFIED',
  'REJECTED',
] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

// ---------------------------------------------------------------- AI layer

export const AGENT_TYPES = [
  'DOCUMENT_REVIEW',
  'ROUTING',
  'BOTTLENECK',
  'CITIZEN_EXPLANATION',
] as const
export type AgentType = (typeof AGENT_TYPES)[number]

export const AGENT_LABELS: Record<AgentType, string> = {
  DOCUMENT_REVIEW: 'Document Review Agent',
  ROUTING: 'Routing Agent',
  BOTTLENECK: 'Bottleneck Agent',
  CITIZEN_EXPLANATION: 'Citizen Explanation Agent',
}

export const RECOMMENDATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'expired',
] as const
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number]

/**
 * How a recommendation's content was produced.
 *
 * RULES     - derived entirely by deterministic rules over workflow data.
 * RULES+LLM - the finding and confidence are still rule-derived; a language
 *             model only rephrased it for readability.
 *
 * There is deliberately no "LLM" value: no recommendation may originate from a
 * model's unconstrained judgement.
 */
export const GENERATION_MODES = ['RULES', 'RULES+LLM'] as const
export type GenerationMode = (typeof GENERATION_MODES)[number]

// ---------------------------------------------------------------- provenance

/**
 * Drives the visible provenance badges across the UI. CivicaX must never render
 * a synthetic transaction in a way that could be read as official statistics.
 *
 * SYNTHETIC_DEMO  - fabricated for demonstration. Not real government data.
 * OFFICIAL_SOURCE - sourced from a named public dataset or statute.
 * CIVICAX_DERIVED - computed by CivicaX from whatever the inputs were; carries
 *                   the provenance of its least authoritative input.
 */
export const DATA_CLASSIFICATIONS = [
  'SYNTHETIC_DEMO',
  'OFFICIAL_SOURCE',
  'CIVICAX_DERIVED',
] as const
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number]

export const DATA_CLASSIFICATION_LABELS: Record<DataClassification, string> = {
  SYNTHETIC_DEMO: 'Synthetic demo data',
  OFFICIAL_SOURCE: 'Official / public source',
  CIVICAX_DERIVED: 'CivicaX prototype metric',
}

/** Where a documentary requirement came from. */
export const PROVENANCE_KINDS = ['ILLUSTRATIVE', 'SOURCED'] as const
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number]

// ---------------------------------------------------------------- transparency

/**
 * Declared per event. CITIZEN events appear on the applicant's timeline;
 * INTERNAL events are restricted to officers and administrators. Authorization
 * is enforced server-side - this field is not a UI hint.
 */
export const VISIBILITIES = ['CITIZEN', 'INTERNAL'] as const
export type Visibility = (typeof VISIBILITIES)[number]

// ---------------------------------------------------------------- helpers

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export function isTransitionAction(value: string): value is TransitionAction {
  return (TRANSITION_ACTIONS as readonly string[]).includes(value)
}

export function isCaseStatus(value: string): value is CaseStatus {
  return (CASE_STATUSES as readonly string[]).includes(value)
}
