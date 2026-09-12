-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
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
    "fundsDisbursed" INTEGER NOT NULL DEFAULT 0,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("agency", "budget", "category", "city", "contractId", "contractor", "contractorId", "createdAt", "dataClassification", "id", "location", "name", "officeId", "procurementId", "progress", "projectId", "region", "sector", "startDate", "status", "syntheticDemo", "targetCompletion", "updatedAt") SELECT "agency", "budget", "category", "city", "contractId", "contractor", "contractorId", "createdAt", "dataClassification", "id", "location", "name", "officeId", "procurementId", "progress", "projectId", "region", "sector", "startDate", "status", "syntheticDemo", "targetCompletion", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectId_key" ON "Project"("projectId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_category_idx" ON "Project"("category");
CREATE INDEX "Project_officeId_idx" ON "Project"("officeId");
CREATE TABLE "new_Validation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "validatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syntheticDemo" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    CONSTRAINT "Validation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Validation_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Validation" ("createdAt", "dataClassification", "department", "id", "milestoneId", "note", "role", "status", "syntheticDemo", "validatedAt", "validatorId") SELECT "createdAt", "dataClassification", "department", "id", "milestoneId", "note", "role", "status", "syntheticDemo", "validatedAt", "validatorId" FROM "Validation";
DROP TABLE "Validation";
ALTER TABLE "new_Validation" RENAME TO "Validation";
CREATE INDEX "Validation_milestoneId_status_idx" ON "Validation"("milestoneId", "status");
CREATE UNIQUE INDEX "Validation_milestoneId_validatorId_key" ON "Validation"("milestoneId", "validatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
