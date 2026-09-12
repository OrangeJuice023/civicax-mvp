# Kawing — System Architecture & Product Logic

**Product:** KAWING
**Tagline:** See how systems connect.
**Previous working name:** CivicaX (see [`brand-transition.md`](brand-transition.md))

KAWING is the canonical current brand.

> **How to read this document.** This is the product and architecture thesis,
> covering both what exists today and what is deliberately deferred. Sections
> that describe future stages (IPFS, blockchain anchoring, mobile, the extracted
> API) say so explicitly — nothing in those sections is implemented in this
> repository. Where the running code has since moved past what a section
> describes, a **Status note** marks it inline rather than rewriting the text.

---

## 1. What Kawing is

Kawing is a systems connectivity, workflow visibility, verification, and
auditability platform.

The company is NOT limited to government.

**Initial beachhead:** Public-sector infrastructure and government workflows.

**Potential future markets:**

- Government
- Construction
- Enterprise operations
- Supply chain
- Healthcare
- Financial services
- Other organizations with complex multi-party workflows

**Core company thesis:**

Organizations already have systems. The problem is that people, systems, data,
evidence, decisions, and accountability are often fragmented. Kawing makes
those relationships visible.

**Primary product promise:** SEE HOW SYSTEMS CONNECT.

## 2. Product positioning

Kawing should be understood as a **systems visibility and connectivity layer**.

Not primarily:

- a blockchain company
- a project management application
- an ERP
- a government portal
- a cybersecurity product
- a construction management company
- a cryptocurrency product

Blockchain is an infrastructure mechanism used for tamper-evident external
anchoring. The user-facing product is about:

SYSTEMS + WORKFLOWS + EVIDENCE + VALIDATION + DECISIONS + AUDITABILITY

## 3. Initial product vertical

The first working product is **public infrastructure project monitoring**. The
system models complex infrastructure project lifecycles. Example:

- Bridge Rehabilitation
- School Construction
- Road Repair
- Drainage Improvement
- Water Supply Expansion
- Health Center Construction

## 4. Core product flow

```
PROJECT
    ↓
MILESTONE
    ↓
EVIDENCE
    ↓
VALIDATION
    ↓
APPROVAL
    ↓
NEXT ELIGIBLE ACTION
    ↓
AUDIT
```

More detailed:

```
Project
    ↓
Procurement / Contract
    ↓
Implementation
    ↓
Milestone
    ↓
Evidence Submission
    ↓
Evidence Verification
    ↓
Multi-party Validation
    ↓
Milestone Readiness
    ↓
Approval
    ↓
Payment Eligibility / Next Workflow State
    ↓
Audit Event
```

The product exists to make this entire chain visible.

## 5. Core user questions

Kawing should allow an authorized user to answer:

1. What projects are active?
2. What stage is each project in?
3. What milestone is currently active?
4. What evidence has been submitted?
5. What evidence is missing?
6. Who has verified the evidence?
7. Who has validated the milestone?
8. Who still needs to act?
9. Why is the project/milestone blocked?
10. What can happen next?
11. What happened historically?
12. Can the recorded event history be independently verified?

## 6. Central product differentiator

The core differentiated experience is: **"Why can't this milestone move
forward?"**

Kawing should answer: WHAT is blocked? WHY is it blocked? WHO needs to act?
WHAT must happen next?

Example:

```
Inspection Phase

3 / 4 validations complete

STATUS:            BLOCKED
BLOCKING CONDITION: Independent validation pending
CURRENT OWNER:      Independent Engineering Validator
NEXT ACTION:        Complete independent validation
```

This is more important than showing blockchain terminology.

## 7. Important distinction

Kawing does NOT claim:

- "Blockchain proves the project exists."
- "Blockchain proves the evidence is truthful."
- "Blockchain makes fraud impossible."

Instead: Kawing verifies workflow conditions and records events. Cryptographic
hashing and blockchain anchoring help demonstrate that a specific recorded
artifact/event has not been altered since it was anchored.

## 8. Current MVP domain model

```
Project
    ↓
Milestone
    ↓
Evidence
    ↓
Validation
    ↓
Validator
```

**Project** — the overall public infrastructure project. Typical fields:
project ID, project name, category, location, budget, funds disbursed,
progress, contractor, timeline, status, current milestone, delayed reason.

**Milestone** — a meaningful project phase (Mobilization, Foundation,
Structural Works, Construction, Inspection, Validation, Approval, Turnover).
Milestones have: sequence, progress, target date, status, required evidence,
required validations, readiness.

**Evidence** — documentation or proof supporting a milestone: progress report,
inspection report, site inspection, geotagged photo, structural test, material
certificate, engineering certification, finance reconciliation. Evidence may
eventually include a file, content hash, IPFS CID and blockchain anchor, but
the core MVP can operate with evidence metadata.

**Validation** — a review/verification performed by an authorized validator:
engineering, finance, oversight, independent. States: PENDING, APPROVED,
REJECTED.

**Validator** — an organization, role, or designated validation actor. A
validator is NOT necessarily a literal blockchain node; the current MVP
interpretation is a named review/validation role.

## 9. Project state vs milestone state

These must remain distinct.

```
PROJECT:            In Progress
CURRENT MILESTONE:  Blocked on Validation
```

The project is still active; one stage of its lifecycle cannot proceed.

## 10. Milestone state machine

Conceptual states:

```
PENDING
    ↓
IN_PROGRESS
    ↓
BLOCKED_ON_EVIDENCE
    ↓
BLOCKED_ON_VALIDATION
    ↓
READY_FOR_APPROVAL
    ↓
APPROVED
    ↓
COMPLETED
```

Not every milestone must pass through every state:

- Missing evidence → BLOCKED_ON_EVIDENCE
- Missing required validator → BLOCKED_ON_VALIDATION
- All requirements satisfied → READY_FOR_APPROVAL
- Authorized approval → APPROVED

> **Status note.** The implementation uses one status,
> `PENDING_APPROVAL`, for the "all required validations complete, awaiting
> sign-off" state, displayed as "Ready for approval" at milestone level and
> "Pending approval" at project level. See
> `src/lib/infrastructure/constants.ts`, which is the single source of truth
> for the status vocabulary.

## 11. Readiness rule

A milestone is ready for approval only when the configured required evidence
and validation conditions are satisfied.

```
Evidence:   3 / 3 present
Validation: 3 / 4 complete
Result:     BLOCKED_ON_VALIDATION
```

After the final required validator completes:

```
Evidence:   3 / 3
Validation: 4 / 4
Result:     READY FOR APPROVAL
```

After authorized approval: APPROVED.

**IMPORTANT:** The frontend must never determine readiness by itself. The
server/domain layer is authoritative (`src/lib/infrastructure/engine.ts`).

## 12. Payment logic

Kawing does NOT perform real payments in the MVP. Conceptually:

```
Milestone → Evidence → Validation → Approval → PAYMENT ELIGIBLE
```

"Payment eligible" does NOT mean money was transferred. Actual payment
integration is a future system integration. The MVP can show
`PAYMENT / NEXT TRANCHE: BLOCKED` or `PAYMENT: ELIGIBLE`.

## 13. Hero demo project

| Field | Value |
| --- | --- |
| Project ID | PRJ-00026 |
| Project | Bridge Rehabilitation |
| Budget | PHP 20,000,000 |
| Funds disbursed | PHP 15,239,000 |
| Progress | 65% |
| Current milestone | Inspection Phase |
| Project status | In Progress |
| Milestone status | Blocked on Validation |

## 14. Hero project story

The hero project exists to demonstrate: a project has progressed to
inspection; evidence exists; multiple validators have reviewed it; one
required independent validation is still missing; therefore the milestone
cannot proceed.

The system clearly shows `3 / 4 validations complete`, `BLOCKED`, `Independent
validation pending`. Then the Independent Validator completes validation →
`4 / 4`, `READY FOR APPROVAL`. Then an authorized user approves → `APPROVED`.
Then an audit event is created. Then audit integrity is verified.

## 15. Hero evidence story

Inspection Phase contains synthetic evidence such as:

| Evidence | Status |
| --- | --- |
| Contractor Progress Submission | VERIFIED |
| Engineering Inspection Report | VERIFIED |
| Finance Reconciliation | VERIFIED |
| Independent Validation Record | PENDING |

The application should represent `3 / 4` required validation conditions
complete.

## 16. Hero validation story

Required validation roles: Engineering APPROVED, Finance APPROVED, City
Oversight APPROVED, Independent Validator PENDING.

After final validation: Independent Validator APPROVED → milestone READY FOR
APPROVAL. After approval: milestone APPROVED.

## 17. See how systems connect

The tagline is not just marketing. The UI should make these relationships
visible:

```
PROJECT → MILESTONE → EVIDENCE → VALIDATION → APPROVAL → AUDIT
```

A project detail page should visually communicate this relationship.

## 18. Internal audit architecture — current MVP

Kawing has a shared audit spine used by two domains: the citizen transaction
domain and the infrastructure project domain. Shared concepts: `CaseEvent`,
`AuditRecord`.

Each meaningful state-changing operation creates: state change + CaseEvent +
AuditRecord, written atomically in one transaction.

## 19. Audit hash chain

The MVP uses a SHA-256 hash chain:

```
Event 1 → Hash 1
Event 2 → Hash 2 = hash(payload + previousHash)
Event 3 → Hash 3 = hash(payload + previousHash)
```

Each project has its own chain. Each citizen case has its own chain. Project
and case sequences must not accidentally merge.

## 20. Audit invariant

The audit chain rejects invalid sequence transitions. Do NOT "repair" missing
sequence numbers automatically — a sequence gap may represent tampering or
corruption. The safest behavior is verification failure rather than silent
repair.

## 21. Audit verification

Verification reconstructs the stored event sequence and recomputes hashes:

```
Stored events → Reconstruct payloads → Recompute hashes
→ Compare previous/current links → VALID or INTEGRITY ERROR
```

The UI must NOT hard-code `VALID`.

## 22. Audit vs blockchain

These are separate layers.

```
Kawing internal audit:   Project Event → CaseEvent / AuditRecord → SHA-256 chain
External blockchain:     Evidence Hash → Blockchain Anchor
Combined:                KAWING AUDIT → SHA-256 → BLOCKCHAIN ANCHOR
```

The blockchain is an external integrity anchor.

## 23. Real blockchain MVP — optional / next stage

The next technical stage can introduce a real **Ethereum Sepolia testnet**
anchor, to demonstrate a real public blockchain anchor without using
production money.

## 24. Why blockchain exists

Blockchain is used for external timestamped anchoring, and independent
verification of a previously calculated hash.

Blockchain is NOT being used as bulk file storage, a government database, an
ERP, or a project management database.

## 25. Evidence storage architecture

Large evidence files should NOT normally be stored directly on Ethereum.

```
ACTUAL FILE → IPFS / decentralized content storage → CID
ACTUAL FILE → SHA-256 → CONTENT HASH
CONTENT HASH + CID/reference + Project ID + Milestone ID → BLOCKCHAIN ANCHOR
```

## 26. Why files are not the primary blockchain data

Blockchains replicate ledger data across network participants and are not
designed to serve as cheap bulk file storage. Large files create high storage
costs, unnecessary replicated data, poor application architecture, and poor
scalability.

Therefore: **IPFS = content. Blockchain = proof/anchor.**

## 27. IPFS model

IPFS provides content-addressed storage: `inspection.jpg → IPFS → CID: bafy…`.
The CID identifies the content; if the file changes, the CID changes.

For the MVP, Pinata can be used as the IPFS pinning/storage provider. The MVP
should only use synthetic demonstration files.

## 28. Important IPFS caveat

IPFS does not automatically mean "the file is permanently replicated
everywhere." Persistence requires pinning / nodes that retain the content.

- MVP: Pinata / managed IPFS pinning
- Future: institutional nodes, multi-party pinning, redundant storage

## 29. Real evidence verification

Ideal flow, on upload of `inspection.jpg`:

1. validate file
2. compute SHA-256
3. upload to IPFS
4. receive CID
5. store Evidence record
6. anchor hash to Ethereum Sepolia
7. store transaction hash
8. create audit events

```
Evidence:    Engineering Inspection Photo
IPFS:        bafy…
SHA-256:     8f3c…a92
Blockchain:  Ethereum Sepolia
Transaction: 0x91fa…7b31
Status:      ANCHORED
```

## 30. Independent verification

A user should eventually be able to open the evidence, retrieve the content,
compute SHA-256 independently, compare with Kawing's stored hash, inspect the
blockchain transaction, and confirm the transaction contains the expected
hash/reference → INTEGRITY VERIFIED.

## 31. Integrity ≠ truth

Suppose somebody uploads a fake photo. Blockchain can prove "this exact file
was anchored." It cannot prove "this photo accurately represents the physical
world."

Therefore:

| Layer | Provides |
| --- | --- |
| Blockchain | Integrity of recorded artifact |
| Validators | Human/institutional verification |
| Evidence | Supporting material |
| Workflow rules | Conditions for progression |

This distinction is fundamental to Kawing.

## 32. Evidence → validation → approval

Do NOT automatically approve a milestone merely because a file was uploaded,
stored on IPFS, hashed, or successfully anchored.

Correct: Evidence submitted → Evidence integrity anchored →
Human/institutional validation → Milestone readiness → Approval.

## 33. Ideal end-to-end flow

```
CONTRACTOR / USER → Submit Evidence → Kawing → Hash Evidence → IPFS → CID
→ Blockchain Anchor → Evidence Integrity Confirmed → Validator Review
→ Validation → Milestone Ready → Authorized Approval → Audit Event
→ Audit Verification
```

## 34. Blockchain transaction scope

Do NOT put every application action on-chain. Do NOT record login, search,
page visit, button click, or dashboard view.

Potential blockchain anchor events: `EVIDENCE_SUBMITTED`, `EVIDENCE_ANCHORED`,
`INSPECTION_VERIFIED`, `VALIDATION_COMPLETED`, `MILESTONE_APPROVED`,
`PAYMENT_ELIGIBLE`, `PROJECT_COMPLETED`.

Only anchor events where external integrity provides meaningful value.

## 35. Minimal smart contract

The MVP contract should be intentionally tiny — `KawingEvidenceAnchor`,
emitting:

```
EvidenceAnchored(projectId, milestoneId, evidenceHash, cid, timestamp)
```

No token, NFT, staking, DAO, governance token, wallet marketplace, or
financial instrument. The contract is an evidence anchoring mechanism.

## 36. User does not need a crypto wallet

The MVP should NOT require MetaMask or user wallets. The architecture can use
a Kawing-controlled testnet signer:

```
User → Kawing server → Kawing signer → Ethereum Sepolia
```

The private key remains SERVER ONLY.

## 37. Security rule

NEVER expose `KAWING_CHAIN_PRIVATE_KEY` to the browser. Never use
`NEXT_PUBLIC_*` for private keys. Private key, Pinata JWT, and RPC secrets
remain server-side.

## 38. Blockchain failure behavior

If blockchain anchoring fails, DO NOT lose the evidence. Evidence remains
`UPLOADED` or `ANCHOR_PENDING`, and later becomes `EVIDENCE_ANCHORED`.
Application functionality must not collapse merely because the external
blockchain provider is unavailable.

## 39. Duplicate anchor protection

Do not repeatedly anchor the same evidence. If `blockchainStatus = ANCHORED`
and a transaction hash exists, return the existing anchor.

## 40. Current MVP technical stack

Next.js 16, React 19, TypeScript, Prisma 7, Tailwind CSS. The current MVP is a
web application.

> **Status note.** This section originally read "SQLite / better-sqlite3"
> locally with hosted PostgreSQL as the production direction. The application
> has since moved to PostgreSQL (Neon, via Vercel Postgres) for **both** local
> development and production, because Vercel's serverless runtime has no
> persistent filesystem for a SQLite file to live on. See
> `src/lib/db.ts`, `prisma.config.ts` and `.env.example`.

## 41. Current domain architecture

Current infrastructure domain: Project, Milestone, Evidence, Validation,
Validator.

Existing platform infrastructure includes authorization, workflow logic, input
validation, sessions, audit, recommendations, provenance.

## 42. Authorization

Current roles: CITIZEN, OFFICER, ADMINISTRATOR.

Infrastructure-specific permissions include `project:read`,
`project:submit-milestone`, `project:verify-evidence`,
`project:complete-validation`, `project:approve-milestone`.

Authorization is server-side. Frontend visibility does NOT replace server
authorization.

## 43. Role model

**Administrator** may view the system, configure/inspect it, inspect audit,
and access administrative functions. Should NOT automatically be treated as
the person who approves every individual transaction if separation-of-duties
rules prohibit it.

**Officer / Validator** may perform authorized validation/workflow actions
according to policy.

**Citizen** is primarily relevant to the older administrative transaction
domain, not the current infrastructure-monitoring MVP.

## 44. Input validation

Use strict server-side validation. Validation ≠ authorization: a correctly
shaped request is not automatically an authorized request.

## 45. AI / recommendation layer

AI does NOT directly mutate workflow state. The AI/recommendation layer can
produce an `AgentRecommendation`; the workflow engine remains authoritative.

Current recommended MVP mode: RULES, or RULES + optional LLM. The MVP does not
require an external LLM.

## 46. Bottleneck / explanation logic

A deterministic recommendation layer can explain: "1 of 4 required validations
is pending." / "Inspection evidence is missing." / "Approval is waiting on
Finance." / "Milestone exceeded configured target duration."

The recommendation explains existing data. It does not invent government
requirements.

## 47. Synthetic data policy

All current MVP demo data is synthetic. Do NOT present it as live government
data, official Quezon City statistics, actual DPWH project records, or real
contractor information. The UI must visibly display **SYNTHETIC DEMO DATA**.

## 48. Canonical MVP portfolio

- 18 synthetic projects
- 9 validators (7 active, 2 inactive)
- 5 pending approvals
- 42 completed milestones
- Portfolio budget: PHP 1,000,000,000

| Category | Budget | Share |
| --- | --- | --- |
| Roads & Bridges | PHP 480,000,000 | 48% |
| Public Buildings | PHP 260,000,000 | 26% |
| Water Works | PHP 160,000,000 | 16% |
| Health Facilities | PHP 100,000,000 | 10% |

## 49. Canonical project status

18 projects total: 11 IN_PROGRESS, 5 PENDING_APPROVAL, 2 DELAYED.

Hero: PRJ-00026, IN_PROGRESS.

## 50. Pending approvals

Exactly five milestone-level pending approvals:

- PRJ-00005 Flood Control Channel Improvement
- PRJ-00007 Footbridge Replacement Program
- PRJ-00009 School Building Construction
- PRJ-00012 Public Market Rehabilitation
- PRJ-00017 Health Center Construction

The hero PRJ-00026 is NOT counted as one of these; it is
BLOCKED_ON_VALIDATION.

## 51. Seed requirements

The seed must be deterministic. Do NOT rely on `Math.random()`, uncontrolled
current time, or random state generation.

Structure: `prisma/seed-data.ts` contains readable structured data;
`prisma/seed.ts` transforms those definitions into database records.

## 52. Seed assertions

The seed must verify: 18 projects; 9 validators; 7 active; 2 inactive; 5
pending approval milestones; 42 completed milestones; hero PRJ-00026 exists
with budget 20,000,000, funds disbursed 15,239,000, progress 65, milestone
"Inspection Phase", state Blocked on Validation, pending validation count 1;
and a portfolio budget of 1,000,000,000.

## 53. Data consistency

Every project must have milestones. Each milestone must belong to a valid
project. Each evidence record must belong to a valid milestone. Each
validation must belong to a valid milestone. Disbursed funds must not exceed
project budget. Progress must be between 0 and 100. Event timestamps must be
logically ordered. Approved milestones must satisfy required validations.
Blocked milestones must have a real blocking condition.

## 54. Current dashboard logic

The dashboard must derive KPIs from actual database state:

| KPI | Source |
| --- | --- |
| Projects | project count |
| Active projects | active project count |
| Pending approvals | milestones awaiting approval |
| Completed milestones | completed milestone count |
| Validating nodes | active validator count / total validator count |
| Blocked | blocked milestone/project count |

No duplicated hard-coded JSX values.

## 55. Current dashboard

Primary dashboard concept: **Kawing Command Center**.

Suggested sections: KPI cards, Projects at a Glance, Needs Attention,
Validation Health, Recent Audit Activity, Audit Ledger Preview, Budget
Distribution.

The dashboard should not primarily look like a blockchain explorer.

## 56. Projects page

Route `/projects`. Shows project ID, project, category, location, budget,
progress, current milestone, status, last updated. Rows link to
`/projects/[id]`.

## 57. Project detail

Route `/projects/[id]`. Priority information: project, current status, current
milestone, progress, budget, funds disbursed, blocking issue, evidence,
validation, next action, audit history.

The project detail page is the core product experience.

## 58. Pending actions

Route `/pending-actions`. Shows pending approvals, missing evidence, pending
validations, delayed projects, blocked milestones. Each item should answer:
What? Why? Who? Next action?

## 59. Validators

Route `/validators`. Shows total validators, active, inactive, and recent
validation activity. Current MVP: 9 total, 7 active, 2 inactive. Do not
falsely represent these as a production blockchain node network.

## 60. Audit

Route `/audit`. Shows project event history: sequence, timestamp, project,
milestone, event, actor, hash, verification. The technical cryptographic
details are secondary to the human-readable event history.

## 61. UI information architecture

Canonical navigation: Dashboard, Projects, Pending Actions, Validators, Audit
Ledger, Settings.

Avoid redundant navigation such as Nodes Overview, Validator Nodes, Consensus
Status, Project Reports, unless they represent genuinely distinct
functionality.

## 62. Brand

Company/Product: **KAWING**. Tagline: **See how systems connect.**

Do not use the old CivicaX branding in current user-facing UI. Historical
CivicaX references may remain where they represent old migrations, historical
documentation, Git history, architecture history, provenance, or
compatibility.

## 63. Visual identity

| Role | Colour |
| --- | --- |
| Primary — Trust Navy | `#0B2D5B` |
| Secondary — Progress Blue | `#2563EB` |
| Accent — Connection Teal | `#10B981` |
| Neutral | `#94A3B8` |
| Background | `#F8FAFC` |

The visual language should communicate connection, continuity, systems,
clarity, trust.

## 64. Logo

Primary concept: two connected flowing ribbon forms. Meaning: two systems →
Kawing → connected workflow.

The logo should NOT look like cryptocurrency, a blockchain cube, a literal
chain, a cybersecurity shield, or a government building.

## 65. Tagline

KAWING — See how systems connect.

The tagline expresses the product's UX thesis. It should not merely be
decorative.

## 66. Command center philosophy

The UI should not primarily show BLOCK, HASH, NODE, CONSENSUS. It should
primarily show PROJECT, MILESTONE, EVIDENCE, VALIDATION, APPROVAL, AUDIT.
Technical cryptographic information is secondary.

## 67. Current application architecture

```
                   KAWING WEB
                       │
           ┌───────────┴───────────┐
           │                       │
       Dashboard              Project UI
           │                       │
           └───────────┬───────────┘
                       │
                 Domain Services
                       │
          ┌────────────┼────────────┐
          │            │            │
       Workflow      Audit        Auth
          │            │            │
          └────────────┼────────────┘
                       │
                    Prisma
                       │
                    Database
```

The current MVP can still contain backend/server logic inside the Next.js
application. This is intentional for MVP speed.

## 68. Future API architecture

```
                 KAWING WEB                 KAWING MOBILE
                      │                           │
                 KAWING API  ←────────────────────┘
                      │
                Domain Services
                      │
          ┌───────────┼───────────┐
          │           │           │
       Database     Audit    Integrations
```

Mobile and Web must NOT talk directly to the database.

## 69. Future external integration

Potential future integrations: government systems, procurement systems,
finance/accounting systems, inspection systems, document management, public
open-data systems, infrastructure data standards, enterprise systems.

```
External System → Integration Layer → Kawing API → Domain → Workflow → Audit → UI
```

Do NOT implement these yet unless explicitly requested. See
[`future-integrations.md`](future-integrations.md) for the documented entry
points.

## 70. Future standardization

Where applicable, future infrastructure data should be compatible with
established infrastructure/procurement standards such as OCDS and OC4IDS. Do
not implement full specifications prematurely; the MVP should simply avoid
making the internal model impossible to map to them.

## 71. Future mobile architecture

Potential mobile application: **KAWING MOBILE**. Primary future use cases:
field inspection, evidence capture, photos, geolocation metadata, validator
actions, inspection checklists, offline capture, sync.

```
Field User → Kawing Mobile → Kawing API → Evidence → IPFS → Hash
→ Blockchain Anchor → Validation
```

Web is the command center; mobile is the field/verification interface.

## 72. Repository strategy

The current MVP may remain one repository. Eventually, once boundaries
stabilize:

| Repository | Contents |
| --- | --- |
| `kawing-web` | Next.js web application |
| `kawing-api` | backend / workflows / auth / integrations / audit |
| `kawing-mobile` | React Native / Expo |
| `kawing-prototype` | experimental work |
| `kawing-architecture` | ADRs / diagrams / technical documentation |
| `kawing-contracts` | shared API contracts / OpenAPI / schemas |

**Important:** do not split the MVP prematurely. Extract services after actual
boundaries become stable.

## 73. Repository ownership

`kawing-web` = presentation. `kawing-api` = business logic. `kawing-mobile` =
field/client experience. `kawing-prototype` = experimentation.
`kawing-architecture` = architecture/documentation. `kawing-contracts` =
shared contracts.

## 74. Single product experience

Multiple repositories do NOT mean multiple products; they are implementation
boundaries. The user experiences KAWING.

Potential production domains: `app.kawing.*`, `api.kawing.*`. Web and mobile
consume the same API/domain.

## 75. Production deployment

Current web MVP: Next.js, production target Vercel.

> **Status note.** Both local development and production now run on hosted
> PostgreSQL via `DATABASE_URL` (see §40). Do not depend on a local SQLite
> file for persistent production storage.

## 76. Vercel rule

Production code must NOT depend on Windows paths, localhost services, local
persistent files, or Docker-only dependencies. Secrets remain server-side.

## 77. Blockchain deployment

Blockchain MVP target: Ethereum Sepolia, for testnet experimentation and a
verifiable demo. No production money.

Potential configuration: `SEPOLIA_RPC_URL`, `KAWING_CHAIN_PRIVATE_KEY`,
`KAWING_EVIDENCE_ANCHOR_CONTRACT`, `PINATA_JWT`. All secrets server-side.

## 78. Cost model for MVP

Goal: near-zero cost. Use an Ethereum testnet with faucet test ETH, a free/low
-cost RPC tier, and a free/low-cost IPFS pinning tier. No production blockchain
expenses. No mainnet.

## 79. Evidence storage

DO NOT put image bytes directly into a blockchain transaction. Use: file →
IPFS; hash → blockchain; metadata → Kawing database.

## 80. Audit storage

Internal audit lives in the Kawing database; the external anchor on a
blockchain; actual content in IPFS or a future storage system. Three-layer
concept: CONTENT + APPLICATION RECORD + EXTERNAL PROOF.

## 81. Security model

Never expose database credentials, RPC secrets, private keys, Pinata JWT, or
session secrets.

The client never accesses the database directly. The server authorizes
requests. The domain enforces workflow. The audit records state transitions.
The blockchain anchors selected evidence.

## 82. Privacy model

Do NOT place sensitive personal information on-chain: full names, addresses,
personal records, private government documents, private signatures. Use
hashes, identifiers, and references where appropriate.

## 83. Synthetic demo security

MVP test files must be synthetic (e.g. a synthetic inspection photo). Do NOT
use actual government confidential evidence, citizen records, or private
contractor records.

## 84. Current user experience

Ideal 30-second understanding: "This is Kawing. I can see all the projects. I
can open a project. I can see the current milestone. I can see its evidence. I
can see who validated it. I can see what is blocking it. I can see the next
action. I can inspect the audit history. I can verify the integrity of the
recorded history."

## 85. Hero demo script

```
Dashboard → Projects → PRJ-00026 Bridge Rehabilitation → Inspection Phase
→ 3 / 4 Validation → BLOCKED → Independent Validator → Complete Validation
→ 4 / 4 → READY FOR APPROVAL → Approve Milestone → APPROVED → Audit → Verify
→ AUDIT VERIFIED
```

With a future blockchain MVP:

```
Upload inspection image → IPFS stored → SHA-256 calculated
→ Ethereum Sepolia anchor → Transaction hash → View on explorer
→ Verify evidence integrity → Validator → Approval → Audit
```

## 86. What blockchain actually contributes

Without blockchain, Kawing can still manage workflow, evidence, validation and
audit, and calculate hashes.

With public blockchain anchoring, Kawing additionally demonstrates: "this
exact evidence hash was externally anchored at this point on a public test
network." That provides an independent external reference.

## 87. What blockchain does not solve

Blockchain does not automatically solve false evidence, fake photographs,
collusion, incorrect human inspection, unauthorized physical work claims, poor
governance, or bad data entered before anchoring.

These are addressed through workflow controls, validation, independent review,
evidence requirements, cross-checking, and auditability.

## 88. Long-term architecture

```
                    KAWING
                       │
       ┌───────────────┼────────────────┐
       │               │                │
      WEB            MOBILE          EXTERNAL
       │               │             SYSTEMS
       └───────────────┼────────────────┘
                       │
                  KAWING API
                       │
               Domain / Workflow
                       │
        ┌──────────────┼───────────────┐
        │              │               │
     Evidence      Validation        Audit
        │              │               │
        │              │          SHA-256 chain
        ▼              ▼               ▼
       IPFS        Validators   Blockchain Anchor
        │                               │
        └───────────────┬───────────────┘
                        │
                     KAWING
                 SYSTEM OF CONNECTIONS
```

## 89. Future physical-world verification

Potential later layers: geotagged photos, GPS metadata, independent
inspection, drone imagery, IoT, sensors, digital signatures, third-party
attestations, cross-system reconciliation.

```
PHYSICAL WORLD → EVIDENCE → VALIDATION → KAWING RECORD → HASH → BLOCKCHAIN
```

These are future extensions. Do not claim they exist in the MVP.

## 90. Company-level vision

Kawing should eventually become infrastructure for organizations that need to
understand complex relationships between systems, people, data, workflows,
evidence, and decisions.

The first use case is government infrastructure. The long-term company is
systems connectivity and verification infrastructure.

## 91. Brand principle

KAWING — See how systems connect.

The product should embody the phrase, not merely display it. Every major
screen should help users see a relationship:

```
Project → Milestone → Evidence → Validator → Approval → Audit
```

## 92. Engineering principle

Prefer: simple, verifiable, auditable, modular, extensible.

Avoid: unnecessary infrastructure, premature microservices, unnecessary
blockchain complexity, unnecessary AI, unnecessary dependencies.

Build the smallest system that demonstrates the complete product thesis
convincingly.

## 93. MVP vs future

**Current MVP:** web app; infrastructure project monitoring;
project/milestone/evidence/validation; synthetic data; dashboard; project
detail; pending actions; validators; audit ledger; SHA-256 audit chain;
role-based authorization; Vercel-compatible architecture.

**Next technical stage:** real evidence upload; IPFS; SHA-256 file hashing;
Ethereum Sepolia anchoring; blockchain transaction display; evidence
verification.

**Future:** API extraction; web/mobile separation; government integrations;
enterprise integrations; OC4IDS/OCDS mapping; field mobile app; offline
evidence capture; richer physical-world verification.

## 94. What not to build without explicit request

Do NOT automatically add: mainnet blockchain, tokens, NFTs, DAO, per-user
wallets, cryptocurrency, staking, blockchain consensus infrastructure,
government API integrations, payment rails, production financial transfers,
complex AI agents, nationwide government deployment, or real personal data.

## 95. System of record principle

| Layer | Responsibility |
| --- | --- |
| Kawing database | application state |
| Kawing audit chain | application event integrity |
| IPFS | evidence content |
| Blockchain | external integrity anchor |

No single technology is expected to do all four jobs.

## 96. Final conceptual model

Kawing sits between fragmented systems — government procurement, engineering,
finance, inspection, oversight, audit — and makes the connections visible.

The product is therefore not "another database." It is "the layer that lets
organizations see how their systems, workflows, evidence, and decisions
connect."

## 97. Final product statement

KAWING — See how systems connect.

Kawing connects fragmented systems, workflows, evidence, decisions, and audit
history into one operational view.

Initial application: infrastructure project monitoring.

```
Core operational chain:   PROJECT → MILESTONE → EVIDENCE → VALIDATION → APPROVAL → AUDIT
Future integrity chain:   EVIDENCE → HASH → IPFS → BLOCKCHAIN → INDEPENDENT VERIFICATION
```

## 98. Engineering golden rules

1. The database is the source of application state.
2. The workflow/domain layer decides whether state can change.
3. The server decides authorization.
4. Every meaningful state change generates an audit event.
5. Historical audit records must not be silently rewritten.
6. Evidence integrity is different from evidence truth.
7. IPFS stores content.
8. Blockchain anchors proof/references.
9. Blockchain does not replace workflow or validation.
10. Synthetic demo data must never be represented as official data.
11. The UI should show relationships before technical internals.
12. Build the MVP before splitting into unnecessary services.
13. Future integrations should enter through an API/integration layer.
14. Never expose secrets or private keys client-side.
15. Keep history intact when rebranding CivicaX → Kawing.

## 99. Single-sentence architecture

Kawing is a systems connectivity platform that makes complex organizational
workflows visible by connecting project state, evidence, validation,
approvals, and audit history, with optional IPFS storage and public blockchain
anchoring providing independently verifiable integrity for selected evidence
and events.

## 100. End state

```
KAWING — See how systems connect.
         ↓
PROJECT → MILESTONE → EVIDENCE → VALIDATION → APPROVAL → AUDIT
         ↓
OPTIONAL EXTERNAL ANCHOR
         ↓
WEB · MOBILE · EXTERNAL SYSTEMS
         ↓
ONE CONNECTED OPERATIONAL VIEW.
```
