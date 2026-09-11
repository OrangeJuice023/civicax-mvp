/**
 * Audit hashing primitives.
 *
 * This module holds the three things that must never drift: the canonical
 * serialisation, the digest function, and the exact shape of the payload that
 * gets hashed. Everything else in src/lib/audit is built on top of it.
 *
 * It exists as a separate file purely to break a module cycle: ledger.ts needs
 * verify.ts (to implement AuditLedger.verifyChain) and verify.ts needs the
 * primitives (to recompute hashes). Both import from here, so neither imports
 * the other at runtime. The public surface is re-exported from ledger.ts and
 * index.ts; nothing outside src/lib/audit should import this file directly.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE CHAIN DELIBERATELY DOES NOT COVER
 * ---------------------------------------------------------------------------
 * The hashed payload contains only structural process facts: which event, on
 * which case, in what order, of what type, by which ROLE, at which office,
 * between which workflow steps, when, plus structured metadata.
 *
 * It excludes, on purpose:
 *
 *   - the applicant's identity (Case.applicantName, Case.applicantId)
 *   - the acting official's identity (CaseEvent.actorUserId, actorLabel)
 *   - free-text notes (CaseEvent.note)
 *   - documents and document contents of any kind
 *
 * The reason is data minimisation: an append-only ledger cannot be redacted,
 * so anything personal written into it is written permanently and cannot be
 * corrected or erased. Keeping identities and free text off-ledger means a
 * later correction or deletion request can be honoured without destroying the
 * integrity proof.
 *
 * The honest consequence, which must not be glossed over anywhere in the UI:
 *
 *   The chain proves PROCESS integrity, not DOCUMENT integrity and not
 *   individual accountability.
 *
 * Concretely, it will detect a re-ordered, inserted, deleted or re-typed
 * event. It will NOT detect someone editing CaseEvent.actorUserId to blame a
 * different official, editing CaseEvent.note, or swapping an uploaded file,
 * because none of those values are inputs to any hash. Covering them would
 * require hashing them, which would put them permanently on the ledger. That
 * trade-off is a deliberate design decision, not an oversight; a production
 * deployment that needs document integrity should hash a document DIGEST
 * (never the content) and record that digest in metadata.
 */

import { createHash } from 'node:crypto'

/**
 * The prevHash of the first record in every case chain. 64 zeros - the same
 * width as a hex sha256 digest, so a chain link is always a fixed-length
 * concatenation and no ambiguity can arise from mixing widths.
 */
export const GENESIS_HASH = '0'.repeat(64)

export const AUDIT_ALGORITHM = 'sha256'

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Deterministic serialisation. THIS OUTPUT IS WHAT GETS HASHED.
 *
 * ---------------------------------------------------------------------------
 * STABILITY CONTRACT - READ BEFORE CHANGING ANYTHING BELOW
 * ---------------------------------------------------------------------------
 * Every AuditRecord ever written stores a payloadHash derived from this
 * function's output. Verification re-derives that hash from the CaseEvent row.
 * If the byte-for-byte output of canonicalize() changes for any input, then
 * EVERY historical chain instantly fails verification and there is no way to
 * tell a real tamper from a serialisation change. Changing key ordering, how a
 * Date is rendered, whether whitespace is emitted, or the number format - any
 * of these is a breaking change to stored data, not a refactor.
 *
 * So: do not "improve" this function. If a genuinely different encoding is
 * ever needed, add a NEW algorithm identifier, write it into
 * AuditRecord.algorithm for new records only, and make the verifier dispatch
 * on that column. The `algorithm` field exists in the schema for exactly this
 * migration path.
 *
 * Rules:
 *   - objects:    keys sorted by UTF-16 code unit (the default sort order),
 *                 recursively; keys whose value is `undefined` are omitted
 *   - arrays:     order preserved (it is meaningful); `undefined` elements
 *                 become null, matching JSON.stringify
 *   - Date:       ISO 8601 UTC string with milliseconds (toISOString)
 *   - strings:    JSON.stringify, which escapes control characters and lone
 *                 surrogates (well-formed since ES2019)
 *   - numbers:    JSON number form; non-finite values THROW rather than
 *                 silently becoming null, because hashing "null" would quietly
 *                 conflate NaN, Infinity and a real null
 *   - bigint,
 *     function,
 *     symbol:     THROW. JSON.stringify would drop or reject these, and
 *                 silently dropping a field out of a hash is far worse than a
 *                 loud failure at write time
 *   - toJSON:     NOT honoured except for Date. Honouring arbitrary toJSON
 *                 would make the encoding depend on library internals we do
 *                 not control, which is precisely what a stability contract
 *                 cannot tolerate
 */
export function canonicalize(value: unknown): string {
  return encode(value, [])
}

function encode(value: unknown, ancestors: object[]): string {
  if (value === null) return 'null'

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false'

    case 'number':
      if (!Number.isFinite(value)) {
        throw new Error(
          `canonicalize: refusing to hash the non-finite number ${String(value)}`,
        )
      }
      // JSON.stringify gives the shortest round-trippable form, and -0
      // normalises to "0" - both deterministic across V8 versions.
      return JSON.stringify(value)

    case 'string':
      return JSON.stringify(value)

    case 'undefined':
      // Only reachable for a top-level or array-element undefined; object
      // properties are filtered out before recursing.
      return 'null'

    case 'bigint':
      throw new Error(
        'canonicalize: bigint has no stable JSON form - convert it to a string first',
      )

    case 'function':
    case 'symbol':
      throw new Error(
        `canonicalize: ${typeof value} cannot be hashed - remove it from the payload`,
      )
  }

  // Objects from here down.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('canonicalize: refusing to hash an Invalid Date')
    }
    return JSON.stringify(value.toISOString())
  }

  const obj = value as object
  if (ancestors.includes(obj)) {
    throw new Error('canonicalize: circular reference in payload')
  }
  const nextAncestors = [...ancestors, obj]

  if (Array.isArray(value)) {
    return `[${value.map((item) => encode(item, nextAncestors)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${encode(record[key], nextAncestors)}`,
  )
  return `{${parts.join(',')}}`
}

// ---------------------------------------------------------------- the payload

/**
 * The exact set of fields covered by payloadHash. See the file header for what
 * is excluded and why.
 *
 * This is a closed shape on purpose. Adding a field changes every future hash
 * (fine) but also means old records can no longer be re-derived by new code
 * unless the added field is absent-equivalent for them - so treat any change
 * here as an algorithm version bump.
 */
export type AuditEventPayload = {
  eventId: string
  caseId: string | null
  projectId: string | null
  sequence: number
  type: string
  actorRole: string | null
  officeId: string | null
  fromStepId: string | null
  toStepId: string | null
  occurredAt: Date
  metadata: Record<string, unknown> | null
}

/**
 * The shape of a CaseEvent row that the ledger reads. Declared structurally
 * rather than as the Prisma model type so this module stays driver-agnostic:
 * the AuditLedger interface is meant to be reimplementable against a
 * permissioned ledger with no Prisma anywhere in sight.
 */
export type AuditableEventRow = {
  id: string
  caseId: string | null
  projectId: string | null
  sequence: number
  type: string
  actorRole: string | null
  officeId: string | null
  fromStepId: string | null
  toStepId: string | null
  occurredAt: Date
  metadataJson: string | null
}

/**
 * The single construction site for an AuditEventPayload.
 *
 * Both the writer (the workflow engine, at append time) and the verifier
 * (verify.ts, re-deriving from the stored row) go through this function. If
 * they built the payload independently the two would eventually diverge and
 * every chain would start failing verification for no real reason.
 *
 * metadataJson is parsed rather than hashed as an opaque string so that a
 * re-serialised row (different key order, different whitespace) still
 * verifies: canonicalize sorts keys, so only the VALUES matter. If the column
 * contains something that is not a JSON object, the payload records that fact
 * instead of guessing - verification then legitimately fails, which is the
 * correct outcome for a corrupted column.
 */
export function auditPayloadFromEvent(event: AuditableEventRow): AuditEventPayload {
  return {
    eventId: event.id,
    caseId: event.caseId,
    projectId: event.projectId,
    sequence: event.sequence,
    type: event.type,
    actorRole: event.actorRole,
    officeId: event.officeId,
    fromStepId: event.fromStepId,
    toStepId: event.toStepId,
    occurredAt: event.occurredAt,
    metadata: parseMetadata(event.metadataJson),
  }
}

function parseMetadata(json: string | null): Record<string, unknown> | null {
  if (json === null || json === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    // Deliberately not throwing: verifyAuditChain must be able to report a
    // corrupted row as "chain broken at sequence N" rather than crash. This
    // sentinel cannot collide with a genuine payload, because genuine metadata
    // is written by canonicalize() and therefore always parses.
    return { __unparseableMetadata: json }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { __nonObjectMetadata: parsed }
  }
  return parsed as Record<string, unknown>
}

// ---------------------------------------------------------------- chain links

/** payloadHash = sha256(canonicalize(payload)). */
export function computePayloadHash(payload: AuditEventPayload): string {
  return sha256Hex(canonicalize(payload))
}

/**
 * hash = sha256(payloadHash + prevHash) - the chain link itself.
 *
 * Both operands are fixed-width 64-char hex, so plain concatenation is
 * unambiguous: there is exactly one way to split the 128-char input, and no
 * pair of hashes can be confused with a different pair.
 */
export function computeLinkHash(payloadHash: string, prevHash: string): string {
  return sha256Hex(payloadHash + prevHash)
}
