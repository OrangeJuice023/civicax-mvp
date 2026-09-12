/**
 * Canonical Seed Data for Kawing v0.1 MVP.
 *
 * All records are SYNTHETIC DEMONSTRATION DATA.
 * Reference Date: 2026-09-11 09:00:00 +08:00
 *
 * Canonical Totals:
 * - 18 Projects (11 IN_PROGRESS, 5 PENDING_APPROVAL, 2 DELAYED)
 * - 9 Validators (7 ACTIVE, 2 INACTIVE)
 * - 5 Pending Approval Milestones (PRJ-00005, PRJ-00007, PRJ-00009, PRJ-00012, PRJ-00017)
 * - 42 Completed Milestones
 * - PHP 1,000,000,000 Total Portfolio:
 *     - ROADS_AND_BRIDGES: PHP 480M (48%)
 *     - PUBLIC_BUILDINGS:  PHP 260M (26%)
 *     - WATER_WORKS:       PHP 160M (16%)
 *     - HEALTH_FACILITIES: PHP 100M (10%)
 *
 * Hero Project: PRJ-00026 (Bridge Rehabilitation)
 * - Budget: PHP 20,000,000
 * - Funds Disbursed: PHP 15,239,000 (76.2%)
 * - Progress: 65%
 * - Current Milestone: Inspection Phase (BLOCKED_ON_VALIDATION)
 * - Validations: 3/4 Approved, 1 Pending (Independent Validator)
 */

export const DEMO_REFERENCE_DATE = new Date('2026-09-11T09:00:00+08:00')

// ---------------------------------------------------------------- offices

export const INFRASTRUCTURE_OFFICES = [
  {
    id: 'off-dpwh-ncr',
    code: 'DPWH_NCR',
    name: 'Department of Public Works and Highways - NCR',
    shortName: 'DPWH NCR',
    lguName: 'Quezon City / Metro Manila',
    psgc: '130000000',
    region: 'NCR',
    isFrontline: true,
  },
  {
    id: 'off-dpwh-qc',
    code: 'DPWH_QC',
    name: 'DPWH Quezon City First District Engineering Office',
    shortName: 'DPWH QC 1st',
    lguName: 'Quezon City',
    psgc: '137404000',
    region: 'NCR',
    isFrontline: true,
  },
  {
    id: 'off-qc-engineering',
    code: 'QC_ENG',
    name: 'Quezon City Department of Engineering',
    shortName: 'QC Engineering',
    lguName: 'Quezon City',
    psgc: '137404000',
    region: 'NCR',
    isFrontline: true,
  },
  {
    id: 'off-qc-oversight',
    code: 'QC_OVR',
    name: 'Quezon City Infrastructure Oversight Office',
    shortName: 'City Oversight',
    lguName: 'Quezon City',
    psgc: '137404000',
    region: 'NCR',
    isFrontline: false,
  },
  {
    id: 'off-coa-audit',
    code: 'COA_QC',
    name: 'Commission on Audit - QC Local Sector',
    shortName: 'COA Audit',
    lguName: 'Quezon City',
    psgc: '137404000',
    region: 'NCR',
    isFrontline: false,
  },
]

export const INFRASTRUCTURE_OFFICE_BY_CODE = Object.fromEntries(
  INFRASTRUCTURE_OFFICES.map((office) => [office.code, office]),
)

// ---------------------------------------------------------------- users

export const INFRASTRUCTURE_USERS = [
  {
    id: 'usr-admin',
    email: 'admin@kawing.demo',
    name: 'City Oversight Administrator',
    role: 'ADMINISTRATOR',
    officeCode: 'QC_OVR',
    position: 'Chief Oversight Director',
  },
  {
    id: 'usr-eng-lead',
    email: 'engineer@dpwh.example.demo',
    name: 'Engr. Ramon Bautista',
    role: 'OFFICER',
    officeCode: 'DPWH_NCR',
    position: 'Supervising Project Engineer',
  },
  {
    id: 'usr-validator-ind',
    email: 'independent.validator@review.example.demo',
    name: 'Engr. Teresa Lim',
    role: 'OFFICER',
    officeCode: 'QC_OVR',
    position: 'Independent Structural Verifier',
  },
]

// ---------------------------------------------------------------- validators (9 validators: 7 active, 2 inactive)

export const INFRASTRUCTURE_VALIDATORS = [
  {
    id: 'val-eng-01',
    code: 'VAL-ENG-01',
    name: 'City Engineering Validation Unit',
    department: 'Engineering',
    role: 'Engineering Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-10T16:45:00+08:00'),
  },
  {
    id: 'val-fin-01',
    code: 'VAL-FIN-01',
    name: 'City Finance Validation Unit',
    department: 'Finance',
    role: 'Finance Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-10T17:15:00+08:00'),
  },
  {
    id: 'val-ovr-01',
    code: 'VAL-OVR-01',
    name: 'City Oversight Office',
    department: 'Oversight',
    role: 'Oversight Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-11T08:30:00+08:00'),
  },
  {
    id: 'val-proc-01',
    code: 'VAL-PROC-01',
    name: 'Procurement Compliance Unit',
    department: 'Procurement',
    role: 'Procurement Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-09T14:20:00+08:00'),
  },
  {
    id: 'val-qa-01',
    code: 'VAL-QA-01',
    name: 'Infrastructure QA Unit',
    department: 'Quality',
    role: 'Quality Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-10T11:00:00+08:00'),
  },
  {
    id: 'val-ind-01',
    code: 'VAL-IND-01',
    name: 'Independent Engineering Validator',
    department: 'Independent',
    role: 'Independent Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-08T15:00:00+08:00'),
  },
  {
    id: 'val-aud-01',
    code: 'VAL-AUD-01',
    name: 'Audit Review Unit',
    department: 'Audit',
    role: 'Audit Validator',
    status: 'ACTIVE',
    lastActivity: new Date('2026-09-11T08:50:00+08:00'),
  },
  {
    id: 'val-ext-01',
    code: 'VAL-EXT-01',
    name: 'External Technical Review Node',
    department: 'Technical',
    role: 'Technical Validator',
    status: 'INACTIVE',
    lastActivity: new Date('2026-08-20T10:00:00+08:00'),
  },
  {
    id: 'val-reg-01',
    code: 'VAL-REG-01',
    name: 'Regional Review Node',
    department: 'Oversight',
    role: 'Oversight Validator',
    status: 'INACTIVE',
    lastActivity: new Date('2026-08-15T09:30:00+08:00'),
  },
]

export const INFRASTRUCTURE_VALIDATOR_BY_CODE = Object.fromEntries(
  INFRASTRUCTURE_VALIDATORS.map((validator) => [validator.code, validator]),
)

// ---------------------------------------------------------------- project definitions
// Category budget requirements:
// ROADS_AND_BRIDGES: 480M
// PUBLIC_BUILDINGS:  260M
// WATER_WORKS:       160M
// HEALTH_FACILITIES: 100M
// Total = 1,000M (1 Billion)

export type SeedMilestone = {
  name: string
  code: string
  description?: string
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'READY_FOR_APPROVAL' | 'BLOCKED_ON_VALIDATION' | 'IN_PROGRESS' | 'DRAFT'
  progress: number
  targetDate?: Date
  submittedAt?: Date | null
  approvedAt?: Date | null
  completedAt?: Date | null
  approvedBy?: string | null
  targetWindowDays?: number
  evidence?: {
    type: string
    title: string
    description?: string
    status: 'SUBMITTED' | 'VERIFIED' | 'MISSING' | 'REJECTED'
    submittedBy?: string
    submittedAt?: Date
    verifiedAt?: Date | null
    verifiedBy?: string | null
    source?: string
    fileRef?: string
    latitude?: number
    longitude?: number
    accuracyM?: number
    capturedAt?: Date
  }[]
  validations?: {
    validatorCode: string
    department: string
    role: string
    status: 'APPROVED' | 'PENDING' | 'REJECTED'
    required?: boolean
    note?: string
    validatedAt?: Date | null
  }[]
}

export type SeedProject = {
  projectId: string
  name: string
  category: 'ROADS_AND_BRIDGES' | 'PUBLIC_BUILDINGS' | 'WATER_WORKS' | 'HEALTH_FACILITIES'
  sector: string
  location: string
  city: string
  region: string
  budget: number
  fundsDisbursed: number
  contractor: string
  contractorId: string
  agency: string
  officeCode: string
  startDate: Date
  targetCompletion: Date
  status: 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'DELAYED'
  delayedReason?: string
  progress: number
  procurementId: string
  contractId: string
  timelineMonths: number
  milestones: SeedMilestone[]
}

export const INFRASTRUCTURE_PROJECTS: SeedProject[] = [
  // ========================================================== ROADS & BRIDGES (PHP 480M)
  // 1. HERO DEMO
  {
    projectId: 'PRJ-00026',
    name: 'Bridge Rehabilitation',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Bridges',
    location: 'Circumferential Road 5 Segment 4, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 20_000_000,
    fundsDisbursed: 15_239_000, // 76.2%
    contractor: 'ABC Infrastructure Corporation',
    contractorId: 'CTR-QC-00026',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-03-15T08:00:00+08:00'),
    targetCompletion: new Date('2026-09-30T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 65,
    procurementId: 'PROC-2025-0026',
    contractId: 'CON-2025-0026',
    timelineMonths: 18,
    milestones: [
      {
        name: 'Mobilization & Procurement',
        code: 'MS-00026-01',
        description: 'Bidding, contract award, contractor mobilization, and site equipment setup.',
        status: 'COMPLETED',
        progress: 100,
        targetDate: new Date('2025-05-15T00:00:00+08:00'),
        submittedAt: new Date('2025-05-10T10:00:00+08:00'),
        approvedAt: new Date('2025-05-14T14:00:00+08:00'),
        completedAt: new Date('2025-05-15T16:00:00+08:00'),
        approvedBy: 'City Oversight Office',
        evidence: [
          {
            type: 'REPORT',
            title: 'Notice to Proceed & Mobilization Plan',
            status: 'VERIFIED',
            submittedBy: 'ABC Infrastructure Corporation',
            submittedAt: new Date('2025-05-10T10:00:00+08:00'),
            verifiedAt: new Date('2025-05-12T11:00:00+08:00'),
            verifiedBy: 'DPWH NCR Oversight',
            source: 'Contractor Portal',
            fileRef: 'EVD-00026-MOB',
          },
        ],
        validations: [
          {
            validatorCode: 'VAL-PROC-01',
            department: 'Procurement',
            role: 'Procurement Validator',
            status: 'APPROVED',
            note: 'Contract compliance verified against RA 9184 standards.',
            validatedAt: new Date('2025-05-12T11:00:00+08:00'),
          },
        ],
      },
      {
        name: 'Foundation & Girder Retrofitting',
        code: 'MS-00026-02',
        description: 'Pier jacketing, substructure repair, and prestressed girder load retrofitting.',
        status: 'COMPLETED',
        progress: 100,
        targetDate: new Date('2025-11-20T00:00:00+08:00'),
        submittedAt: new Date('2025-11-15T14:00:00+08:00'),
        approvedAt: new Date('2025-11-19T16:30:00+08:00'),
        completedAt: new Date('2025-11-20T17:00:00+08:00'),
        approvedBy: 'City Oversight Office',
        evidence: [
          {
            type: 'PHOTO',
            title: 'Substructure Reinforcement Inspection',
            status: 'VERIFIED',
            submittedBy: 'ABC Infrastructure Corporation',
            submittedAt: new Date('2025-11-15T14:00:00+08:00'),
            verifiedAt: new Date('2025-11-18T10:00:00+08:00'),
            verifiedBy: 'Engr. Ramon Bautista',
            source: 'Field QA Device',
            fileRef: 'EVD-00026-FND',
            latitude: 14.6542,
            longitude: 121.0458,
            accuracyM: 3.1,
            capturedAt: new Date('2025-11-15T13:45:00+08:00'),
          },
        ],
        validations: [
          {
            validatorCode: 'VAL-ENG-01',
            department: 'Engineering',
            role: 'Engineering Validator',
            status: 'APPROVED',
            note: 'Ultrasonic concrete testing passed specifications.',
            validatedAt: new Date('2025-11-18T10:00:00+08:00'),
          },
        ],
      },
      {
        name: 'Structural / Deck Works',
        code: 'MS-00026-03',
        description: 'Bridge deck slab demolition, rebar mesh installation, and concrete overlay curing.',
        status: 'COMPLETED',
        progress: 100,
        targetDate: new Date('2026-04-10T00:00:00+08:00'),
        submittedAt: new Date('2026-04-05T09:00:00+08:00'),
        approvedAt: new Date('2026-04-09T15:00:00+08:00'),
        completedAt: new Date('2026-04-10T16:00:00+08:00'),
        approvedBy: 'City Oversight Office',
        evidence: [
          {
            type: 'REPORT',
            title: 'Compressive Core Strength Lab Report',
            status: 'VERIFIED',
            submittedBy: 'Materials Testing Lab',
            submittedAt: new Date('2026-04-05T09:00:00+08:00'),
            verifiedAt: new Date('2026-04-08T11:00:00+08:00'),
            verifiedBy: 'QA Inspection Unit',
            source: 'Bureau of Research and Standards',
            fileRef: 'EVD-00026-DCK',
          },
        ],
        validations: [
          {
            validatorCode: 'VAL-QA-01',
            department: 'Quality',
            role: 'Quality Validator',
            status: 'APPROVED',
            note: '28-day cylinder compressive strength test: 4,500 psi achieved.',
            validatedAt: new Date('2026-04-08T11:00:00+08:00'),
          },
        ],
      },
      {
        name: 'Inspection Phase',
        code: 'MS-00026-04',
        description: 'Comprehensive structural integrity validation and dynamic load compliance verification.',
        status: 'BLOCKED_ON_VALIDATION',
        progress: 65,
        targetDate: new Date('2026-09-15T00:00:00+08:00'),
        submittedAt: new Date('2026-09-02T10:30:00+08:00'),
        approvedAt: null,
        completedAt: null,
        evidence: [
          {
            type: 'REPORT',
            title: 'Contractor Progress Submission',
            description: 'Bill of quantities measurement and milestone completion claim.',
            status: 'VERIFIED',
            submittedBy: 'ABC Infrastructure Corporation',
            submittedAt: new Date('2026-09-02T10:30:00+08:00'),
            verifiedAt: new Date('2026-09-05T14:00:00+08:00'),
            verifiedBy: 'Engr. Ramon Bautista',
            source: 'Contractor Portal',
            fileRef: 'EVD-00026-PROG',
          },
          {
            type: 'PHOTO',
            title: 'Engineering Inspection Report',
            description: 'Deck surface level survey and expansion joint alignment photos.',
            status: 'VERIFIED',
            submittedBy: 'QC Engineering Inspection Team',
            submittedAt: new Date('2026-09-03T11:00:00+08:00'),
            verifiedAt: new Date('2026-09-06T15:30:00+08:00'),
            verifiedBy: 'City Oversight Office',
            source: 'Field QA Device',
            fileRef: 'EVD-00026-INSP',
            latitude: 14.6548,
            longitude: 121.0461,
            accuracyM: 2.4,
            capturedAt: new Date('2026-09-03T10:55:00+08:00'),
          },
          {
            type: 'REPORT',
            title: 'Finance Reconciliation',
            description: 'Tranche 4 milestone voucher statement and deduction ledger.',
            status: 'VERIFIED',
            submittedBy: 'Accounting Division',
            submittedAt: new Date('2026-09-04T16:00:00+08:00'),
            verifiedAt: new Date('2026-09-07T09:30:00+08:00'),
            verifiedBy: 'City Finance Validation Unit',
            source: 'Financial System',
            fileRef: 'EVD-00026-FIN',
          },
          {
            type: 'REPORT',
            title: 'Independent Validation Record',
            description: 'Third-party physical load-bearing and vibration dampening assessment.',
            status: 'MISSING',
            submittedBy: 'Independent Engineering Validator',
            submittedAt: undefined,
            verifiedAt: null,
            source: 'Third-party Structural Panel',
            fileRef: 'EVD-00026-IND-PENDING',
          },
        ],
        validations: [
          {
            validatorCode: 'VAL-ENG-01',
            department: 'Engineering',
            role: 'Engineering Validator',
            status: 'APPROVED',
            note: 'Structural dimensions and surface elevations match design plans.',
            validatedAt: new Date('2026-09-08T10:15:00+08:00'),
          },
          {
            validatorCode: 'VAL-FIN-01',
            department: 'Finance',
            role: 'Finance Validator',
            status: 'APPROVED',
            note: 'Progress billing aligns with physical accomplishment percentage.',
            validatedAt: new Date('2026-09-09T14:30:00+08:00'),
          },
          {
            validatorCode: 'VAL-OVR-01',
            department: 'Oversight',
            role: 'Oversight Validator',
            status: 'APPROVED',
            note: 'Citizen advisory signs and pedestrian corridor safeguards installed.',
            validatedAt: new Date('2026-09-10T11:00:00+08:00'),
          },
          {
            validatorCode: 'VAL-IND-01',
            department: 'Independent',
            role: 'Independent Validator',
            status: 'PENDING',
            note: 'Independent physical vibration test and acoustic resonance report pending submission.',
            validatedAt: null,
          },
        ],
      },
      {
        name: 'Turnover & Final Acceptance',
        code: 'MS-00026-05',
        description: 'Road opening ceremony, final certificate of completion, and warranty bond deposit.',
        status: 'DRAFT',
        progress: 0,
        targetDate: new Date('2026-09-30T00:00:00+08:00'),
      },
    ],
  },

  // 2. Central Road Resurfacing
  {
    projectId: 'PRJ-00002',
    name: 'Central Road Resurfacing',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Roads',
    location: 'Commonwealth Avenue Corridor, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 35_000_000,
    fundsDisbursed: 27_300_000,
    contractor: 'Metro Asphalt Builders',
    contractorId: 'CTR-QC-00002',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-06-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-10-30T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 78,
    procurementId: 'PROC-2025-0002',
    contractId: 'CON-2025-0002',
    timelineMonths: 16,
    milestones: [
      { name: 'Milling & Surface Scraping', code: 'MS-00002-01', status: 'COMPLETED', progress: 100 },
      { name: 'Asphalt Binder Course', code: 'MS-00002-02', status: 'COMPLETED', progress: 100 },
      { name: 'Wearing Course Paving', code: 'MS-00002-03', status: 'COMPLETED', progress: 100 },
      { name: 'Thermoplastic Pavement Markings', code: 'MS-00002-04', status: 'COMPLETED', progress: 100 },
    ],
  },

  // 3. North District Drainage Improvement (DELAYED)
  {
    projectId: 'PRJ-00003',
    name: 'North District Drainage Improvement',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Drainage',
    location: 'Mindanao Avenue Outfall, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 45_000_000,
    fundsDisbursed: 24_300_000,
    contractor: 'HydraTech Solutions Co.',
    contractorId: 'CTR-QC-00003',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-05-10T08:00:00+08:00'),
    targetCompletion: new Date('2026-11-15T17:00:00+08:00'),
    status: 'DELAYED',
    delayedReason: 'Inspection scheduling delay',
    progress: 54,
    procurementId: 'PROC-2025-0003',
    contractId: 'CON-2025-0003',
    timelineMonths: 18,
    milestones: [
      { name: 'Site Clearing & Trenching', code: 'MS-00003-01', status: 'COMPLETED', progress: 100 },
      { name: 'Reinforced Culvert Installation', code: 'MS-00003-02', status: 'COMPLETED', progress: 100 },
      { name: 'Catch Basin Construction', code: 'MS-00003-03', status: 'COMPLETED', progress: 100 },
    ],
  },

  // 4. Quirino Avenue Road Widening
  {
    projectId: 'PRJ-00004',
    name: 'Quirino Avenue Road Widening',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Roads',
    location: 'Quirino Highway Km 18, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 65_000_000,
    fundsDisbursed: 27_300_000,
    contractor: 'Apex Heavy Civil Works',
    contractorId: 'CTR-QC-00004',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-08-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-12-20T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 42,
    procurementId: 'PROC-2025-0004',
    contractId: 'CON-2025-0004',
    timelineMonths: 16,
    milestones: [
      { name: 'Right of Way Clearing', code: 'MS-00004-01', status: 'COMPLETED', progress: 100 },
      { name: 'Subgrade Preparation', code: 'MS-00004-02', status: 'COMPLETED', progress: 100 },
      { name: 'Aggregate Base Course', code: 'MS-00004-03', status: 'COMPLETED', progress: 100 },
    ],
  },

  // 5. Flood Control Channel Improvement (PENDING_APPROVAL #1)
  {
    projectId: 'PRJ-00005',
    name: 'Flood Control Channel Improvement',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Flood Control',
    location: 'Tullahan River Basin Section, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 80_000_000,
    fundsDisbursed: 48_800_000,
    contractor: 'Riverine Civil Contractors',
    contractorId: 'CTR-QC-00005',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-04-15T08:00:00+08:00'),
    targetCompletion: new Date('2026-10-15T17:00:00+08:00'),
    status: 'PENDING_APPROVAL',
    progress: 61,
    procurementId: 'PROC-2025-0005',
    contractId: 'CON-2025-0005',
    timelineMonths: 18,
    milestones: [
      { name: 'Dredging & Excavation', code: 'MS-00005-01', status: 'COMPLETED', progress: 100 },
      { name: 'Sheet Piling & Riprap', code: 'MS-00005-02', status: 'COMPLETED', progress: 100 },
      { name: 'Concrete Revetment Wall', code: 'MS-00005-03', status: 'PENDING_APPROVAL', progress: 100 },
    ],
  },

  // 6. East District Road Repair Package
  {
    projectId: 'PRJ-00006',
    name: 'East District Road Repair Package',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Roads',
    location: 'Katipunan Ave Extension, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 90_000_000,
    fundsDisbursed: 64_800_000,
    contractor: 'Eastern Metropolitan Infra',
    contractorId: 'CTR-QC-00006',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-02-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-09-25T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 72,
    procurementId: 'PROC-2025-0006',
    contractId: 'CON-2025-0006',
    timelineMonths: 19,
    milestones: [
      { name: 'Pavement Re-blocking', code: 'MS-00006-01', status: 'COMPLETED', progress: 100 },
      { name: 'Curbs and Gutter Alignment', code: 'MS-00006-02', status: 'COMPLETED', progress: 100 },
      { name: 'Sidewalk Modernization', code: 'MS-00006-03', status: 'COMPLETED', progress: 100 },
      { name: 'Traffic Barrier Installation', code: 'MS-00006-04', status: 'COMPLETED', progress: 100 },
    ],
  },

  // 7. Footbridge Replacement Program (PENDING_APPROVAL #2)
  {
    projectId: 'PRJ-00007',
    name: 'Footbridge Replacement Program',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Bridges',
    location: 'EDSA Muñoz & Balintawak Points, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 25_000_000,
    fundsDisbursed: 22_000_000,
    contractor: 'Urban Steel Structures Inc.',
    contractorId: 'CTR-QC-00007',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-07-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-09-30T17:00:00+08:00'),
    status: 'PENDING_APPROVAL',
    progress: 88,
    procurementId: 'PROC-2025-0007',
    contractId: 'CON-2025-0007',
    timelineMonths: 15,
    milestones: [
      { name: 'Old Truss Dismantling', code: 'MS-00007-01', status: 'COMPLETED', progress: 100 },
      { name: 'Steel Arch Erection', code: 'MS-00007-02', status: 'COMPLETED', progress: 100 },
      { name: 'Roof Canopy & Lighting Installation', code: 'MS-00007-03', status: 'PENDING_APPROVAL', progress: 100 },
    ],
  },

  // 8. Slope Protection and Road Stabilization
  {
    projectId: 'PRJ-00008',
    name: 'Slope Protection and Road Stabilization',
    category: 'ROADS_AND_BRIDGES',
    sector: 'Slope Protection',
    location: 'Payatas Ridge Link, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 120_000_000,
    fundsDisbursed: 44_400_000,
    contractor: 'GeoAnchor Engineering Corp.',
    contractorId: 'CTR-QC-00008',
    agency: 'DPWH',
    officeCode: 'DPWH_NCR',
    startDate: new Date('2025-09-15T08:00:00+08:00'),
    targetCompletion: new Date('2027-03-30T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 37,
    procurementId: 'PROC-2025-0008',
    contractId: 'CON-2025-0008',
    timelineMonths: 18,
    milestones: [
      { name: 'Soil Nailing & Geotextile Layer', code: 'MS-00008-01', status: 'COMPLETED', progress: 100 },
      { name: 'Shotcreting & Retaining Wall', code: 'MS-00008-02', status: 'COMPLETED', progress: 100 },
    ],
  },

  // ========================================================== PUBLIC BUILDINGS (PHP 260M)
  // 9. School Building Construction (PENDING_APPROVAL #3)
  {
    projectId: 'PRJ-00009',
    name: 'School Building Construction',
    category: 'PUBLIC_BUILDINGS',
    sector: 'Education',
    location: 'Batasan Hills Elementary School, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 60_000_000,
    fundsDisbursed: 40_200_000,
    contractor: 'Solid Builders & Development',
    contractorId: 'CTR-QC-00009',
    agency: 'LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-03-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-10-30T17:00:00+08:00'),
    status: 'PENDING_APPROVAL',
    progress: 67,
    procurementId: 'PROC-2025-0009',
    contractId: 'CON-2025-0009',
    timelineMonths: 20,
    milestones: [
      { name: 'Earthworks & Foundation Piling', code: 'MS-00009-01', status: 'COMPLETED', progress: 100 },
      { name: 'Four-Storey Concrete Superstructure', code: 'MS-00009-02', status: 'COMPLETED', progress: 100 },
      { name: 'Masonry & Roofing Works', code: 'MS-00009-03', status: 'PENDING_APPROVAL', progress: 100 },
    ],
  },

  // 10. Barangay Hall Complex
  {
    projectId: 'PRJ-00010',
    name: 'Barangay Hall Complex',
    category: 'PUBLIC_BUILDINGS',
    sector: 'Civic',
    location: 'Barangay Holy Spirit, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 35_000_000,
    fundsDisbursed: 17_150_000,
    contractor: 'Civic Cornerstone Corp.',
    contractorId: 'CTR-QC-00010',
    agency: 'LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-07-15T08:00:00+08:00'),
    targetCompletion: new Date('2026-11-30T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 49,
    procurementId: 'PROC-2025-0010',
    contractId: 'CON-2025-0010',
    timelineMonths: 16,
    milestones: [
      { name: 'Substructure & Footings', code: 'MS-00010-01', status: 'COMPLETED', progress: 100 },
      { name: 'Two-Storey Structural Framing', code: 'MS-00010-02', status: 'COMPLETED', progress: 100 },
      { name: 'Plumbing and Electrical Roughing-ins', code: 'MS-00010-03', status: 'IN_PROGRESS', progress: 35 },
    ],
  },

  // 11. City Administration Annex
  {
    projectId: 'PRJ-00011',
    name: 'City Administration Annex',
    category: 'PUBLIC_BUILDINGS',
    sector: 'Civic',
    location: 'Quezon City Hall Compound, Elliptical Road',
    city: 'Quezon City',
    region: 'NCR',
    budget: 45_000_000,
    fundsDisbursed: 13_950_000,
    contractor: 'Prime Capital Builders Inc.',
    contractorId: 'CTR-QC-00011',
    agency: 'LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-10-01T08:00:00+08:00'),
    targetCompletion: new Date('2027-02-28T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 31,
    procurementId: 'PROC-2025-0011',
    contractId: 'CON-2025-0011',
    timelineMonths: 17,
    milestones: [
      { name: 'Basement Excavation & Shoring', code: 'MS-00011-01', status: 'COMPLETED', progress: 100 },
      { name: 'Ground Floor Slab Pouring', code: 'MS-00011-02', status: 'IN_PROGRESS', progress: 45 },
    ],
  },

  // 12. Public Market Rehabilitation (PENDING_APPROVAL #4)
  {
    projectId: 'PRJ-00012',
    name: 'Public Market Rehabilitation',
    category: 'PUBLIC_BUILDINGS',
    sector: 'Commercial / Public Market',
    location: 'Novaliches Public Market, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 70_000_000,
    fundsDisbursed: 56_700_000,
    contractor: 'Bayanihan Construction Works',
    contractorId: 'CTR-QC-00012',
    agency: 'LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-01-10T08:00:00+08:00'),
    targetCompletion: new Date('2026-09-30T17:00:00+08:00'),
    status: 'PENDING_APPROVAL',
    progress: 81,
    procurementId: 'PROC-2025-0012',
    contractId: 'CON-2025-0012',
    timelineMonths: 20,
    milestones: [
      { name: 'Wet Market Drainage Overhaul', code: 'MS-00012-01', status: 'COMPLETED', progress: 100 },
      { name: 'Stainless Steel Stalls & Tiling', code: 'MS-00012-02', status: 'COMPLETED', progress: 100 },
      { name: 'Fire Suppression & Solar Roof Phase', code: 'MS-00012-03', status: 'PENDING_APPROVAL', progress: 100 },
    ],
  },

  // 13. Community Evacuation Center
  {
    projectId: 'PRJ-00013',
    name: 'Community Evacuation Center',
    category: 'PUBLIC_BUILDINGS',
    sector: 'Disaster Preparedness',
    location: 'Barangay Bagong Silangan, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 50_000_000,
    fundsDisbursed: 28_500_000,
    contractor: 'ShieldSafe Construction Group',
    contractorId: 'CTR-QC-00013',
    agency: 'LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-05-20T08:00:00+08:00'),
    targetCompletion: new Date('2026-11-15T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 57,
    procurementId: 'PROC-2025-0013',
    contractId: 'CON-2025-0013',
    timelineMonths: 18,
    milestones: [
      { name: 'Site Leveling & Foundation Mat', code: 'MS-00013-01', status: 'COMPLETED', progress: 100 },
      { name: 'Multi-Purpose Gymnasium Structure', code: 'MS-00013-02', status: 'COMPLETED', progress: 100 },
      { name: 'Sanitation Facility & Backup Power', code: 'MS-00013-03', status: 'IN_PROGRESS', progress: 40 },
    ],
  },

  // ========================================================== WATER WORKS (PHP 160M)
  // 14. Water Supply Expansion
  {
    projectId: 'PRJ-00014',
    name: 'Water Supply Expansion',
    category: 'WATER_WORKS',
    sector: 'Water Supply',
    location: 'Fairview-Lagro Distribution Grid, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 55_000_000,
    fundsDisbursed: 34_650_000,
    contractor: 'Aqueduct Infrastructure Philippines',
    contractorId: 'CTR-QC-00014',
    agency: 'MWSS / LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-04-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-10-31T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 63,
    procurementId: 'PROC-2025-0014',
    contractId: 'CON-2025-0014',
    timelineMonths: 19,
    milestones: [
      { name: 'High-Density Polyethylene Main Lines', code: 'MS-00014-01', status: 'COMPLETED', progress: 100 },
      { name: 'District Metered Area Pressure Chambers', code: 'MS-00014-02', status: 'COMPLETED', progress: 100 },
      { name: 'Household Connection Interconnection', code: 'MS-00014-03', status: 'IN_PROGRESS', progress: 45 },
    ],
  },

  // 15. Water Line Rehabilitation (DELAYED)
  {
    projectId: 'PRJ-00015',
    name: 'Water Line Rehabilitation',
    category: 'WATER_WORKS',
    sector: 'Water Supply',
    location: 'Tandang Sora Transmission Line, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 40_000_000,
    fundsDisbursed: 18_400_000,
    contractor: 'FlowMaster Piping Corp.',
    contractorId: 'CTR-QC-00015',
    agency: 'MWSS / LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-06-15T08:00:00+08:00'),
    targetCompletion: new Date('2026-11-30T17:00:00+08:00'),
    status: 'DELAYED',
    delayedReason: 'Utility coordination delay',
    progress: 46,
    procurementId: 'PROC-2025-0015',
    contractId: 'CON-2025-0015',
    timelineMonths: 17,
    milestones: [
      { name: 'Pipe Condition Acoustic Survey', code: 'MS-00015-01', status: 'COMPLETED', progress: 100 },
      { name: 'Cured-in-Place Pipe Lining', code: 'MS-00015-02', status: 'COMPLETED', progress: 100 },
      { name: 'Gate Valve Replacements', code: 'MS-00015-03', status: 'IN_PROGRESS', progress: 25 },
    ],
  },

  // 16. Reservoir Construction
  {
    projectId: 'PRJ-00016',
    name: 'Reservoir Construction',
    category: 'WATER_WORKS',
    sector: 'Storage Reservoir',
    location: 'La Mesa Watershed Perimeter, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 65_000_000,
    fundsDisbursed: 33_800_000,
    contractor: 'Apex Reservoir Engineers',
    contractorId: 'CTR-QC-00016',
    agency: 'MWSS / LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-05-01T08:00:00+08:00'),
    targetCompletion: new Date('2026-12-15T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 52,
    procurementId: 'PROC-2025-0016',
    contractId: 'CON-2025-0016',
    timelineMonths: 19,
    milestones: [
      { name: 'Ring Wall Foundation Pouring', code: 'MS-00016-01', status: 'COMPLETED', progress: 100 },
      { name: 'Prestressed Concrete Tank Walls', code: 'MS-00016-02', status: 'COMPLETED', progress: 100 },
      { name: 'Internal Epoxy Sealant & Hydrotesting', code: 'MS-00016-03', status: 'IN_PROGRESS', progress: 35 },
    ],
  },

  // ========================================================== HEALTH FACILITIES (PHP 100M)
  // 17. Health Center Construction (PENDING_APPROVAL #5)
  {
    projectId: 'PRJ-00017',
    name: 'Health Center Construction',
    category: 'HEALTH_FACILITIES',
    sector: 'Primary Health Care',
    location: 'Barangay Pasong Tamo, Quezon City',
    city: 'Quezon City',
    region: 'NCR',
    budget: 55_000_000,
    fundsDisbursed: 40_700_000,
    contractor: 'Medica Builders Corporation',
    contractorId: 'CTR-QC-00017',
    agency: 'DOH / LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-02-15T08:00:00+08:00'),
    targetCompletion: new Date('2026-09-30T17:00:00+08:00'),
    status: 'PENDING_APPROVAL',
    progress: 74,
    procurementId: 'PROC-2025-0017',
    contractId: 'CON-2025-0017',
    timelineMonths: 19,
    milestones: [
      { name: 'Clinical Wing Foundation', code: 'MS-00017-01', status: 'COMPLETED', progress: 100 },
      { name: 'Diagnostic & Treatment Rooms', code: 'MS-00017-02', status: 'COMPLETED', progress: 100 },
      { name: 'Cold Chain Laboratory & HVAC', code: 'MS-00017-03', status: 'PENDING_APPROVAL', progress: 100 },
    ],
  },

  // 18. District Hospital Wing
  {
    projectId: 'PRJ-00018',
    name: 'District Hospital Wing',
    category: 'HEALTH_FACILITIES',
    sector: 'Hospital Services',
    location: 'Quezon City General Hospital Complex',
    city: 'Quezon City',
    region: 'NCR',
    budget: 45_000_000,
    fundsDisbursed: 13_050_000,
    contractor: 'BioHealth Facilities Inc.',
    contractorId: 'CTR-QC-00018',
    agency: 'DOH / LGU',
    officeCode: 'QC_ENG',
    startDate: new Date('2025-11-01T08:00:00+08:00'),
    targetCompletion: new Date('2027-04-30T17:00:00+08:00'),
    status: 'IN_PROGRESS',
    progress: 70,
    procurementId: 'PROC-2025-0018',
    contractId: 'CON-2025-0018',
    timelineMonths: 18,
    milestones: [
      { name: 'Structural Seismic Retrofit', code: 'MS-00018-01', status: 'COMPLETED', progress: 100 },
      { name: 'ICU Extension Framing', code: 'MS-00018-02', status: 'COMPLETED', progress: 100 },
    ],
  },
]
