/**
 * Kawing v0.1 database seed.
 *
 * Idempotent: every createMany is wrapped in a deleteMany for the same model,
 * so re-running px prisma migrate reset\ or \prisma db seed\ produces the
 * same state regardless of what was there before. The infrastructure domain
 * rows are created LAST and their deletes come first, so a partial prior run
 * cannot leave an orphaned Project whose Milestones were wiped.
 *
 * Everything here is fabricated. No real citizen PII, no real government
 * record, no real contractor. The syntheticDemo / dataClassification columns
 * are set on every row so the UI can render provenance badges and so no
 * synthetic record can ever be mistaken for official data.
 *
 * The seed does not hand-write CaseEvent/AuditRecord rows for the citizen
 * Case domain - those are append-only and produced entirely by
 * src/lib/workflow/engine.ts at runtime, and inventing them here would create
 * records the verifier could never re-derive.
 *
 * The infrastructure (Project) domain is the one deliberate exception:
 * backfillProjectHistory() below appends the HISTORICAL portion of each
 * project's audit trail - the events its own seeded dates say already
 * happened - through appendProjectEvent(), the exact same ledger-append
 * primitive src/lib/infrastructure/engine.ts uses for a live validate/approve
 * action. That keeps the chain genuinely re-derivable (every hash is computed
 * from the real row, not invented) while giving a freshly seeded database a
 * demo-ready audit ledger instead of an empty one. Nothing still PENDING gets
 * an event - only facts that already happened, in their real order.
 */

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { appendProjectEvent } from '@/lib/infrastructure/engine'
import { verifyProjectAuditChain } from '@/lib/audit'
import {
  INFRASTRUCTURE_OFFICES,
  INFRASTRUCTURE_USERS,
  INFRASTRUCTURE_VALIDATORS,
  INFRASTRUCTURE_PROJECTS,
  INFRASTRUCTURE_OFFICE_BY_CODE,
  INFRASTRUCTURE_VALIDATOR_BY_CODE,
  type SeedProject,
} from './seed-data'

async function main() {
  // Delete in REVERSE dependency order so FK constraints are never violated.
  // A fresh database has nothing to delete, and deleteMany on an empty table
  // is a no-op, so this is safe on first run as well as on re-seeds.
  // AuditRecord/CaseEvent are deleted explicitly (not just cascaded) so a
  // re-seed always starts the project audit chains from a true genesis -
  // otherwise a second run's backfilled events would append onto the
  // previous run's chain instead of replacing it.
  await db.auditRecord.deleteMany({ where: { projectId: { not: null } } })
  await db.caseEvent.deleteMany({ where: { projectId: { not: null } } })
  await db.validation.deleteMany({})
  await db.evidence.deleteMany({})
  await db.milestone.deleteMany({})
  await db.project.deleteMany({})
  await db.user.deleteMany({})
  await db.validator.deleteMany({})
  await db.office.deleteMany({})
  await db.role.deleteMany({})

  // ---------------------------------------------------------------- roles

  await db.role.createMany({
    data: [
      { code: 'CITIZEN', name: 'Citizen' },
      { code: 'OFFICER', name: 'Government Officer' },
      { code: 'ADMINISTRATOR', name: 'Administrator' },
    ],
  })

  // ---------------------------------------------------------------- offices

  await db.office.createMany({
    data: INFRASTRUCTURE_OFFICES.map((office) => ({
      id: office.id,
      code: office.code,
      name: office.name,
      shortName: office.shortName,
      lguName: office.lguName,
      lguPsgcCode: office.psgc,
      regionName: office.region,
      isFrontline: office.isFrontline,
    })),
  })

  // ---------------------------------------------------------------- users

  const passwordHash = await hashPassword('DemoPass123!')
  await db.user.createMany({
    data: INFRASTRUCTURE_USERS.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash,
      roleCode: user.role,
      officeId: user.officeCode ? INFRASTRUCTURE_OFFICE_BY_CODE[user.officeCode].id : null,
      position: user.position,
      isActive: true,
    })),
  })

  // ---------------------------------------------------------------- validators

  await db.validator.createMany({
    data: INFRASTRUCTURE_VALIDATORS.map((validator) => ({
      id: validator.id,
      code: validator.code,
      name: validator.name,
      department: validator.department,
      role: validator.role,
      status: validator.status,
      isActive: validator.status === 'ACTIVE',
    })),
  })

  // ---------------------------------------------------------------- projects

  for (const project of INFRASTRUCTURE_PROJECTS) {
    const office = INFRASTRUCTURE_OFFICE_BY_CODE[project.officeCode]
    const created = await db.project.create({
      data: {
        projectId: project.projectId,
        name: project.name,
        category: project.category,
        sector: project.sector,
        location: project.location,
        city: project.city,
        region: project.region,
        budget: project.budget,
        fundsDisbursed: project.fundsDisbursed,
        contractor: project.contractor,
        contractorId: project.contractorId,
        agency: project.agency,
        officeId: office.id,
        startDate: project.startDate,
        targetCompletion: project.targetCompletion,
        status: project.status,
        delayedReason: project.delayedReason ?? null,
        progress: project.progress,
        procurementId: project.procurementId,
        contractId: project.contractId,
        milestones: {
          create: project.milestones.map((milestone, index) => ({
            sequence: index + 1,
            name: milestone.name,
            code: milestone.code,
            description: milestone.description,
            status: milestone.status,
            progress: milestone.progress,
            targetDate: milestone.targetDate,
            submittedAt: milestone.submittedAt,
            approvedAt: milestone.approvedAt,
            approvedBy: milestone.approvedBy,
            targetWindowDays: milestone.targetWindowDays,
            evidence: {
              create: (milestone.evidence ?? []).map((evidence) => ({
                type: evidence.type,
                title: evidence.title,
                description: evidence.description,
                status: evidence.status,
                submittedBy: evidence.submittedBy,
                submittedAt: evidence.submittedAt,
                verifiedAt: evidence.verifiedAt,
                verifiedBy: evidence.verifiedBy,
                source: evidence.source,
                fileRef: evidence.fileRef,
                latitude: evidence.latitude ?? null,
                longitude: evidence.longitude ?? null,
                accuracyM: evidence.accuracyM ?? null,
                capturedAt: evidence.capturedAt ?? null,
              })),
            },
            validations: {
              create: (milestone.validations ?? []).map((validation) => ({
                validatorId: INFRASTRUCTURE_VALIDATOR_BY_CODE[validation.validatorCode].id,
                department: validation.department,
                role: validation.role,
                status: validation.status,
                required: validation.required ?? true,
                note: validation.note,
                validatedAt: validation.validatedAt,
              })),
            },
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { sequence: 'asc' },
          include: { evidence: true, validations: { include: { validator: true } } },
        },
      },
    })

    await db.$transaction(async (tx) => {
      await backfillProjectHistory(tx, created, project, office)
    })
  }
}

// ---------------------------------------------------------------- audit history backfill

type CreatedMilestone = {
  id: string
  code: string
  submittedAt: Date | null
  approvedAt: Date | null
  approvedBy: string | null
  evidence: Array<{
    id: string
    type: string
    status: string
    submittedAt: Date | null
    submittedBy: string | null
    verifiedAt: Date | null
    verifiedBy: string | null
  }>
  validations: Array<{
    status: string
    validatedAt: Date | null
    note: string | null
    validator: { code: string; name: string }
  }>
}

type CreatedProject = { id: string; milestones: CreatedMilestone[] }

/**
 * Reconstruct the historical portion of a project's audit trail from the
 * synthetic dates already recorded on its milestones, evidence and
 * validations - project creation, each milestone's submission, each
 * evidence item's submission/verification, each validation's decision, and
 * each milestone's approval, IN CHRONOLOGICAL ORDER.
 *
 * This is a one-time backfill, not a shortcut the runtime engine ever takes:
 * src/lib/infrastructure/engine.ts's completeValidation()/approveMilestone()
 * are the only way NEW events are appended once the app is running. What
 * makes this legitimate rather than a fabricated ledger is that every
 * timestamp here already exists in the seed data as the historical record of
 * something that happened before the demo's reference date; recording it once,
 * in order, is exactly what migrating historical data into a from-here-on
 * tamper-evident ledger means. A milestone that is still awaiting a decision
 * (a PENDING validation, an un-submitted evidence item) gets NO event for
 * that fact, because it has not happened yet - the ledger only ever records
 * what is true, never what is expected.
 */
async function backfillProjectHistory(
  tx: Prisma.TransactionClient,
  created: CreatedProject,
  seedProject: SeedProject,
  office: { id: string },
): Promise<void> {
  type HistoryItem = { occurredAt: Date; type: string; actorLabel: string; note?: string; metadata: Record<string, unknown> }
  const items: HistoryItem[] = []

  items.push({
    occurredAt: seedProject.startDate,
    type: 'PROJECT_CREATED',
    actorLabel: seedProject.agency,
    metadata: { projectId: seedProject.projectId, category: seedProject.category, budget: seedProject.budget },
  })

  for (const milestone of created.milestones) {
    if (milestone.submittedAt) {
      items.push({
        occurredAt: milestone.submittedAt,
        type: 'MILESTONE_SUBMITTED',
        actorLabel: seedProject.contractor,
        metadata: { milestoneId: milestone.id, milestoneCode: milestone.code },
      })
    }

    for (const evidence of milestone.evidence) {
      if (evidence.submittedAt) {
        items.push({
          occurredAt: evidence.submittedAt,
          type: 'EVIDENCE_SUBMITTED',
          actorLabel: evidence.submittedBy ?? seedProject.contractor,
          metadata: { milestoneId: milestone.id, evidenceId: evidence.id, evidenceType: evidence.type },
        })
      }
      if (evidence.status === 'VERIFIED' && evidence.verifiedAt) {
        items.push({
          occurredAt: evidence.verifiedAt,
          type: 'EVIDENCE_VERIFIED',
          actorLabel: evidence.verifiedBy ?? 'Oversight office',
          metadata: { milestoneId: milestone.id, evidenceId: evidence.id },
        })
      } else if (evidence.status === 'REJECTED' && evidence.verifiedAt) {
        items.push({
          occurredAt: evidence.verifiedAt,
          type: 'EVIDENCE_REJECTED',
          actorLabel: evidence.verifiedBy ?? 'Oversight office',
          metadata: { milestoneId: milestone.id, evidenceId: evidence.id },
        })
      }
    }

    for (const validation of milestone.validations) {
      if (validation.status === 'APPROVED' && validation.validatedAt) {
        items.push({
          occurredAt: validation.validatedAt,
          type: 'VALIDATION_COMPLETED',
          actorLabel: validation.validator.name,
          note: validation.note ?? undefined,
          metadata: { milestoneId: milestone.id, validatorCode: validation.validator.code, decision: 'APPROVED' },
        })
      } else if (validation.status === 'REJECTED' && validation.validatedAt) {
        items.push({
          occurredAt: validation.validatedAt,
          type: 'VALIDATION_ESCALATED',
          actorLabel: validation.validator.name,
          note: validation.note ?? undefined,
          metadata: { milestoneId: milestone.id, validatorCode: validation.validator.code, decision: 'REJECTED' },
        })
      }
      // PENDING validations produce no event - nothing has happened yet.
    }

    if (milestone.approvedAt) {
      items.push({
        occurredAt: milestone.approvedAt,
        type: 'MILESTONE_APPROVED',
        actorLabel: milestone.approvedBy ?? 'Oversight office',
        metadata: { milestoneId: milestone.id, milestoneCode: milestone.code },
      })
    }
  }

  // Chronological order is the whole point: `sequence` must reflect the real
  // order things happened in, not the order milestones happen to be listed.
  items.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())

  for (const item of items) {
    await appendProjectEvent(tx, {
      projectId: created.id,
      type: item.type,
      actorRole: 'OFFICER',
      actorLabel: item.actorLabel,
      officeId: office.id,
      note: item.note ?? null,
      metadata: item.metadata,
      occurredAt: item.occurredAt,
    })
  }
}

main()
  .then(() => assertCanonicalSeedCounts())
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

// ---------------------------------------------------------------- assertions

/**
 * Assert the seeded dataset satisfies the canonical MVP counts.
 *
 * These run AFTER the seed completes, against the live database, so they
 * cannot drift from the data the UI reads. If a future edit to seed-data.ts
 * changes a count, this fails loudly instead of shipping a dashboard that
 * quietly shows the wrong numbers.
 */
export async function assertCanonicalSeedCounts(): Promise<void> {
  const failures: string[] = []

  const projectCount = await db.project.count()
  if (projectCount !== 18) failures.push(`projects: expected 18, got ${projectCount}`)

  const validatorCount = await db.validator.count()
  if (validatorCount !== 9) failures.push(`validators: expected 9, got ${validatorCount}`)

  const activeValidators = await db.validator.count({ where: { status: 'ACTIVE' } })
  if (activeValidators !== 7) failures.push(`active validators: expected 7, got ${activeValidators}`)

  const inactiveValidators = await db.validator.count({ where: { status: 'INACTIVE' } })
  if (inactiveValidators !== 2) failures.push(`inactive validators: expected 2, got ${inactiveValidators}`)

  const pendingApprovalMilestones = await db.milestone.count({ where: { status: 'PENDING_APPROVAL' } })
  if (pendingApprovalMilestones !== 5) failures.push(`pending approval milestones: expected 5, got ${pendingApprovalMilestones}`)

  const completedMilestones = await db.milestone.count({ where: { status: 'COMPLETED' } })
  if (completedMilestones !== 42) failures.push(`completed milestones: expected 42, got ${completedMilestones}`)

  const hero = await db.project.findUnique({ where: { projectId: 'PRJ-00026' } })
  if (!hero) {
    failures.push('hero project PRJ-00026 missing')
  } else {
    if (hero.budget !== 20_000_000) failures.push(`hero budget: expected 20000000, got ${hero.budget}`)
    if (hero.progress !== 65) failures.push(`hero progress: expected 65, got ${hero.progress}`)
    if (hero.fundsDisbursed !== 15_239_000) failures.push(`hero disbursed: expected 15239000, got ${hero.fundsDisbursed}`)
    if (hero.status !== 'IN_PROGRESS') failures.push(`hero status: expected IN_PROGRESS, got ${hero.status}`)
  }

  const heroMilestone = await db.milestone.findFirst({
    where: { project: { projectId: 'PRJ-00026' }, name: { contains: 'Inspection' } },
  })
  if (!heroMilestone) {
    failures.push('hero Inspection Phase milestone missing')
  } else if (heroMilestone.status !== 'BLOCKED_ON_VALIDATION') {
    failures.push(`hero milestone status: expected BLOCKED_ON_VALIDATION, got ${heroMilestone.status}`)
  }

  const heroPendingValidations = await db.validation.count({
    where: { milestone: { id: heroMilestone?.id }!, status: 'PENDING' },
  })
  if (heroPendingValidations !== 1) failures.push(`hero pending validations: expected 1, got ${heroPendingValidations}`)

  const categoryTotals = await db.project.groupBy({ by: ['category'], _sum: { budget: true } })
  const totals: Record<string, number> = {}
  for (const row of categoryTotals) totals[row.category] = row._sum.budget ?? 0
  if ((totals.ROADS_AND_BRIDGES ?? 0) !== 480_000_000) failures.push(`roads budget: expected 480000000, got ${totals.ROADS_AND_BRIDGES ?? 0}`)
  if ((totals.PUBLIC_BUILDINGS ?? 0) !== 260_000_000) failures.push(`public buildings budget: expected 260000000, got ${totals.PUBLIC_BUILDINGS ?? 0}`)
  if ((totals.WATER_WORKS ?? 0) !== 160_000_000) failures.push(`water works budget: expected 160000000, got ${totals.WATER_WORKS ?? 0}`)
  if ((totals.HEALTH_FACILITIES ?? 0) !== 100_000_000) failures.push(`health facilities budget: expected 100000000, got ${totals.HEALTH_FACILITIES ?? 0}`)
  const totalBudget = Object.values(totals).reduce((a, b) => a + b, 0)
  if (totalBudget !== 1_000_000_000) failures.push(`total budget: expected 1000000000, got ${totalBudget}`)

  // Every project must have at least one backfilled audit event, and every
  // project's chain must verify - a seed that produced an unhashable or
  // out-of-order backfill would otherwise ship a broken "Audit Verified"
  // badge on day one.
  const allProjects = await db.project.findMany({ select: { id: true, projectId: true } })
  for (const p of allProjects) {
    const recordCount = await db.auditRecord.count({ where: { projectId: p.id } })
    if (recordCount === 0) failures.push(`${p.projectId}: no audit history was backfilled`)
    const verification = await verifyProjectAuditChain(p.id)
    if (!verification.valid) {
      failures.push(`${p.projectId}: audit chain does not verify - ${verification.reason}`)
    }
  }

  if (failures.length > 0) {
    console.error('SEED ASSERTION FAILURES:')
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log('Seed assertions passed: 18 projects, 9 validators, 7 active, 5 pending approvals, 42 completed milestones, PHP 1B portfolio.')
}
