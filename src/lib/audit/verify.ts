/**
 * Audit chain verification.
 *
 * Re-derives the whole hash chain for one case FROM THE UNDERLYING DATA and
 * compares it against the stored AuditRecord rows. The important word is
 * "re-derives": the verifier never trusts AuditRecord.payloadHash. It rebuilds
 * each payload out of the CaseEvent row and hashes it again. That is what makes
 * the check two-sided:
 *
 *   - tamper with a CaseEvent row  -> the recomputed payloadHash no longer
 *                                     matches the stored payloadHash
 *   - tamper with an AuditRecord   -> either payloadHash disagrees with the
 *                                     event, or the link hash disagrees with
 *                                     sha256(payloadHash + prevHash), or the
 *                                     prevHash no longer matches its
 *                                     predecessor's hash
 *   - delete an interior record    -> the sequence run has a gap
 *   - insert or re-order events    -> `sequence` is inside the hashed payload,
 *                                     so the payload hash changes
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CANNOT DETECT - be honest about this in any UI that shows a
 * green "chain verified" badge
 * ---------------------------------------------------------------------------
 * 1. TRUNCATION. Deleting a trailing suffix of the chain (the last k events
 *    and their records together) leaves a shorter but perfectly self-
 *    consistent chain. Nothing inside the database can distinguish "this case
 *    had 5 events" from "this case had 8 and someone removed 3", because the
 *    only record of the expected length is the chain itself. Detecting this
 *    requires an EXTERNAL ANCHOR: periodically publishing the head hash and
 *    event count per case somewhere outside this database (a second store, a
 *    signed daily digest, a public timestamp). Kawing v0.1 does not implement
 *    an anchor, so truncation is out of scope and must be described as such.
 *
 * 2. WHOLESALE REWRITE. Anyone with write access to the database also has
 *    access to this code, so they can recompute a fully valid chain over
 *    falsified events. A hash chain proves internal consistency; it does not
 *    prove authenticity. Authenticity needs a signing key the database server
 *    does not hold (an HSM, an external notary, or a permissioned ledger) -
 *    which is why AuditLedger is an interface rather than a concrete class.
 *
 * 3. OFF-LEDGER FIELDS. actorUserId, actorLabel, note, visibility,
 *    durationFromPrevMs, the applicant's identity and all document data are
 *    NOT hashed (see hash.ts for why). Editing any of them leaves the chain
 *    valid. In particular the chain does not attribute an action to a named
 *    official - only to a role and an office.
 *
 * 4. BACKDATING AT WRITE TIME. occurredAt is hashed, so it cannot be changed
 *    afterwards, but nothing prevents a false value being supplied when the
 *    record is first appended. There is no trusted clock here.
 *
 * What it DOES give, and what is worth saying plainly: after-the-fact editing
 * of the recorded process history cannot be done quietly. That is a real and
 * useful property for an accountability prototype, and it is the only property
 * being claimed.
 */

import { db } from '@/lib/db'
import {
  AUDIT_ALGORITHM,
  GENESIS_HASH,
  auditPayloadFromEvent,
  computeLinkHash,
  computePayloadHash,
} from './hash'

export type AuditChainVerification = {
  caseId: string
  valid: boolean
  /** Audit records examined. On a broken chain this is the number found, not the number expected. */
  recordCount: number
  /** 1-based sequence of the first inconsistency found, or null when valid. */
  brokenAtSequence: number | null
  /** Human-readable explanation of the first inconsistency, or null when valid. */
  reason: string | null
  checkedAt: Date
}

/**
 * @param caseId the case whose chain to check
 * @param client optional Prisma client or transaction client; defaults to the
 *        shared singleton. Passing a transaction client lets a caller verify
 *        a chain it has just written, inside the same transaction.
 */
export async function verifyAuditChain(
  caseId: string,
  client: unknown = db,
): Promise<AuditChainVerification> {
  const checkedAt = new Date()
  // `client` is typed `unknown` so a caller can hand in either the PrismaClient
  // singleton or an interactive transaction client. Prisma's transaction client
  // is deliberately NOT assignable to PrismaClient (it lacks $transaction and
  // the connection methods), and the delegate methods this function uses are
  // identical on both, so one narrow cast here is the honest way to express it.
  const prisma = client as typeof db

  const fail = (
    recordCount: number,
    brokenAtSequence: number | null,
    reason: string,
  ): AuditChainVerification => ({
    caseId,
    valid: false,
    recordCount,
    brokenAtSequence,
    reason,
    checkedAt,
  })

  const caseRow = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true },
  })
  if (!caseRow) {
    // Reported rather than thrown: "no such case" is an answer the caller can
    // render, and throwing would make an integrity dashboard fragile.
    return fail(0, null, `No case exists with id ${caseId}.`)
  }

  const events = await prisma.caseEvent.findMany({
    where: { caseId },
    orderBy: { sequence: 'asc' },
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
  const records = await prisma.auditRecord.findMany({
    where: { caseId },
    orderBy: { sequence: 'asc' },
    select: {
      eventId: true,
      caseId: true,
      sequence: true,
      algorithm: true,
      payloadHash: true,
      prevHash: true,
      hash: true,
    },
  })

  // An empty case is vacuously valid. It should not happen (submitCase always
  // appends CASE_SUBMITTED) but reporting "valid, 0 records" is more useful
  // than inventing a violation.
  if (events.length === 0 && records.length === 0) {
    return { caseId, valid: true, recordCount: 0, brokenAtSequence: null, reason: null, checkedAt }
  }

  // ---- structural checks, before any hashing -----------------------------
  // Every event must have exactly one record and vice versa. The schema's
  // unique constraints on AuditRecord.eventId and (caseId, sequence) make
  // duplicates impossible, so a count mismatch means something was deleted or
  // inserted directly in SQL.
  if (events.length !== records.length) {
    const missing = events.length > records.length
    return fail(
      records.length,
      null,
      missing
        ? `${events.length} events but only ${records.length} audit records: ${
            events.length - records.length
          } event(s) are unchained.`
        : `${records.length} audit records but only ${events.length} events: ${
            records.length - events.length
          } record(s) refer to events that no longer exist.`,
    )
  }

  // Sequences must be the contiguous run 1..N. A gap is a deleted interior
  // link; a value out of that range means renumbering.
  for (let i = 0; i < events.length; i += 1) {
    const expected = i + 1
    if (events[i].sequence !== expected) {
      return fail(
        records.length,
        events[i].sequence,
        `Event sequence run is not contiguous: expected ${expected} at position ${i}, found ${events[i].sequence}. An event was deleted or renumbered.`,
      )
    }
    if (records[i].sequence !== expected) {
      return fail(
        records.length,
        records[i].sequence,
        `Audit sequence run is not contiguous: expected ${expected} at position ${i}, found ${records[i].sequence}. A record was deleted or renumbered.`,
      )
    }
  }

  // ---- hash chain --------------------------------------------------------
  let prevHash = GENESIS_HASH

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]
    const record = records[i]
    const seq = event.sequence

    if (record.eventId !== event.id) {
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} points at event ${record.eventId}, but the event at that sequence is ${event.id}.`,
      )
    }
    if (record.caseId !== caseId) {
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} is filed under case ${record.caseId}.`,
      )
    }
    if (record.algorithm !== AUDIT_ALGORITHM) {
      // Not a tamper as such - it is the version-bump path described in
      // hash.ts. Until a second algorithm exists we cannot verify it, and
      // saying so is better than reporting a false tamper.
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} uses algorithm "${record.algorithm}", which this verifier does not implement.`,
      )
    }

    const recomputedPayloadHash = computePayloadHash(auditPayloadFromEvent(event))
    if (recomputedPayloadHash !== record.payloadHash) {
      return fail(
        records.length,
        seq,
        `Payload hash mismatch at sequence ${seq}: the event row no longer hashes to the value recorded in the ledger. Either the event was edited or the audit record was.`,
      )
    }

    if (record.prevHash !== prevHash) {
      return fail(
        records.length,
        seq,
        seq === 1
          ? `The first audit record does not start from the genesis hash.`
          : `Chain break at sequence ${seq}: prevHash does not match the hash of sequence ${seq - 1}.`,
      )
    }

    const recomputedHash = computeLinkHash(record.payloadHash, record.prevHash)
    if (recomputedHash !== record.hash) {
      return fail(
        records.length,
        seq,
        `Link hash mismatch at sequence ${seq}: stored hash is not sha256(payloadHash + prevHash).`,
      )
    }

    prevHash = record.hash
  }

  return {
    caseId,
    valid: true,
    recordCount: records.length,
    brokenAtSequence: null,
    reason: null,
    checkedAt,
  }
}

/**
 * The same verification, for the parallel project chain.
 *
 * A project's lifecycle events are written into the SAME CaseEvent /
 * AuditRecord spine as case transactions, filed under projectId instead of
 * caseId. The two chains never intersect because sequence is unique per
 * owning record, but they share the hashing primitives, so the verifier is
 * structurally identical and is factored into a shared helper below.
 *
 * The honest limitation stated in the file header applies equally here: this
 * proves process integrity per project, not document integrity, not
 * authenticity, and not truncation.
 */
export async function verifyProjectAuditChain(
  projectId: string,
  client: unknown = db,
): Promise<AuditChainVerification> {
  const checkedAt = new Date()
  const prisma = client as typeof db

  const fail = (
    recordCount: number,
    brokenAtSequence: number | null,
    reason: string,
  ): AuditChainVerification => ({
    caseId: projectId,
    valid: false,
    recordCount,
    brokenAtSequence,
    reason,
    checkedAt,
  })

  const projectRow = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!projectRow) {
    return fail(0, null, `No project exists with id ${projectId}.`)
  }

  const events = await prisma.caseEvent.findMany({
    where: { projectId },
    orderBy: { sequence: 'asc' },
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
  const records = await prisma.auditRecord.findMany({
    where: { projectId },
    orderBy: { sequence: 'asc' },
    select: {
      eventId: true,
      caseId: true,
      projectId: true,
      sequence: true,
      algorithm: true,
      payloadHash: true,
      prevHash: true,
      hash: true,
    },
  })

  if (events.length === 0 && records.length === 0) {
    return { caseId: projectId, valid: true, recordCount: 0, brokenAtSequence: null, reason: null, checkedAt }
  }

  if (events.length !== records.length) {
    const missing = events.length > records.length
    return fail(
      records.length,
      null,
      missing
        ? `${events.length} events but only ${records.length} audit records: ${
            events.length - records.length
          } event(s) are unchained.`
        : `${records.length} audit records but only ${events.length} events: ${
            records.length - events.length
          } record(s) refer to events that no longer exist.`,
    )
  }

  for (let i = 0; i < events.length; i += 1) {
    const expected = i + 1
    if (events[i].sequence !== expected) {
      return fail(
        records.length,
        events[i].sequence,
        `Event sequence run is not contiguous: expected ${expected} at position ${i}, found ${events[i].sequence}. An event was deleted or renumbered.`,
      )
    }
    if (records[i].sequence !== expected) {
      return fail(
        records.length,
        records[i].sequence,
        `Audit sequence run is not contiguous: expected ${expected} at position ${i}, found ${records[i].sequence}. A record was deleted or renumbered.`,
      )
    }
  }

  let prevHash = GENESIS_HASH

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]
    const record = records[i]
    const seq = event.sequence

    if (record.eventId !== event.id) {
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} points at event ${record.eventId}, but the event at that sequence is ${event.id}.`,
      )
    }
    if (record.projectId !== projectId) {
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} is filed under project ${record.projectId}.`,
      )
    }
    if (record.algorithm !== AUDIT_ALGORITHM) {
      return fail(
        records.length,
        seq,
        `Audit record at sequence ${seq} uses algorithm "${record.algorithm}", which this verifier does not implement.`,
      )
    }

    const recomputedPayloadHash = computePayloadHash(auditPayloadFromEvent(event))
    if (recomputedPayloadHash !== record.payloadHash) {
      return fail(
        records.length,
        seq,
        `Payload hash mismatch at sequence ${seq}: the event row no longer hashes to the value recorded in the ledger. Either the event was edited or the audit record was.`,
      )
    }

    if (record.prevHash !== prevHash) {
      return fail(
        records.length,
        seq,
        seq === 1
          ? `The first audit record does not start from the genesis hash.`
          : `Chain break at sequence ${seq}: prevHash does not match the hash of sequence ${seq - 1}.`,
      )
    }

    const recomputedHash = computeLinkHash(record.payloadHash, record.prevHash)
    if (recomputedHash !== record.hash) {
      return fail(
        records.length,
        seq,
        `Link hash mismatch at sequence ${seq}: stored hash is not sha256(payloadHash + prevHash).`,
      )
    }

    prevHash = record.hash
  }

  return {
    caseId: projectId,
    valid: true,
    recordCount: records.length,
    brokenAtSequence: null,
    reason: null,
    checkedAt,
  }
}
