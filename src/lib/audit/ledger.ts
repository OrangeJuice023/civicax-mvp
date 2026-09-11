/**
 * The audit ledger.
 *
 * AuditLedger is an INTERFACE, and the concrete HashChainLedger below is only
 * the v0.1 implementation. The workflow engine depends on the interface alone,
 * so the storage of the integrity proof can be swapped - for a permissioned
 * ledger, an externally signed notary service, or an append-only WORM store -
 * without touching a line of workflow code. That substitutability is the whole
 * point of the abstraction: a hash chain kept in the same database it protects
 * proves consistency, not authenticity (see verify.ts), and the honest fix for
 * that is a different backend, not a cleverer hash.
 *
 * INVARIANT enforced here and relied on everywhere else:
 *
 *   one CaseEvent  <->  exactly one AuditRecord, per case, in sequence order,
 *   written inside the SAME database transaction as the event.
 *
 * The schema backs this with a unique constraint on AuditRecord.eventId and on
 * (caseId, sequence), so a second append for the same event fails loudly at
 * the database rather than producing a forked chain.
 *
 * Only src/lib/workflow/engine.ts is permitted to call append(). Anything else
 * that wants to record something must go through the engine, so that the
 * event, the audit record and the case-state update stay atomic.
 */

import { db } from '@/lib/db'
import {
  AUDIT_ALGORITHM,
  GENESIS_HASH,
  computeLinkHash,
  computePayloadHash,
} from './hash'
import { verifyAuditChain, verifyProjectAuditChain, type AuditChainVerification } from './verify'
import type { AuditEventPayload } from './hash'

// Re-exported so ledger.ts is the single import site for the public hashing
// surface. hash.ts is an internal file (it exists only to break a cycle).
export {
  AUDIT_ALGORITHM,
  GENESIS_HASH,
  auditPayloadFromEvent,
  canonicalize,
  computeLinkHash,
  computePayloadHash,
  sha256Hex,
} from './hash'
export type { AuditEventPayload, AuditableEventRow } from './hash'

export type AuditAppendResult = {
  auditRecordId: string
  eventId: string
  caseId: string | null
  projectId: string | null
  sequence: number
  algorithm: string
  payloadHash: string
  prevHash: string
  hash: string
}

export interface AuditLedger {
  /**
   * Append one link to a case's chain.
   *
   * @param payload the fields to be covered by the hash. Built by
   *        auditPayloadFromEvent() from the CaseEvent row that was just
   *        written - never assembled by hand at the call site, so writer and
   *        verifier cannot drift apart.
   * @param tx an optional transaction handle. Typed `unknown` on purpose: the
   *        interface must not name Prisma types, or an alternative
   *        implementation could not satisfy it. Implementations narrow it.
   *
   * Callers should always pass `tx`. Appending outside a transaction can leave
   * an event with no audit record if the process dies in between, which is
   * exactly the failure the chain is supposed to make impossible.
   */
  append(payload: AuditEventPayload, tx?: unknown): Promise<AuditAppendResult>

  /**
   * Append one link to a project's chain. Structurally identical to append()
   * but filed under projectId instead of caseId - the shared spine allows
   * both, and sequence uniqueness per owning record keeps the two chains from
   * forking.
   */
  appendToProject(payload: AuditEventPayload, tx?: unknown): Promise<AuditAppendResult>

  verifyChain(caseId: string): Promise<AuditChainVerification>

  verifyProjectChain(projectId: string): Promise<AuditChainVerification>
}

export class HashChainLedger implements AuditLedger {
  async append(
    payload: AuditEventPayload,
    tx?: unknown,
  ): Promise<AuditAppendResult> {
    // See verify.ts for why this cast is the honest expression of "either a
    // PrismaClient or a transaction client".
    const prisma = (tx ?? db) as typeof db

    // The previous link is looked up inside the caller's transaction, so on
    // SQLite (which serialises writers) two concurrent appends to the same
    // case cannot both read the same head. On PostgreSQL the unique constraint
    // on (caseId, sequence) is what converts a lost update into a visible
    // error instead of a silently forked chain.
    const previous = await prisma.auditRecord.findFirst({
      where: { caseId: payload.caseId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, hash: true },
    })

    const prevHash = previous?.hash ?? GENESIS_HASH
    const expectedSequence = (previous?.sequence ?? 0) + 1

    if (payload.sequence !== expectedSequence) {
      // Refusing here rather than writing a hole is deliberate: a chain with a
      // gap can never be repaired, because repairing it means rewriting hashes,
      // which is indistinguishable from tampering.
      throw new Error(
        `HashChainLedger.append: out-of-order append on case ${payload.caseId} - ` +
          `payload sequence ${payload.sequence}, chain expects ${expectedSequence}.`,
      )
    }

    const payloadHash = computePayloadHash(payload)
    const hash = computeLinkHash(payloadHash, prevHash)

    const created = await prisma.auditRecord.create({
      data: {
        eventId: payload.eventId,
        caseId: payload.caseId,
        projectId: payload.projectId,
        sequence: payload.sequence,
        algorithm: AUDIT_ALGORITHM,
        payloadHash,
        prevHash,
        hash,
      },
      select: { id: true },
    })

    return {
      auditRecordId: created.id,
      eventId: payload.eventId,
      caseId: payload.caseId,
      projectId: payload.projectId,
      sequence: payload.sequence,
      algorithm: AUDIT_ALGORITHM,
      payloadHash,
      prevHash,
      hash,
    }
  }

  /**
   * Append one link to a project's chain.
   *
   * Identical to append() except the head is looked up and the record filed
   * under projectId. The shared CaseEvent/AuditRecord spine keeps the two
   * chains apart via sequence uniqueness per owning record, so neither
   * method can fork the other's chain.
   */
  async appendToProject(
    payload: AuditEventPayload,
    tx?: unknown,
  ): Promise<AuditAppendResult> {
    const prisma = (tx ?? db) as typeof db

    const previous = await prisma.auditRecord.findFirst({
      where: { projectId: payload.projectId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, hash: true },
    })

    const prevHash = previous?.hash ?? GENESIS_HASH
    const expectedSequence = (previous?.sequence ?? 0) + 1

    if (payload.sequence !== expectedSequence) {
      throw new Error(
        `HashChainLedger.appendToProject: out-of-order append on project ${payload.projectId} - ` +
          `payload sequence ${payload.sequence}, chain expects ${expectedSequence}.`,
      )
    }

    const payloadHash = computePayloadHash(payload)
    const hash = computeLinkHash(payloadHash, prevHash)

    const created = await prisma.auditRecord.create({
      data: {
        eventId: payload.eventId,
        caseId: payload.caseId,
        projectId: payload.projectId,
        sequence: payload.sequence,
        algorithm: AUDIT_ALGORITHM,
        payloadHash,
        prevHash,
        hash,
      },
      select: { id: true },
    })

    return {
      auditRecordId: created.id,
      eventId: payload.eventId,
      caseId: payload.caseId,
      projectId: payload.projectId,
      sequence: payload.sequence,
      algorithm: AUDIT_ALGORITHM,
      payloadHash,
      prevHash,
      hash,
    }
  }

  async verifyChain(caseId: string): Promise<AuditChainVerification> {
    return verifyAuditChain(caseId)
  }

  async verifyProjectChain(projectId: string): Promise<AuditChainVerification> {
    return verifyProjectAuditChain(projectId)
  }
}

/**
 * The default ledger. A module-level singleton because it is stateless - it
 * holds no connection of its own and reads the database handle per call, so
 * sharing one instance costs nothing and keeps the swap point to a single
 * assignment.
 */
export const auditLedger: AuditLedger = new HashChainLedger()
