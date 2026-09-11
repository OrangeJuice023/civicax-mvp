/**
 * Static seed data for the infrastructure domain.
 *
 * Extracted to its own module so the shapes stay reviewable as data rather
 * than as inline code inside seed.ts. Mirrors the \src/data/*.js\ pattern used
 * in bt-admin: plain module-level arrays, no database access, no side effects.
 *
 * Every record is fabricated. No real citizen PII, no real government record,
 * no real contractor. Geotags are synthetic coordinates inside real LGU
 * boundaries so a map view can be demoed without leaking location data.
 */

// ---------------------------------------------------------------- offices

export const INFRASTRUCTURE_OFFICES = [
  {
    id: 'off-dpwh-ncr',
    code: 'DPWH_NCR',
    name: 'Department of Public Works and Highways - NCR',
    shortName: 'DPWH NCR',
    lguName: 'Metro Manila',
    psgc: '130000000',
    region: 'NCR',
    isFrontline: true,
  },
  {
    id: 'off-dpwh-region-3',
    code: 'DPWH_R3',
    name: 'Department of Public Works and Highways - Region III',
    shortName: 'DPWH R3',
    lguName: 'Central Luzon',
    psgc: '030000000',
    region: 'III',
    isFrontline: true,
  },
  {
    id: 'off-dpwh-region-7',
    code: 'DPWH_R7',
    name: 'Department of Public Works and Highways - Region VII',
    shortName: 'DPWH R7',
    lguName: 'Central Visayas',
    psgc: '070000000',
    region: 'VII',
    isFrontline: true,
  },
  {
    id: 'off-dpwh-region-10',
    code: 'DPWH_R10',
    name: 'Department of Public Works and Highways - Region X',
    shortName: 'DPWH R10',
    lguName: 'Northern Mindanao',
    psgc: '100000000',
    region: 'X',
    isFrontline: true,
  },
  {
    id: 'off-dpwh-legal',
    code: 'DPWH_LEGAL',
    name: 'DPWH Legal and Legislative Affairs',
    shortName: 'DPWH Legal',
    lguName: 'Metro Manila',
    psgc: '130000000',
    region: 'NCR',
    isFrontline: false,
  },
  {
    id: 'off-dpwh-internal-audit',
    code: 'DPWH_IA',
    name: 'DPWH Internal Audit',
    shortName: 'DPWH IA',
    lguName: 'Metro Manila',
    psgc: '130000000',
    region: 'NCR',
    isFrontline: false,
  },
]

// ---------------------------------------------------------------- users

export const INFRASTRUCTURE_USERS = [
  {
    id: 'usr-admin',
    email: 'civicax.admin@example.demo',
    name: 'CivicaX Demo Administrator',
    role: 'ADMINISTRATOR',
    officeCode: null,
    position: 'System Administrator',
  },
  {
    id: 'usr-ncr-officer',
    email: 'maria.reyes@dpwh.example.demo',
    name: 'Maria Reyes',
    role: 'OFFICER',
    officeCode: 'DPWH_NCR',
    position: 'Engineer III',
  },
  {
    id: 'usr-ncr-approver',
    email: 'robert.santos@dpwh.example.demo',
    name: 'Robert Santos',
    role: 'OFFICER',
    officeCode: 'DPWH_NCR',
    position: 'Senior Engineer',
  },
  {
    id: 'usr-r3-officer',
    email: 'angelica.cruz@dpwh.example.demo',
    name: 'Angelica Cruz',
    role: 'OFFICER',
    officeCode: 'DPWH_R3',
    position: 'Engineer II',
  },
  {
    id: 'usr-r7-officer',
    email: 'patrick.gonzales@dpwh.example.demo',
    name: 'Patrick Gonzales',
    role: 'OFFICER',
    officeCode: 'DPWH_R7',
    position: 'Engineer II',
  },
  {
    id: 'usr-r10-officer',
    email: 'michael.dela.cruz@dpwh.example.demo',
    name: 'Michael Dela Cruz',
    role: 'OFFICER',
    officeCode: 'DPWH_R10',
    position: 'Engineer II',
  },
  {
    id: 'usr-legal-officer',
    email: 'carmen.vidal@dpwh.example.demo',
    name: 'Carmen Vidal',
    role: 'OFFICER',
    officeCode: 'DPWH_LEGAL',
    position: 'Legal Officer',
  },
  {
    id: 'usr-ia-officer',
    email: 'jesus.la.vista@dpwh.example.demo',
    name: 'Jesus La Vista',
    role: 'OFFICER',
    officeCode: 'DPWH_IA',
    position: 'Internal Auditor',
  },
]

// ---------------------------------------------------------------- validators

export const INFRASTRUCTURE_VALIDATORS = [
  {
    id: 'val-structural',
    code: 'VAL-STRUCT-01',
    name: 'Structural Engineering Panel',
    department: 'Engineering',
    role: 'Senior Structural Engineer',
    status: 'ACTIVE',
  },
  {
    id: 'val-geotechnical',
    code: 'VAL-GEO-01',
    name: 'Geotechnical Review Panel',
    department: 'Engineering',
    role: 'Geotechnical Engineer',
    status: 'ACTIVE',
  },
  {
    id: 'val-environmental',
    code: 'VAL-ENV-01',
    name: 'Environmental Compliance Panel',
    department: 'Environment',
    role: 'Environmental Planner',
    status: 'ACTIVE',
  },
  {
    id: 'val-financial',
    code: 'VAL-FIN-01',
    name: 'Financial Oversight Panel',
    department: 'Finance',
    role: 'Budget Analyst',
    status: 'ACTIVE',
  },
  {
    id: 'val-legal',
    code: 'VAL-LEG-01',
    name: 'Legal Compliance Panel',
    department: 'Legal',
    role: 'Legal Officer',
    status: 'ACTIVE',
  },
  {
    id: 'val-quantity',
    code: 'VAL-QTY-01',
    name: 'Quantity Survey Panel',
    department: 'Engineering',
    role: 'Quantity Surveyor',
    status: 'ACTIVE',
  },
  {
    id: 'val-archaeological',
    code: 'VAL-ARCH-01',
    name: 'Cultural Heritage Panel',
    department: 'Heritage',
    role: 'Heritage Officer',
    status: 'INACTIVE',
  },
]


// ---------------------------------------------------------------- projects

/**
 * 18 public-infrastructure projects. PRJ-00026 is the hero: a 20M PHP bridge
 * rehabilitation in Quezon City, 65% complete, BLOCKED because its Independent
 * Validation milestone has no APPROVED validation record yet.
 *
 * Geotags are synthetic coordinates inside real LGU boundaries. They exist so
 * a map view can be demoed without leaking anyone's real location.
 */
export const INFRASTRUCTURE_PROJECTS = [
  {
    projectId: 'PRJ-00026',
    name: 'Bridge Rehabilitation - Circumferential Road 5 Segment 4',
    category: 'ROADS',
    sector: 'BRIDGES',
    location: 'C5 Segment 4',
    city: 'Quezon City',
    region: 'NCR',
    budget: 20000000,
    contractor: 'MegaConstruct Inc.',
    contractorId: 'CTR-00026',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-06-01T00:00:00Z'),
    targetCompletion: new Date('2026-09-30T00:00:00Z'),
    status: 'ACTIVE',
    progress: 65,
    procurementId: 'PROC-00026',
    contractId: 'CON-00026',
    milestones: [
      {
        name: 'Procurement',
        code: 'MS-00026-PROC',
        description: 'Bidding and award of the rehabilitation contract.',
        status: 'COMPLETED',
        progress: 100,
        targetDate: new Date('2025-07-15T00:00:00Z'),
        submittedAt: new Date('2025-07-10T00:00:00Z'),
        approvedAt: new Date('2025-07-15T00:00:00Z'),
        approvedBy: 'usr-ncr-approver',
        targetWindowDays: 45,
        evidence: [],
        validations: [],
      },
      {
        name: 'Contract Execution',
        code: 'MS-00026-CON',
        description: 'Signing of the contract and mobilisation.',
        status: 'COMPLETED',
        progress: 100,
        targetDate: new Date('2025-08-15T00:00:00Z'),
        submittedAt: new Date('2025-08-12T00:00:00Z'),
        approvedAt: new Date('2025-08-15T00:00:00Z'),
        approvedBy: 'usr-ncr-approver',
        targetWindowDays: 30,
        evidence: [],
        validations: [],
      },
      {
        name: 'Independent Validation',
        code: 'MS-00026-VAL',
        description: 'Third-party structural validation before the load-limit sign is installed.',
        status: 'BLOCKED',
        progress: 40,
        targetDate: new Date('2026-08-15T00:00:00Z'),
        submittedAt: new Date('2026-08-01T00:00:00Z'),
        approvedAt: null,
        approvedBy: null,
        targetWindowDays: 30,
        evidence: [
          {
            type: 'REPORT',
            title: 'Initial structural assessment field notes',
            description: 'Field notes from the first visual inspection of the bridge deck and abutments.',
            status: 'SUBMITTED',
            submittedBy: 'usr-ncr-officer',
            submittedAt: new Date('2026-08-01T09:30:00Z'),
            verifiedAt: null,
            verifiedBy: null,
            source: 'DPWH NCR field team',
            fileRef: 'EVD-00026-001',
            latitude: 14.6382,
            longitude: 121.0045,
            accuracyM: 3.2,
            capturedAt: new Date('2026-08-01T09:30:00Z'),
          },
          {
            type: 'PHOTO',
            title: 'Deck cracking - north span',
            description: 'Wide-angle photograph of the longitudinal cracks observed on the north span deck.',
            status: 'VERIFIED',
            submittedBy: 'usr-ncr-officer',
            submittedAt: new Date('2026-08-01T10:15:00Z'),
            verifiedAt: new Date('2026-08-05T14:00:00Z'),
            verifiedBy: 'usr-ncr-approver',
            source: 'DPWH NCR field team',
            fileRef: 'EVD-00026-002',
            latitude: 14.6384,
            longitude: 121.0047,
            accuracyM: 2.8,
            capturedAt: new Date('2026-08-01T10:15:00Z'),
          },
        ],
        validations: [
          {
            validatorCode: 'VAL-STRUCT-01',
            department: 'Engineering',
            role: 'Senior Structural Engineer',
            status: 'PENDING',
            note: 'Awaiting the structural panel site visit.',
            validatedAt: null,
          },
          {
            validatorCode: 'VAL-GEO-01',
            department: 'Engineering',
            role: 'Geotechnical Engineer',
            status: 'PENDING',
            note: 'Abutment settlement readings still outstanding.',
            validatedAt: null,
          },
        ],
      },
      {
        name: 'Load-Limit Sign Installation',
        code: 'MS-00026-SIGN',
        description: 'Erect the authorised load-limit signage at both approaches.',
        status: 'DRAFT',
        progress: 0,
        targetDate: new Date('2026-09-20T00:00:00Z'),
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
        targetWindowDays: 15,
        evidence: [],
        validations: [],
      },
    ],
  },
]


// ---------------------------------------------------------------- lookups

/** Offices keyed by their Prisma code, so seed.ts can resolve FKs. */
export const INFRASTRUCTURE_OFFICE_BY_CODE = Object.fromEntries(
  INFRASTRUCTURE_OFFICES.map((office) => [office.code, office]),
)

/** Validators keyed by their Prisma code, so seed.ts can resolve FKs. */
export const INFRASTRUCTURE_VALIDATOR_BY_CODE = Object.fromEntries(
  INFRASTRUCTURE_VALIDATORS.map((validator) => [validator.code, validator]),
)
