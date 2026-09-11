/**
 * Declarative transition guards.
 *
 * A WorkflowTransition row may name a guard in its `guard` column. The engine
 * looks that name up here and refuses the transition if the guard denies it.
 *
 * WHY A WHITELIST RATHER THAN EXPRESSIONS IN THE DATABASE
 * A configurable workflow is tempting to make fully data-driven - store a
 * predicate expression in the row and evaluate it. That turns the workflow
 * definition table into an execution surface: whoever can write a row can run
 * code with database access. Instead the database holds only a NAME, and the
 * behaviour lives in reviewable, testable TypeScript in this file. Adding a
 * guard is a code change that goes through review, which is the correct
 * ceremony for a rule that decides whether a permit may advance.
 *
 * WHY UNKNOWN NAMES FAIL CLOSED
 * resolveGuard() never returns undefined; for an unrecognised name it returns
 * a guard that always denies. The alternative - treating an unknown guard as
 * "no guard, proceed" - means a typo in a guard name, a renamed function, or a
 * definition imported from an environment that had an extra guard, all
 * silently REMOVE a safety check while the workflow keeps running and looks
 * healthy. Failing closed converts each of those into an immediately visible
 * refusal with an explicit reason. A stuck case is a bug someone fixes in
 * minutes; a silently disabled prerequisite is a permit issued without its
 * checks, and nobody finds out.
 *
 * Guards are READ-ONLY. They receive the caller's transaction handle so they
 * see the same snapshot as the rest of the transition, and they must not write
 * anything: a guard that mutated state would produce side effects on refusal.
 */

import type { Prisma } from '@prisma/client'
import type { Case } from '@prisma/client'

/**
 * Prisma's interactive-transaction client. Typed concretely rather than as
 * `any` so a guard that reaches for a delegate that does not exist fails at
 * compile time. A plain PrismaClient is assignable to this, so a guard can
 * also be evaluated outside a transaction (getAvailableTransitions does).
 */
export type GuardClient = Prisma.TransactionClient

export type GuardContext = {
  caseId: string
  /** The case row as loaded by the engine, inside the same transaction. */
  caseRow: Case
  tx: GuardClient
}

export type GuardOutcome = {
  pass: boolean
  /**
   * Why the guard denied, phrased for the officer who is being stopped, and
   * always populated when pass is false. Null when it passed. The engine puts
   * this into WorkflowError.detail and getAvailableTransitions puts it into
   * blockedReason, so it is user-visible: state the missing prerequisite, not
   * the applicant's data.
   */
  reason: string | null
}

export type GuardFn = (ctx: GuardContext) => Promise<GuardOutcome>

const PASS: GuardOutcome = { pass: true, reason: null }

function deny(reason: string): GuardOutcome {
  return { pass: false, reason }
}

// ---------------------------------------------------------------- the guards

/**
 * Every required documentary requirement for the service has a VERIFIED
 * document.
 *
 * Only requirements marked isRequired count, and only documents linked to a
 * requirement (requirementId not null) are considered. Ad-hoc attachments that
 * an officer added outside the configured requirement list never block a
 * transition - they are supplementary, and letting them block would mean an
 * officer could deadlock a case by attaching a file.
 *
 * A requirement with no CaseDocument row at all also blocks. submitCase()
 * creates a row for every requirement, so a genuinely absent row means the
 * case predates the requirement being added to the service - which is exactly
 * the situation where a human should look, not one to wave through.
 */
const allRequiredDocumentsVerified: GuardFn = async ({ caseRow, tx }) => {
  const requirements = await tx.serviceRequirement.findMany({
    where: { serviceTypeId: caseRow.serviceTypeId, isRequired: true },
    select: { id: true, name: true },
  })
  if (requirements.length === 0) return PASS

  const documents = await tx.caseDocument.findMany({
    where: { caseId: caseRow.id, requirementId: { in: requirements.map((r) => r.id) } },
    select: { requirementId: true, status: true },
  })

  const statusByRequirement = new Map<string, string>()
  for (const doc of documents) {
    if (!doc.requirementId) continue
    // If a requirement somehow has several documents, VERIFIED wins - a later
    // accepted resubmission should not be held back by an earlier rejection.
    const existing = statusByRequirement.get(doc.requirementId)
    if (existing === 'VERIFIED') continue
    statusByRequirement.set(doc.requirementId, doc.status)
  }

  const outstanding = requirements.filter(
    (r) => statusByRequirement.get(r.id) !== 'VERIFIED',
  )
  if (outstanding.length === 0) return PASS

  const names = outstanding.slice(0, 3).map((r) => r.name)
  const suffix = outstanding.length > names.length ? `, and ${outstanding.length - names.length} more` : ''
  return deny(
    `${outstanding.length} of ${requirements.length} required document(s) are not yet verified: ${names.join(', ')}${suffix}.`,
  )
}

/**
 * Weaker sibling of the above: every required requirement has a document that
 * is at least SUBMITTED (SUBMITTED or VERIFIED).
 *
 * Useful on a receiving step, where the front desk checks completeness of the
 * bundle but is not the office that verifies its contents - RA 11032's
 * one-time assessment idea is that the applicant should be told everything
 * that is missing at the counter, in one go, rather than in instalments.
 */
const allRequiredDocumentsSubmitted: GuardFn = async ({ caseRow, tx }) => {
  const requirements = await tx.serviceRequirement.findMany({
    where: { serviceTypeId: caseRow.serviceTypeId, isRequired: true },
    select: { id: true, name: true },
  })
  if (requirements.length === 0) return PASS

  const present = await tx.caseDocument.findMany({
    where: {
      caseId: caseRow.id,
      requirementId: { in: requirements.map((r) => r.id) },
      status: { in: ['SUBMITTED', 'VERIFIED'] },
    },
    select: { requirementId: true },
  })
  const presentIds = new Set(present.map((d) => d.requirementId))
  const outstanding = requirements.filter((r) => !presentIds.has(r.id))
  if (outstanding.length === 0) return PASS

  const names = outstanding.slice(0, 3).map((r) => r.name)
  const suffix = outstanding.length > names.length ? `, and ${outstanding.length - names.length} more` : ''
  return deny(
    `${outstanding.length} required document(s) have not been submitted: ${names.join(', ')}${suffix}.`,
  )
}

/**
 * No AgentRecommendation on this case is still `pending`.
 *
 * This is the guard that operationalises the project's AI rule: an agent may
 * only propose, and a human with the right role must dispose. Left ungated, a
 * case could sail past an open recommendation, and the recommendation would
 * then sit in the table forever looking like an unread warning that nobody was
 * ever required to answer. Requiring disposal (approve or reject - either is
 * fine, both are recorded) means the human decision is always on the record
 * before the case moves.
 *
 * Note it does NOT require the recommendation to be APPROVED. An officer
 * rejecting an agent's suggestion and proceeding is a legitimate, and
 * important, outcome to keep cheap.
 */
const noPendingRecommendations: GuardFn = async ({ caseRow, tx }) => {
  const pending = await tx.agentRecommendation.findMany({
    where: { caseId: caseRow.id, status: 'pending' },
    select: { agentType: true },
  })
  if (pending.length === 0) return PASS

  const types = Array.from(new Set(pending.map((r) => r.agentType))).join(', ')
  return deny(
    `${pending.length} AI recommendation(s) are still awaiting a human decision (${types}). Approve or reject them before proceeding.`,
  )
}

/**
 * The whitelist. Keys are the literal strings permitted in
 * WorkflowTransition.guard.
 */
export const GUARDS: Record<string, GuardFn> = {
  allRequiredDocumentsVerified,
  allRequiredDocumentsSubmitted,
  noPendingRecommendations,
}

export const GUARD_NAMES: readonly string[] = Object.keys(GUARDS)

export function isKnownGuard(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(GUARDS, name)
}

/**
 * Resolve a guard name to a function, failing closed.
 *
 * Returns a denying guard - not undefined, and not a passing guard - for any
 * name that is not in the whitelist. See the file header for why. The lookup
 * uses hasOwnProperty so inherited Object.prototype keys ("toString",
 * "constructor") cannot resolve to something callable.
 */
export function resolveGuard(name: string): GuardFn {
  if (isKnownGuard(name)) return GUARDS[name]
  return async () =>
    deny(
      `Unknown guard "${name}" is referenced by this transition. Refusing to proceed: an unrecognised guard is treated as a denied guard, never as an absent one.`,
    )
}
