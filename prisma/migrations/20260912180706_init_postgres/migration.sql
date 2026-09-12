-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "officeId" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "lguName" TEXT,
    "lguPsgcCode" TEXT,
    "regionName" TEXT,
    "isFrontline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ra11032Classification" TEXT NOT NULL,
    "citizenSummary" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequirement" (
    "id" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sourceNote" TEXT,
    "provenance" TEXT NOT NULL DEFAULT 'ILLUSTRATIVE',
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "guard" TEXT,
    "isRework" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
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
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "slaDueAt" TIMESTAMP(3),
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "requirementId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "fileRef" TEXT,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "CaseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
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
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "durationFromPrevMs" INTEGER,
    "metadataJson" TEXT,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "caseId" TEXT,
    "projectId" TEXT,
    "sequence" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'sha256',
    "payloadHash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRecommendation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "proposedActionJson" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "generatedBy" TEXT NOT NULL DEFAULT 'RULES',
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "AgentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeMetric" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "stepId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "casesEntered" INTEGER NOT NULL DEFAULT 0,
    "casesCompleted" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "avgWaitMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgActiveMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slaBreaches" INTEGER NOT NULL DEFAULT 0,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
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
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetCompletion" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "procurementId" TEXT,
    "contractId" TEXT,
    "fundsDisbursed" INTEGER NOT NULL DEFAULT 0,
    "delayedReason" TEXT,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "targetWindowDays" INTEGER,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "source" TEXT,
    "fileRef" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validator" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastActivity" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validator_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "CaseEvent_projectId_occurredAt_idx" ON "CaseEvent"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "CaseEvent_type_idx" ON "CaseEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CaseEvent_caseId_sequence_key" ON "CaseEvent"("caseId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CaseEvent_projectId_sequence_key" ON "CaseEvent"("projectId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_eventId_key" ON "AuditRecord"("eventId");

-- CreateIndex
CREATE INDEX "AuditRecord_caseId_sequence_idx" ON "AuditRecord"("caseId", "sequence");

-- CreateIndex
CREATE INDEX "AuditRecord_projectId_sequence_idx" ON "AuditRecord"("projectId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_caseId_sequence_key" ON "AuditRecord"("caseId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_projectId_sequence_key" ON "AuditRecord"("projectId", "sequence");

-- CreateIndex
CREATE INDEX "AgentRecommendation_caseId_idx" ON "AgentRecommendation"("caseId");

-- CreateIndex
CREATE INDEX "AgentRecommendation_status_idx" ON "AgentRecommendation"("status");

-- CreateIndex
CREATE INDEX "AgentRecommendation_agentType_idx" ON "AgentRecommendation"("agentType");

-- CreateIndex
CREATE INDEX "OfficeMetric_officeId_periodStart_idx" ON "OfficeMetric"("officeId", "periodStart");

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

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequirement" ADD CONSTRAINT "ServiceRequirement_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_currentOfficeId_fkey" FOREIGN KEY ("currentOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ServiceRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CaseEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRecommendation" ADD CONSTRAINT "AgentRecommendation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRecommendation" ADD CONSTRAINT "AgentRecommendation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMetric" ADD CONSTRAINT "OfficeMetric_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMetric" ADD CONSTRAINT "OfficeMetric_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

