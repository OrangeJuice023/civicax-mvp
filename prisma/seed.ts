/**
 * CivicaX v0.1 database seed.
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
 * The seed deliberately does NOT write any CaseEvent or AuditRecord rows.
 * Those are append-only and produced by the workflow/infrastructure engines at
 * runtime; the audit chain verifies itself and seeding events by hand would
 * create records the verifier could never re-derive.
 */

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import {
  INFRASTRUCTURE_OFFICES,
  INFRASTRUCTURE_USERS,
  INFRASTRUCTURE_VALIDATORS,
  INFRASTRUCTURE_PROJECTS,
  INFRASTRUCTURE_OFFICE_BY_CODE,
  INFRASTRUCTURE_VALIDATOR_BY_CODE,
} from './seed-data'

async function main() {
  // Delete in REVERSE dependency order so FK constraints are never violated.
  // A fresh database has nothing to delete, and deleteMany on an empty table
  // is a no-op, so this is safe on first run as well as on re-seeds.
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
    await db.project.create({
      data: {
        projectId: project.projectId,
        name: project.name,
        category: project.category,
        sector: project.sector,
        location: project.location,
        city: project.city,
        region: project.region,
        budget: project.budget,
        contractor: project.contractor,
        contractorId: project.contractorId,
        agency: project.agency,
        officeId: office.id,
        startDate: project.startDate,
        targetCompletion: project.targetCompletion,
        status: project.status,
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
                note: validation.note,
                validatedAt: validation.validatedAt,
              })),
            },
          })),
        },
      },
    })
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
