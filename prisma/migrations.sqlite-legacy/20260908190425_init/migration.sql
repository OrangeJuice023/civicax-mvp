-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "officeId" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "lguName" TEXT,
    "lguPsgcCode" TEXT,
    "regionName" TEXT,
    "isFrontline" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ra11032Classification" TEXT NOT NULL,
    "citizenSummary" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ServiceRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sourceNote" TEXT,
    "provenance" TEXT NOT NULL DEFAULT 'ILLUSTRATIVE',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServiceRequirement_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceTypeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowDefinition_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "definitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "officeId" TEXT,
    "targetHours" INTEGER,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "citizenLabel" TEXT,
    "citizenExplanation" TEXT,
    "actionRequiredByCitizen" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WorkflowStep_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowStep_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "definitionId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "guard" TEXT,
    "isRework" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WorkflowTransition_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "currentStepId" TEXT NOT NULL,
    "currentOfficeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "applicantId" TEXT,
    "applicantName" TEXT NOT NULL,
    "businessName" TEXT,
    "lguName" TEXT,
    "lguPsgcCode" TEXT,
    "submittedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "slaDueAt" DATETIME,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_currentOfficeId_fkey" FOREIGN KEY ("currentOfficeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "requirementId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "fileRef" TEXT,
    "note" TEXT,
    "submittedAt" DATETIME,
    "verifiedAt" DATETIME,
    CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ServiceRequirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedAt" DATETIME NOT NULL,
    "releasedAt" DATETIME,
    CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseAssignment_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
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
    CONSTRAINT "CaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'sha256',
    "payloadHash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CaseEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "proposedActionJson" TEXT,
    "confidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "generatedBy" TEXT NOT NULL DEFAULT 'RULES',
    "modelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    CONSTRAINT "AgentRecommendation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentRecommendation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficeMetric" (
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
    CONSTRAINT "OfficeMetric_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleCode_idx" ON "User"("roleCode");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "Office_code_key" ON "Office"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_code_key" ON "ServiceType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequirement_serviceTypeId_code_key" ON "ServiceRequirement"("serviceTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_serviceTypeId_version_key" ON "WorkflowDefinition"("serviceTypeId", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_definitionId_sequence_idx" ON "WorkflowStep"("definitionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_definitionId_code_key" ON "WorkflowStep"("definitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTransition_definitionId_fromStepId_toStepId_action_key" ON "WorkflowTransition"("definitionId", "fromStepId", "toStepId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_currentOfficeId_idx" ON "Case"("currentOfficeId");

-- CreateIndex
CREATE INDEX "Case_currentStepId_idx" ON "Case"("currentStepId");

-- CreateIndex
CREATE INDEX "Case_submittedAt_idx" ON "Case"("submittedAt");

-- CreateIndex
CREATE INDEX "CaseDocument_caseId_idx" ON "CaseDocument"("caseId");

-- CreateIndex
CREATE INDEX "CaseAssignment_caseId_idx" ON "CaseAssignment"("caseId");

-- CreateIndex
CREATE INDEX "CaseAssignment_officeId_releasedAt_idx" ON "CaseAssignment"("officeId", "releasedAt");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_occurredAt_idx" ON "CaseEvent"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "CaseEvent_type_idx" ON "CaseEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CaseEvent_caseId_sequence_key" ON "CaseEvent"("caseId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_eventId_key" ON "AuditRecord"("eventId");

-- CreateIndex
CREATE INDEX "AuditRecord_caseId_sequence_idx" ON "AuditRecord"("caseId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_caseId_sequence_key" ON "AuditRecord"("caseId", "sequence");

-- CreateIndex
CREATE INDEX "AgentRecommendation_caseId_idx" ON "AgentRecommendation"("caseId");

-- CreateIndex
CREATE INDEX "AgentRecommendation_status_idx" ON "AgentRecommendation"("status");

-- CreateIndex
CREATE INDEX "AgentRecommendation_agentType_idx" ON "AgentRecommendation"("agentType");

-- CreateIndex
CREATE INDEX "OfficeMetric_officeId_periodStart_idx" ON "OfficeMetric"("officeId", "periodStart");
