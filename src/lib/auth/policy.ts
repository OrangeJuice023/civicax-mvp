/**
 * Authorization policy - the single source of truth for "may this caller do
 * this to this thing".
 *
 * ---------------------------------------------------------------------------
 * Why a policy module instead of checks scattered through the routes
 * ---------------------------------------------------------------------------
 * Every access-control bug in a system like this has the same shape: one route
 * out of fifteen forgot a condition. Concentrating the rules in one pure,
 * table-driven function makes the whole matrix reviewable on one screen and
 * unit-testable without a database, a request, or a browser. Routes and server
 * components ask; they never decide.
 *
 * This module is PURE. No Prisma, no next/headers, no fetch. It takes a caller
 * and a description of the resource and returns a decision. That is what lets
 * policy.test.ts assert the entire matrix, including the negative cases, in
 * milliseconds - and what keeps the rules from quietly depending on request
 * state that a test cannot reproduce.
 *
 * ---------------------------------------------------------------------------
 * What this module does NOT decide
 * ---------------------------------------------------------------------------
 * 1. Whether a specific workflow transition is legal. That is the workflow
 *    engine's job: WorkflowTransition.requiredRole and its guard say whether
 *    THIS step may move THIS way. can(user, 'case:transition', case) only says
 *    the caller is entitled to act on the case at all. Both must pass.
 * 2. Whether an AI recommendation may change anything. It may not. An approved
 *    recommendation is an instruction to the engine, executed under the
 *    approving human's authority, and that human needs 'recommendation:review'
 *    on the case. No agent code ever calls can() on its own behalf.
 * 3. Row filtering for list endpoints. can() answers a question about ONE
 *    resource. For queries, use caseAccessScopeForUser / analyticsScopeForUser
 *    below, which return a machine-checkable scope instead of prose - see the
 *    note on obligation reasons.
 *
 * Nothing here is a UI hint. The client is welcome to hide a button, but the
 * server-side route must ask again, because the client is not trusted.
 */

import type { SessionUser } from './session'
// Relative, not '@/lib/...': keeps this module (and its test) resolvable by
// plain node and by vitest without a path-alias config.
import { isRole, type Role } from '../domain/constants'
import { AuthError } from './errors'

/**
 * The verbs Kawing authorises. Derived from a const array so that tests can
 * enumerate them and prove no action is silently unhandled.
 *
 * 'case:read'          - the citizen-facing view of a transaction: status,
 *                        step, statutory deadline, citizen-visible timeline.
 * 'case:read-internal' - internal notes, officer identities, agent
 *                        recommendations, the full event log. The distinction
 *                        between these two is the whole transparency model.
 */
export const ACTIONS = [
  'case:read',
  'case:read-internal',
  'case:create',
  'case:transition',
  'case:note',
  'document:verify',
  'recommendation:read',
  'recommendation:review',
  'analytics:read',
  'workflow:configure',
  'audit:verify',
  // Infrastructure domain verbs. A project is not a transaction: it has a
  // contractor, a budget, a location and a lifecycle of milestones. The
  // oversight office (the project's owning office) controls milestone
  // submission, evidence verification and validation; the contractor and the
  // public get read-only access.
  'project:read',
  'project:read-internal',
  'project:create',
  'project:submit-milestone',
  'project:verify-evidence',
  'project:complete-validation',
  'project:approve-milestone',
  'project:return-milestone',
  'project:release-payment',
  'project:configure',
] as const

export type Action = (typeof ACTIONS)[number]

/**
 * A case, described by only the two facts authorization depends on: who filed
 * it and which office is holding it now.
 *
 * Deliberately not the Prisma Case type. Passing the whole row would couple the
 * policy to the ORM and tempt a future rule to reach for a field that the
 * caller had not actually loaded (an undefined field silently failing open is
 * how these bugs happen).
 */
export type CaseResource = {
  kind: 'case'
  /** User.id of the applicant, or null for a case filed at a counter with no citizen account. */
  applicantId: string | null
  /** Case.currentOfficeId - custody right now, not history. */
  currentOfficeId: string | null
}

/**
 * A public-infrastructure project, described by only the two facts
 * authorization depends on: which office owns it (the oversight office) and
 * which office is the contractor's reporting office, if any.
 *
 * Same structural discipline as CaseResource: not the Prisma Project type, so
 * a rule cannot reach for a field the caller did not load.
 */
export type ProjectResource = {
  kind: 'project'
  /** Project.officeId - the oversight office that owns the file. */
  officeId: string | null
  /** The contractor's reporting office, when the project has one. */
  contractorOfficeId: string | null
}

export type PolicyResource = CaseResource | ProjectResource | { kind: 'global' }

/**
 * The answer.
 *
 * `reason` is always populated when denied - it is the text a route may show,
 * and the text a reviewer reads in a log to understand a refusal.
 *
 * When ALLOWED, reason is usually null but is NOT always: a global-resource
 * grant to a citizen or an officer carries an obligation note, because the
 * grant means "you may access this class of resource, subject to a filter you
 * must apply". Read those notes as instructions, and satisfy them with the
 * scope helpers at the bottom of this file rather than by hand.
 */
export type PolicyDecision = { allowed: boolean; reason: string | null }

const ALLOWED: PolicyDecision = { allowed: true, reason: null }

function deny(reason: string): PolicyDecision {
  return { allowed: false, reason }
}

function allowWithObligation(reason: string): PolicyDecision {
  return { allowed: true, reason }
}

/**
 * How a rule is scoped.
 *
 * 'allow'
 *   Unconditional for this role.
 *
 * 'own-cases'
 *   Only the caller's own transactions. With a case resource, the case's
 *   applicantId must be the caller. With the global resource the decision is
 *   allowed but carries the obligation to filter by applicantId - that is what
 *   makes "my applications" work without also making "all applications" work.
 *
 * 'office-cases'
 *   Only transactions currently in the caller's office. Same two shapes.
 *
 * `caseRequired: true` refuses the global resource outright. It is set for
 * every action that MUTATES or decides something, because "act on all cases in
 * my office" is never a coherent request and a route that asked it that way
 * would be a route that forgot to load the case.
 *
 * 'deny'
 *   With a reason specific to this role and action, not a generic refusal.
 */
type Rule =
  | { effect: 'allow' }
  | { effect: 'own-cases'; caseRequired: boolean }
  | { effect: 'office-cases'; caseRequired: boolean }
  | { effect: 'deny'; reason: string }

/**
 * ---------------------------------------------------------------------------
 * THE MATRIX
 * ---------------------------------------------------------------------------
 * Record<Role, Record<Action, Rule>> is load-bearing: adding a role to
 * constants.ts or an action to ACTIONS makes this object fail to typecheck
 * until someone decides, explicitly, what the answer is. There is no default
 * branch to fall through, which is the point - an unconsidered permission is
 * the bug this shape prevents.
 *
 * At runtime the lookup is still treated as possibly-undefined, so a string
 * that was never a valid Action (arriving from JSON, say) is denied rather
 * than crashing or matching by accident.
 */
const POLICY: Record<Role, Record<Action, Rule>> = {
  /**
   * CITIZEN - the applicant.
   *
   * Reads only their own transactions, and only the citizen-visible projection
   * of them: status, current step's citizen label, statutory deadline, and the
   * events explicitly marked visibility CITIZEN. Never internal notes, never
   * which named officer is holding the file, never analytics. Two reasons, and
   * both are substantive rather than squeamish: the identity of an individual
   * evaluator is not the applicant's business and publishing it invites
   * pressure on that evaluator; and aggregate performance data over synthetic
   * transactions must not circulate as if it described a real office.
   */
  CITIZEN: {
    'case:read': { effect: 'own-cases', caseRequired: false },
    'case:read-internal': {
      effect: 'deny',
      reason:
        'Internal case records - officer identities, internal notes and agent recommendations - are not part of the applicant view.',
    },
    'case:create': { effect: 'allow' },
    'case:transition': {
      effect: 'deny',
      reason: 'Only the office handling a transaction can move it to the next step.',
    },
    'case:note': {
      effect: 'deny',
      reason:
        'Case notes are an internal record. Kawing v0.1 has no applicant messaging channel; adding one would need its own action and its own visibility rules.',
    },
    'document:verify': {
      effect: 'deny',
      reason: 'Only the receiving office can verify a submitted requirement.',
    },
    'recommendation:read': {
      effect: 'deny',
      reason:
        'Agent recommendations are internal deliberative material awaiting a human decision, not a finding about the application.',
    },
    'recommendation:review': {
      effect: 'deny',
      reason: 'Only an officer of the handling office can act on an agent recommendation.',
    },
    'analytics:read': {
      effect: 'deny',
      reason: 'Process analytics are for the offices operating the process.',
    },
    'workflow:configure': {
      effect: 'deny',
      reason: 'Workflow configuration is an administrator function.',
    },
    'audit:verify': {
      effect: 'deny',
      reason:
        'Audit chain verification is an administrator function in v0.1. Extending it to an applicant for their own case would be a defensible transparency feature, but it is a deliberate future decision, not an oversight.',
    },
    'project:read': { effect: 'allow' },
    'project:read-internal': {
      effect: 'deny',
      reason:
        'Project internals - validator identities, validation notes, payment details - are not part of the public view.',
    },
    'project:create': {
      effect: 'deny',
      reason: 'Projects are registered by the oversight agency, not by applicants.',
    },
    'project:submit-milestone': {
      effect: 'deny',
      reason: 'Milestones are submitted by the contractor through the oversight office.',
    },
    'project:verify-evidence': {
      effect: 'deny',
      reason: 'Evidence verification belongs to the oversight office.',
    },
    'project:complete-validation': {
      effect: 'deny',
      reason: 'Validation completion belongs to the named validator panel.',
    },
    'project:approve-milestone': {
      effect: 'deny',
      reason: 'Milestone approval belongs to the oversight office.',
    },
    'project:return-milestone': {
      effect: 'deny',
      reason: 'Returning a milestone belongs to the oversight office.',
    },
    'project:release-payment': {
      effect: 'deny',
      reason: 'Payment release belongs to the oversight office.',
    },
    'project:configure': {
      effect: 'deny',
      reason: 'Project configuration is an administrator function.',
    },
  },

  /**
   * OFFICER - the person doing the work.
   *
   * Scope is CURRENT CUSTODY: the cases sitting in their office right now.
   * Honest limitation - an officer who handled a case last week and endorsed it
   * onward loses access to it, even though CaseAssignment records that they
   * handled it. Custody-based scoping is the conservative reading of "cases at
   * their own office" and it is what v0.1 implements; a fuller model would
   * grant continued read access on the strength of a past assignment, and that
   * belongs in this table (a new rule effect) rather than in a route.
   *
   * case:create is granted because frontline receiving is a real function: a
   * walk-in applicant with no account still has to be encoded by someone. The
   * resulting Case carries a synthetic applicantName and no applicantId.
   */
  OFFICER: {
    'case:read': { effect: 'office-cases', caseRequired: false },
    'case:read-internal': { effect: 'office-cases', caseRequired: false },
    'case:create': { effect: 'allow' },
    'case:transition': { effect: 'office-cases', caseRequired: true },
    'case:note': { effect: 'office-cases', caseRequired: true },
    'document:verify': { effect: 'office-cases', caseRequired: true },
    'recommendation:read': { effect: 'office-cases', caseRequired: false },
    'recommendation:review': { effect: 'office-cases', caseRequired: true },
    // Allowed, but only ever for their own office: analyticsScopeForUser
    // returns that constraint in a form a query can use.
    'analytics:read': { effect: 'office-cases', caseRequired: false },
    'workflow:configure': {
      effect: 'deny',
      reason:
        'Changing the process itself is an administrator function, separate from operating it.',
    },
    'audit:verify': {
      effect: 'deny',
      reason: 'Audit chain verification is an administrator function.',
    },
    'project:read': { effect: 'allow' },
    'project:read-internal': { effect: 'office-cases', caseRequired: false },
    'project:create': { effect: 'allow' },
    'project:submit-milestone': { effect: 'office-cases', caseRequired: true },
    'project:verify-evidence': { effect: 'office-cases', caseRequired: true },
    'project:complete-validation': { effect: 'allow' },
    'project:approve-milestone': { effect: 'office-cases', caseRequired: true },
    'project:return-milestone': { effect: 'office-cases', caseRequired: true },
    'project:release-payment': { effect: 'office-cases', caseRequired: true },
    'project:configure': {
      effect: 'deny',
      reason: 'Project configuration is an administrator function.',
    },
  },

  /**
   * ADMINISTRATOR - oversight and configuration.
   *
   * Full read across offices, all analytics, workflow configuration, audit
   * verification. NOT case actions: an administrator cannot fire a transition,
   * verify a document, annotate a case, or approve an agent recommendation.
   *
   * This is the most consequential decision in the file, so it is stated
   * loudly: an administrator can see everything and can change the process, but
   * cannot decide an individual citizen's transaction. Separating the power to
   * configure from the power to act is what keeps the audit trail meaningful -
   * if the person who defines the workflow can also approve inside it, "the
   * process was followed" stops being evidence of anything. If a deployment
   * genuinely needs an administrator who can also act, the correct answer is to
   * give that person an OFFICER account for their office, so their actions are
   * attributed to the office that held the file.
   */
  ADMINISTRATOR: {
    'case:read': { effect: 'allow' },
    'case:read-internal': { effect: 'allow' },
    'case:create': {
      effect: 'deny',
      reason:
        'Applications are filed by applicants or encoded by the receiving office, not created from the administration console.',
    },
    'case:transition': {
      effect: 'deny',
      reason:
        'Administrators configure and audit the process; they do not decide individual transactions. Act through an officer account of the handling office.',
    },
    'case:note': {
      effect: 'deny',
      reason:
        'The case record is written by the offices handling it, so that the trail attributes each entry to the office that held the file.',
    },
    'document:verify': {
      effect: 'deny',
      reason: 'Requirement verification belongs to the office that received the document.',
    },
    'recommendation:read': { effect: 'allow' },
    'recommendation:review': {
      effect: 'deny',
      reason:
        'Approving an agent recommendation executes a workflow action, which is an officer decision, not an administrative one.',
    },
    'analytics:read': { effect: 'allow' },
    'workflow:configure': { effect: 'allow' },
    'audit:verify': { effect: 'allow' },
    'project:read': { effect: 'allow' },
    'project:read-internal': { effect: 'allow' },
    'project:create': {
      effect: 'deny',
      reason: 'Projects are registered by the oversight agency, not by applicants.',
    },
    'project:submit-milestone': {
      effect: 'deny',
      reason: 'Milestones are submitted by the contractor through the oversight office.',
    },
    'project:verify-evidence': {
      effect: 'deny',
      reason: 'Evidence verification belongs to the oversight office.',
    },
    'project:complete-validation': {
      effect: 'deny',
      reason: 'Validation completion belongs to the named validator panel.',
    },
    'project:approve-milestone': {
      effect: 'deny',
      reason: 'Milestone approval belongs to the oversight office.',
    },
    'project:return-milestone': {
      effect: 'deny',
      reason: 'Returning a milestone belongs to the oversight office.',
    },
    'project:release-payment': {
      effect: 'deny',
      reason: 'Payment release belongs to the oversight office.',
    },
    'project:configure': {
      effect: 'deny',
      reason: 'Project configuration is an administrator function.',
    },
  },
}

/**
 * The authorization question.
 *
 * Deny by default at three levels: an absent caller, a role that is not in the
 * vocabulary, and an action with no rule. The resource defaults to global, so a
 * caller who forgets to pass a case gets the global answer - which for every
 * mutating action is a refusal, never an accidental grant.
 */
export function can(
  user: SessionUser | null,
  action: Action,
  resource: PolicyResource = { kind: 'global' },
): PolicyDecision {
  if (!user) {
    return deny('Sign in to continue.')
  }

  // The role arrives from a JWT claim, so it is authentic but not necessarily
  // one this build knows about (an older token, a renamed role). Unknown role,
  // no permissions.
  if (!isRole(user.role)) {
    return deny('This account has a role Kawing does not recognise.')
  }

  const rule: Rule | undefined = POLICY[user.role][action]
  if (!rule) {
    return deny('Unknown action - denied by default.')
  }

  switch (rule.effect) {
    case 'deny':
      return deny(rule.reason)

    case 'allow':
      return ALLOWED

    case 'own-cases': {
      if (resource.kind === 'global') {
        if (rule.caseRequired) {
          return deny('This action needs a specific transaction to act on.')
        }
        return allowWithObligation(
          'Allowed for the signed-in applicant\'s own transactions only. The query must be filtered by applicantId - use caseAccessScopeForUser().',
        )
      }
      if (resource.kind !== 'case') {
        return deny('This action applies to transactions, not projects.')
      }
      if (!user.userId) {
        return deny('This session does not identify an applicant.')
      }
      if (resource.applicantId === null) {
        return deny('This transaction is not linked to an applicant account.')
      }
      if (resource.applicantId !== user.userId) {
        return deny('This transaction belongs to another applicant.')
      }
      return ALLOWED
    }

    case 'office-cases': {
      // An officer with no office has no scope. Treating null as "any office"
      // is the failure mode this check exists to prevent.
      if (!user.officeId) {
        return deny('This account is not assigned to an office.')
      }
      if (resource.kind === 'global') {
        if (rule.caseRequired) {
          return deny('This action needs a specific transaction to act on.')
        }
        return allowWithObligation(
          'Allowed for the caller\'s own office only. The query must be filtered by office - use caseAccessScopeForUser() or analyticsScopeForUser().',
        )
      }
      // A project is owned by its oversight office, so the check is against
      // Project.officeId, not Case.currentOfficeId. The two resource kinds
      // carry the same shape under different field names and this is where
      // they are told apart.
      const resourceOfficeId =
        resource.kind === 'case' ? resource.currentOfficeId : resource.officeId
      if (resourceOfficeId !== user.officeId) {
        return deny(
          resource.kind === 'case'
            ? 'This transaction is currently with another office.'
            : 'This project is owned by another oversight office.',
        )
      }
      return ALLOWED
    }
  }
}

/**
 * can(), but it throws instead of returning.
 *
 * Provided so route handlers do not each invent their own status code for a
 * refusal. Distinguishing 401 from 403 here (rather than answering 403 for
 * both) is what keeps an anonymous caller from being told a resource exists.
 */
export function assertCan(
  user: SessionUser | null,
  action: Action,
  resource: PolicyResource = { kind: 'global' },
): void {
  const decision = can(user, action, resource)
  if (decision.allowed) return
  if (!user) throw AuthError.unauthenticated(decision.reason ?? undefined)
  throw AuthError.forbidden(decision.reason ?? undefined)
}

// ---------------------------------------------------------------- transparency

/**
 * The minimum an event has to look like for the visibility filter to work.
 *
 * Structural rather than the Prisma CaseEvent type, for the same reason
 * CaseResource is structural: the filter must be usable on a mapped DTO, on a
 * test fixture, and on a raw row, and it must not be able to reach for a field
 * the caller did not select.
 *
 * `visibility` is typed as string, not the Visibility union, precisely because
 * the database column is a string. Anything that is not exactly 'CITIZEN' is
 * withheld - an unrecognised or misspelled value fails closed.
 */
export type PolicyCaseEvent = {
  visibility: string
}

/**
 * Filter a case's event list to what this caller may see. THIS is the
 * transparency model in code.
 *
 * - No caller: nothing.
 * - A caller with internal read on this case (officer of the holding office,
 *   or an administrator): the whole log, in the order given.
 * - A caller with only citizen read on this case (the applicant): only events
 *   the workflow declared visibility CITIZEN.
 * - Anyone else: nothing, including a citizen asking about someone else's case
 *   and an officer asking about a case held by another office.
 *
 * The case resource is required, not optional. Visibility alone cannot answer
 * the question - "is this event public" is meaningless without "is this case
 * yours" - and an optional parameter here would be an invitation to omit it.
 *
 * Non-mutating: returns a new array and never touches the inputs, so a caller
 * cannot accidentally hand a redacted list to one consumer and a mutated
 * original to another.
 */
export function filterVisibleEvents<E extends PolicyCaseEvent>(
  user: SessionUser | null,
  caseResource: CaseResource,
  events: readonly E[],
): E[] {
  if (can(user, 'case:read-internal', caseResource).allowed) {
    return [...events]
  }
  if (!can(user, 'case:read', caseResource).allowed) {
    return []
  }
  return events.filter((event) => event.visibility === 'CITIZEN')
}

/**
 * True when this caller must not see WHICH PERSON acted.
 *
 * An applicant is entitled to know that their application was endorsed by the
 * Business Permits and Licensing Office; they are not entitled to know that
 * Evaluator II so-and-so did it. Office-level attribution is accountability;
 * naming the individual evaluator to the applicant is exposure.
 */
export function hidesActorIdentity(user: SessionUser | null): boolean {
  return !user || user.role === 'CITIZEN'
}

/**
 * What a timeline event may carry, for the redacting projection below.
 *
 * actorLabel is deliberately NOT redacted. The workflow engine is expected to
 * set it to an office-or-role label ("Business Permits and Licensing Office",
 * "Approving Officer"), never to a person's name. That is an assumption this
 * function cannot enforce, so it is stated here as a contract: if a caller
 * puts a personal name in actorLabel on a CITIZEN-visible event, this
 * projection will not save them.
 *
 * `note` is also kept. An event marked visibility CITIZEN was declared
 * citizen-facing by whoever wrote it - the reason an application was returned
 * is exactly what the applicant needs. Anything not meant for the applicant
 * belongs on an INTERNAL event, where the filter above removes it whole.
 */
export type RedactableCaseEvent = PolicyCaseEvent & {
  actorUserId?: string | null
  actorRole?: string | null
}

/**
 * Filter by visibility, then strip actor identity if the caller is an
 * applicant. This is what an API route serving a case timeline should call.
 */
export function projectEventsForUser<E extends RedactableCaseEvent>(
  user: SessionUser | null,
  caseResource: CaseResource,
  events: readonly E[],
): E[] {
  const visible = filterVisibleEvents(user, caseResource, events)
  if (!hidesActorIdentity(user)) return visible

  return visible.map((event) => {
    // The cast is needed because TypeScript cannot prove that a spread of E
    // with two fields overwritten is still an E - a subtype could narrow
    // actorUserId to a non-nullable string. At runtime these fields are
    // nullable columns, so nulling them is sound; the alternative was to force
    // every caller to hand-build a DTO.
    return { ...event, actorUserId: null, actorRole: null } as E
  })
}

// ---------------------------------------------------------------- query scopes

/**
 * The list-endpoint counterpart to can().
 *
 * can() answers a question about one resource. A query needs the same rule
 * expressed as a filter, and expressing it twice - once here, once inline in
 * some route's where clause - is how the two drift apart. These helpers return
 * a discriminated union so that a caller cannot ignore the constraint: there is
 * no shape that means "no filter" unless the role really has none.
 *
 * 'NONE' is returned for a caller with no case access at all, and must produce
 * an empty result set, NOT an unfiltered query.
 */
export type CaseAccessScope =
  | { kind: 'ALL' }
  | { kind: 'OFFICE'; officeId: string }
  | { kind: 'OWN'; applicantId: string }
  | { kind: 'NONE' }

export function caseAccessScopeForUser(user: SessionUser | null): CaseAccessScope {
  if (!user || !isRole(user.role)) return { kind: 'NONE' }

  switch (user.role) {
    case 'ADMINISTRATOR':
      return { kind: 'ALL' }
    case 'OFFICER':
      return user.officeId ? { kind: 'OFFICE', officeId: user.officeId } : { kind: 'NONE' }
    case 'CITIZEN':
      return user.userId ? { kind: 'OWN', applicantId: user.userId } : { kind: 'NONE' }
  }
}

/**
 * Analytics scope. Same contract: an officer sees their own office, an
 * administrator sees everything, everyone else sees nothing.
 *
 * A requested officeId from a query string is a REQUEST, not a permission. The
 * route must intersect it with this scope - an OFFICE scope plus a different
 * requested officeId is a refusal, not a widening.
 */
export type AnalyticsScope =
  | { kind: 'ALL' }
  | { kind: 'OFFICE'; officeId: string }
  | { kind: 'NONE' }

export function analyticsScopeForUser(user: SessionUser | null): AnalyticsScope {
  if (!can(user, 'analytics:read').allowed || !user) return { kind: 'NONE' }
  if (user.role === 'ADMINISTRATOR') return { kind: 'ALL' }
  if (user.role === 'OFFICER' && user.officeId) {
    return { kind: 'OFFICE', officeId: user.officeId }
  }
  return { kind: 'NONE' }
}
