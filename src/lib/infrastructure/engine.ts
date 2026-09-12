/**
 * The infrastructure engine.
 *
 * The counterpart to src/lib/workflow/engine.ts for the Project / Milestone /
 * Evidence / Validation domain. Same invariant, same reason for it: every
 * state change appends exactly one CaseEvent AND exactly one chained
 * AuditRecord (filed under projectId, via auditLedger.appendToProject), both
 * inside the same database transaction as the Milestone/Validation update. A
 * milestone that moved without a matching ledger entry is exactly the failure
 * this module exists to make impossible.
 *
 * This is the ONLY place permitted to change Validation.status or move a
 * Milestone between statuses at runtime. Route handlers ask; they do not
 * decide - every exported function here re-checks authorization from
 * src/lib/auth/policy.ts and re-derives eligibility from the database, never
 * from a value the caller supplied. A client claiming "4/4 validations, ready
 * to approve" is a UI hint, nothing more; this module recomputes it.
 *
 * appendProjectEvent() is also used by prisma/seed.ts to BACKFILL the
 * historical portion of a project's audit trail - the events that already
 * happened before the demo's reference date (mobilization, prior milestones,
 * completed validations). That is legitimate: those events are being
 * recorded once, in their real chronological order, exactly like a
 * production deployment migrating in historical data. What no seed may ever
 * do is call completeValidation()/approveMilestone() themselves, because
 * those enforce a caller identity and current-database eligibility that a
 * seed script does not have.
 */

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { auditLedger, auditPayloadFromEvent, canonicalize } from '@/lib/audit'
import type { SessionUser } from '@/lib/auth/session'
import { can, type ProjectResource } from '@/lib/auth/policy'
import type { InfrastructureEventType } from './constants'

type InfraTx = Prisma.TransactionClient

export class InfrastructureError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHENTICATED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'VALIDATOR_NOT_ELIGIBLE'
      | 'MILESTONE_NOT_READY'
      | 'INVALID_STATE',
    message: string,
  ) {
    super(message)
    this.name = 'InfrastructureError'
  }
}

function fail(code: InfrastructureError['code'], message: string): never {
  throw new InfrastructureError(code, message)
}

function projectResource(project: { officeId: string | null }): ProjectResource {
  return { kind: 'project', officeId: project.officeId, contractorOfficeId: null }
}

// ---------------------------------------------------------------- shared ledger append

export type AppendProjectEventInput = {
  projectId: string
  type: InfrastructureEventType | string
  actorUserId?: string | null
  actorRole?: string | null
  actorLabel?: string | null
  officeId?: string | null
  note?: string | null
  /** Structural facts only - THIS IS HASHED into the audit chain. No personal data, no free text beyond `note` (which is not hashed - see src/lib/audit/hash.ts). */
  metadata?: Record<string, unknown>
  occurredAt?: Date
}

export type AppendProjectEventResult = {
  eventId: string
  sequence: number
  auditHash: string
}

/**
 * Append one project-chain event + audit record, atomically. Every mutation
 * in this module goes through this single function so the sequence
 * bookkeeping and the ledger append can never drift apart.
 *
 * Must be called with a transaction client so the CaseEvent write and the
 * domain-state write (Milestone/Validation update) commit together.
 */
export async function appendProjectEvent(
  tx: InfraTx,
  input: AppendProjectEventInput,
): Promise<AppendProjectEventResult> {
  const occurredAt = input.occurredAt ?? new Date()

  const previous = await tx.caseEvent.findFirst({
    where: { projectId: input.projectId },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  })
  const sequence = (previous?.sequence ?? 0) + 1

  const event = await tx.caseEvent.create({
    data: {
      projectId: input.projectId,
      sequence,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      actorLabel: input.actorLabel ?? null,
      officeId: input.officeId ?? null,
      note: input.note ?? null,
      // Infrastructure events are internal-office process facts, not a
      // citizen's own transaction - the public/internal split for projects is
      // handled by the read policy (project:read vs project:read-internal),
      // not by this per-event flag, so every project event is filed INTERNAL.
      visibility: 'INTERNAL',
      occurredAt,
      metadataJson: canonicalize(input.metadata ?? {}),
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

  const audit = await auditLedger.appendToProject(auditPayloadFromEvent(event), tx)

  return { eventId: event.id, sequence: audit.sequence, auditHash: audit.hash }
}

// ---------------------------------------------------------------- complete validation

export type CompleteValidationInput = {
  projectId: string
  milestoneId: string
  validatorCode: string
  decision?: 'APPROVED' | 'REJECTED'
  note?: string
  actor: SessionUser
  now?: Date
}

export type CompleteValidationResult = {
  milestoneId: string
  milestoneStatus: string
  validationId: string
  validationStatus: string
  allValidationsComplete: boolean
  eventId: string
  sequence: number
  auditHash: string
}

/**
 * Record a validator's decision on a milestone and recompute the milestone's
 * status from the resulting set of validations.
 *
 * Authorization: 'project:complete-validation'. Per policy.ts this is granted
 * unconditionally to OFFICER (the panel is convened by the oversight office,
 * not scoped to the officer's own office - a project can call in an
 * independent or regional validator) and denied to ADMINISTRATOR and
 * CITIZEN. Re-checked here even though a route handler may have checked it
 * already, because this function is the actual authority.
 */
export async function completeValidation(
  input: CompleteValidationInput,
): Promise<CompleteValidationResult> {
  const now = input.now ?? new Date()
  const decision = input.decision ?? 'APPROVED'

  return db.$transaction(async (tx) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: input.milestoneId },
      include: { project: true, validations: { include: { validator: true } } },
    })
    if (!milestone || milestone.project.projectId !== input.projectId) {
      fail('NOT_FOUND', `No milestone ${input.milestoneId} on project ${input.projectId}.`)
    }
    const milestoneRow = milestone!

    const decisionCheck = can(input.actor, 'project:complete-validation', projectResource(milestoneRow.project))
    if (!decisionCheck.allowed) {
      fail('FORBIDDEN', decisionCheck.reason ?? 'Not permitted to complete validations on this project.')
    }

    if (milestoneRow.status === 'COMPLETED' || milestoneRow.status === 'APPROVED') {
      fail('INVALID_STATE', `Milestone ${milestoneRow.code} is already ${milestoneRow.status.toLowerCase()} and no longer accepts validation decisions.`)
    }

    const validation = milestoneRow.validations.find((v) => v.validator.code === input.validatorCode)
    if (!validation) {
      fail('NOT_FOUND', `No validation assigned to validator ${input.validatorCode} on this milestone.`)
    }
    const validationRow = validation!

    if (validationRow.validator.status !== 'ACTIVE') {
      fail('VALIDATOR_NOT_ELIGIBLE', `Validator ${validationRow.validator.name} is ${validationRow.validator.status.toLowerCase()} and may not record a validation decision.`)
    }
    if (validationRow.status !== 'PENDING') {
      fail('INVALID_STATE', `Validation by ${validationRow.validator.name} is already ${validationRow.status.toLowerCase()}.`)
    }

    await tx.validation.update({
      where: { id: validationRow.id },
      data: { status: decision, validatedAt: now, note: input.note ?? validationRow.note },
    })
    await tx.validator.update({ where: { id: validationRow.validatorId }, data: { lastActivity: now } })

    // Recompute milestone status from the resulting validation set. Evidence
    // is not part of this gate - the schema is explicit that a milestone
    // becomes ready for approval on validation completeness alone (see the
    // Validation model comment in prisma/schema.prisma).
    const refreshedValidations = milestoneRow.validations.map((v) =>
      v.id === validationRow.id ? { ...v, status: decision } : v,
    )
    const required = refreshedValidations.filter((v) => v.required)
    const allApproved = required.length > 0 && required.every((v) => v.status === 'APPROVED')
    const anyRejected = required.some((v) => v.status === 'REJECTED')

    const nextMilestoneStatus = anyRejected
      ? 'BLOCKED_ON_VALIDATION'
      : allApproved
        ? 'PENDING_APPROVAL'
        : 'BLOCKED_ON_VALIDATION'

    await tx.milestone.update({ where: { id: milestoneRow.id }, data: { status: nextMilestoneStatus } })

    const eventType: InfrastructureEventType = decision === 'APPROVED' ? 'VALIDATION_COMPLETED' : 'VALIDATION_ESCALATED'
    const { eventId, sequence, auditHash } = await appendProjectEvent(tx, {
      projectId: milestoneRow.projectId,
      type: eventType,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorLabel: input.actor.officeName ?? input.actor.name,
      officeId: milestoneRow.project.officeId,
      note: input.note ?? null,
      metadata: {
        milestoneId: milestoneRow.id,
        milestoneCode: milestoneRow.code,
        validatorCode: input.validatorCode,
        validatorRole: validationRow.role,
        decision,
        resultingMilestoneStatus: nextMilestoneStatus,
      },
      occurredAt: now,
    })

    return {
      milestoneId: milestoneRow.id,
      milestoneStatus: nextMilestoneStatus,
      validationId: validationRow.id,
      validationStatus: decision,
      allValidationsComplete: allApproved,
      eventId,
      sequence,
      auditHash,
    }
  })
}

// ---------------------------------------------------------------- approve milestone

export type ApproveMilestoneInput = {
  projectId: string
  milestoneId: string
  note?: string
  actor: SessionUser
  now?: Date
}

export type ApproveMilestoneResult = {
  milestoneId: string
  milestoneStatus: string
  eventId: string
  sequence: number
  auditHash: string
}

/**
 * Approve a milestone that is PENDING_APPROVAL.
 *
 * Authorization: 'project:approve-milestone'. Per policy.ts this is
 * office-scoped for OFFICER (only the oversight office that owns the
 * project) and denied outright to ADMINISTRATOR - approving is an act on a
 * specific project, not a configuration decision, and administrators do not
 * decide individual milestones (see the ADMINISTRATOR block in policy.ts for
 * the same rule applied to citizen transactions).
 *
 * Eligibility is re-derived from the database, never trusted from the
 * caller: the milestone must actually be PENDING_APPROVAL, which itself is
 * only ever set by completeValidation() once every required validation is
 * APPROVED. There is no path by which a client can mark a milestone approved
 * without every required validator having signed off first.
 */
export async function approveMilestone(input: ApproveMilestoneInput): Promise<ApproveMilestoneResult> {
  const now = input.now ?? new Date()

  return db.$transaction(async (tx) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: input.milestoneId },
      include: { project: true, validations: true },
    })
    if (!milestone || milestone.project.projectId !== input.projectId) {
      fail('NOT_FOUND', `No milestone ${input.milestoneId} on project ${input.projectId}.`)
    }
    const milestoneRow = milestone!

    const decision = can(input.actor, 'project:approve-milestone', projectResource(milestoneRow.project))
    if (!decision.allowed) {
      fail('FORBIDDEN', decision.reason ?? 'Not permitted to approve milestones on this project.')
    }

    if (milestoneRow.status !== 'PENDING_APPROVAL') {
      fail(
        'MILESTONE_NOT_READY',
        `Milestone ${milestoneRow.code} is ${milestoneRow.status.toLowerCase()}, not ready for approval. Every required validation must be APPROVED first.`,
      )
    }

    const actorLabel = input.actor.officeName ?? input.actor.name

    await tx.milestone.update({
      where: { id: milestoneRow.id },
      data: {
        status: 'APPROVED',
        progress: 100,
        approvedAt: now,
        approvedBy: actorLabel,
      },
    })

    const { eventId, sequence, auditHash } = await appendProjectEvent(tx, {
      projectId: milestoneRow.projectId,
      type: 'MILESTONE_APPROVED',
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorLabel,
      officeId: milestoneRow.project.officeId,
      note: input.note ?? null,
      metadata: {
        milestoneId: milestoneRow.id,
        milestoneCode: milestoneRow.code,
        requiredValidations: milestoneRow.validations.filter((v) => v.required).length,
      },
      occurredAt: now,
    })

    return { milestoneId: milestoneRow.id, milestoneStatus: 'APPROVED', eventId, sequence, auditHash }
  })
}
