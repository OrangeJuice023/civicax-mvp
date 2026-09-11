-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "contractor" TEXT NOT NULL,
    "contractorId" TEXT,
    "agency" TEXT NOT NULL,
    "officeId" TEXT,
    "startDate" DATETIME NOT NULL,
    "targetCompletion" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "procurementId" TEXT,
    "contractId" TEXT,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "completedAt" DATETIME,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "targetWindowDays" INTEGER,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "submittedBy" TEXT,
    "submittedAt" DATETIME,
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "source" TEXT,
    "fileRef" TEXT,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    CONSTRAINT "Evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "validatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    CONSTRAINT "Validation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Validation_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Validator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastActivity" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "caseId" TEXT,
    "projectId" TEXT,
    "sequence" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'sha256',
    "payloadHash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CaseEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditRecord" ("algorithm", "caseId", "createdAt", "eventId", "hash", "id", "payloadHash", "prevHash", "sequence") SELECT "algorithm", "caseId", "createdAt", "eventId", "hash", "id", "payloadHash", "prevHash", "sequence" FROM "AuditRecord";
DROP TABLE "AuditRecord";
ALTER TABLE "new_AuditRecord" RENAME TO "AuditRecord";
CREATE UNIQUE INDEX "AuditRecord_eventId_key" ON "AuditRecord"("eventId");
CREATE INDEX "AuditRecord_caseId_sequence_idx" ON "AuditRecord"("caseId", "sequence");
CREATE INDEX "AuditRecord_projectId_sequence_idx" ON "AuditRecord"("projectId", "sequence");
CREATE UNIQUE INDEX "AuditRecord_caseId_sequence_key" ON "AuditRecord"("caseId", "sequence");
CREATE UNIQUE INDEX "AuditRecord_projectId_sequence_key" ON "AuditRecord"("projectId", "sequence");
CREATE TABLE "new_CaseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "projectId" TEXT,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "actorLabel" TEXT,
    "officeId" TEXT,
    "fromStepId" TEXT,
    "toStepId" TEXT,
    "note" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "occurredAt" DATETIME NOT NULL,
    "durationFromPrevMs" INTEGER,
    "metadataJson" TEXT,
    CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CaseEvent" ("actorLabel", "actorRole", "actorUserId", "caseId", "durationFromPrevMs", "fromStepId", "id", "metadataJson", "note", "occurredAt", "officeId", "sequence", "toStepId", "type", "visibility") SELECT "actorLabel", "actorRole", "actorUserId", "caseId", "durationFromPrevMs", "fromStepId", "id", "metadataJson", "note", "occurredAt", "officeId", "sequence", "toStepId", "type", "visibility" FROM "CaseEvent";
DROP TABLE "CaseEvent";
ALTER TABLE "new_CaseEvent" RENAME TO "CaseEvent";
CREATE INDEX "CaseEvent_caseId_occurredAt_idx" ON "CaseEvent"("caseId", "occurredAt");
CREATE INDEX "CaseEvent_projectId_occurredAt_idx" ON "CaseEvent"("projectId", "occurredAt");
CREATE INDEX "CaseEvent_type_idx" ON "CaseEvent"("type");
CREATE UNIQUE INDEX "CaseEvent_caseId_sequence_key" ON "CaseEvent"("caseId", "sequence");
CREATE UNIQUE INDEX "CaseEvent_projectId_sequence_key" ON "CaseEvent"("projectId", "sequence");
CREATE TABLE "new_OfficeMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "stepId" TEXT,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "casesEntered" INTEGER NOT NULL DEFAULT 0,
    "casesCompleted" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "avgWaitMs" REAL NOT NULL DEFAULT 0,
    "avgActiveMs" REAL NOT NULL DEFAULT 0,
    "slaBreaches" INTEGER NOT NULL DEFAULT 0,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeMetric_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficeMetric_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OfficeMetric" ("avgActiveMs", "avgWaitMs", "casesCompleted", "casesEntered", "computedAt", "id", "officeId", "pendingCount", "periodEnd", "periodStart", "reworkCount", "slaBreaches", "stepId") SELECT "avgActiveMs", "avgWaitMs", "casesCompleted", "casesEntered", "computedAt", "id", "officeId", "pendingCount", "periodEnd", "periodStart", "reworkCount", "slaBreaches", "stepId" FROM "OfficeMetric";
DROP TABLE "OfficeMetric";
ALTER TABLE "new_OfficeMetric" RENAME TO "OfficeMetric";
CREATE INDEX "OfficeMetric_officeId_periodStart_idx" ON "OfficeMetric"("officeId", "periodStart");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectId_key" ON "Project"("projectId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");

-- CreateIndex
CREATE INDEX "Project_officeId_idx" ON "Project"("officeId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_status_idx" ON "Milestone"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_sequence_key" ON "Milestone"("projectId", "sequence");

-- CreateIndex
CREATE INDEX "Evidence_milestoneId_status_idx" ON "Evidence"("milestoneId", "status");

-- CreateIndex
CREATE INDEX "Validation_milestoneId_status_idx" ON "Validation"("milestoneId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_milestoneId_validatorId_key" ON "Validation"("milestoneId", "validatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Validator_code_key" ON "Validator"("code");

-- CreateIndex
CREATE INDEX "Validator_status_idx" ON "Validator"("status");
