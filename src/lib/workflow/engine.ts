/**
 * The workflow engine.
 *
 * This module is the ONLY place in CivicaX permitted to write CaseEvent or
 * AuditRecord rows, and the only place permitted to move a Case between steps.
 * Everything else - Server Actions, route handlers, the AI agents, the seed
 * script - goes through the four functions exported here. The reason is a
 * single invariant that cannot be maintained if writes are scattered:
 *
 *   every state change appends exactly one CaseEvent AND exactly one chained
 *   AuditRecord, both inside the same database transaction as the Case update.
 *
 * If any one of those three writes could happen without the others, the audit
 * chain would be a chain of some of the history, which is worse than no chain
 * at all because it would still render a green "verified" badge.
 *
 * ---------------------------------------------------------------------------
 * DESIGN DECISIONS worth knowing before reading the code
 * ---------------------------------------------------------------------------
 *
 * ONE EVENT PER TRANSITION. A move could plausibly be recorded as a pair
 * (STEP_COMPLETED on the old step, STEP_ENTERED on the new one). We emit a
 * single event carrying both fromStepId and toStepId instead, so that audit
 * sequence numbers map one-to-one onto real decisions. A reviewer counting
 * links in the chain counts actions taken, not internal bookkeeping, and the
 * dwell-time arithmetic has no ambiguity about which of a pair to measure
 * from. STEP_ENTERED and CASE_COMPLETED therefore exist in the event
 * vocabulary but are unused in v0.1; they are reserved, and appendCaseEvent
 * refuses them rather than letting a caller half-implement the other scheme.
 *
 * AUTHORIZATION IS SERVER-SIDE, HERE. getAvailableTransitions() exists so the
 * UI can grey out actions, but it is advisory: executeTransition() re-checks
 * every rule from the database and is the sole authority. The two share one
 * evaluator (evaluateEligibility) precisely so they can never disagree.
 *
 * AI NEVER MUTATES STATE THROUGH THIS MODULE. There is no code path by which
 * an agent can call executeTransition. Agents write AgentRecommendation rows;
 * a human calls executeTransition; the noPendingRecommendations guard makes
 * sure an open recommendation is answered by a person before a case advances.
 */

import type { Case, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { auditLedger, auditPayloadFromEvent, canonicalize } from '@/lib/audit'
import {
  EVENT_TYPES,
  TERMINAL_CASE_STATUSES,
  isTransitionAction,
  type CaseStatus,
  type DocumentStatus,
  type EventType,
  type Role,
  type TransitionAction,
  type Visibility,
} from '@/lib/domain/constants'
import { RA_11032_WORKING_DAY_LIMITS, computeStatutoryDueDate } from '@/lib/domain/sla'
import { WORKFLOW_ERROR_MESSAGES, WorkflowError, type WorkflowErrorCode } from './errors'
import { resolveGuard, type GuardClient } from './guards'

/** Prisma's interactive-transaction client. */
type WorkflowTx = Prisma.TransactionClient

/**
 * Prisma maps `Int` to a 32-bit signed integer, so durationFromPrevMs cannot
 * hold more than ~24.8 days of dwell time. Rather than let the driver reject
 * the row (which would abort a legitimate transition on a case that sat in a
 * queue for a month - exactly the case a bottleneck tool most wants to record)
 * the value is clamped and the true figure is recoverable from the occurredAt
 * timestamps of adjacent events. Any analytics that cares about long dwells
 * should difference occurredAt rather than trust this column; it is a
 * convenience, not the source of truth. Widening the column to BigInt is the
 * real fix and needs a migration, which this module may not make.
 */
const MAX_INT32 = 2_147_483_647

export type TransitionActor = {
  userId: string
  role: Role
  officeId: string | null
  /** Display name recorded on the event as actorLabel. Never hashed - see src/lib/audit/hash.ts. */
  name: string
}

export type TransitionInput = {
  caseId: string
  action: TransitionAction
  /**
   * Required only when the current step has more than one transition for the
   * same action (e.g. two possible endorsement targets). With one candidate it
   * may be omitted; with several, omitting it is an error rather than a guess,
   * because guessing would route a permit to an office nobody chose.
   */
  toStepCode?: string
  actor: TransitionActor
  note?: string
  /** Injectable clock, for tests and for backfilling a synthetic demo history. */
  now?: Date
}

export type TransitionResult = {
  caseId: string
  caseNumber: string
  fromStepCode: string
  toStepCode: string
  eventId: string
  sequence: number
  auditHash: string
  status: CaseStatus
}

export type AvailableTransition = {
  action: TransitionAction
  toStepCode: string
  toStepName: string
  label: string
  permitted: boolean
  blockedReason: string | null
}

// ---------------------------------------------------------------- vocabularies

/**
 * Action -> event type. Kept as an exhaustive Record so adding a
 * TransitionAction to the domain vocabulary fails to compile until its event
 * type is decided here.
 *
 * ADVANCE becomes STEP_COMPLETED because the event records the completion of
 * the step being LEFT; the destination is carried by toStepId on the same row.
 */
const EVENT_TYPE_FOR_ACTION: Record<TransitionAction, EventType> = {
  ADVANCE: 'STEP_COMPLETED',
  ENDORSE: 'ENDORSED',
  RETURN: 'RETURNED',
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  CANCEL: 'CANCELLED',
}

/**
 * Event types that only executeTransition() or submitCase() may write, plus
 * the two reserved by the one-event-per-transition decision above.
 * appendCaseEvent() refuses all of them: an annotation that claims to be a
 * state change would put the timeline and the Case row into disagreement,
 * with the audit chain endorsing the false version.
 */
const ENGINE_RESERVED_EVENT_TYPES: readonly EventType[] = [
  'CASE_SUBMITTED',
  'STEP_COMPLETED',
  'ENDORSED',
  'RETURNED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  // Reserved, unused in v0.1 - see the file header.
  'STEP_ENTERED',
  'CASE_COMPLETED',
]

/**
 * Who may append each non-transition event, enforced server-side.
 *
 * v0.1 has no SYSTEM role, so events produced while running an AI agent are
 * attributed to the officer or administrator whose request triggered the run.
 * That is an honest limitation, not a claim that a human authored the finding:
 * AgentRecommendation.generatedBy records the real provenance, and the
 * recommendation itself is what carries the agent's reasoning.
 */
const ANNOTATION_EVENT_ROLES: Record<string, readonly Role[]> = {
  DOCUMENT_SUBMITTED: ['CITIZEN', 'OFFICER', 'ADMINISTRATOR'],
  DOCUMENT_VERIFIED: ['OFFICER', 'ADMINISTRATOR'],
  DOCUMENT_REJECTED: ['OFFICER', 'ADMINISTRATOR'],
  NOTE_ADDED: ['CITIZEN', 'OFFICER', 'ADMINISTRATOR'],
  ASSIGNED: ['OFFICER', 'ADMINISTRATOR'],
  RECOMMENDATION_CREATED: ['OFFICER', 'ADMINISTRATOR'],
  RECOMMENDATION_APPROVED: ['OFFICER', 'ADMINISTRATOR'],
  RECOMMENDATION_REJECTED: ['OFFICER', 'ADMINISTRATOR'],
}

/**
 * Default visibility for non-transition events.
 *
 * The applicant is told about anything that affects the standing of their own
 * documents. Officer notes stay INTERNAL because they are deliberative -
 * publishing them by default would push officers into keeping their real
 * reasoning off the system entirely, which costs more transparency than it
 * buys. Assignment is internal workload management.
 *
 * RECOMMENDATION_* events are INTERNAL in v0.1. Whether an office publishes
 * the fact that an AI recommendation was made on a citizen's application is a
 * policy decision for that office; defaulting to disclosure would be CivicaX
 * making it for them. A caller may override per event.
 */
const DEFAULT_ANNOTATION_VISIBILITY: Record<string, Visibility> = {
  DOCUMENT_SUBMITTED: 'CITIZEN',
  DOCUMENT_VERIFIED: 'CITIZEN',
  DOCUMENT_REJECTED: 'CITIZEN',
  NOTE_ADDED: 'INTERNAL',
  ASSIGNED: 'INTERNAL',
  RECOMMENDATION_CREATED: 'INTERNAL',
  RECOMMENDATION_APPROVED: 'INTERNAL',
  RECOMMENDATION_REJECTED: 'INTERNAL',
}

// ---------------------------------------------------------------- small helpers

function fail(code: WorkflowErrorCode, detail?: string): never {
  throw new WorkflowError(code, WORKFLOW_ERROR_MESSAGES[code], detail)
}

function isTerminalStatus(status: string): boolean {
  return (TERMINAL_CASE_STATUSES as readonly string[]).includes(status)
}

/**
 * Dwell time in the previous state.
 *
 * Clamped to >= 0 rather than trusting the clock: `now` is injectable, and a
 * caller replaying a synthetic history out of order (or a machine whose clock
 * stepped backwards) would otherwise write a negative duration that quietly
 * poisons every average. The event's occurredAt is left exactly as supplied -
 * the timestamp stays honest even when the derived duration is clamped -
 * because `sequence`, not the clock, is what orders the chain.
 */
function durationFromPrevMs(previousOccurredAt: Date | null, now: Date): number | null {
  if (!previousOccurredAt) return null
  const raw = now.getTime() - previousOccurredAt.getTime()
  if (!Number.isFinite(raw)) return null
  return Math.min(Math.max(0, Math.round(raw)), MAX_INT32)
}

/**
 * Resulting case status.
 *
 * Order matters. REJECT and CANCEL are recorded as themselves even though
 * their destination step is normally terminal, because "rejected" and
 * "completed" are very different facts about a permit application and
 * collapsing them would corrupt every completion statistic downstream.
 */
function statusAfterTransition(
  action: TransitionAction,
  toStepIsTerminal: boolean,
): CaseStatus {
  if (action === 'REJECT') return 'REJECTED'
  if (action === 'CANCEL') return 'CANCELLED'
  if (action === 'RETURN') return 'RETURNED'
  if (toStepIsTerminal) return 'COMPLETED'
  return 'ACTIVE'
}

/**
 * Citizen visibility for a transition event.
 *
 * The rule is data-driven on purpose: an event is shown to the applicant when
 * it changes the status of their transaction (RETURN / APPROVE / REJECT /
 * CANCEL), or when the destination step carries a citizenLabel - which is the
 * office declaring, in the workflow definition, that this stage is one it is
 * willing to name publicly. Purely internal handoffs between steps that have
 * no citizen-facing label stay INTERNAL.
 *
 * Putting the decision in the definition rather than in code means an office
 * can widen or narrow what applicants see by editing its own workflow, and
 * that what they see is always vocabulary the office itself authored - which
 * is also what keeps the Citizen Explanation Agent paraphrasing configured
 * copy instead of inventing what a status means.
 */
function visibilityForTransition(
  action: TransitionAction,
  toStepCitizenLabel: string | null,
): Visibility {
  if (action === 'RETURN' || action === 'APPROVE' || action === 'REJECT' || action === 'CANCEL') {
    return 'CITIZEN'
  }
  return toStepCitizenLabel ? 'CITIZEN' : 'INTERNAL'
}

/** Duck-typed P2002. Avoids importing Prisma's error class, whose module path is not stable across versions. */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

// ---------------------------------------------------------------- eligibility

type EligibilityCandidate = {
  requiredRole: string
  guard: string | null
  /** Office the case is currently sitting at, already resolved by the caller. */
  currentOfficeId: string | null
}

type Eligibility = { code: WorkflowErrorCode | null; reason: string | null }

const ELIGIBLE: Eligibility = { code: null, reason: null }

/**
 * The single authorization evaluator.
 *
 * executeTransition() turns a non-null code into a thrown WorkflowError;
 * getAvailableTransitions() turns it into a greyed-out button with a reason.
 * They MUST share this function - if the UI computed availability with its own
 * copy of the rules, the two would drift and the drift would show up as either
 * a button that errors when pressed or, far worse, a rule the UI enforced that
 * the server did not.
 *
 * ---------------------------------------------------------------------------
 * THE OFFICE RULE
 * ---------------------------------------------------------------------------
 * An OFFICER may act on a case only while it is sitting at that officer's own
 * office. "Sitting at" is Case.currentOfficeId, which the engine keeps equal
 * to the office of the current step.
 *
 * Corollaries, all deliberate:
 *   - An officer whose User.officeId is null is refused. A blank office is
 *     missing data, and treating missing data as "matches everything" is how
 *     an authorization check becomes decorative.
 *   - If the current step has no office (Case.currentOfficeId is null - e.g. a
 *     "with the applicant" step after a RETURN), no office restriction can be
 *     evaluated, so none is applied and the transition's requiredRole is the
 *     only control. This is the correct reading: an office-less step belongs to
 *     no office, so there is no office to match.
 *   - ADMINISTRATOR is exempt. Administrators are the escalation path for a
 *     case parked at an office whose officer is on leave, and every such act
 *     is on the ledger with actorRole ADMINISTRATOR, so the exemption is
 *     auditable rather than invisible.
 *   - CITIZEN is exempt, because a citizen belongs to no office. Their access
 *     is bounded by case ownership instead (see below).
 *
 * ---------------------------------------------------------------------------
 * ROLE AND OWNERSHIP
 * ---------------------------------------------------------------------------
 * The actor's role must equal WorkflowTransition.requiredRole. ADMINISTRATOR
 * may additionally fire any transition, for the escalation reason above.
 *
 * A CITIZEN actor must be the case's applicant. Where Case.applicantId is null
 * - a walk-in filed at a counter, which has no citizen account attached - there
 * is nothing to compare against, so the check cannot be made and the
 * transition is allowed on the strength of requiredRole alone. That is a real
 * gap and it is recorded here rather than hidden: closing it needs the
 * authorization layer that resolves the session to refuse to present a
 * CITIZEN actor for a case they do not own.
 */
async function evaluateEligibility(
  candidate: EligibilityCandidate,
  actor: TransitionActor,
  caseRow: Case,
  tx: WorkflowTx,
): Promise<Eligibility> {
  if (isTerminalStatus(caseRow.status)) {
    return {
      code: 'CASE_TERMINAL',
      reason: `This transaction is already ${caseRow.status.toLowerCase()} and no longer moves through the workflow.`,
    }
  }

  const isAdministrator = actor.role === 'ADMINISTRATOR'

  if (!isAdministrator && actor.role !== candidate.requiredRole) {
    return {
      code: 'ROLE_NOT_PERMITTED',
      reason: `This action requires the ${candidate.requiredRole} role; you are acting as ${actor.role}.`,
    }
  }

  if (actor.role === 'CITIZEN' && caseRow.applicantId && caseRow.applicantId !== actor.userId) {
    return {
      code: 'ROLE_NOT_PERMITTED',
      reason: 'A citizen may only act on their own transaction.',
    }
  }

  if (actor.role === 'OFFICER' && candidate.currentOfficeId !== null) {
    if (actor.officeId === null) {
      return {
        code: 'OFFICE_MISMATCH',
        reason:
          'Your account has no office assignment, so it cannot act on a transaction held by an office.',
      }
    }
    if (actor.officeId !== candidate.currentOfficeId) {
      return {
        code: 'OFFICE_MISMATCH',
        reason: 'This transaction is currently held by a different office.',
      }
    }
  }

  if (candidate.guard) {
    // resolveGuard fails closed on an unrecognised name - see guards.ts.
    const outcome = await resolveGuard(candidate.guard)({
      caseId: caseRow.id,
      caseRow,
      tx: tx as GuardClient,
    })
    if (!outcome.pass) {
      return {
        code: 'GUARD_FAILED',
        reason: outcome.reason ?? `Guard "${candidate.guard}" denied this action.`,
      }
    }
  }

  return ELIGIBLE
}

// ---------------------------------------------------------------- transitions

export async function executeTransition(input: TransitionInput): Promise<TransitionResult> {
  const now = input.now ?? new Date()

  // Defence in depth: `action` is typed, but this function is reachable from a
  // request body, and a string that is not in the vocabulary must be refused
  // before it is used in a database query.
  if (!isTransitionAction(input.action)) {
    fail('TRANSITION_NOT_ALLOWED', `"${String(input.action)}" is not a workflow action.`)
  }

  return db.$transaction(async (tx) => {
    const caseRow = await tx.case.findUnique({
      where: { id: input.caseId },
      include: { currentStep: true },
    })
    if (!caseRow) fail('CASE_NOT_FOUND', `No case with id ${input.caseId}.`)

    const fromStep = caseRow.currentStep
    if (fromStep.definitionId !== caseRow.definitionId) {
      fail(
        'DEFINITION_INVALID',
        `Case ${caseRow.caseNumber} points at step ${fromStep.code}, which belongs to a different workflow definition.`,
      )
    }

    // The terminal check comes BEFORE resolving the transition, not with the
    // rest of the authorization rules. A closed case usually has no outgoing
    // transitions at all (its step is terminal), so resolving first would
    // report TRANSITION_NOT_ALLOWED - technically true, but it tells the
    // officer "that action does not exist here" when the real answer is "this
    // transaction is finished". evaluateEligibility checks it again, which is
    // what lets getAvailableTransitions() mark every action on a closed case
    // as blocked-because-closed; the duplication is deliberate.
    if (isTerminalStatus(caseRow.status)) {
      fail(
        'CASE_TERMINAL',
        `Case ${caseRow.caseNumber} is ${caseRow.status.toLowerCase()} and no longer moves through the workflow.`,
      )
    }

    // ---- resolve the transition ----------------------------------------
    const candidates = await tx.workflowTransition.findMany({
      where: {
        definitionId: caseRow.definitionId,
        fromStepId: caseRow.currentStepId,
        action: input.action,
      },
      include: { toStep: true },
    })
    const matching = input.toStepCode
      ? candidates.filter((t) => t.toStep.code === input.toStepCode)
      : candidates

    if (matching.length === 0) {
      fail(
        'TRANSITION_NOT_ALLOWED',
        input.toStepCode
          ? `No ${input.action} transition from step ${fromStep.code} to ${input.toStepCode} is defined.`
          : `No ${input.action} transition is defined from step ${fromStep.code}.`,
      )
    }
    if (matching.length > 1) {
      // Refusing to guess: several endorsement targets is a real configuration,
      // and silently picking one would route a permit to an office nobody chose.
      fail(
        'TRANSITION_NOT_ALLOWED',
        `${matching.length} ${input.action} transitions are defined from step ${fromStep.code}. Specify toStepCode: ${matching
          .map((t) => t.toStep.code)
          .join(', ')}.`,
      )
    }

    const transition = matching[0]
    const toStep = transition.toStep

    // ---- authorization and guards --------------------------------------
    const eligibility = await evaluateEligibility(
      {
        requiredRole: transition.requiredRole,
        guard: transition.guard,
        currentOfficeId: caseRow.currentOfficeId,
      },
      input.actor,
      caseRow,
      tx,
    )
    if (eligibility.code) fail(eligibility.code, eligibility.reason ?? undefined)

    // ---- append the event ----------------------------------------------
    const previous = await tx.caseEvent.findFirst({
      where: { caseId: caseRow.id },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, occurredAt: true },
    })
    const sequence = (previous?.sequence ?? 0) + 1
    const eventType = EVENT_TYPE_FOR_ACTION[input.action]
    const status = statusAfterTransition(input.action, toStep.isTerminal)

    // Metadata is hashed into the audit chain, so it holds structural facts
    // only - never applicant data, never free text. Recording the guard and
    // the resulting status here is what lets a later reviewer see which rule
    // was in force at the time, not just which rule is in force today.
    const metadata = {
      action: input.action,
      transitionId: transition.id,
      fromStepCode: fromStep.code,
      toStepCode: toStep.code,
      guard: transition.guard,
      isRework: transition.isRework,
      resultingStatus: status,
    }

    const event = await tx.caseEvent.create({
      data: {
        caseId: caseRow.id,
        sequence,
        type: eventType,
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        actorLabel: input.actor.name,
        officeId: caseRow.currentOfficeId,
        fromStepId: fromStep.id,
        toStepId: toStep.id,
        note: input.note ?? null,
        visibility: visibilityForTransition(input.action, toStep.citizenLabel),
        occurredAt: now,
        durationFromPrevMs: durationFromPrevMs(previous?.occurredAt ?? null, now),
        metadataJson: canonicalize(metadata),
      },
      select: {
        id: true,
        caseId: true,
        projectId: true,
        sequence: true,
        type: true,
        actorRole: true,
        officeId: true,
        fromStepId: true,
        toStepId: true,
        occurredAt: true,
        metadataJson: true,
      },
    })

    const audit = await auditLedger.append(auditPayloadFromEvent(event), tx)

    // ---- move the case --------------------------------------------------
    const terminalNow = isTerminalStatus(status)
    // A breach, once true, stays true: the point of the flag is that the
    // statutory period WAS exceeded, not that it is currently exceeded.
    // In-flight breach detection for open cases is the readers' job via
    // evaluateSla() in src/lib/domain/sla.ts; the engine only latches.
    const slaBreached =
      caseRow.slaBreached ||
      (caseRow.slaDueAt !== null && now.getTime() > caseRow.slaDueAt.getTime())

    await tx.case.update({
      where: { id: caseRow.id },
      data: {
        currentStepId: toStep.id,
        // The case sits wherever its step says it sits, including nowhere
        // (a step with no office means "with the applicant").
        currentOfficeId: toStep.officeId,
        status,
        completedAt: terminalNow ? (caseRow.completedAt ?? now) : null,
        slaBreached,
      },
    })

    return {
      caseId: caseRow.id,
      caseNumber: caseRow.caseNumber,
      fromStepCode: fromStep.code,
      toStepCode: toStep.code,
      eventId: event.id,
      sequence: audit.sequence,
      auditHash: audit.hash,
      status,
    }
  })
}

/**
 * Every transition out of the case's current step, each marked permitted or
 * not, with a reason when not.
 *
 * Blocked actions are RETURNED, not omitted. A greyed-out "Approve" with
 * "3 required documents are not yet verified" tells an officer what to do
 * next; a missing button tells them nothing and invites a phone call. It also
 * makes the process legible to the applicant-facing side of the prototype:
 * the rules are visible even when they are not satisfied.
 *
 * Cost note: each candidate with a guard runs that guard, so this is O(number
 * of transitions out of the step) queries. Step fan-out in a permit workflow
 * is small (single digits), so this is fine; it would need batching before
 * being used to render a list of many cases at once.
 */
export async function getAvailableTransitions(
  caseId: string,
  actor: TransitionActor,
): Promise<AvailableTransition[]> {
  return db.$transaction(async (tx) => {
    const caseRow = await tx.case.findUnique({
      where: { id: caseId },
      include: { currentStep: true },
    })
    if (!caseRow) fail('CASE_NOT_FOUND', `No case with id ${caseId}.`)

    const candidates = await tx.workflowTransition.findMany({
      where: { definitionId: caseRow.definitionId, fromStepId: caseRow.currentStepId },
      include: { toStep: true },
      orderBy: [{ action: 'asc' }, { toStepId: 'asc' }],
    })

    const results: AvailableTransition[] = []
    for (const candidate of candidates) {
      const eligibility = await evaluateEligibility(
        {
          requiredRole: candidate.requiredRole,
          guard: candidate.guard,
          currentOfficeId: caseRow.currentOfficeId,
        },
        actor,
        caseRow,
        tx,
      )
      results.push({
        // The column is a free string in the schema (portability); anything not
        // in the vocabulary is a definition bug that will be refused by
        // executeTransition, and is surfaced here rather than hidden.
        action: candidate.action as TransitionAction,
        toStepCode: candidate.toStep.code,
        toStepName: candidate.toStep.name,
        label: candidate.label,
        permitted: eligibility.code === null,
        blockedReason: eligibility.reason,
      })
    }
    return results
  })
}

// ---------------------------------------------------------------- intake

export type SubmitCaseInput = {
  serviceTypeCode: string
  /** Set when a registered citizen filed it themselves. Null for a counter walk-in. */
  applicantUserId?: string
  /** Synthetic identity only. Never a real person's name. */
  applicantName: string
  businessName?: string
  lguName?: string
  lguPsgcCode?: string
  /**
   * Optional initial document states, keyed by ServiceRequirement.code. Any
   * requirement not listed is created as MISSING. An unrecognised code is an
   * error, not something to ignore: silently dropping it would make a case
   * look complete when a caller believed it had supplied a document.
   */
  documents?: Array<{ requirementCode: string; status: DocumentStatus }>
  now?: Date
}

/**
 * How many times to retry the whole transaction on a case-number collision.
 * See allocateCaseNumber() for why a retry is needed at all.
 */
const CASE_NUMBER_ATTEMPTS = 6

/**
 * File a new transaction.
 *
 * Creates the Case at the definition's initial step, materialises a
 * CaseDocument row for EVERY configured requirement (so the citizen-facing
 * checklist is complete from the first second, including the things they have
 * not provided), computes the RA 11032 statutory deadline, and appends the
 * CASE_SUBMITTED event plus its audit record - all in one transaction.
 */
export async function submitCase(input: SubmitCaseInput): Promise<{
  caseId: string
  caseNumber: string
}> {
  const now = input.now ?? new Date()

  for (let attempt = 1; attempt <= CASE_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => createCaseInTransaction(tx, input, now))
    } catch (error) {
      // The only unique columns this transaction writes are Case.caseNumber and
      // AuditRecord's (eventId, caseId+sequence). The audit ones are derived
      // from a freshly minted event id on a brand-new case, so they cannot
      // collide. A P2002 here is therefore always the case number.
      if (isUniqueConstraintViolation(error) && attempt < CASE_NUMBER_ATTEMPTS) continue
      throw error
    }
  }

  // Unreachable: the loop either returns or rethrows.
  throw new Error('submitCase: exhausted case-number attempts without a result')
}

async function createCaseInTransaction(
  tx: WorkflowTx,
  input: SubmitCaseInput,
  now: Date,
): Promise<{ caseId: string; caseNumber: string }> {
  const serviceType = await tx.serviceType.findUnique({
    where: { code: input.serviceTypeCode },
    select: { id: true, code: true, ra11032Classification: true, isActive: true },
  })
  if (!serviceType) {
    fail('DEFINITION_INVALID', `No service type with code ${input.serviceTypeCode}.`)
  }
  if (!serviceType.isActive) {
    fail('DEFINITION_INVALID', `Service ${serviceType.code} is not currently accepting applications.`)
  }

  // Highest active version. Versioning exists so that a case in flight keeps
  // the definition it was filed under; new filings get the newest one.
  const definition = await tx.workflowDefinition.findFirst({
    where: { serviceTypeId: serviceType.id, isActive: true },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  })
  if (!definition) {
    fail('DEFINITION_INVALID', `Service ${serviceType.code} has no active workflow definition.`)
  }

  const initialSteps = await tx.workflowStep.findMany({
    where: { definitionId: definition.id, isInitial: true },
    select: { id: true, code: true, officeId: true, citizenLabel: true },
    orderBy: { sequence: 'asc' },
  })
  if (initialSteps.length !== 1) {
    fail(
      'DEFINITION_INVALID',
      `Workflow definition ${definition.id} has ${initialSteps.length} initial steps; exactly one is required.`,
    )
  }
  const initialStep = initialSteps[0]

  const requirements = await tx.serviceRequirement.findMany({
    where: { serviceTypeId: serviceType.id },
    select: { id: true, code: true, name: true },
    orderBy: { sequence: 'asc' },
  })

  const suppliedByCode = new Map<string, DocumentStatus>()
  for (const doc of input.documents ?? []) {
    suppliedByCode.set(doc.requirementCode, doc.status)
  }
  const unknownCodes = Array.from(suppliedByCode.keys()).filter(
    (code) => !requirements.some((r) => r.code === code),
  )
  if (unknownCodes.length > 0) {
    fail(
      'DEFINITION_INVALID',
      `Service ${serviceType.code} has no requirement(s) with code: ${unknownCodes.join(', ')}.`,
    )
  }

  // RA 11032 Sec. 9 deadline, in working days. Returns null for a
  // classification we do not recognise rather than guessing a legal deadline.
  const slaDueAt = computeStatutoryDueDate(now, serviceType.ra11032Classification)

  const caseNumber = await allocateCaseNumber(tx, now)

  const created = await tx.case.create({
    data: {
      caseNumber,
      serviceTypeId: serviceType.id,
      definitionId: definition.id,
      currentStepId: initialStep.id,
      currentOfficeId: initialStep.officeId,
      status: 'ACTIVE',
      applicantId: input.applicantUserId ?? null,
      applicantName: input.applicantName,
      businessName: input.businessName ?? null,
      lguName: input.lguName ?? null,
      lguPsgcCode: input.lguPsgcCode ?? null,
      submittedAt: now,
      slaDueAt,
      slaBreached: false,
      // Hard labels, set here rather than left to the schema default, so that
      // no code path can produce a Case that is not marked synthetic. Nothing
      // in this prototype may be presentable as official statistics.
      syntheticDemo: true,
      dataClassification: 'SYNTHETIC_DEMO',
    },
    select: { id: true, caseNumber: true },
  })

  if (requirements.length > 0) {
    await tx.caseDocument.createMany({
      data: requirements.map((requirement) => {
        const status = suppliedByCode.get(requirement.code) ?? 'MISSING'
        return {
          caseId: created.id,
          requirementId: requirement.id,
          name: requirement.name,
          status,
          // No files are stored in the prototype; fileRef stays null and is a
          // pointer field only. See the schema comment on CaseDocument.
          submittedAt: status === 'MISSING' ? null : now,
          verifiedAt: status === 'VERIFIED' ? now : null,
        }
      }),
    })
  }

  const workingDayLimit =
    serviceType.ra11032Classification in RA_11032_WORKING_DAY_LIMITS
      ? RA_11032_WORKING_DAY_LIMITS[
          serviceType.ra11032Classification as keyof typeof RA_11032_WORKING_DAY_LIMITS
        ]
      : null

  // Recording the statutory deadline in the hashed metadata, not just in the
  // mutable Case column, is deliberate: it means a later edit to Case.slaDueAt
  // can be detected. The deadline a transaction was filed under is exactly the
  // kind of fact an accountability record should pin down.
  const metadata = {
    serviceTypeCode: serviceType.code,
    ra11032Classification: serviceType.ra11032Classification,
    ra11032WorkingDayLimit: workingDayLimit,
    slaDueAt,
    definitionVersion: definition.version,
    initialStepCode: initialStep.code,
    requirementCount: requirements.length,
    dataClassification: 'SYNTHETIC_DEMO',
  }

  const event = await tx.caseEvent.create({
    data: {
      caseId: created.id,
      sequence: 1,
      type: 'CASE_SUBMITTED',
      actorUserId: input.applicantUserId ?? null,
      actorRole: 'CITIZEN',
      actorLabel: input.applicantName,
      officeId: initialStep.officeId,
      fromStepId: null,
      toStepId: initialStep.id,
      note: null,
      // Filing is always visible to the applicant - it is their own act.
      visibility: 'CITIZEN',
      occurredAt: now,
      // Nothing preceded it, so there is no dwell time to measure.
      durationFromPrevMs: null,
      metadataJson: canonicalize(metadata),
    },
    select: {
      id: true,
      caseId: true,
      projectId: true,
      sequence: true,
      type: true,
      actorRole: true,
      officeId: true,
      fromStepId: true,
      toStepId: true,
      occurredAt: true,
      metadataJson: true,
    },
  })

  await auditLedger.append(auditPayloadFromEvent(event), tx)

  return { caseId: created.id, caseNumber: created.caseNumber }
}

/**
 * Next case number for the year, as CASE-YYYY-NNNN.
 *
 * ---------------------------------------------------------------------------
 * UNIQUENESS UNDER CONCURRENCY
 * ---------------------------------------------------------------------------
 * The obvious "max + 1" is a read-then-write race: two concurrent filings can
 * read the same maximum and both try to insert CASE-2026-0007.
 *
 * Two layers handle it:
 *
 *   1. The read happens INSIDE the filing transaction. On SQLite that is
 *      already sufficient - write transactions are serialised, so the second
 *      filer's read cannot observe a stale maximum.
 *   2. Case.caseNumber is UNIQUE, and submitCase() retries the whole
 *      transaction on P2002. This is the layer that matters on PostgreSQL,
 *      where two REPEATABLE READ transactions genuinely can read the same
 *      maximum; the unique index turns the race into a retryable error rather
 *      than a duplicate number. Retries are bounded, so a pathological
 *      contention loop fails loudly instead of spinning.
 *
 * The alternative - a dedicated counter table locked with SELECT ... FOR
 * UPDATE, or a database sequence - gives a single round trip with no retries,
 * but SQLite has neither, and the schema is deliberately provider-portable
 * with no provider-specific constructs. The retry loop costs nothing at
 * prototype volumes and behaves correctly on both engines, so portability
 * wins here. At real volumes, switch to a sequence on PostgreSQL.
 *
 * Numbering is per calendar year in UTC, matching the rest of the date
 * handling in src/lib/domain/sla.ts. A deployment reckoning in Philippine
 * local time would see a handful of end-of-December filings numbered into the
 * following year; that is a cosmetic issue, and fixing it means committing the
 * whole system to a timezone, which belongs in a configuration decision rather
 * than buried in a number generator.
 */
async function allocateCaseNumber(tx: WorkflowTx, now: Date): Promise<string> {
  const year = now.getUTCFullYear()
  const prefix = `CASE-${year}-`

  const latest = await tx.case.findFirst({
    where: { caseNumber: { startsWith: prefix } },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  })

  let next = 1
  if (latest) {
    const parsed = Number.parseInt(latest.caseNumber.slice(prefix.length), 10)
    // A malformed suffix (hand-edited row, imported data) must not silently
    // reset numbering to 1 and collide with everything; counting is the safe
    // fallback because it can only ever be too high, never too low.
    if (Number.isFinite(parsed) && parsed > 0) {
      next = parsed + 1
    } else {
      next = (await tx.case.count({ where: { caseNumber: { startsWith: prefix } } })) + 1
    }
  }

  // Four digits is the display convention, not a cap: the 10000th case of a
  // year becomes CASE-2026-10000 rather than wrapping.
  return `${prefix}${String(next).padStart(4, '0')}`
}

// ---------------------------------------------------------------- annotations

export type AppendCaseEventInput = {
  caseId: string
  type: EventType
  actor: TransitionActor
  note?: string
  /** Structural facts only. THIS IS HASHED into the audit chain - no personal data, no free text. */
  metadata?: Record<string, unknown>
  /** Overrides DEFAULT_ANNOTATION_VISIBILITY for this event. */
  visibility?: Visibility
  now?: Date
}

export type AppendCaseEventResult = {
  caseId: string
  eventId: string
  sequence: number
  auditHash: string
  type: EventType
  visibility: Visibility
}

/**
 * Append a non-transition event: a note, a document verification, the disposal
 * of an AI recommendation, an assignment.
 *
 * Same atomicity as a transition - one CaseEvent, one chained AuditRecord, one
 * transaction - but the Case row is NOT touched. That is the whole distinction:
 * annotations enter the record without moving the case, and event types that
 * imply movement are refused (ENGINE_RESERVED_EVENT_TYPES) so a caller cannot
 * write a timeline that disagrees with the Case row while the audit chain
 * endorses the disagreement.
 *
 * Appending to a CLOSED case is allowed. The ledger is append-only, and a
 * correction, a late document, or an audit finding recorded after a permit was
 * released is legitimate history that belongs on the record. What is refused
 * is the case MOVING again - executeTransition rejects a terminal case.
 *
 * The office rule (see evaluateEligibility) applies here too, with one
 * exception: NOTE_ADDED. Cross-office correspondence about a case is normal and
 * a note changes nothing authoritative, whereas every other annotation touches
 * the substantive record and should come from the office holding the case.
 */
export async function appendCaseEvent(
  input: AppendCaseEventInput,
): Promise<AppendCaseEventResult> {
  const now = input.now ?? new Date()

  if (!(EVENT_TYPES as readonly string[]).includes(input.type)) {
    fail('TRANSITION_NOT_ALLOWED', `"${String(input.type)}" is not a known event type.`)
  }
  if (ENGINE_RESERVED_EVENT_TYPES.includes(input.type)) {
    fail(
      'TRANSITION_NOT_ALLOWED',
      `${input.type} records a state change and may only be written by executeTransition() or submitCase().`,
    )
  }

  const allowedRoles = ANNOTATION_EVENT_ROLES[input.type]
  if (!allowedRoles) {
    // Fail closed, for the same reason guards do: an event type nobody has
    // decided the permissions for must not default to "anyone may write it".
    fail('ROLE_NOT_PERMITTED', `No role is configured as able to append ${input.type}.`)
  }
  if (!allowedRoles.includes(input.actor.role)) {
    fail(
      'ROLE_NOT_PERMITTED',
      `${input.type} may be appended by ${allowedRoles.join(' or ')}; you are acting as ${input.actor.role}.`,
    )
  }

  return db.$transaction(async (tx) => {
    const caseRow = await tx.case.findUnique({
      where: { id: input.caseId },
      select: { id: true, currentOfficeId: true, currentStepId: true, applicantId: true },
    })
    if (!caseRow) fail('CASE_NOT_FOUND', `No case with id ${input.caseId}.`)

    if (input.actor.role === 'CITIZEN' && caseRow.applicantId && caseRow.applicantId !== input.actor.userId) {
      fail('ROLE_NOT_PERMITTED', 'A citizen may only act on their own transaction.')
    }

    if (
      input.actor.role === 'OFFICER' &&
      input.type !== 'NOTE_ADDED' &&
      caseRow.currentOfficeId !== null
    ) {
      if (input.actor.officeId === null) {
        fail(
          'OFFICE_MISMATCH',
          'Your account has no office assignment, so it cannot annotate a transaction held by an office.',
        )
      }
      if (input.actor.officeId !== caseRow.currentOfficeId) {
        fail('OFFICE_MISMATCH', 'This transaction is currently held by a different office.')
      }
    }

    const previous = await tx.caseEvent.findFirst({
      where: { caseId: caseRow.id },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, occurredAt: true },
    })
    const sequence = (previous?.sequence ?? 0) + 1
    const visibility = input.visibility ?? DEFAULT_ANNOTATION_VISIBILITY[input.type] ?? 'INTERNAL'

    const event = await tx.caseEvent.create({
      data: {
        caseId: caseRow.id,
        sequence,
        type: input.type,
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        actorLabel: input.actor.name,
        officeId: input.actor.officeId ?? caseRow.currentOfficeId,
        // An annotation does not move the case, so both step fields describe
        // where it is standing: null "from", current step as "to". Reading the
        // timeline, from == null and to == current means "recorded at", not
        // "moved to".
        fromStepId: null,
        toStepId: caseRow.currentStepId,
        note: input.note ?? null,
        visibility,
        occurredAt: now,
        durationFromPrevMs: durationFromPrevMs(previous?.occurredAt ?? null, now),
        metadataJson: input.metadata ? canonicalize(input.metadata) : null,
      },
      select: {
        id: true,
        caseId: true,
        projectId: true,
        sequence: true,
        type: true,
        actorRole: true,
        officeId: true,
        fromStepId: true,
        toStepId: true,
        occurredAt: true,
        metadataJson: true,
      },
    })

    const audit = await auditLedger.append(auditPayloadFromEvent(event), tx)

    return {
      caseId: caseRow.id,
      eventId: event.id,
      sequence: audit.sequence,
      auditHash: audit.hash,
      type: input.type,
      visibility,
    }
  })
}
