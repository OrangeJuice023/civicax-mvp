/**
 * Server-side input validation.
 *
 * ---------------------------------------------------------------------------
 * What this layer is for
 * ---------------------------------------------------------------------------
 * Every byte that arrives from a browser is untrusted, including bytes sent by
 * Kawing's own forms. These schemas are the only sanctioned way for request
 * data to become typed values, and they run on the SERVER in every case. A zod
 * schema reused in a client component for nicer form feedback is a convenience;
 * it is never the check that counts.
 *
 * Three rules shape everything below.
 *
 * 1. STRICT OBJECTS, ALWAYS. z.strictObject rejects unknown keys instead of
 *    stripping them. Stripping is friendlier and worse: a client that sends
 *    { status: 'COMPLETED' } to the note endpoint deserves a 400 telling it so,
 *    not a silent success that leaves the sender believing the field was
 *    honoured. It also means the fields a client MAY NOT set - Case.status,
 *    slaDueAt, slaBreached, AgentRecommendation.confidence, audit hashes - are
 *    protected by their absence from these schemas. Never add them.
 *
 * 2. VALIDATION IS NOT AUTHORIZATION. A schema proves a payload is well formed.
 *    Whether the caller may act on the case it names is a question for
 *    src/lib/auth/policy.ts, and whether the workflow permits the transition is
 *    a question for the workflow engine. Every route needs all three, in that
 *    order: shape, permission, legality.
 *
 * 3. NO INVENTED GOVERNMENT FACTS. These schemas constrain formats, never
 *    substance. There is no list of "valid" documentary requirements or LGU
 *    codes here, because Kawing does not hold the authoritative version of
 *    either; those are configuration (ServiceRequirement) and reference data.
 *
 * Error messages are written to be shown to a user, so they say what to do
 * rather than naming the failed constraint.
 */

import { z } from 'zod'
// Relative, not '@/lib/...', so these schemas can be exercised by vitest and
// plain node without a path-alias config.
import {
  AGENT_TYPES,
  CASE_STATUSES,
  TRANSITION_ACTIONS,
  VISIBILITIES,
} from '../domain/constants'
import { RA11032_CLASSIFICATIONS } from '../domain/sla'

// ---------------------------------------------------------------- primitives

/**
 * A database identifier.
 *
 * Deliberately NOT z.cuid(). The id format belongs to the ORM: Prisma's cuid()
 * default has already changed shape once between major versions, and a schema
 * that hard-codes the current one turns a harmless upgrade into a fleet of
 * 400s. A bounded, non-empty, trimmed string is all a route needs - the real
 * check is whether the row exists, which only the database can answer.
 */
const ID_MAX_LENGTH = 64

function identifier(label: string) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, { error: `${label} is required.` })
    .max(ID_MAX_LENGTH, { error: `${label} is not a valid identifier.` })
}

/** Free text with a length band, trimmed. */
function text(label: string, min: number, max: number) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, {
      error:
        min === 1
          ? `${label} cannot be empty.`
          : `${label} must be at least ${min} characters.`,
    })
    .max(max, { error: `${label} must be at most ${max} characters.` })
}

/**
 * An optional field that tolerates the empty string.
 *
 * HTML forms and query strings send "" for a control the user left alone, and
 * "" is not the same as "absent" to zod. Collapsing it here keeps every caller
 * from writing `value || undefined` and getting it wrong once.
 */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  )
}

/**
 * A Philippine Standard Geographic Code, as a format only.
 *
 * PSA has published PSGC codes in both 9-digit and 10-digit forms (the longer
 * form came with the 2019 revision), so both are accepted rather than asserting
 * that one of them is "the" format. Kawing does not validate the code against
 * the PSGC register: it does not hold that dataset, and pretending to check
 * would be worse than not checking. Provenance for any code actually used in
 * the demo belongs in the seed data's source note.
 */
const psgcCode = z
  .string()
  .trim()
  .regex(/^[0-9]{9,10}$/, {
    error: 'A PSGC code is 9 or 10 digits.',
  })

/**
 * Declared visibility of a note or event.
 *
 * Defaults to INTERNAL - fail closed. An officer who means a note for the
 * applicant has to say so, because the opposite default would leak internal
 * deliberation the first time someone forgot the field.
 */
const visibility = z.enum(VISIBILITIES, {
  error: 'Visibility must be CITIZEN or INTERNAL.',
})

// ---------------------------------------------------------------- sign-in

/**
 * Sign-in credentials.
 *
 * No minimum length and no complexity rule on the password field on purpose. A
 * login form that rejects a short password before checking it tells an attacker
 * the password policy, and it locks out any account whose password predates the
 * current rule. Length rules belong where a password is CHOSEN - see
 * MIN_PASSWORD_LENGTH in src/lib/auth/password.ts. The upper bound is only
 * there to cap the work a single request can ask for.
 *
 * Email is lowercased because User.email is unique and a case difference must
 * not create a second account or a failed sign-in.
 */
export const loginSchema = z.strictObject({
  email: z
    .string({ error: 'Enter your email address.' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address.' }))
    .pipe(z.string().max(254, { error: 'That email address is too long.' })),
  password: z
    .string({ error: 'Enter your password.' })
    .min(1, { error: 'Enter your password.' })
    .max(200, { error: 'That password is too long.' }),
})

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------- case intake

/**
 * A requirement the applicant says they are submitting.
 *
 * requirementId points at a configured ServiceRequirement row. A free-text
 * `name` is accepted for a document submitted outside the configured list,
 * because real counters do receive those - but it can never create a
 * requirement: the Document Review Agent reads ServiceRequirement and is
 * forbidden from inventing one, so an unmatched document shows up as an extra
 * attachment, not as a satisfied requirement.
 *
 * There is no file upload in v0.1. fileRef is a pointer string only, and no
 * document contents are stored anywhere in the prototype.
 */
export const caseDocumentInputSchema = z.strictObject({
  requirementId: optional(identifier('The requirement')),
  name: text('The document name', 2, 160),
  fileRef: optional(text('The document reference', 1, 300)),
  note: optional(text('The note', 1, 500)),
})

export type CaseDocumentInput = z.infer<typeof caseDocumentInputSchema>

/**
 * Filing a new transaction.
 *
 * What is absent matters as much as what is present. The caller does not choose
 * the case number, the workflow definition version, the initial step, the
 * holding office, the status, or the statutory deadline. All of those are
 * derived server-side: caseNumber by the intake handler, definition by the
 * active WorkflowDefinition for the service, step and office from the
 * definition's initial step, and slaDueAt by computeStatutoryDueDate() from the
 * service's RA 11032 classification. A client that could set slaDueAt could
 * manufacture compliance.
 *
 * applicantId is absent too: an applicant filing for themselves is identified
 * by their session, and an officer encoding a walk-in leaves the case with no
 * linked account (applicantName only). Accepting an applicantId from the
 * request body would let anyone file in anyone's name.
 */
export const caseCreateSchema = z.strictObject({
  serviceTypeId: identifier('The service'),

  /**
   * A synthetic name. No real personal data belongs in this prototype, and the
   * seeded identities are all fabricated - see the syntheticDemo columns in
   * prisma/schema.prisma.
   */
  applicantName: text('The applicant name', 2, 120),
  businessName: optional(text('The business name', 2, 160)),

  /**
   * Where the transaction is being filed. Free text plus an optional PSGC code
   * rather than a fixed list of LGUs, because Kawing is not the authority on
   * the roster of Philippine LGUs and hard-coding a subset would read as one.
   */
  lguName: optional(text('The LGU name', 2, 120)),
  lguPsgcCode: optional(psgcCode),

  documents: z
    .array(caseDocumentInputSchema)
    .max(30, { error: 'At most 30 documents can be submitted at once.' })
    .optional(),

  /**
   * Accepted only as literal true.
   *
   * The server sets dataClassification = 'SYNTHETIC_DEMO' regardless of what
   * arrives, so this field changes nothing on the happy path. It exists so that
   * a caller attempting to file a record labelled as real data fails loudly
   * instead of being silently overridden. Rule 2 of the project: synthetic data
   * must never be presentable as official statistics, and the boundary where
   * that could first go wrong is here.
   */
  syntheticDemo: z
    .literal(true, {
      error:
        'Kawing v0.1 accepts synthetic demonstration transactions only. Every case it stores is labelled as such.',
    })
    .optional(),
})

export type CaseCreateInput = z.infer<typeof caseCreateSchema>

// ---------------------------------------------------------------- case actions

/**
 * Firing a workflow transition.
 *
 * The caller names the transition by id, not by describing where the case
 * should go. The engine then re-reads that WorkflowTransition row and checks
 * three things this schema cannot: that it starts from the case's CURRENT step,
 * that requiredRole matches the caller, and that its guard passes. A payload
 * that validates here has proven nothing about whether the move is legal.
 *
 * `action` is optional and, when present, is a cross-check rather than an
 * instruction: if it disagrees with the stored transition's action, the UI was
 * working from a stale view of the case and the engine should refuse rather
 * than do something the user did not intend.
 *
 * A note attached to a RETURN is usually the single most useful thing an
 * applicant ever receives from this system, so the visibility field is right
 * here on the transition rather than requiring a second call.
 */
export const caseTransitionSchema = z.strictObject({
  caseId: identifier('The transaction'),
  transitionId: identifier('The workflow transition'),
  action: optional(
    z.enum(TRANSITION_ACTIONS, {
      error: 'That is not a workflow action Kawing recognises.',
    }),
  ),
  note: optional(text('The note', 1, 2000)),
  visibility: visibility.default('INTERNAL'),
})

export type CaseTransitionInput = z.infer<typeof caseTransitionSchema>

/**
 * Adding a note without moving the case.
 *
 * Notes are append-only in the event log; there is no edit or delete input
 * schema, deliberately. A record that can be rewritten is not an audit trail,
 * and CaseEvent rows are covered by the audit hash chain.
 */
export const caseNoteSchema = z.strictObject({
  caseId: identifier('The transaction'),
  note: text('The note', 1, 2000),
  visibility: visibility.default('INTERNAL'),
})

export type CaseNoteInput = z.infer<typeof caseNoteSchema>

/**
 * Verifying or rejecting a submitted requirement.
 *
 * MISSING and SUBMITTED are not offered: those describe what the applicant has
 * done, and only VERIFIED and REJECTED are decisions an officer makes. A reason
 * is mandatory on a rejection - an applicant told only "rejected" has to come
 * back to the counter to find out why, which is exactly the round trip RA 11032
 * exists to eliminate.
 */
export const documentReviewSchema = z
  .strictObject({
    caseId: identifier('The transaction'),
    documentId: identifier('The document'),
    status: z.enum(['VERIFIED', 'REJECTED'], {
      error: 'A document can be marked VERIFIED or REJECTED.',
    }),
    note: optional(text('The note', 1, 1000)),
  })
  .refine((value) => value.status !== 'REJECTED' || Boolean(value.note), {
    error: 'Say why the document was rejected, so the applicant knows what to fix.',
    path: ['note'],
  })

export type DocumentReviewInput = z.infer<typeof documentReviewSchema>

// ---------------------------------------------------------------- AI layer

/**
 * A human deciding on an agent recommendation.
 *
 * This is the schema that enforces rule 3 of the project at the HTTP boundary:
 * AI never mutates authoritative workflow state. An agent writes an
 * AgentRecommendation with status 'pending'; nothing moves until a human with
 * 'recommendation:review' on that case sends this payload; and the workflow
 * action that follows executes under that human's authority, attributed to
 * them in the event log.
 *
 * Only 'approved' and 'rejected' are accepted. 'pending' is the agent's
 * starting state and 'expired' is something the system concludes when a
 * recommendation is overtaken by events - neither is a decision a reviewer
 * makes, so neither is offered here.
 *
 * Absent by design: confidence, reasoning, recommendation text, proposedAction.
 * A reviewer approves or rejects what the agent actually produced. Letting the
 * review call rewrite the proposal would destroy the only thing that makes the
 * confidence value meaningful - that it was rule-derived before a human saw it.
 */
export const recommendationReviewSchema = z
  .strictObject({
    recommendationId: identifier('The recommendation'),
    decision: z.enum(['approved', 'rejected'], {
      error: 'A recommendation can be approved or rejected.',
    }),
    reviewNote: optional(text('The review note', 1, 1000)),
  })
  .refine((value) => value.decision !== 'rejected' || Boolean(value.reviewNote), {
    error: 'Record why the recommendation was rejected - this is the accountability trail.',
    path: ['reviewNote'],
  })

export type RecommendationReviewInput = z.infer<typeof recommendationReviewSchema>

/**
 * Asking an agent to look at a case.
 *
 * Running an agent produces a pending recommendation and nothing else, which is
 * why this input is so small: there is no parameter here that could influence
 * the finding. The rules do that, over workflow data.
 */
export const agentRunSchema = z.strictObject({
  caseId: identifier('The transaction'),
  agentType: z.enum(AGENT_TYPES, {
    error: 'That is not an agent Kawing provides.',
  }),
})

export type AgentRunInput = z.infer<typeof agentRunSchema>

// ---------------------------------------------------------------- query params

/**
 * Query strings are all strings.
 *
 * z.coerce and the empty-string handling in optional() do the conversion, so a
 * route can hand URLSearchParams straight in. Strictness is kept even here,
 * which does mean an unexpected tracking parameter produces a 400 - the
 * trade-off is accepted deliberately: an unknown filter silently ignored is how
 * an analytics page ends up showing a wider slice of data than the caller
 * asked for.
 */
const paginationLimit = z.coerce
  .number({ error: 'The page size must be a number.' })
  .int({ error: 'The page size must be a whole number.' })
  .min(1, { error: 'The page size must be at least 1.' })
  .max(200, { error: 'The page size cannot exceed 200.' })

/**
 * Analytics filters.
 *
 * READ THIS BEFORE USING officeId. It is a REQUEST, not a permission. An
 * officer may only ever see their own office, and this schema has no way to
 * know who is asking. The route must intersect whatever arrives here with
 * analyticsScopeForUser() from src/lib/auth/policy.ts: an OFFICE scope plus a
 * different requested officeId is a refusal, never a widening. Trusting this
 * field on its own would make every analytics endpoint an open cross-office
 * read.
 *
 * Everything an analytics endpoint returns is a Kawing prototype metric
 * computed over synthetic transactions, except the RA 11032 deadline itself.
 * The response, not this schema, is where that has to be said - but it has to
 * be said.
 */
export const analyticsQuerySchema = z
  .strictObject({
    officeId: optional(identifier('The office')),
    serviceTypeId: optional(identifier('The service')),
    stepId: optional(identifier('The workflow step')),

    /**
     * Inclusive start, exclusive end, both optional. Coerced from an ISO date
     * or date-time string; anything unparseable is rejected rather than
     * silently becoming the epoch.
     */
    from: optional(z.coerce.date({ error: 'The start date is not a valid date.' })),
    to: optional(z.coerce.date({ error: 'The end date is not a valid date.' })),

    granularity: z
      .enum(['day', 'week', 'month'], {
        error: 'Group by day, week or month.',
      })
      .default('week'),

    ra11032Classification: optional(
      z.enum(RA11032_CLASSIFICATIONS, {
        error: 'That is not an RA 11032 classification.',
      }),
    ),
    status: optional(
      z.enum(CASE_STATUSES, { error: 'That is not a transaction status.' }),
    ),
  })
  .refine(
    (value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(),
    {
      error: 'The start date must not be after the end date.',
      path: ['to'],
    },
  )

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>

/**
 * Listing transactions.
 *
 * Same warning as above, for the same reason: officeId and applicantId here are
 * filters a caller may ask for, and caseAccessScopeForUser() decides what they
 * are actually allowed to see. Apply the scope first and the filter second, so
 * that a narrower request narrows and a wider one is refused.
 *
 * Cursor pagination rather than offset, because the case list is ordered by
 * submission time and rows arrive while a user is paging; offset paging quietly
 * skips or repeats rows when that happens.
 */
export const caseListQuerySchema = z.strictObject({
  status: optional(z.enum(CASE_STATUSES, { error: 'That is not a transaction status.' })),
  officeId: optional(identifier('The office')),
  serviceTypeId: optional(identifier('The service')),
  applicantId: optional(identifier('The applicant')),
  /** Matches case number, applicant name or business name - the route decides which. */
  search: optional(text('The search term', 1, 120)),
  slaState: optional(
    z.enum(['ON_TIME', 'AT_RISK', 'BREACHED', 'UNKNOWN'], {
      error: 'That is not a deadline state.',
    }),
  ),
  cursor: optional(identifier('The page cursor')),
  limit: paginationLimit.default(25),
})

export type CaseListQueryInput = z.infer<typeof caseListQuerySchema>

/** Route params, which arrive as strings from the URL and are just as untrusted. */
export const caseIdParamSchema = z.strictObject({
  caseId: identifier('The transaction'),
})

export type CaseIdParam = z.infer<typeof caseIdParamSchema>

export const recommendationListQuerySchema = z.strictObject({
  caseId: optional(identifier('The transaction')),
  agentType: optional(
    z.enum(AGENT_TYPES, { error: 'That is not an agent Kawing provides.' }),
  ),
  status: optional(
    z.enum(['pending', 'approved', 'rejected', 'expired'], {
      error: 'That is not a recommendation status.',
    }),
  ),
  limit: paginationLimit.default(25),
})

export type RecommendationListQueryInput = z.infer<typeof recommendationListQuerySchema>

// ---------------------------------------------------------------- parse helper

/**
 * One field error per path, ready to attach to a form control.
 */
export type FieldIssue = { path: string; message: string }

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; issues: FieldIssue[] }

function formatIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    // A top-level issue (an unknown key, or a whole-object refinement) has an
    // empty path; '_' gives the caller something to key on.
    path: issue.path.length > 0 ? issue.path.join('.') : '_',
    message: issue.message,
  }))
}

/**
 * Parse untrusted input into a typed value.
 *
 * Returns a result instead of throwing so that a route handler's happy path
 * stays flat and a 400 cannot be mistaken for a 500. Everything in the failure
 * branch is safe to send to the client: zod issue messages describe the input,
 * never the server.
 *
 * Prefer this over calling schema.parse() in a route. It keeps every endpoint's
 * error envelope identical, which is what makes client-side form error handling
 * possible at all.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): ParseResult<z.infer<S>> {
  const result = schema.safeParse(input)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  const issues = formatIssues(result.error)
  return {
    ok: false,
    // The first issue is the most useful single line for a toast or a log; the
    // full list is there for per-field display.
    message: issues[0]?.message ?? 'That request could not be read.',
    issues,
  }
}

/**
 * Parse a URLSearchParams into a query schema.
 *
 * Repeated parameters keep their LAST value rather than becoming an array.
 * Reason: none of the query schemas above accept an array, so a duplicated
 * parameter is either a client bug or an attempt at parameter smuggling, and
 * both are better handled by picking one deterministically than by letting the
 * shape of the value change underneath a schema that expects a string.
 */
export function parseQuery<S extends z.ZodType>(
  schema: S,
  params: URLSearchParams,
): ParseResult<z.infer<S>> {
  const raw: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    raw[key] = value
  }
  return parseInput(schema, raw)
}
