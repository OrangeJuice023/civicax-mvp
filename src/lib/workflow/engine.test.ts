/**
 * Workflow engine tests.
 *
 * Run with:
 *   npx vitest run --config src/lib/workflow/vitest.config.mts
 *
 * These tests need a real database, because almost everything worth testing
 * here IS the database interaction: the atomicity of event + audit + case
 * update, the sequence numbering, the guard queries. Mocking Prisma would
 * leave the actual risk untested and would pass happily against an engine that
 * writes an event and forgets the audit record.
 *
 * engine.test.setup.ts points DATABASE_URL at a throwaway file in the OS temp
 * directory and replays the committed migration into it, so nothing here
 * touches dev.db and none of it depends on prisma/seed.ts. The fixture below
 * is the minimum workflow that can express every rule under test, and it is
 * seeded by these tests rather than borrowed from the demo seed - a test that
 * depends on demo data breaks whenever the demo changes, for reasons that have
 * nothing to do with the engine.
 *
 * All identities in the fixture are fabricated.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { GENESIS_HASH, verifyAuditChain } from '@/lib/audit'
import { WorkflowError, type WorkflowErrorCode } from './errors'
import {
  appendCaseEvent,
  executeTransition,
  getAvailableTransitions,
  submitCase,
  type TransitionActor,
} from './engine'

// ---------------------------------------------------------------- fixture ids
// Explicit ids rather than generated cuids, so a failing assertion names
// something readable.

const OFFICE_A = 'office-bplo'
const OFFICE_B = 'office-zoning'

const SERVICE_ID = 'svc-test-simple'
const SERVICE_CODE = 'TEST_SIMPLE'
const DEFINITION_ID = 'def-test-simple-v1'

const STEP_RECEIVING = 'step-receiving'
const STEP_EVALUATION = 'step-evaluation'
const STEP_RELEASED = 'step-released'
const STEP_WITH_APPLICANT = 'step-with-applicant'

const REQ_A = 'req-a'
const REQ_B = 'req-b'

/** A Monday, so the RA 11032 working-day arithmetic has no weekend to skip. */
const BASE = new Date('2026-03-02T01:00:00.000Z')
const later = (hours: number) => new Date(BASE.getTime() + hours * 3_600_000)

const citizen: TransitionActor = {
  userId: 'user-citizen',
  role: 'CITIZEN',
  officeId: null,
  name: 'Demo Applicant (synthetic)',
}
const officerA: TransitionActor = {
  userId: 'user-officer-a',
  role: 'OFFICER',
  officeId: OFFICE_A,
  name: 'Demo Receiving Officer (synthetic)',
}
const officerB: TransitionActor = {
  userId: 'user-officer-b',
  role: 'OFFICER',
  officeId: OFFICE_B,
  name: 'Demo Evaluator (synthetic)',
}
const administrator: TransitionActor = {
  userId: 'user-admin',
  role: 'ADMINISTRATOR',
  officeId: null,
  name: 'Demo Administrator (synthetic)',
}

// ---------------------------------------------------------------- helpers

/**
 * Assert that a call is refused with a specific WorkflowError code.
 *
 * The code is asserted, not just the fact of a rejection: "it threw" would
 * pass for a typo in a fixture id, which is exactly the kind of false green
 * that makes an authorization test worthless.
 */
async function expectRefusal(
  call: () => Promise<unknown>,
  code: WorkflowErrorCode,
): Promise<WorkflowError> {
  let caught: unknown
  try {
    await call()
  } catch (error) {
    caught = error
  }
  expect(caught, `expected a WorkflowError(${code}), but the call resolved`).toBeInstanceOf(
    WorkflowError,
  )
  const workflowError = caught as WorkflowError
  expect(workflowError.code).toBe(code)
  return workflowError
}

type DocState = 'MISSING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'

/** A fresh case per test, so no test depends on another's leftovers. */
async function newCase(documents?: DocState): Promise<string> {
  const result = await submitCase({
    serviceTypeCode: SERVICE_CODE,
    applicantUserId: citizen.userId,
    applicantName: citizen.name,
    businessName: 'Synthetic Sari-Sari Store',
    documents: documents
      ? [
          { requirementCode: 'REQ_A', status: documents },
          { requirementCode: 'REQ_B', status: documents },
        ]
      : undefined,
    now: BASE,
  })
  return result.caseId
}

// ---------------------------------------------------------------- seed

beforeAll(async () => {
  await db.role.createMany({
    data: [
      { id: 'role-citizen', code: 'CITIZEN', name: 'Citizen' },
      { id: 'role-officer', code: 'OFFICER', name: 'Government Officer' },
      { id: 'role-admin', code: 'ADMINISTRATOR', name: 'Administrator' },
    ],
  })

  await db.office.createMany({
    data: [
      {
        id: OFFICE_A,
        code: 'TEST_BPLO',
        name: 'Business Permits Office (test fixture)',
        isFrontline: true,
      },
      {
        id: OFFICE_B,
        code: 'TEST_ZONING',
        name: 'Zoning Office (test fixture)',
        isFrontline: false,
      },
    ],
  })

  // CaseEvent.actorUserId and Case.applicantId are foreign keys, so the actors
  // above must exist as rows. Password hashes are obvious placeholders - these
  // accounts are not usable for login and no real credential belongs in a test.
  await db.user.createMany({
    data: [
      {
        id: citizen.userId,
        email: 'applicant@example.test',
        name: citizen.name,
        passwordHash: 'not-a-real-hash',
        roleCode: 'CITIZEN',
        officeId: null,
      },
      {
        id: officerA.userId,
        email: 'officer-a@example.test',
        name: officerA.name,
        passwordHash: 'not-a-real-hash',
        roleCode: 'OFFICER',
        officeId: OFFICE_A,
      },
      {
        id: officerB.userId,
        email: 'officer-b@example.test',
        name: officerB.name,
        passwordHash: 'not-a-real-hash',
        roleCode: 'OFFICER',
        officeId: OFFICE_B,
      },
      {
        id: administrator.userId,
        email: 'admin@example.test',
        name: administrator.name,
        passwordHash: 'not-a-real-hash',
        roleCode: 'ADMINISTRATOR',
        officeId: null,
      },
    ],
  })

  await db.serviceType.create({
    data: {
      id: SERVICE_ID,
      code: SERVICE_CODE,
      name: 'Test service (fixture)',
      // SIMPLE -> 3 working days under RA 11032 Sec. 9. The classification is
      // the fixture's; the ceiling it implies comes from src/lib/domain/sla.ts.
      ra11032Classification: 'SIMPLE',
    },
  })

  await db.serviceRequirement.createMany({
    data: [
      {
        id: REQ_A,
        serviceTypeId: SERVICE_ID,
        code: 'REQ_A',
        name: 'Fixture requirement A',
        isRequired: true,
        provenance: 'ILLUSTRATIVE',
        sequence: 1,
      },
      {
        id: REQ_B,
        serviceTypeId: SERVICE_ID,
        code: 'REQ_B',
        name: 'Fixture requirement B',
        isRequired: true,
        provenance: 'ILLUSTRATIVE',
        sequence: 2,
      },
    ],
  })

  await db.workflowDefinition.create({
    data: {
      id: DEFINITION_ID,
      serviceTypeId: SERVICE_ID,
      version: 1,
      name: 'Test workflow v1',
      isActive: true,
    },
  })

  await db.workflowStep.createMany({
    data: [
      {
        id: STEP_RECEIVING,
        definitionId: DEFINITION_ID,
        code: 'RECEIVING',
        name: 'Receiving',
        sequence: 1,
        officeId: OFFICE_A,
        isInitial: true,
        // A citizenLabel is what makes an onward move citizen-visible; see
        // visibilityForTransition in engine.ts.
        citizenLabel: 'Application received',
      },
      {
        id: STEP_EVALUATION,
        definitionId: DEFINITION_ID,
        code: 'EVALUATION',
        name: 'Evaluation',
        sequence: 2,
        officeId: OFFICE_B,
        // Deliberately no citizenLabel: an internal handoff.
        citizenLabel: null,
      },
      {
        id: STEP_RELEASED,
        definitionId: DEFINITION_ID,
        code: 'RELEASED',
        name: 'Released',
        sequence: 3,
        officeId: OFFICE_B,
        isTerminal: true,
        citizenLabel: 'Permit released',
      },
      {
        id: STEP_WITH_APPLICANT,
        definitionId: DEFINITION_ID,
        code: 'WITH_APPLICANT',
        name: 'With the applicant',
        sequence: 4,
        // No office: the case is not held by any office while it sits with the
        // applicant, which is what exercises the office-less branch of the
        // office rule.
        officeId: null,
        citizenLabel: 'Returned to you for correction',
        actionRequiredByCitizen: true,
      },
    ],
  })

  await db.workflowTransition.createMany({
    data: [
      {
        id: 'tr-advance',
        definitionId: DEFINITION_ID,
        fromStepId: STEP_RECEIVING,
        toStepId: STEP_EVALUATION,
        action: 'ADVANCE',
        label: 'Forward for evaluation',
        requiredRole: 'OFFICER',
        guard: null,
      },
      {
        id: 'tr-approve',
        definitionId: DEFINITION_ID,
        fromStepId: STEP_EVALUATION,
        toStepId: STEP_RELEASED,
        action: 'APPROVE',
        label: 'Approve and release',
        requiredRole: 'OFFICER',
        guard: 'allRequiredDocumentsVerified',
      },
      {
        id: 'tr-return',
        definitionId: DEFINITION_ID,
        fromStepId: STEP_EVALUATION,
        toStepId: STEP_WITH_APPLICANT,
        action: 'RETURN',
        label: 'Return for correction',
        requiredRole: 'OFFICER',
        guard: null,
        isRework: true,
      },
      {
        // Administrator-only, so an OFFICER firing RETURN at RECEIVING is a
        // role refusal rather than an undefined transition.
        id: 'tr-return-intake',
        definitionId: DEFINITION_ID,
        fromStepId: STEP_RECEIVING,
        toStepId: STEP_WITH_APPLICANT,
        action: 'RETURN',
        label: 'Return at intake',
        requiredRole: 'ADMINISTRATOR',
        guard: null,
        isRework: true,
      },
      {
        // Intentionally misconfigured: this guard name is not in the
        // whitelist, which must deny rather than pass.
        id: 'tr-endorse-broken-guard',
        definitionId: DEFINITION_ID,
        fromStepId: STEP_RECEIVING,
        toStepId: STEP_EVALUATION,
        action: 'ENDORSE',
        label: 'Endorse (misconfigured guard)',
        requiredRole: 'OFFICER',
        guard: 'noSuchGuardExists',
      },
    ],
  })
})

// ---------------------------------------------------------------- intake

describe('submitCase', () => {
  it('files the case at the initial step with a genesis-linked audit record', async () => {
    const { caseId, caseNumber } = await submitCase({
      serviceTypeCode: SERVICE_CODE,
      applicantUserId: citizen.userId,
      applicantName: citizen.name,
      now: BASE,
    })

    expect(caseNumber).toMatch(/^CASE-2026-\d{4}$/)

    const caseRow = await db.case.findUniqueOrThrow({ where: { id: caseId } })
    expect(caseRow.currentStepId).toBe(STEP_RECEIVING)
    expect(caseRow.currentOfficeId).toBe(OFFICE_A)
    expect(caseRow.status).toBe('ACTIVE')
    // Synthetic labelling is set by the engine, not left to a schema default,
    // so that no code path can produce an unlabelled case.
    expect(caseRow.syntheticDemo).toBe(true)
    expect(caseRow.dataClassification).toBe('SYNTHETIC_DEMO')
    // RA 11032 SIMPLE = 3 working days from a Monday -> the following Thursday.
    expect(caseRow.slaDueAt?.toISOString()).toBe('2026-03-05T01:00:00.000Z')

    // One CaseDocument per configured requirement, including the ones the
    // applicant has not provided - the checklist is complete from the start.
    const documents = await db.caseDocument.findMany({ where: { caseId } })
    expect(documents).toHaveLength(2)
    expect(documents.every((doc) => doc.status === 'MISSING')).toBe(true)

    const events = await db.caseEvent.findMany({ where: { caseId } })
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('CASE_SUBMITTED')
    expect(events[0].sequence).toBe(1)
    expect(events[0].visibility).toBe('CITIZEN')
    expect(events[0].durationFromPrevMs).toBeNull()

    const records = await db.auditRecord.findMany({ where: { caseId } })
    expect(records).toHaveLength(1)
    expect(records[0].prevHash).toBe(GENESIS_HASH)
    expect(records[0].eventId).toBe(events[0].id)

    await expect(verifyAuditChain(caseId)).resolves.toMatchObject({
      valid: true,
      recordCount: 1,
      brokenAtSequence: null,
    })
  })

  it('refuses a document for a requirement the service does not have', async () => {
    await expectRefusal(
      () =>
        submitCase({
          serviceTypeCode: SERVICE_CODE,
          applicantName: citizen.name,
          documents: [{ requirementCode: 'REQ_NOT_CONFIGURED', status: 'SUBMITTED' }],
          now: BASE,
        }),
      'DEFINITION_INVALID',
    )
  })
})

// ---------------------------------------------------------------- transitions

describe('executeTransition', () => {
  it('advances the case and appends one chained audit record', async () => {
    const caseId = await newCase()

    const result = await executeTransition({
      caseId,
      action: 'ADVANCE',
      actor: officerA,
      note: 'Bundle complete at the counter.',
      now: later(2),
    })

    expect(result.fromStepCode).toBe('RECEIVING')
    expect(result.toStepCode).toBe('EVALUATION')
    expect(result.status).toBe('ACTIVE')
    expect(result.sequence).toBe(2)

    const caseRow = await db.case.findUniqueOrThrow({ where: { id: caseId } })
    expect(caseRow.currentStepId).toBe(STEP_EVALUATION)
    // The case moves to the office that owns the destination step.
    expect(caseRow.currentOfficeId).toBe(OFFICE_B)
    expect(caseRow.completedAt).toBeNull()
    expect(caseRow.slaBreached).toBe(false)

    const events = await db.caseEvent.findMany({
      where: { caseId },
      orderBy: { sequence: 'asc' },
    })
    expect(events).toHaveLength(2)
    expect(events[1].type).toBe('STEP_COMPLETED')
    expect(events[1].fromStepId).toBe(STEP_RECEIVING)
    expect(events[1].toStepId).toBe(STEP_EVALUATION)
    // Two hours of dwell time at the receiving step.
    expect(events[1].durationFromPrevMs).toBe(2 * 3_600_000)
    // EVALUATION has no citizenLabel, so this handoff is internal.
    expect(events[1].visibility).toBe('INTERNAL')

    const records = await db.auditRecord.findMany({
      where: { caseId },
      orderBy: { sequence: 'asc' },
    })
    expect(records).toHaveLength(2)
    // The chain is a chain: link 2 points at link 1.
    expect(records[1].prevHash).toBe(records[0].hash)
    expect(records[1].hash).toBe(result.auditHash)

    await expect(verifyAuditChain(caseId)).resolves.toMatchObject({
      valid: true,
      recordCount: 2,
    })
  })

  it('throws TRANSITION_NOT_ALLOWED for an action the current step does not define', async () => {
    const caseId = await newCase()

    // APPROVE exists in the definition, but only out of EVALUATION.
    const error = await expectRefusal(
      () => executeTransition({ caseId, action: 'APPROVE', actor: officerA, now: later(1) }),
      'TRANSITION_NOT_ALLOWED',
    )
    expect(error.detail).toContain('RECEIVING')

    // Nothing was written: a refused transition must not leave a partial trail.
    const events = await db.caseEvent.count({ where: { caseId } })
    expect(events).toBe(1)
  })

  it('throws ROLE_NOT_PERMITTED when the actor does not hold the required role', async () => {
    const caseId = await newCase()

    // RETURN out of RECEIVING requires ADMINISTRATOR.
    await expectRefusal(
      () => executeTransition({ caseId, action: 'RETURN', actor: officerA, now: later(1) }),
      'ROLE_NOT_PERMITTED',
    )

    // The same transition for an administrator, who may also act on a case
    // held by an office they do not belong to.
    const result = await executeTransition({
      caseId,
      action: 'RETURN',
      actor: administrator,
      now: later(1),
    })
    expect(result.status).toBe('RETURNED')
    expect(result.toStepCode).toBe('WITH_APPLICANT')

    const caseRow = await db.case.findUniqueOrThrow({ where: { id: caseId } })
    // A step with no office means the case is with the applicant, held by nobody.
    expect(caseRow.currentOfficeId).toBeNull()
    expect(caseRow.status).toBe('RETURNED')
  })

  it('throws OFFICE_MISMATCH when the case is held by another office', async () => {
    const caseId = await newCase()

    // officerB holds the right role but the case is sitting at OFFICE_A.
    await expectRefusal(
      () => executeTransition({ caseId, action: 'ADVANCE', actor: officerB, now: later(1) }),
      'OFFICE_MISMATCH',
    )
  })

  it('throws GUARD_FAILED while required documents are unverified, and succeeds once they are', async () => {
    const blocked = await newCase('SUBMITTED')
    await executeTransition({ caseId: blocked, action: 'ADVANCE', actor: officerA, now: later(1) })

    const error = await expectRefusal(
      () =>
        executeTransition({ caseId: blocked, action: 'APPROVE', actor: officerB, now: later(2) }),
      'GUARD_FAILED',
    )
    // The reason names the prerequisite, because a blocked officer needs to
    // know what to do next.
    expect(error.detail).toContain('not yet verified')

    const stillAtEvaluation = await db.case.findUniqueOrThrow({ where: { id: blocked } })
    expect(stillAtEvaluation.currentStepId).toBe(STEP_EVALUATION)

    // Same workflow, documents verified: the guard passes and the case closes.
    const passing = await newCase('VERIFIED')
    await executeTransition({ caseId: passing, action: 'ADVANCE', actor: officerA, now: later(1) })
    const approved = await executeTransition({
      caseId: passing,
      action: 'APPROVE',
      actor: officerB,
      now: later(3),
    })

    expect(approved.status).toBe('COMPLETED')
    const caseRow = await db.case.findUniqueOrThrow({ where: { id: passing } })
    expect(caseRow.status).toBe('COMPLETED')
    expect(caseRow.completedAt?.toISOString()).toBe(later(3).toISOString())
    // Approved inside the 3-working-day statutory period.
    expect(caseRow.slaBreached).toBe(false)

    await expect(verifyAuditChain(passing)).resolves.toMatchObject({
      valid: true,
      recordCount: 3,
    })
  })

  it('fails closed on a guard name that is not in the whitelist', async () => {
    const caseId = await newCase('VERIFIED')

    const error = await expectRefusal(
      () => executeTransition({ caseId, action: 'ENDORSE', actor: officerA, now: later(1) }),
      'GUARD_FAILED',
    )
    // An unrecognised guard must be treated as a denied guard, never an absent
    // one - otherwise a typo silently removes a safety check.
    expect(error.detail).toContain('noSuchGuardExists')
  })

  it('throws CASE_TERMINAL once the case has left the workflow', async () => {
    const caseId = await newCase('VERIFIED')
    await executeTransition({ caseId, action: 'ADVANCE', actor: officerA, now: later(1) })
    await executeTransition({ caseId, action: 'APPROVE', actor: officerB, now: later(2) })

    await expectRefusal(
      () => executeTransition({ caseId, action: 'ADVANCE', actor: administrator, now: later(4) }),
      'CASE_TERMINAL',
    )

    // Not even an administrator may reopen it through this path, and the
    // refusal leaves the chain exactly as it was.
    await expect(verifyAuditChain(caseId)).resolves.toMatchObject({
      valid: true,
      recordCount: 3,
    })
  })

  it('throws CASE_NOT_FOUND for an unknown case id', async () => {
    await expectRefusal(
      () =>
        executeTransition({
          caseId: 'no-such-case',
          action: 'ADVANCE',
          actor: administrator,
          now: BASE,
        }),
      'CASE_NOT_FOUND',
    )
  })
})

// ---------------------------------------------------------------- availability

describe('getAvailableTransitions', () => {
  it('lists every transition out of the step, blocked ones included, with reasons', async () => {
    const caseId = await newCase()
    const available = await getAvailableTransitions(caseId, officerA)

    // Three transitions leave RECEIVING: ADVANCE (allowed), ENDORSE (a broken
    // guard denies it) and RETURN (administrator only).
    expect(available.map((t) => t.action)).toEqual(['ADVANCE', 'ENDORSE', 'RETURN'])

    const advance = available.find((t) => t.action === 'ADVANCE')
    expect(advance).toMatchObject({ permitted: true, blockedReason: null, toStepCode: 'EVALUATION' })

    const endorse = available.find((t) => t.action === 'ENDORSE')
    expect(endorse?.permitted).toBe(false)
    expect(endorse?.blockedReason).toContain('noSuchGuardExists')

    const returnAction = available.find((t) => t.action === 'RETURN')
    expect(returnAction?.permitted).toBe(false)
    expect(returnAction?.blockedReason).toContain('ADMINISTRATOR')

    // The UI greys these out; it does not hide them. Labels come from the
    // definition so the office controls its own vocabulary.
    expect(available.every((t) => t.label.length > 0)).toBe(true)
  })

  it('reports every transition as blocked once the case is closed', async () => {
    const caseId = await newCase('VERIFIED')
    await executeTransition({ caseId, action: 'ADVANCE', actor: officerA, now: later(1) })
    await executeTransition({ caseId, action: 'APPROVE', actor: officerB, now: later(2) })

    const available = await getAvailableTransitions(caseId, administrator)
    // RELEASED is terminal, so there is nothing defined out of it; the
    // assertion is that the call succeeds and offers nothing rather than
    // throwing at the caller.
    expect(available.every((t) => !t.permitted)).toBe(true)
  })
})

// ---------------------------------------------------------------- annotations

describe('appendCaseEvent', () => {
  it('records a note without moving the case, and chains it', async () => {
    const caseId = await newCase()
    const before = await db.case.findUniqueOrThrow({ where: { id: caseId } })

    const result = await appendCaseEvent({
      caseId,
      type: 'NOTE_ADDED',
      actor: officerA,
      note: 'Applicant advised of the missing requirements at the counter.',
      now: later(1),
    })

    expect(result.sequence).toBe(2)
    // Officer notes are deliberative, so they are internal by default.
    expect(result.visibility).toBe('INTERNAL')

    const after = await db.case.findUniqueOrThrow({ where: { id: caseId } })
    expect(after.currentStepId).toBe(before.currentStepId)
    expect(after.status).toBe(before.status)

    await expect(verifyAuditChain(caseId)).resolves.toMatchObject({
      valid: true,
      recordCount: 2,
    })
  })

  it('refuses event types that would claim a state change', async () => {
    const caseId = await newCase()
    await expectRefusal(
      () => appendCaseEvent({ caseId, type: 'APPROVED', actor: administrator, now: later(1) }),
      'TRANSITION_NOT_ALLOWED',
    )
  })

  it('refuses a citizen appending an officer-only event', async () => {
    const caseId = await newCase()
    await expectRefusal(
      () => appendCaseEvent({ caseId, type: 'DOCUMENT_VERIFIED', actor: citizen, now: later(1) }),
      'ROLE_NOT_PERMITTED',
    )
  })
})

// ---------------------------------------------------------------- tampering

describe('verifyAuditChain against tampering', () => {
  it('detects an edited CaseEvent row', async () => {
    const caseId = await newCase()
    await executeTransition({ caseId, action: 'ADVANCE', actor: officerA, now: later(1) })

    const target = await db.caseEvent.findFirstOrThrow({
      where: { caseId, sequence: 2 },
      select: { id: true },
    })

    // actorRole IS part of the hashed payload, so rewriting it must break the
    // chain. Raw SQL on purpose: the engine offers no way to do this, which is
    // the point - this simulates someone with direct database access.
    await db.$executeRawUnsafe(
      'UPDATE "CaseEvent" SET "actorRole" = ? WHERE "id" = ?',
      'ADMINISTRATOR',
      target.id,
    )

    const verification = await verifyAuditChain(caseId)
    expect(verification.valid).toBe(false)
    expect(verification.brokenAtSequence).toBe(2)
    expect(verification.reason).toContain('Payload hash mismatch')
  })

  it('detects a deleted interior event as a sequence gap', async () => {
    const caseId = await newCase()
    await executeTransition({ caseId, action: 'ADVANCE', actor: officerA, now: later(1) })
    await appendCaseEvent({ caseId, type: 'NOTE_ADDED', actor: officerB, now: later(2) })

    const middle = await db.caseEvent.findFirstOrThrow({
      where: { caseId, sequence: 2 },
      select: { id: true },
    })
    // AuditRecord cascades on event deletion, so both links vanish together -
    // which is the most favourable case for the attacker, and still detected.
    await db.$executeRawUnsafe('DELETE FROM "CaseEvent" WHERE "id" = ?', middle.id)

    const verification = await verifyAuditChain(caseId)
    expect(verification.valid).toBe(false)
    expect(verification.reason).toContain('not contiguous')
  })

  it('does NOT detect an edited note - notes are off-ledger by design', async () => {
    const caseId = await newCase()
    await executeTransition({
      caseId,
      action: 'ADVANCE',
      actor: officerA,
      note: 'Original note.',
      now: later(1),
    })

    const target = await db.caseEvent.findFirstOrThrow({
      where: { caseId, sequence: 2 },
      select: { id: true },
    })
    await db.$executeRawUnsafe(
      'UPDATE "CaseEvent" SET "note" = ? WHERE "id" = ?',
      'Rewritten note.',
      target.id,
    )

    // This is a real, documented limitation, asserted here so it can never be
    // quietly misrepresented: free-text notes and actor identity are kept off
    // the ledger (see src/lib/audit/hash.ts) precisely because an append-only
    // chain cannot be redacted, and the price is that editing them is not
    // detectable. Any UI that shows a "chain verified" badge must say what the
    // badge covers. If this test ever starts failing because notes were added
    // to the hashed payload, that is a deliberate policy change and the
    // data-minimisation reasoning in hash.ts has to be revisited with it.
    await expect(verifyAuditChain(caseId)).resolves.toMatchObject({ valid: true })
  })
})
