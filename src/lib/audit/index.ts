/**
 * Public surface of the Kawing audit ledger.
 *
 * Import from '@/lib/audit', never from the individual files: hash.ts is an
 * internal module whose only reason to exist is breaking the ledger/verify
 * cycle, and keeping the barrel as the single entry point means the storage
 * implementation can be replaced without a codebase-wide find-and-replace.
 *
 * Read hash.ts before using any of this. It documents the one thing that is
 * easy to get wrong when reading a "verified" badge in the UI: the chain
 * covers process facts only. Applicant identity, official identity, free-text
 * notes and document contents are deliberately off-ledger, so the proof is
 * about process integrity - not document integrity and not individual
 * accountability.
 */

export {
  AUDIT_ALGORITHM,
  GENESIS_HASH,
  HashChainLedger,
  auditLedger,
  auditPayloadFromEvent,
  canonicalize,
  computeLinkHash,
  computePayloadHash,
  sha256Hex,
} from './ledger'

export type {
  AuditAppendResult,
  AuditEventPayload,
  AuditLedger,
  AuditableEventRow,
} from './ledger'

export { verifyAuditChain, verifyProjectAuditChain } from './verify'
export type { AuditChainVerification } from './verify'
